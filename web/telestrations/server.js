import express from "express";
import http from "http";
import { readFileSync } from "fs";
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

// --------------- Word List ---------------

const wordList = readFileSync(join(__dirname, "word_list.txt"), "utf-8")
  .split("\n")
  .map((w) => w.trim())
  .filter(Boolean);

function pickUniqueWords(count) {
  const shuffled = [...wordList].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

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

  // For the write round, pick unique word options so no player gets duplicates
  let wordOptions = null;
  if (type === "write") {
    const totalNeeded = lobby.playerOrder.length * 3;
    const words = pickUniqueWords(totalNeeded);
    wordOptions = {};
    lobby.playerOrder.forEach((id, i) => {
      wordOptions[id] = words.slice(i * 3, i * 3 + 3);
    });
  }

  for (const playerId of lobby.playerOrder) {
    const s = io.sockets.sockets.get(playerId);
    if (!s) continue;
    s.emit("new-round", {
      round: lobby.currentRound,
      totalRounds: lobby.totalRounds,
      type,
      prompt: promptFor(playerId, lobby.currentRound),
      wordOptions: wordOptions ? wordOptions[playerId] : undefined,
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

function advancePresenter() {
  lobby.presenterIdx++;
  // Skip disconnected presenters
  while (
    lobby.presenterIdx < lobby.revealData.length &&
    !lobby.players.has(lobby.originalPlayerOrder[lobby.presenterIdx]?.id)
  ) {
    lobby.presenterIdx++;
  }
  if (lobby.presenterIdx >= lobby.revealData.length) {
    io.emit("reveal-done");
    return;
  }
  lobby.revealEntryIdx = -1;
  io.emit("presenter-change", {
    presenterIdx: lobby.presenterIdx,
  });
}

function revealChains() {
  lobby.state = "reveal";
  const data = lobby.chains.map((chain, i) => ({
    startedBy: lobby.originalPlayerOrder[i]?.name || "Unknown",
    entries: chain.entries.map((e) => ({
      type: e.type,
      content: e.content,
      authorName: e.authorName,
    })),
  }));
  lobby.revealData = data;
  lobby.presenterIdx = 0;
  // Skip disconnected initial presenters
  while (
    lobby.presenterIdx < data.length &&
    !lobby.players.has(lobby.originalPlayerOrder[lobby.presenterIdx]?.id)
  ) {
    lobby.presenterIdx++;
  }
  if (lobby.presenterIdx >= data.length) {
    io.emit("reveal-done");
    return;
  }
  lobby.revealEntryIdx = -1;
  io.emit("reveal", {
    chains: data,
    presenterOrder: lobby.originalPlayerOrder,
    presenterIdx: lobby.presenterIdx,
  });
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
    lobby.originalPlayerOrder = lobby.playerOrder.map((id) => ({
      id,
      name: lobby.players.get(id).name,
    }));
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

    // Only the current presenter can navigate
    const currentPresenterId = lobby.originalPlayerOrder[lobby.presenterIdx]?.id;
    if (socket.id !== currentPresenterId) return;

    const chains = lobby.revealData;
    if (!chains) return;

    const chainIdx = lobby.presenterIdx;
    const chain = chains[chainIdx];

    if (direction === "next") {
      if (lobby.revealEntryIdx < chain.entries.length - 1) {
        lobby.revealEntryIdx++;
        io.emit("reveal-sync", {
          chainIdx,
          entryIdx: lobby.revealEntryIdx,
        });
      } else {
        // End of this presenter's chain — advance to next presenter
        advancePresenter();
      }
    } else if (direction === "prev") {
      if (lobby.revealEntryIdx > -1) {
        lobby.revealEntryIdx--;
        io.emit("reveal-sync", {
          chainIdx,
          entryIdx: lobby.revealEntryIdx,
        });
      }
    }
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
    } else if (lobby.state === "reveal") {
      io.emit("player-disconnected", { playerName: player.name });
      const wasPresenter =
        socket.id === lobby.originalPlayerOrder[lobby.presenterIdx]?.id;

      lobby.players.delete(socket.id);
      lobby.playerOrder = lobby.playerOrder.filter((id) => id !== socket.id);

      if (socket.id === lobby.adminId) {
        const newAdmin = lobby.playerOrder[0];
        if (newAdmin) {
          lobby.adminId = newAdmin;
          io.to(newAdmin).emit("admin-update", { isAdmin: true });
        }
      }

      if (lobby.players.size === 0) {
        lobby = null;
        return;
      }

      // If the disconnected player was the current presenter, advance
      if (wasPresenter) {
        advancePresenter();
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`Telestrations running on port ${PORT}`);
});
