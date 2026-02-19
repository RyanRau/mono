/* eslint-disable no-undef */
// ==================== Socket ====================
const socket = io();

// ==================== State ====================
let isAdmin = false;
let myName = "";
let revealData = null;
let revealChainIdx = 0;
let revealEntryIdx = 0;
let canvas = null;

// ==================== DOM Refs ====================
const $ = (id) => document.getElementById(id);

const screens = {
  landing: $("screen-landing"),
  lobby: $("screen-lobby"),
  write: $("screen-write"),
  draw: $("screen-draw"),
  guess: $("screen-guess"),
  waiting: $("screen-waiting"),
  reveal: $("screen-reveal"),
  sandbox: $("screen-sandbox"),
};

// ==================== Screen Management ====================
function showScreen(name) {
  Object.values(screens).forEach((s) => s.classList.remove("active"));
  screens[name].classList.add("active");
}

// ==================== Toast ====================
let toastTimer = null;
function showToast(msg) {
  const t = $("toast");
  t.textContent = msg;
  t.hidden = false;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    t.classList.remove("show");
    setTimeout(() => {
      t.hidden = true;
    }, 300);
  }, 3000);
}

// ==================== Landing ====================
$("btn-create").addEventListener("click", () => {
  const name = $("name-input").value.trim();
  if (!name) return showErr("Enter your name");
  clearErr();
  myName = name;
  socket.emit("create-lobby", { playerName: name });
});

$("btn-join").addEventListener("click", () => {
  const name = $("name-input").value.trim();
  if (!name) return showErr("Enter your name");
  clearErr();
  myName = name;
  socket.emit("join-lobby", { playerName: name });
});

$("name-input").addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    const joinBtn = $("btn-join");
    if (!joinBtn.hidden) joinBtn.click();
    else $("btn-create").click();
  }
});

function showErr(msg) {
  const el = $("error-msg");
  el.textContent = msg;
  el.hidden = false;
}

function clearErr() {
  $("error-msg").hidden = true;
}

// ==================== Lobby ====================
function updateLobby(data) {
  const list = $("player-list");
  list.innerHTML = "";
  data.players.forEach((p) => {
    const li = document.createElement("li");
    let html = `<span>${esc(p.name)}</span>`;
    if (p.name === myName) html += `<span class="you-badge">you</span>`;
    if (p.isAdmin) html += `<span class="admin-badge">HOST</span>`;
    li.innerHTML = html;
    list.appendChild(li);
  });
  $("lobby-count").textContent =
    `${data.players.length} player${data.players.length !== 1 ? "s" : ""} in lobby`;

  if (isAdmin) {
    $("btn-start").hidden = false;
    $("btn-start").disabled = data.players.length < 3;
    $("lobby-wait").hidden = true;
  } else {
    $("btn-start").hidden = true;
    $("lobby-wait").hidden = false;
  }
}

$("btn-start").addEventListener("click", () => {
  socket.emit("start-game");
});

// ==================== Write ====================
$("btn-submit-word").addEventListener("click", () => {
  const word = $("word-input").value.trim();
  if (!word) return;
  $("btn-submit-word").disabled = true;
  socket.emit("submit-word", { word });
  showScreen("waiting");
});

$("word-input").addEventListener("keydown", (e) => {
  if (e.key === "Enter") $("btn-submit-word").click();
});

// ==================== Draw ====================
const COLORS = [
  "#000000",
  "#d63031",
  "#e17055",
  "#fdcb6e",
  "#00b894",
  "#0984e3",
  "#6c5ce7",
  "#e84393",
  "#ffffff",
];

const CANVAS_SIZE = 500;

class DrawingCanvas {
  constructor(el) {
    this.el = el;
    this.ctx = el.getContext("2d");
    this.strokes = [];
    this.current = null;
    this.drawing = false;
    this.color = "#000000";
    this.lineWidth = 6;
    this.erasing = false;

    el.width = CANVAS_SIZE;
    el.height = CANVAS_SIZE;
    this.clearCanvas();
    this.bind();
  }

  bind() {
    this.el.addEventListener("mousedown", (e) => this.start(this.pos(e)));
    this.el.addEventListener("mousemove", (e) => this.move(this.pos(e)));
    this.el.addEventListener("mouseup", () => this.end());
    this.el.addEventListener("mouseleave", () => this.end());
    this.el.addEventListener("touchstart", (e) => {
      e.preventDefault();
      this.start(this.touchPos(e));
    });
    this.el.addEventListener("touchmove", (e) => {
      e.preventDefault();
      this.move(this.touchPos(e));
    });
    this.el.addEventListener("touchend", (e) => {
      e.preventDefault();
      this.end();
    });
  }

