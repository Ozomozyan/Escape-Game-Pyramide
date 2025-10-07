import { WebSocket } from 'ws';

export type PlayerRole = 'surveyor' | 'scribe';

export interface Player {
  id: string;
  role: PlayerRole;
  connected: boolean;
  lastHeartbeat: number;
}

export interface GameState {
  currentRoom: number;
  airTimer: number;
  inventory: string[];
  roomsCompleted: number[];
  choices: Array<{
    roomId: number;
    playerId: string;
    choice: string;
    timestamp: number;
  }>;
  isPaused: boolean;
  createdAt: number;
  lastActivity: number;
}

export interface GameSession {
  roomCode: string;
  players: {
    surveyor: Player | null;
    scribe: Player | null;
  };
  gameState: GameState;
}

export interface PlayerConnection {
  ws: WebSocket;
  roomCode: string;
}

export interface Lesson {
  title: string;
  content: string;
  duration: number;
}

export interface Puzzle {
  type: string;
  description: string;
  surveyorInfo: string;
  scribeInfo: string;
  branches?: {
    maat_path?: {
      description: string;
      consequence: string;
    };
    seth_path?: {
      description: string;
      consequence: string;
    };
  };
}

export interface Reward {
  id: string;
  name: string;
  description: string;
}

export interface Room {
  id: number;
  name: string;
  theme: string;
  lesson: Lesson;
  puzzle: Puzzle;
  reward: Reward;
}

export interface Ending {
  condition: string;
  title: string;
  description: string;
  educational_message: string;
}

export interface RoomsData {
  rooms: Room[];
  endings: {
    maat_ending: Ending;
    seth_ending: Ending;
  };
}

// WebSocket message types
export interface WSMessage {
  type: 'auth' | 'heartbeat' | 'action' | 'error' | 'auth_success' | 'heartbeat_ack' | 'state_update' | 'room_completed' | 'player_connected' | 'player_disconnected' | 'player_action';
  [key: string]: any;
}

export interface AuthMessage extends WSMessage {
  type: 'auth';
  playerId: string;
  roomCode: string;
}

export interface HeartbeatMessage extends WSMessage {
  type: 'heartbeat';
}

export interface ActionMessage extends WSMessage {
  type: 'action';
  action: any;
}
