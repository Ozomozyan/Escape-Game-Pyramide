# MA'AT ou asphyxie - Backend

Backend server for the cooperative pyramid escape game built with Express.js, TypeScript, and WebSockets.

## Features

- **WebSocket-based real-time multiplayer** - Two players cooperate in real-time
- **REST API** - Session management, room data, and game state
- **Session persistence** - Save and resume games after each room
- **Heartbeat system** - Monitor connection health and reconnection
- **Idempotent endpoints** - Safe to retry operations
- **Automatic cleanup** - Inactive sessions removed after 30 minutes
- **Security** - HTTPS/TLS ready, no personal data stored, minimal logging

## Tech Stack

- **Node.js** + **TypeScript**
- **Express.js 5** - HTTP server and REST API
- **ws** - WebSocket server for real-time communication
- **CORS** - Cross-origin resource sharing

## Project Structure

```
backend/
├── src/
│   ├── server.ts       # Main server with WebSocket and REST API
│   └── types.ts        # TypeScript type definitions
├── rooms.json          # Game content data (6 rooms + endings)
├── claude.md           # Game design document
├── tsconfig.json       # TypeScript configuration
└── package.json        # Dependencies and scripts
```

## Installation

```bash
pnpm install
```

## Development

Start the development server with hot reload:

```bash
pnpm dev
```

Server runs on `http://localhost:3000`

## Build

Compile TypeScript to JavaScript:

```bash
pnpm build
```

## Production

Run the compiled server:

```bash
pnpm start
```

## API Documentation

### REST Endpoints

#### Create Session
```http
POST /api/session/create
```

**Response:**
```json
{
  "roomCode": "A1B2C3",
  "message": "Session created successfully"
}
```

#### Join Session
```http
POST /api/session/join
Content-Type: application/json

{
  "roomCode": "A1B2C3",
  "role": "surveyor" // or "scribe"
}
```

**Response:**
```json
{
  "playerId": "uuid-v4",
  "role": "surveyor",
  "roomCode": "A1B2C3",
  "message": "Joined successfully"
}
```

**Errors:**
- `400` - Missing parameters or invalid role
- `404` - Session not found
- `409` - Role already taken

#### Get Session State
```http
GET /api/session/:roomCode
```

**Response:**
```json
{
  "roomCode": "A1B2C3",
  "players": {
    "surveyor": { "role": "surveyor", "connected": true },
    "scribe": { "role": "scribe", "connected": false }
  },
  "gameState": {
    "currentRoom": 2,
    "airTimer": 1680,
    "inventory": ["stellar_disk", "cubit_ruler"],
    "roomsCompleted": [0, 1],
    "choices": [],
    "isPaused": false,
    "createdAt": 1696680000000,
    "lastActivity": 1696680120000
  }
}
```

#### Update Game State
```http
POST /api/session/:roomCode/update
Content-Type: application/json

{
  "playerId": "uuid-v4",
  "updates": {
    "airTimer": 1620,
    "isPaused": false
  }
}
```

**Response:**
```json
{
  "success": true,
  "gameState": { ... }
}
```

#### Complete Room
```http
POST /api/session/:roomCode/complete-room
Content-Type: application/json

{
  "playerId": "uuid-v4",
  "roomId": 2,
  "reward": "cartouche_seal"
}
```

**Response:**
```json
{
  "success": true,
  "gameState": { ... }
}
```

**Note:** Idempotent - completing the same room multiple times has no additional effect.

#### Get All Rooms
```http
GET /api/rooms
```

**Response:**
```json
{
  "rooms": [ ... ],
  "endings": { ... }
}
```

#### Get Specific Room
```http
GET /api/rooms/:roomId
```

**Response:**
```json
{
  "id": 0,
  "name": "Antechamber",
  "theme": "Upper/Lower Egypt",
  "lesson": { ... },
  "puzzle": { ... },
  "reward": { ... }
}
```

### WebSocket Protocol

Connect to `ws://localhost:3000`

#### Authentication
```json
{
  "type": "auth",
  "playerId": "uuid-v4",
  "roomCode": "A1B2C3"
}
```

**Response:**
```json
{
  "type": "auth_success",
  "gameState": { ... },
  "players": { ... }
}
```

#### Heartbeat
Send every 10-15 seconds to maintain connection:

```json
{
  "type": "heartbeat"
}
```

**Response:**
```json
{
  "type": "heartbeat_ack"
}
```

#### Player Action
```json
{
  "type": "action",
  "action": {
    "type": "puzzle_solution",
    "data": { ... }
  }
}
```

### Broadcast Events

#### State Update
```json
{
  "type": "state_update",
  "gameState": { ... }
}
```

#### Room Completed
```json
{
  "type": "room_completed",
  "roomId": 2,
  "reward": "cartouche_seal",
  "gameState": { ... }
}
```

#### Player Connected
```json
{
  "type": "player_connected",
  "role": "surveyor"
}
```

#### Player Disconnected
```json
{
  "type": "player_disconnected",
  "role": "scribe"
}
```

#### Player Action
```json
{
  "type": "player_action",
  "playerId": "uuid-v4",
  "action": { ... }
}
```

## Game Flow

1. **Create Session** - One player creates a session and receives a room code
2. **Join Session** - Both players join using the room code and select roles (surveyor/scribe)
3. **Connect WebSocket** - Players authenticate via WebSocket for real-time updates
4. **Play Rooms** - Progress through 6 rooms, each with:
   - Mini-lesson (1-2 minutes)
   - Cooperative puzzle (each player has half the info)
   - Reward (item + air timer bonus)
5. **Ma'at Choice** - In room 4, choose cooperation (both escape) or competition (one escapes)
6. **Final Escape** - Synchronize to open the exit

## Data Structures

### Player Roles
- **Surveyor** - Handles geometry, measurements, mechanisms
- **Scribe** - Handles symbols, chronology, funerary practices

### Inventory Items
- `stellar_disk` - Orientation/astronomy (room 0)
- `cubit_ruler` - Measurements and feedback (room 1)
- `cartouche_seal` - Respectful access (room 2)
- `water_key` - Opens shared air conduits (room 3)
- `feather_of_maat` - Truth and balance (room 4)

### Endings
- **Ma'at Ending** - Both players escape through cooperation
- **Seth Ending** - Only one escapes, ethical debrief provided

## Security

- HTTPS/TLS in production (configure with reverse proxy like nginx)
- No personal data collected
- Anonymous avatars only
- Minimal logging (errors only)
- Session cleanup after 30 minutes of inactivity

## Environment Variables

```bash
PORT=3000  # Default: 3000
```

## License

Educational project for high school students (ages 15-18)