  pos(e) {
    const r = this.el.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * CANVAS_SIZE,
      y: ((e.clientY - r.top) / r.height) * CANVAS_SIZE,
    };
  }

  touchPos(e) {
    const t = e.touches[0];
    return this.pos(t);
  }

  start(p) {
    this.drawing = true;
    this.current = {
      color: this.erasing ? "#ffffff" : this.color,
      width: this.erasing ? 24 : this.lineWidth,
      points: [p],
    };
    // Draw a dot for single taps
    this.ctx.fillStyle = this.current.color;
    this.ctx.beginPath();
    this.ctx.arc(p.x, p.y, this.current.width / 2, 0, Math.PI * 2);
    this.ctx.fill();
  }

  move(p) {
    if (!this.drawing || !this.current) return;
    this.current.points.push(p);
    const pts = this.current.points;
    const a = pts[pts.length - 2];
    const b = pts[pts.length - 1];
    this.ctx.beginPath();
    this.ctx.strokeStyle = this.current.color;
    this.ctx.lineWidth = this.current.width;
    this.ctx.lineCap = "round";
    this.ctx.lineJoin = "round";
    this.ctx.moveTo(a.x, a.y);
    this.ctx.lineTo(b.x, b.y);
    this.ctx.stroke();
  }

  end() {
    if (this.current) {
      this.strokes.push(this.current);
      this.current = null;
    }
    this.drawing = false;
  }

  undo() {
    if (this.strokes.length === 0) return;
    this.strokes.pop();
    this.redraw();
  }

  redraw() {
    this.clearCanvas();
    for (const stroke of this.strokes) {
      this.drawStroke(stroke);
    }
  }

  drawStroke(s) {
    this.ctx.strokeStyle = s.color;
    this.ctx.fillStyle = s.color;
    this.ctx.lineWidth = s.width;
    this.ctx.lineCap = "round";
    this.ctx.lineJoin = "round";
    if (s.points.length === 1) {
      this.ctx.beginPath();
      this.ctx.arc(s.points[0].x, s.points[0].y, s.width / 2, 0, Math.PI * 2);
      this.ctx.fill();
      return;
    }
    this.ctx.beginPath();
    this.ctx.moveTo(s.points[0].x, s.points[0].y);
    for (let i = 1; i < s.points.length; i++) {
      this.ctx.lineTo(s.points[i].x, s.points[i].y);
    }
    this.ctx.stroke();
  }

  clearCanvas() {
    this.ctx.fillStyle = "#ffffff";
    this.ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  }

  clearAll() {
    this.strokes = [];
    this.clearCanvas();
  }

  toDataURL() {
    return this.el.toDataURL("image/png");
  }
}

// ==================== Drawing Toolbar Setup ====================
// Reusable tool wiring for both game draw screen and sandbox.
// `ids` maps logical names to actual DOM element IDs.

function setupDrawTools(ids, getCanvas) {
  let holdTimer = null;

  const penBtn = $(ids.pen);
  const eraserBtn = $(ids.eraser);
  const popupEl = $(ids.popup);
  const pickerEl = $(ids.picker);
  const dotEl = $(ids.dot);

  function openPopup() {
    popupEl.hidden = false;
  }
  function closePopup() {
    popupEl.hidden = true;
  }
  function selPen() {
    penBtn.classList.add("active");
    eraserBtn.classList.remove("active");
    const cv = getCanvas();
    if (cv) cv.erasing = false;
  }
  function updDot() {
    const cv = getCanvas();
    if (cv) dotEl.style.background = cv.color;
  }

  // -- Pen: tap = select, long-press = popup --
  function down() {
    clearTimeout(holdTimer);
    holdTimer = setTimeout(() => {
      holdTimer = null;
      openPopup();
    }, 400);
  }
  function up() {
    if (holdTimer !== null) {
      clearTimeout(holdTimer);
      holdTimer = null;
      selPen();
    }
  }
  function cancel() {
    clearTimeout(holdTimer);
    holdTimer = null;
  }

  penBtn.addEventListener("mousedown", down);
  penBtn.addEventListener("mouseup", up);
  penBtn.addEventListener("mouseleave", cancel);
  penBtn.addEventListener("touchstart", (e) => {
    e.preventDefault();
    down();
  });
  penBtn.addEventListener("touchend", (e) => {
    e.preventDefault();
    up();
  });
  penBtn.addEventListener("touchcancel", cancel);

  // -- Popup backdrop --
  popupEl.addEventListener("click", (e) => {
    if (e.target === popupEl) closePopup();
  });

  // -- Colors --
  pickerEl.innerHTML = "";
  COLORS.forEach((c) => {
    const swatch = document.createElement("div");
    swatch.className = "color-swatch" + (c === "#000000" ? " active" : "");
    swatch.style.background = c;
    if (c === "#ffffff") swatch.style.border = "3px solid var(--border)";
    swatch.addEventListener("click", () => {
      pickerEl.querySelectorAll(".color-swatch").forEach((s) => s.classList.remove("active"));
      swatch.classList.add("active");
      const cv = getCanvas();
      if (cv) {
        cv.color = c;
        cv.erasing = false;
      }
      updDot();
      selPen();
      closePopup();
    });
    pickerEl.appendChild(swatch);
  });

  // -- Sizes (scoped to the popup) --
  popupEl.querySelectorAll(".size-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      popupEl.querySelectorAll(".size-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      const cv = getCanvas();
      if (cv) cv.lineWidth = parseInt(btn.dataset.size, 10);
    });
  });

  // -- Eraser --
  $(ids.eraser).addEventListener("click", () => {
    eraserBtn.classList.add("active");
    penBtn.classList.remove("active");
    const cv = getCanvas();
    if (cv) cv.erasing = true;
  });

  // -- Undo --
  $(ids.undo).addEventListener("click", () => {
    const cv = getCanvas();
    if (cv) cv.undo();
  });

  // -- Clear --
  $(ids.clear).addEventListener("click", () => {
    const cv = getCanvas();
    if (cv) cv.clearAll();
  });

  updDot();

  return { selectPen: selPen, closePopup, updateDot: updDot };
}

