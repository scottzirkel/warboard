# Companion App Architecture

This document describes the architecture for building companion applications that integrate with Army Tracker, such as spectator scoreboards and game tracking displays.

## Overview

Army Tracker uses a **shared user system** with **Server-Sent Events (SSE)** for real-time communication. Companion apps can authenticate users via the same Google SSO system and receive real-time game updates through the SSE infrastructure.

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Shared Database                               │
│  ┌─────────┐  ┌──────────┐  ┌──────────┐  ┌────────────────────┐   │
│  │  Users  │  │ Sessions │  │ Accounts │  │       Lists        │   │
│  └─────────┘  └──────────┘  └──────────┘  └────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
        │                          │                    │
        │                          │                    │
        ▼                          ▼                    ▼
┌───────────────┐          ┌───────────────┐    ┌───────────────┐
│  Army Tracker │          │   Scoreboard  │    │ Future Apps   │
│  (Main App)   │          │  Companion    │    │               │
│               │          │               │    │               │
│  - List Build │  ──SSE──▶│  - Display    │    │  - Stats      │
│  - Play Mode  │          │  - Spectate   │    │  - History    │
│  - Broadcast  │          │  - Read-only  │    │  - Analytics  │
└───────────────┘          └───────────────┘    └───────────────┘
```

## Shared Authentication Strategy

All companion apps share the same authentication system via NextAuth.js with Google OAuth.

### Database Schema

The user system uses these tables (defined in `prisma/schema.prisma`):

```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String?
  emailVerified DateTime?
  image         String?
  googleId      String?   @unique
  createdAt     DateTime  @default(now())

  accounts Account[]
  sessions Session[]
  lists    List[]
}

model Account {
  // OAuth provider connections (Google, etc.)
  // Managed by NextAuth adapter
}

model Session {
  // Active user sessions
  // Shared across all apps using same database
}

model List {
  id        String   @id @default(cuid())
  userId    String
  name      String
  armyId    String
  data      String   // JSON army list data
  createdAt DateTime
  updatedAt DateTime
}
```

### Authentication Configuration

All companion apps should use the same NextAuth configuration pattern:

```typescript
// lib/auth.ts
import GoogleProvider from 'next-auth/providers/google';
import { PrismaAdapter } from '@auth/prisma-adapter';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
};
```

### Shared Auth Requirements

1. **Same Database**: All apps must connect to the same database instance
2. **Same OAuth Credentials**: Use the same Google OAuth app (or configure as additional redirect URIs)
3. **Session Sharing**: Users logged into one app are authenticated in all apps

## Real-time Data Flow

### Server-Sent Events Architecture

Army Tracker broadcasts game state changes via SSE. Companion apps subscribe to receive updates.

```
┌─────────────────┐     POST /api/realtime/broadcast
│  Army Tracker   │────────────────────────────────────┐
│  (Play Mode)    │                                    │
└─────────────────┘                                    ▼
                                              ┌────────────────┐
                                              │  SSE Service   │
                                              │  (In-Memory)   │
                                              └────────────────┘
                                                    │
                      GET /api/realtime?sessionId=xxx
                              │                     │
        ┌───────────────────────────────────────────┼───────────────┐
        │                     │                     │               │
        ▼                     ▼                     ▼               ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐  ┌───────────────┐
│  Scoreboard   │    │  Scoreboard   │    │ Stats Tracker │  │   Display     │
│  Instance 1   │    │  Instance 2   │    │               │  │   Board       │
└───────────────┘    └───────────────┘    └───────────────┘  └───────────────┘
```

### Event Types

The following events are broadcast from Army Tracker:

| Event | Payload | Description |
|-------|---------|-------------|
| `connected` | `{ sessionId, timestamp }` | Connection established |
| `heartbeat` | `{ timestamp }` | Keep-alive (every 30s) |
| `game:state` | `{ gameState, listName, armyId }` | Full game state snapshot |
| `game:round` | `{ battleRound }` | Battle round changed (1-5) |
| `game:cp` | `{ commandPoints }` | Command points updated |
| `game:stratagem` | `{ stratagemId, active }` | Stratagem toggled |
| `game:katah` | `{ katah }` | Ka'tah stance changed |
| `list:loaded` | `{ list }` | Army list loaded |
| `unit:wounds` | `{ unitIndex, currentWounds, leaderCurrentWounds, unit }` | Unit damage updated |
| `unit:destroyed` | `{ unitIndex, unitName }` | Unit destroyed |

### Event Payload Types

Full TypeScript types are defined in `src/types/realtime.ts`:

```typescript
export interface GameStatePayload {
  gameState: GameState;
  listName: string;
  armyId: string;
}

