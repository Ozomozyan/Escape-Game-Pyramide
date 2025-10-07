import express, { Request, Response } from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import cors from 'cors';
import crypto from 'crypto';
import {
  GameSession,
  PlayerConnection,
  WSMessage,
  AuthMessage,
  HeartbeatMessage,
  ActionMessage,
  PlayerRole
} from './types';

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(cors());
app.use(express.json());

// In-memory storage for game sessions
const sessions = new Map<string, GameSession>();
const playerConnections = new Map<string, PlayerConnection>();

// Helper to generate room codes
function generateRoomCode(): string {
  return crypto.randomBytes(3).toString('hex').toUpperCase();
}

// Helper to generate player IDs
function generatePlayerId(): string {
  return crypto.randomUUID();
}

// Game state structure
function createGameSession(): GameSession {
  return {
    roomCode: generateRoomCode(),
    players: {
      surveyor: null,
      scribe: null
    },
    gameState: {
      currentRoom: 0,
      airTimer: 1800, // 30 minutes in seconds
      inventory: [],
      roomsCompleted: [],
      choices: [],
      isPaused: false,
      createdAt: Date.now(),
      lastActivity: Date.now()
    }
  };
}

// REST API Endpoints

// Create a new game session
app.post('/api/session/create', (req: Request, res: Response) => {
  const session = createGameSession();
  sessions.set(session.roomCode, session);

  res.json({
    roomCode: session.roomCode,
    message: 'Session created successfully'
  });
});

// Join an existing session
app.post('/api/session/join', (req: Request, res: Response) => {
  const { roomCode, role } = req.body as { roomCode: string; role: PlayerRole };

  if (!roomCode || !role) {
    return res.status(400).json({ error: 'Room code and role required' });
  }

  const session = sessions.get(roomCode.toUpperCase());

  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  if (role !== 'surveyor' && role !== 'scribe') {
    return res.status(400).json({ error: 'Invalid role. Must be "surveyor" or "scribe"' });
  }

  if (session.players[role]) {
    return res.status(409).json({ error: `Role ${role} already taken` });
  }

  const playerId = generatePlayerId();
  session.players[role] = {
    id: playerId,
    role,
    connected: false,
    lastHeartbeat: Date.now()
  };

  res.json({
    playerId,
    role,
    roomCode: session.roomCode,
    message: 'Joined successfully'
  });
});

// Get session state
app.get('/api/session/:roomCode', (req: Request, res: Response) => {
  const session = sessions.get(req.params.roomCode.toUpperCase());

  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  res.json({
    roomCode: session.roomCode,
    players: {
      surveyor: session.players.surveyor ? { role: 'surveyor', connected: session.players.surveyor.connected } : null,
      scribe: session.players.scribe ? { role: 'scribe', connected: session.players.scribe.connected } : null
    },
    gameState: session.gameState
  });
});

// Update game state (idempotent)
app.post('/api/session/:roomCode/update', (req: Request, res: Response) => {
  const { playerId, updates } = req.body;
  const session = sessions.get(req.params.roomCode.toUpperCase());

  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  // Verify player is part of this session
  const playerRole = Object.values(session.players).find(p => p?.id === playerId);
  if (!playerRole) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  // Update game state
  if (updates.currentRoom !== undefined) session.gameState.currentRoom = updates.currentRoom;
  if (updates.airTimer !== undefined) session.gameState.airTimer = updates.airTimer;
  if (updates.inventory) session.gameState.inventory = updates.inventory;
  if (updates.roomsCompleted) session.gameState.roomsCompleted = updates.roomsCompleted;
  if (updates.choices) session.gameState.choices.push(...updates.choices);
  if (updates.isPaused !== undefined) session.gameState.isPaused = updates.isPaused;

  session.gameState.lastActivity = Date.now();

  // Broadcast update to all connected clients
  broadcastToSession(session.roomCode, {
    type: 'state_update',
    gameState: session.gameState
  });

  res.json({
    success: true,
    gameState: session.gameState
  });
});