// Wire up game draw tools
const gameTools = setupDrawTools(
  {
    pen: "btn-pen",
    eraser: "btn-eraser",
    undo: "btn-undo",
    clear: "btn-clear",
    popup: "pen-popup",
    picker: "color-picker",
    dot: "pen-color-dot",
  },
  () => canvas
);

const selectPen = gameTools.selectPen;
const closePenPopup = gameTools.closePopup;

// ==================== Sandbox (draw-only mode) ====================
let sandboxCanvas = null;

const sbxTools = setupDrawTools(
  {
    pen: "sbx-btn-pen",
    eraser: "sbx-btn-eraser",
    undo: "sbx-btn-undo",
    clear: "sbx-btn-clear",
    popup: "sbx-pen-popup",
    picker: "sbx-color-picker",
    dot: "sbx-pen-color-dot",
  },
  () => sandboxCanvas
);

$("btn-sandbox").addEventListener("click", () => {
  sandboxCanvas = new DrawingCanvas($("sandbox-canvas"));
  sbxTools.selectPen();
  sbxTools.closePopup();
  sbxTools.updateDot();
  showScreen("sandbox");
});

$("btn-sandbox-back").addEventListener("click", () => {
  showScreen("landing");
});

$("btn-submit-drawing").addEventListener("click", () => {
  if (!canvas) return;
  $("btn-submit-drawing").disabled = true;
  socket.emit("submit-drawing", { imageData: canvas.toDataURL() });
  showScreen("waiting");
});

// ==================== Guess ====================
$("btn-submit-guess").addEventListener("click", () => {
  const guess = $("guess-input").value.trim();
  if (!guess) return;
  $("btn-submit-guess").disabled = true;
  socket.emit("submit-word", { word: guess });
  showScreen("waiting");
});

$("guess-input").addEventListener("keydown", (e) => {
  if (e.key === "Enter") $("btn-submit-guess").click();
});

// ==================== Reveal ====================
function showReveal(data) {
  revealData = data.chains;
  revealChainIdx = 0;
  revealEntryIdx = -1; // start at -1 so first "next" shows entry 0
  showScreen("reveal");
  updateReveal();

  $("btn-play-again").hidden = !isAdmin;
  $("reveal-wait").hidden = isAdmin;
}

function updateReveal() {
  const chain = revealData[revealChainIdx];
  const totalEntries = chain.entries.length;

  if (revealEntryIdx < 0) {
    // Show chain intro
    $("reveal-title").textContent = `Chain ${revealChainIdx + 1} of ${revealData.length}`;
    $("reveal-entry").innerHTML =
      `<div class="reveal-word">Started by ${esc(chain.startedBy)}</div>`;
    $("reveal-author").textContent = "Tap Next to begin";
    $("reveal-counter").textContent = "";
  } else {
    const entry = chain.entries[revealEntryIdx];
    $("reveal-title").textContent = `Chain ${revealChainIdx + 1} of ${revealData.length}`;
    $("reveal-author").textContent = `by ${entry.authorName}`;
    $("reveal-counter").textContent = `${revealEntryIdx + 1} / ${totalEntries}`;

    if (entry.type === "drawing") {
      if (entry.content) {
        $("reveal-entry").innerHTML =
          `<div class="reveal-img-wrap"><img class="reveal-img" src="${entry.content}" alt="drawing" /></div>`;
      } else {
        $("reveal-entry").innerHTML = `<div class="reveal-word">(no drawing)</div>`;
      }
    } else {
      $("reveal-entry").innerHTML = `<div class="reveal-word">${esc(entry.content)}</div>`;
    }
  }

  const isFirst = revealChainIdx === 0 && revealEntryIdx <= -1;
  const isLast = revealChainIdx === revealData.length - 1 && revealEntryIdx === totalEntries - 1;

  $("btn-reveal-prev").disabled = isFirst;
  $("btn-reveal-next").textContent = isLast ? "Done" : "Next";
}

