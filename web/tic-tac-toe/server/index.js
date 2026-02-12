const express = require('express');
const { WebSocketServer } = require('ws');
const path = require('path');
const http = require('http');

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

const PORT = process.env.PORT || 3000;

// Serve static files from React build
app.use(express.static(path.join(__dirname, '../build')));

// Game state storage
const games = new Map();
const clients = new Map();

function createGame(sessionId) {
  return {
    id: sessionId,
    board: Array(9).fill(null),
    players: [],
    currentPlayer: 'X',
    winner: null,
    gameOver: false,
  };
}

function checkWinner(board) {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
    [0, 4, 8], [2, 4, 6] // diagonals
  ];

  for (const [a, b, c] of lines) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }

  if (board.every(cell => cell !== null)) {
    return 'draw';
  }

  return null;
}

function broadcastToGame(sessionId, message) {
  const game = games.get(sessionId);
  if (!game) return;

  game.players.forEach(playerId => {
    const client = clients.get(playerId);
    if (client && client.readyState === 1) {
      client.send(JSON.stringify(message));
    }
  });
}

wss.on('connection', (ws) => {
  const clientId = Math.random().toString(36).substr(2, 9);
  clients.set(clientId, ws);

  console.log(`Client ${clientId} connected`);

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);

      switch (message.type) {
        case 'join':
          handleJoin(clientId, message.sessionId, ws);
          break;

        case 'move':
          handleMove(clientId, message.sessionId, message.position);
          break;

        case 'reset':
          handleReset(clientId, message.sessionId);
          break;
      }
    } catch (error) {
      console.error('Error processing message:', error);
      ws.send(JSON.stringify({ type: 'error', message: error.message }));
    }
  });

  ws.on('close', () => {
    console.log(`Client ${clientId} disconnected`);
    handleDisconnect(clientId);
    clients.delete(clientId);
  });
});

function handleJoin(clientId, sessionId, ws) {
  if (!sessionId) {
    sessionId = Math.random().toString(36).substr(2, 9);
  }

  let game = games.get(sessionId);

  if (!game) {
    game = createGame(sessionId);
    games.set(sessionId, game);
  }

  if (game.players.length >= 2 && !game.players.includes(clientId)) {
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Game is full'
    }));
    return;
  }

  if (!game.players.includes(clientId)) {
    game.players.push(clientId);
  }

  const playerSymbol = game.players.indexOf(clientId) === 0 ? 'X' : 'O';

  ws.send(JSON.stringify({
    type: 'joined',
    sessionId: sessionId,
    playerSymbol: playerSymbol,
    playerId: clientId
  }));

  broadcastToGame(sessionId, {
    type: 'gameState',
    board: game.board,
    currentPlayer: game.currentPlayer,
    winner: game.winner,
    gameOver: game.gameOver,
    playersCount: game.players.length
  });
}

function handleMove(clientId, sessionId, position) {
  const game = games.get(sessionId);

  if (!game) {
    return;
  }

  const playerIndex = game.players.indexOf(clientId);
  if (playerIndex === -1) {
    return;
  }

  const playerSymbol = playerIndex === 0 ? 'X' : 'O';

  if (game.gameOver) {
    broadcastToGame(sessionId, {
      type: 'error',
      message: 'Game is over'
    });
    return;
  }

  if (playerSymbol !== game.currentPlayer) {
    clients.get(clientId).send(JSON.stringify({
      type: 'error',
      message: 'Not your turn'
    }));
    return;
  }

  if (game.board[position] !== null) {
    clients.get(clientId).send(JSON.stringify({
      type: 'error',
      message: 'Position already taken'
    }));
    return;
  }

  game.board[position] = playerSymbol;
  game.currentPlayer = playerSymbol === 'X' ? 'O' : 'X';

  const winner = checkWinner(game.board);
  if (winner) {
    game.winner = winner;
    game.gameOver = true;
  }

  broadcastToGame(sessionId, {
    type: 'gameState',
    board: game.board,
    currentPlayer: game.currentPlayer,
    winner: game.winner,
    gameOver: game.gameOver,
    playersCount: game.players.length
  });
}

function handleReset(clientId, sessionId) {
  const game = games.get(sessionId);

  if (!game || !game.players.includes(clientId)) {
    return;
  }

  game.board = Array(9).fill(null);
  game.currentPlayer = 'X';
  game.winner = null;
  game.gameOver = false;

  broadcastToGame(sessionId, {
    type: 'gameState',
    board: game.board,
    currentPlayer: game.currentPlayer,
    winner: game.winner,
    gameOver: game.gameOver,
    playersCount: game.players.length
  });
}

function handleDisconnect(clientId) {
  games.forEach((game, sessionId) => {
    if (game.players.includes(clientId)) {
      game.players = game.players.filter(id => id !== clientId);

      if (game.players.length === 0) {
        games.delete(sessionId);
      } else {
        broadcastToGame(sessionId, {
          type: 'playerLeft',
          playersCount: game.players.length
        });
      }
    }
  });
}

// Serve index.html for all routes (SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../build/index.html'));
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