// Complete a room
app.post('/api/session/:roomCode/complete-room', (req: Request, res: Response) => {
  const { playerId, roomId, reward } = req.body;
  const session = sessions.get(req.params.roomCode.toUpperCase());

  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  const playerRole = Object.values(session.players).find(p => p?.id === playerId);
  if (!playerRole) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  // Idempotent: only add if not already completed
  if (!session.gameState.roomsCompleted.includes(roomId)) {
    session.gameState.roomsCompleted.push(roomId);
    session.gameState.currentRoom = roomId + 1;

    if (reward) {
      session.gameState.inventory.push(reward);
      // Slow down air timer as reward
      session.gameState.airTimer += 60; // Add 1 minute
    }
  }

  session.gameState.lastActivity = Date.now();

  broadcastToSession(session.roomCode, {
    type: 'room_completed',
    roomId,
    reward,
    gameState: session.gameState
  });

  res.json({
    success: true,
    gameState: session.gameState
  });
});

// Get room data
app.get('/api/rooms', (req: Request, res: Response) => {
  const roomsData = require('../rooms.json');
  res.json(roomsData);
});

// Get specific room data
app.get('/api/rooms/:roomId', (req: Request, res: Response) => {
  const roomsData = require('../rooms.json');
  const roomId = parseInt(req.params.roomId);
  const room = roomsData.rooms.find((r: any) => r.id === roomId);

  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }

  res.json(room);
});

// WebSocket handling
wss.on('connection', (ws: WebSocket) => {
  let playerId: string | null = null;
  let roomCode: string | null = null;

  ws.on('message', (message: string) => {
    try {
      const data = JSON.parse(message) as WSMessage;

      switch (data.type) {
        case 'auth': {
          const authData = data as AuthMessage;
          playerId = authData.playerId;
          roomCode = authData.roomCode.toUpperCase();

          const session = sessions.get(roomCode);
          if (!session) {
            ws.send(JSON.stringify({ type: 'error', message: 'Session not found' }));
            ws.close();
            return;
          }

          // Find player role
          const player = Object.values(session.players).find(p => p?.id === playerId);
          if (!player) {
            ws.send(JSON.stringify({ type: 'error', message: 'Player not found' }));
            ws.close();
            return;
          }

          player.connected = true;
          player.lastHeartbeat = Date.now();
          playerConnections.set(playerId, { ws, roomCode });

          ws.send(JSON.stringify({
            type: 'auth_success',
            gameState: session.gameState,
            players: session.players
          }));

          // Notify other player
          broadcastToSession(roomCode, {
            type: 'player_connected',
            role: player.role
          }, playerId);

          break;
        }

        case 'heartbeat':
          if (playerId && roomCode) {
            const session = sessions.get(roomCode);
            if (session) {
              const player = Object.values(session.players).find(p => p?.id === playerId);
              if (player) {
                player.lastHeartbeat = Date.now();
                ws.send(JSON.stringify({ type: 'heartbeat_ack' }));
              }
            }
          }
          break;

        case 'action': {
          const actionData = data as ActionMessage;
          // Handle game actions
          if (playerId && roomCode) {
            const session = sessions.get(roomCode);
            if (session) {
              broadcastToSession(roomCode, {
                type: 'player_action',
                playerId,
                action: actionData.action
              });
            }
          }
          break;
        }
      }
    } catch (error) {
      console.error('WebSocket message error:', error);
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
    }
  });

  ws.on('close', () => {
    if (playerId && roomCode) {
      const connection = playerConnections.get(playerId);
      if (connection) {
        playerConnections.delete(playerId);

        const session = sessions.get(roomCode);
        if (session) {
          const player = Object.values(session.players).find(p => p?.id === playerId);
          if (player) {
            player.connected = false;

            // Notify other player
            broadcastToSession(roomCode, {
              type: 'player_disconnected',
              role: player.role
            }, playerId);
          }
        }
      }
    }
  });
});

// Broadcast message to all players in a session
function broadcastToSession(roomCode: string, message: WSMessage, excludePlayerId: string | null = null): void {
  const session = sessions.get(roomCode);
  if (!session) return;

  Object.values(session.players).forEach(player => {
    if (player && player.id !== excludePlayerId) {
      const connection = playerConnections.get(player.id);
      if (connection && connection.ws.readyState === WebSocket.OPEN) {
        connection.ws.send(JSON.stringify(message));
      }
    }
  });
}

// Cleanup disconnected sessions (run every 5 minutes)
setInterval(() => {
  const now = Date.now();
  const timeout = 30 * 60 * 1000; // 30 minutes

  for (const [roomCode, session] of sessions.entries()) {
    if (now - session.gameState.lastActivity > timeout) {
      sessions.delete(roomCode);
      console.log(`Cleaned up inactive session: ${roomCode}`);
    }
  }
}, 5 * 60 * 1000);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