$("btn-reveal-next").addEventListener("click", () => {
  const chain = revealData[revealChainIdx];
  if (revealEntryIdx < chain.entries.length - 1) {
    revealEntryIdx++;
  } else if (revealChainIdx < revealData.length - 1) {
    revealChainIdx++;
    revealEntryIdx = -1;
  }
  updateReveal();
});

$("btn-reveal-prev").addEventListener("click", () => {
  if (revealEntryIdx > -1) {
    revealEntryIdx--;
  } else if (revealChainIdx > 0) {
    revealChainIdx--;
    revealEntryIdx = revealData[revealChainIdx].entries.length - 1;
  }
  updateReveal();
});

$("btn-play-again").addEventListener("click", () => {
  socket.emit("play-again");
});

// ==================== Socket Events ====================
socket.on("lobby-status", (data) => {
  if (data.exists) {
    $("btn-join").hidden = false;
    $("btn-create").hidden = true;
    $("status-msg").textContent = "A lobby is waiting for players";
  } else if (data.inGame) {
    $("btn-join").hidden = true;
    $("btn-create").hidden = true;
    $("status-msg").textContent = "A game is in progress. Please wait.";
  } else {
    $("btn-join").hidden = true;
    $("btn-create").hidden = false;
    $("status-msg").textContent = "";
  }
});

socket.on("lobby-joined", (data) => {
  isAdmin = data.isAdmin;
  showScreen("lobby");
});

socket.on("lobby-update", (data) => {
  updateLobby(data);
});

socket.on("error-msg", (data) => {
  showErr(data.message);
});

socket.on("game-started", () => {
  // Round will come next
});

socket.on("new-round", (data) => {
  if (data.type === "write") {
    $("write-round-badge").textContent = `Round ${data.round + 1} of ${data.totalRounds}`;
    $("write-heading").textContent = "Write a word or phrase";
    $("word-input").value = "";
    $("btn-submit-word").disabled = false;
    showScreen("write");
    $("word-input").focus();
  } else if (data.type === "draw") {
    $("draw-round-badge").textContent = `Round ${data.round + 1} of ${data.totalRounds}`;
    $("draw-word").textContent = data.prompt ? data.prompt.content : "";
    canvas = new DrawingCanvas($("draw-canvas"));
    $("btn-submit-drawing").disabled = false;
    selectPen();
    closePenPopup();
    gameTools.updateDot();
    showScreen("draw");
  } else if (data.type === "guess") {
    $("guess-round-badge").textContent = `Round ${data.round + 1} of ${data.totalRounds}`;
    if (data.prompt && data.prompt.content) {
      $("guess-image").src = data.prompt.content;
    } else {
      $("guess-image").src = "";
    }
    $("guess-input").value = "";
    $("btn-submit-guess").disabled = false;
    showScreen("guess");
    $("guess-input").focus();
  }
});

socket.on("round-progress", (data) => {
  $("progress-text").textContent = `${data.submitted} of ${data.total} submitted`;
});

socket.on("reveal", (data) => {
  showReveal(data);
});

socket.on("back-to-lobby", () => {
  showScreen("lobby");
});

socket.on("lobby-destroyed", () => {
  showToast("Lobby was closed");
  showScreen("landing");
  resetLanding();
});

socket.on("player-disconnected", (data) => {
  showToast(`${data.playerName} disconnected`);
});

socket.on("disconnect", () => {
  showToast("Connection lost. Reconnecting...");
});

socket.on("connect", () => {
  // If reconnecting, request lobby status
  if (myName) {
    showToast("Reconnected");
  }
});

// ==================== Helpers ====================
function esc(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function resetLanding() {
  $("name-input").value = "";
  $("btn-create").hidden = false;
  $("btn-join").hidden = true;
  $("status-msg").textContent = "";
  clearErr();
  isAdmin = false;
  myName = "";
}

// ==================== Init ====================
// Draw tools are initialized via setupDrawTools() above.