export interface UnitWoundsPayload {
  unitIndex: number;
  currentWounds: number | null;
  leaderCurrentWounds: number | null;
  unit: ListUnit;
}

// ... see src/types/realtime.ts for complete definitions
```

### Client-Side Hook

Use the `useRealtime` hook to subscribe to events:

```typescript
import { useRealtime } from '@/hooks/useRealtime';

function ScoreboardDisplay({ gameSessionId }: { gameSessionId: string }) {
  const { status, lastEvent, sessionId } = useRealtime({
    gameSessionId,
    enabled: true,
    onConnect: (id) => console.log('Connected:', id),
    onDisconnect: () => console.log('Disconnected'),
    onError: (err) => console.error('Error:', err),
  });

  useEffect(() => {
    if (lastEvent?.type === 'game:round') {
      // Handle round change
    }
  }, [lastEvent]);

  return (
    <div>
      <p>Status: {status}</p>
      <p>Session: {sessionId}</p>
    </div>
  );
}
```

### Hook Features

- **Automatic Reconnection**: Exponential backoff up to 30 seconds
- **Tab Visibility**: Reconnects when tab becomes visible again
- **Heartbeat Monitoring**: Detects stale connections
- **Type-Safe Events**: Full TypeScript support for all event types

## Companion App Examples

### 1. Spectator Scoreboard

A read-only display showing game state for spectators.

**Features:**
- Display current battle round
- Show command points for both players
- List army units with wound status
- Show active stratagems

**Implementation:**

```typescript
// pages/scoreboard/[sessionId].tsx
'use client';

import { useRealtime } from '@/hooks/useRealtime';
import { useState, useEffect } from 'react';

export default function Scoreboard({ params }: { params: { sessionId: string } }) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [listName, setListName] = useState<string>('');

  const { status, lastEvent } = useRealtime({
    gameSessionId: params.sessionId,
    enabled: true,
  });

  useEffect(() => {
    if (!lastEvent) return;

    switch (lastEvent.type) {
      case 'game:state':
        setGameState(lastEvent.payload.gameState);
        setListName(lastEvent.payload.listName);
        break;
      case 'game:round':
        setGameState(prev => prev ? { ...prev, battleRound: lastEvent.payload.battleRound } : null);
        break;
      case 'game:cp':
        setGameState(prev => prev ? { ...prev, commandPoints: lastEvent.payload.commandPoints } : null);
        break;
      // Handle other events...
    }
  }, [lastEvent]);

  if (status === 'connecting') return <div>Connecting...</div>;
  if (status === 'disconnected') return <div>Disconnected</div>;
  if (!gameState) return <div>Waiting for game data...</div>;

  return (
    <div>
      <h1>{listName}</h1>
      <p>Round: {gameState.battleRound}</p>
      <p>CP: {gameState.commandPoints}</p>
      {/* Render units, stratagems, etc. */}
    </div>
  );
}
```

### 2. Game Tracker (Two-Player)

A full-featured companion for tracking games between two players.

**Additional Features:**
- Track both players' armies
- Dice rolling integration
- Turn timer
- Game history/replay

**Architecture Extension:**

```typescript
// Extended event types for two-player games
interface TwoPlayerGameState {
  player1: {
    userId: string;
    listId: string;
    gameState: GameState;
  };
  player2: {
    userId: string;
    listId: string;
    gameState: GameState;
  };
  currentPlayer: 1 | 2;
  turnTimer: number;
}
```

### 3. Tournament Scoreboard

For tournament organizers showing multiple games.

**Features:**
- Grid display of active games
- Aggregate statistics
- Match results tracking

**Multi-Session Subscription:**

```typescript
function TournamentBoard({ gameSessions }: { gameSessions: string[] }) {
  // Subscribe to multiple game sessions
  const connections = gameSessions.map(sessionId =>
    useRealtime({ gameSessionId: sessionId, enabled: true })
  );

  // Aggregate and display...
}
```

## API Endpoints

### SSE Connection

```
GET /api/realtime?sessionId={gameSessionId}

Headers:
  - Cookie: next-auth.session-token (required)

Response: text/event-stream

