import express from "express";
import http from "http";
import { Server } from "socket.io";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 80;

app.use(express.static(join(__dirname, "public")));

// --------------- Game State ---------------

let lobby = null;

function createLobby(socket, playerName) {
  lobby = {
    players: new Map(),
    playerOrder: [],
    adminId: socket.id,
    state: "waiting",
    chains: [],
    currentRound: 0,
    totalRounds: 0,
    submitted: new Set(),
  };
  addPlayer(socket, playerName);
}

function addPlayer(socket, playerName) {
  lobby.players.set(socket.id, { id: socket.id, name: playerName });
  lobby.playerOrder.push(socket.id);
}

function lobbyInfo() {
  return {
    players: lobby.playerOrder.map((id) => ({
      id,
      name: lobby.players.get(id).name,
      isAdmin: id === lobby.adminId,
    })),
    adminId: lobby.adminId,
    state: lobby.state,
  };
}

function roundType(round) {
  if (round === 0) return "write";
  return round % 2 === 1 ? "draw" : "guess";
}

function chainIndexFor(playerId, round) {
  const idx = lobby.playerOrder.indexOf(playerId);
  const n = lobby.playerOrder.length;
  return (((idx - round) % n) + n) % n;
}

function promptFor(playerId, round) {
  if (round === 0) return null;
  const chain = lobby.chains[chainIndexFor(playerId, round)];
  const last = chain.entries[chain.entries.length - 1];
  return { type: last.type, content: last.content, authorName: last.authorName };
}

function startRound() {
  lobby.submitted.clear();
  const type = roundType(lobby.currentRound);

  for (const playerId of lobby.playerOrder) {
    const s = io.sockets.sockets.get(playerId);
    if (!s) continue;
    s.emit("new-round", {
      round: lobby.currentRound,
      totalRounds: lobby.totalRounds,
      type,
      prompt: promptFor(playerId, lobby.currentRound),
    });
  }

  io.emit("round-progress", { submitted: 0, total: lobby.playerOrder.length });
}

function handleSubmission(socketId, content) {
  if (!lobby || lobby.state !== "playing") return;
  if (lobby.submitted.has(socketId)) return;

  const type = roundType(lobby.currentRound);
  const entryType = type === "write" ? "word" : type === "draw" ? "drawing" : "guess";
  const chain = lobby.chains[chainIndexFor(socketId, lobby.currentRound)];
  const player = lobby.players.get(socketId);

  chain.entries.push({
    type: entryType,
    content,
    authorId: socketId,
    authorName: player.name,
  });

  lobby.submitted.add(socketId);
  io.emit("round-progress", {
    submitted: lobby.submitted.size,
    total: lobby.playerOrder.length,
  });

  if (lobby.submitted.size === lobby.playerOrder.length) {
    lobby.currentRound++;
    if (lobby.currentRound >= lobby.totalRounds) {
      revealChains();
    } else {
      startRound();
    }
  }
}

function revealChains() {
  lobby.state = "reveal";
  const data = lobby.chains.map((chain, i) => ({
    startedBy: lobby.players.get(lobby.playerOrder[i])?.name || "Unknown",
    entries: chain.entries.map((e) => ({
      type: e.type,
      content: e.content,
      authorName: e.authorName,
    })),
  }));
  lobby.revealData = data;
  lobby.revealChainIdx = 0;
  lobby.revealEntryIdx = -1;
  io.emit("reveal", { chains: data });
}

// --------------- Socket Events ---------------

