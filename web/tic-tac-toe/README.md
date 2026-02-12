# Tic-Tac-Toe Multiplayer Game

A real-time multiplayer tic-tac-toe game built with React and WebSockets.

## Features

- Real-time multiplayer gameplay using WebSockets
- Session-based games - share a link to invite opponents
- Responsive design for mobile and desktop
- Automatic game state synchronization between players
- Win detection and draw handling
- Play again functionality

## How to Play

1. Visit the game URL
2. Either create a new game or enter an existing session ID
3. Share the session link with your opponent
4. Wait for your opponent to join
5. Take turns placing X's and O's
6. The game automatically detects wins and draws
7. Click "Play Again" to start a new round

## Technical Stack

- Frontend: React
- Backend: Node.js with Express
- WebSocket: ws library
- Deployment: Docker with multi-stage build

## Development

```bash
# Install dependencies
npm install

# Run client in development mode
npm run dev:client

# Run server
npm run dev:server

# Build for production
npm run build
```

## Deployment

The app is containerized and deployed as part of the mono repository's deployment pipeline.