Events:
  data: {"type":"connected","payload":{"sessionId":"...","timestamp":1234567890}}\n\n
  data: {"type":"heartbeat","payload":{"timestamp":1234567890}}\n\n
  data: {"type":"game:round","payload":{"battleRound":2}}\n\n
```

### Broadcast Event

```
POST /api/realtime/broadcast

Headers:
  - Cookie: next-auth.session-token (required)
  - Content-Type: application/json

Body:
{
  "gameSessionId": "game_xxx_xxx",
  "type": "game:round",
  "payload": { "battleRound": 2 }
}

Response:
{
  "success": true,
  "sentCount": 5,
  "subscriberCount": 5
}
```

## Deployment Considerations

### Single Server

Current implementation uses in-memory subscriber storage, suitable for single-server deployment.

```
┌─────────────────────────────────────────┐
│              Single Server              │
│  ┌─────────────────────────────────┐   │
│  │   In-Memory Subscriber Store    │   │
│  └─────────────────────────────────┘   │
│             │                           │
│             ▼                           │
│  ┌──────────────────────────────────┐  │
│  │        SQLite Database           │  │
│  │  (Users, Sessions, Lists)        │  │
│  └──────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

### Multi-Server (Future)

For horizontal scaling, replace in-memory storage with Redis pub/sub:

```
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│  Server 1   │  │  Server 2   │  │  Server 3   │
└─────────────┘  └─────────────┘  └─────────────┘
        │                │                │
        └────────────────┼────────────────┘
                         │
                         ▼
              ┌─────────────────────┐
              │    Redis Pub/Sub    │
              │   (Event Broker)    │
              └─────────────────────┘
                         │
                         ▼
              ┌─────────────────────┐
              │  PostgreSQL/MySQL   │
              │    (Shared DB)      │
              └─────────────────────┘
```

### Environment Variables

Companion apps need these environment variables:

```env
# Database (same as main app)
DATABASE_URL="file:./dev.db"  # or PostgreSQL URL for production

# NextAuth
NEXTAUTH_URL="https://scoreboard.example.com"
NEXTAUTH_SECRET="your-secret-key"

# Google OAuth (same credentials, add redirect URI)
GOOGLE_CLIENT_ID="your-client-id"
GOOGLE_CLIENT_SECRET="your-client-secret"

# Main App URL (for SSE connection)
ARMY_TRACKER_URL="https://army-tracker.example.com"
```

## Security Considerations

1. **Authentication Required**: All SSE endpoints require valid session
2. **User Scoping**: Users can only access their own lists
3. **Session Validation**: Sessions expire and must be refreshed
4. **CORS**: Configure appropriate CORS headers for cross-origin companion apps

## Development Workflow

### Starting a New Companion App

1. **Clone the shared database schema**
   ```bash
   cp -r army-tracker/prisma companion-app/prisma
   ```

2. **Install dependencies**
   ```bash
   npm install next-auth @auth/prisma-adapter @prisma/client
   ```

3. **Configure environment**
   - Use same `DATABASE_URL`
   - Use same Google OAuth credentials
   - Set unique `NEXTAUTH_URL`

4. **Implement SSE subscription**
   - Copy `src/hooks/useRealtime.ts`
   - Copy `src/types/realtime.ts`

5. **Build UI for your use case**

### Testing Real-time Events

1. Start Army Tracker
2. Log in and create/load a list
3. Enter Play Mode
4. Open companion app in another window
5. Subscribe to the game session
6. Changes in Army Tracker appear in real-time

## Future Enhancements

### Planned Features

1. **Game Rooms**: Named sessions with join codes
2. **Spectator Mode**: Public games anyone can watch
3. **Game History**: Persist and replay game events
4. **Push Notifications**: Mobile alerts for game events
5. **Multi-Player**: Native support for 2+ player games

### API Extensions

```typescript
// Future endpoints
POST /api/games              // Create game room
GET  /api/games/:id          // Get game details
POST /api/games/:id/join     // Join as player/spectator
GET  /api/games/:id/history  // Get event history
```

## Summary

The companion app architecture provides:

- **Shared Users**: Single sign-on across all apps via Google OAuth
- **Real-time Updates**: SSE infrastructure for live game state
- **Type Safety**: Full TypeScript types for all events
- **Scalable Foundation**: Ready for multi-server deployment with Redis
- **Flexible Integration**: Easy to build new companion experiences

For questions or contributions, refer to the main CLAUDE.md file.