io.on("connection", (socket) => {
  socket.emit("lobby-status", {
    exists: lobby !== null && lobby.state === "waiting",
    inGame: lobby !== null && lobby.state === "playing",
  });

  socket.on("create-lobby", ({ playerName }) => {
    if (lobby && lobby.state !== "reveal") {
      socket.emit("error-msg", { message: "A lobby already exists. Join it instead." });
      return;
    }
    createLobby(socket, playerName);
    socket.emit("lobby-joined", { isAdmin: true });
    io.emit("lobby-update", lobbyInfo());
  });

  socket.on("join-lobby", ({ playerName }) => {
    if (!lobby || lobby.state !== "waiting") {
      socket.emit("error-msg", {
        message:
          lobby?.state === "playing"
            ? "A game is already in progress."
            : "No lobby exists. Create one first.",
      });
      return;
    }
    for (const [, p] of lobby.players) {
      if (p.name.toLowerCase() === playerName.toLowerCase()) {
        socket.emit("error-msg", { message: "That name is already taken." });
        return;
      }
    }
    addPlayer(socket, playerName);
    socket.emit("lobby-joined", { isAdmin: false });
    io.emit("lobby-update", lobbyInfo());
  });

  socket.on("start-game", () => {
    if (!lobby || lobby.state !== "waiting") return;
    if (socket.id !== lobby.adminId) return;
    if (lobby.playerOrder.length < 3) {
      socket.emit("error-msg", { message: "Need at least 3 players to start." });
      return;
    }
    lobby.state = "playing";
    lobby.totalRounds = lobby.playerOrder.length;
    lobby.currentRound = 0;
    lobby.chains = lobby.playerOrder.map(() => ({ entries: [] }));
    io.emit("game-started");
    startRound();
  });

  socket.on("submit-word", ({ word }) => {
    handleSubmission(socket.id, word);
  });

  socket.on("submit-drawing", ({ imageData }) => {
    handleSubmission(socket.id, imageData);
  });

  socket.on("reveal-navigate", ({ direction }) => {
    if (!lobby || lobby.state !== "reveal") return;
    if (socket.id !== lobby.adminId) return;

    const chains = lobby.revealData;
    if (!chains) return;

    if (direction === "next") {
      const chain = chains[lobby.revealChainIdx];
      const atEnd =
        lobby.revealChainIdx === chains.length - 1 &&
        lobby.revealEntryIdx === chain.entries.length - 1;
      if (atEnd) {
        io.emit("reveal-done");
        return;
      }
      if (lobby.revealEntryIdx < chain.entries.length - 1) {
        lobby.revealEntryIdx++;
      } else if (lobby.revealChainIdx < chains.length - 1) {
        lobby.revealChainIdx++;
        lobby.revealEntryIdx = -1;
      }
    } else if (direction === "prev") {
      if (lobby.revealEntryIdx > -1) {
        lobby.revealEntryIdx--;
      } else if (lobby.revealChainIdx > 0) {
        lobby.revealChainIdx--;
        lobby.revealEntryIdx = chains[lobby.revealChainIdx].entries.length - 1;
      }
    }

    io.emit("reveal-sync", {
      chainIdx: lobby.revealChainIdx,
      entryIdx: lobby.revealEntryIdx,
    });
  });

  socket.on("play-again", () => {
    if (!lobby) return;
    if (socket.id !== lobby.adminId) return;
    lobby.state = "waiting";
    lobby.chains = [];
    lobby.currentRound = 0;
    lobby.totalRounds = 0;
    lobby.submitted.clear();
    io.emit("back-to-lobby");
    io.emit("lobby-update", lobbyInfo());
  });

  socket.on("disconnect", () => {
    if (!lobby) return;
    const player = lobby.players.get(socket.id);
    if (!player) return;

    if (lobby.state === "waiting") {
      lobby.players.delete(socket.id);
      lobby.playerOrder = lobby.playerOrder.filter((id) => id !== socket.id);
      if (socket.id === lobby.adminId) {
        lobby = null;
        io.emit("lobby-destroyed");
      } else if (lobby.playerOrder.length === 0) {
        lobby = null;
      } else {
        io.emit("lobby-update", lobbyInfo());
      }
    } else if (lobby.state === "playing") {
      io.emit("player-disconnected", { playerName: player.name });

      // Auto-submit a placeholder for disconnected player if they haven't submitted
      if (!lobby.submitted.has(socket.id)) {
        const type = roundType(lobby.currentRound);
        const entryType = type === "write" ? "word" : type === "draw" ? "drawing" : "guess";
        const chain = lobby.chains[chainIndexFor(socket.id, lobby.currentRound)];
        chain.entries.push({
          type: entryType,
          content: entryType === "drawing" ? "" : "(player disconnected)",
          authorId: socket.id,
          authorName: player.name,
        });
        lobby.submitted.add(socket.id);
      }

      // Remove from active players
      lobby.players.delete(socket.id);
      lobby.playerOrder = lobby.playerOrder.filter((id) => id !== socket.id);

      if (socket.id === lobby.adminId && lobby.playerOrder.length > 0) {
        lobby.adminId = lobby.playerOrder[0];
      }

      if (lobby.playerOrder.length < 2) {
        lobby = null;
        io.emit("lobby-destroyed");
        return;
      }

      // Recalculate total rounds
      lobby.totalRounds = Math.min(
        lobby.totalRounds,
        lobby.currentRound + lobby.playerOrder.length
      );

      io.emit("round-progress", {
        submitted: lobby.submitted.size,
        total: lobby.playerOrder.length + 1, // +1 because we already removed the player
      });

      // Check if round is now complete
      const remaining = lobby.playerOrder.filter((id) => !lobby.submitted.has(id));
      if (remaining.length === 0) {
        lobby.currentRound++;
        if (lobby.currentRound >= lobby.totalRounds) {
          revealChains();
        } else {
          startRound();
        }
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`Telestrations running on port ${PORT}`);
});
