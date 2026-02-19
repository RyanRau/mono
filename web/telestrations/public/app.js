/* eslint-disable no-undef */
// ==================== Socket ====================
const socket = io();

// ==================== State ====================
let isAdmin = false;
let myName = "";
let revealData = null;
let revealChainIdx = 0;
let revealEntryIdx = 0;
let revealMode = "live"; // "live" = host-controlled, "browse" = free browsing from summary
let browseChainIdx = 0;
let browseEntryIdx = 0;
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
  const fabMenuEl = $(ids.fabMenu);
  const fabToggleEl = $(ids.fabToggle);

  function openFab() {
    fabMenuEl.classList.add("open");
  }
  function closeFab() {
    fabMenuEl.classList.remove("open");
  }
  function toggleFab() {
    fabMenuEl.classList.toggle("open");
  }
  function openPopup() {
    popupEl.hidden = false;
    closeFab();
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

  // -- FAB toggle --
  fabToggleEl.addEventListener("click", toggleFab);

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
      closeFab();
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
    closeFab();
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
    closeFab();
  });

  updDot();

  return { selectPen: selPen, closePopup, closeFab, openFab, updateDot: updDot };
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
    fabMenu: "fab-menu",
    fabToggle: "fab-toggle",
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
    fabMenu: "sbx-fab-menu",
    fabToggle: "sbx-fab-toggle",
  },
  () => sandboxCanvas
);

$("btn-sandbox").addEventListener("click", () => {
  sandboxCanvas = new DrawingCanvas($("sandbox-canvas"));
  sbxTools.selectPen();
  sbxTools.closePopup();
  sbxTools.closeFab();
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

// -- Render a single entry into the given DOM elements --
function renderRevealEntry(chainIdx, entryIdx, titleEl, entryEl, authorEl, counterEl) {
  const chain = revealData[chainIdx];
  const totalEntries = chain.entries.length;

  if (entryIdx < 0) {
    titleEl.textContent = `Chain ${chainIdx + 1} of ${revealData.length}`;
    entryEl.innerHTML = `<div class="reveal-word">Started by ${esc(chain.startedBy)}</div>`;
    authorEl.textContent = "";
    counterEl.textContent = "";
  } else {
    const entry = chain.entries[entryIdx];
    titleEl.textContent = `Chain ${chainIdx + 1} of ${revealData.length}`;
    authorEl.textContent = `by ${entry.authorName}`;
    counterEl.textContent = `${entryIdx + 1} / ${totalEntries}`;

    if (entry.type === "drawing") {
      if (entry.content) {
        entryEl.innerHTML = `<div class="reveal-img-wrap"><img class="reveal-img" src="${entry.content}" alt="drawing" /></div>`;
      } else {
        entryEl.innerHTML = `<div class="reveal-word">(no drawing)</div>`;
      }
    } else {
      entryEl.innerHTML = `<div class="reveal-word">${esc(entry.content)}</div>`;
    }
  }
}

// -- Show reveal screen (host-controlled live mode) --
function showReveal(data) {
  revealData = data.chains;
  revealChainIdx = 0;
  revealEntryIdx = -1;
  revealMode = "live";
  showScreen("reveal");
  showRevealCard();
  updateRevealLive();
}

function showRevealCard() {
  $("reveal-card").hidden = false;
  $("reveal-summary").hidden = true;

  if (revealMode === "live") {
    $("reveal-nav").hidden = !isAdmin;
    $("reveal-host-msg").hidden = isAdmin;
    $("btn-back-to-summary").hidden = true;
  } else {
    $("reveal-nav").hidden = false;
    $("reveal-host-msg").hidden = true;
    $("btn-back-to-summary").hidden = false;
  }
}

function updateRevealLive() {
  renderRevealEntry(
    revealChainIdx,
    revealEntryIdx,
    $("reveal-title"),
    $("reveal-entry"),
    $("reveal-author"),
    $("reveal-counter")
  );

  const chain = revealData[revealChainIdx];
  const isFirst = revealChainIdx === 0 && revealEntryIdx <= -1;
  const isLast =
    revealChainIdx === revealData.length - 1 && revealEntryIdx === chain.entries.length - 1;

  $("btn-reveal-prev").disabled = isFirst;
  $("btn-reveal-next").textContent = isLast ? "Done" : "Next";
}

// -- Host nav buttons (emit to server instead of navigating locally) --
$("btn-reveal-next").addEventListener("click", () => {
  if (revealMode === "live") {
    socket.emit("reveal-navigate", { direction: "next" });
  } else {
    // Browse mode: local navigation
    const chain = revealData[browseChainIdx];
    if (browseEntryIdx < chain.entries.length - 1) {
      browseEntryIdx++;
    } else {
      // At end of this chain, go back to summary
      showSummary();
      return;
    }
    updateBrowse();
  }
});

$("btn-reveal-prev").addEventListener("click", () => {
  if (revealMode === "live") {
    socket.emit("reveal-navigate", { direction: "prev" });
  } else {
    // Browse mode: local navigation
    if (browseEntryIdx > -1) {
      browseEntryIdx--;
    }
    updateBrowse();
  }
});

// -- Summary table --
function showSummary() {
  $("reveal-card").hidden = true;
  $("reveal-summary").hidden = false;
  $("btn-play-again").hidden = !isAdmin;
  $("reveal-wait").hidden = isAdmin;
  $("chain-list").hidden = !isAdmin;

  const list = $("chain-list");
  list.innerHTML = "";
  revealData.forEach((chain, i) => {
    const firstWord = chain.entries[0]?.content || "";
    const lastEntry = chain.entries[chain.entries.length - 1];
    const lastWord = lastEntry?.type !== "drawing" ? lastEntry?.content || "" : "";

    const item = document.createElement("div");
    item.className = "chain-item";
    item.innerHTML = `
      <div class="chain-item-info">
        <span class="chain-item-name">${esc(chain.startedBy)}'s chain</span>
        <span class="chain-item-detail">${esc(firstWord)}${lastWord && lastWord !== firstWord ? " → " + esc(lastWord) : ""}</span>
      </div>
      <div class="chain-item-actions">
        <button class="chain-export-btn" title="Save as image">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        </button>
        <span class="chain-item-arrow">›</span>
      </div>`;
    item.querySelector(".chain-export-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      exportChain(i);
    });
    item.addEventListener("click", () => openBrowse(i));
    list.appendChild(item);
  });
}

// -- Export chain as vertical image --
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function loadImg(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function wrapText(ctx, text, maxW) {
  const words = text.split(" ");
  const lines = [];
  let line = "";
  for (const word of words) {
    const test = line ? line + " " + word : word;
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

async function exportChain(chainIdx) {
  const chain = revealData[chainIdx];
  const W = 540;
  const PAD = 20;
  const CW = W - PAD * 2; // content width
  const ENTRY_GAP = 12;
  const TITLE_FONT = "bold 22px system-ui, -apple-system, sans-serif";
  const WORD_FONT = "bold 22px system-ui, -apple-system, sans-serif";
  const AUTHOR_FONT = "13px system-ui, -apple-system, sans-serif";
  const WORD_PAD = 20;
  const LINE_H = 28;

  // Pre-load drawing images
  const images = await Promise.all(
    chain.entries.map((e) =>
      e.type === "drawing" && e.content ? loadImg(e.content) : Promise.resolve(null)
    )
  );

  // Measure text to calculate total height
  const measure = document.createElement("canvas").getContext("2d");
  let totalH = PAD + 36; // top padding + title
  for (const entry of chain.entries) {
    if (entry.type === "drawing") {
      totalH += CW;
    } else {
      measure.font = WORD_FONT;
      const lines = wrapText(measure, entry.content, CW - WORD_PAD * 2);
      totalH += lines.length * LINE_H + WORD_PAD * 2;
    }
    totalH += 22 + ENTRY_GAP; // author + gap
  }
  totalH += PAD;

  // Render
  const cvs = document.createElement("canvas");
  cvs.width = W;
  cvs.height = totalH;
  const ctx = cvs.getContext("2d");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, totalH);

  let y = PAD;
  ctx.fillStyle = "#2d3436";
  ctx.font = TITLE_FONT;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText(`${chain.startedBy}'s chain`, W / 2, y);
  y += 36;

  for (let i = 0; i < chain.entries.length; i++) {
    const entry = chain.entries[i];

    if (entry.type === "drawing") {
      if (images[i]) {
        ctx.save();
        roundRect(ctx, PAD, y, CW, CW, 8);
        ctx.clip();
        ctx.drawImage(images[i], PAD, y, CW, CW);
        ctx.restore();
        ctx.strokeStyle = "#dfe6e9";
        ctx.lineWidth = 2;
        roundRect(ctx, PAD, y, CW, CW, 8);
        ctx.stroke();
      }
      y += CW;
    } else {
      ctx.font = WORD_FONT;
      const lines = wrapText(ctx, entry.content, CW - WORD_PAD * 2);
      const boxH = lines.length * LINE_H + WORD_PAD * 2;

      ctx.fillStyle = "#f0edff";
      roundRect(ctx, PAD, y, CW, boxH, 12);
      ctx.fill();

      ctx.fillStyle = "#2d3436";
      ctx.font = WORD_FONT;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      let ty = y + WORD_PAD;
      for (const line of lines) {
        ctx.fillText(line, W / 2, ty);
        ty += LINE_H;
      }
      y += boxH;
    }

    ctx.fillStyle = "#b2bec3";
    ctx.font = AUTHOR_FONT;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(`by ${entry.authorName}`, W / 2, y + 4);
    y += 22 + ENTRY_GAP;
  }

  cvs.toBlob((blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${chain.startedBy}-chain.png`;
    a.click();
    URL.revokeObjectURL(url);
  });
}

// -- Browse a single chain from the summary --
function openBrowse(chainIdx) {
  revealMode = "browse";
  browseChainIdx = chainIdx;
  browseEntryIdx = -1;
  showRevealCard();
  updateBrowse();
}

function updateBrowse() {
  renderRevealEntry(
    browseChainIdx,
    browseEntryIdx,
    $("reveal-title"),
    $("reveal-entry"),
    $("reveal-author"),
    $("reveal-counter")
  );

  const chain = revealData[browseChainIdx];
  const isFirst = browseEntryIdx <= -1;
  const isLast = browseEntryIdx === chain.entries.length - 1;

  $("btn-reveal-prev").disabled = isFirst;
  $("btn-reveal-next").textContent = isLast ? "Done" : "Next";
}

$("btn-back-to-summary").addEventListener("click", () => {
  showSummary();
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
    gameTools.closeFab();
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

socket.on("reveal-sync", (data) => {
  revealChainIdx = data.chainIdx;
  revealEntryIdx = data.entryIdx;
  updateRevealLive();
});

socket.on("reveal-done", () => {
  showSummary();
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
