// DOM ELEMENTS: all UI elements needed to update visually
const mySideLabel = document.getElementById("mySideLabel");
const messageEl = document.getElementById("message");
const turnLabel = document.getElementById("turnLabel");

const leftTimeEl = document.getElementById("leftTime");
const rightTimeEl = document.getElementById("rightTime");
const leftScoreEl = document.getElementById("leftScore");
const rightScoreEl = document.getElementById("rightScore");

const startBtn = document.getElementById("startBtn");

const leftCanvas = document.getElementById("leftPool");
const rightCanvas = document.getElementById("rightPool");
const boardCanvas = document.getElementById("board");

const lctx = leftCanvas.getContext("2d");
const rctx = rightCanvas.getContext("2d");
const bctx = boardCanvas.getContext("2d");


//CORE GAME CONTENT
// data that defines the match
const cols = 5;
const rows = 6;
const boardCells = cols * rows;   
const totalTiles = 30;            //Board game: squares for the pieces/tiles to be placed on
const tileSize = 100;

let board = new Array(boardCells).fill(null); // each board cell stores tile index or null

// LEFT uses tiles/puzzle pieces 0–14, RIGHT uses tiles/puzzle pieces 15–29
let leftPool = Array.from({ length: 15 }, (_, i) => i);
let rightPool = Array.from({ length: 15 }, (_, i) => 15 + i);

let leftScore = 0;
let rightScore = 0;

let currentTurn = "left"; // turn-based: "left" or "right"

let leftTime = 60;
let rightTime = 60;

let gameOver = false;
let winner = null;

let timerRunning = false; // timer only runs after pressing Start Game
let selectedTileIndex = null; // which tile is selected for placing

// multiplayer
let mySide = null; // "left", "right", or "spectator"
let playerNumber = null;


//IMAGE LOADING: first load all tile images for the game, 
// then after the game finishesm final picture should be shown, which is the puzzle's original picture
const imageSources = Array.from(
  { length: totalTiles },
  (_, i) => `images/pic${i + 1}.png` //all the pictures from 1 to 30
);

const images = new Array(totalTiles);
let imagesLoaded = 0;

// final “completed puzzle” image
const finalImg = new Image();
finalImg.src = "images/final.png";

// starts game only when all tiles AND final image are loaded to be shown during the game
finalImg.onload = () => {
  if (imagesLoaded === imageSources.length) {
    initGame();
    drawAll();
  }
};

// load tile images
imageSources.forEach((src, index) => {
  const img = new Image();
  img.src = src;
  img.onload = () => {
    imagesLoaded++;
    if (imagesLoaded === imageSources.length && finalImg.complete) {
      initGame();
      drawAll();
    }
  };
  images[index] = img;
});


//WEBSOCKET SETUP: assigning sides

const playerId = Math.random().toString(36).slice(2);
const ws = new WebSocket("wss://puzzlegame-0m5l.onrender.com");

// Telling the server player(s) joined (so it can count players)
ws.onopen = () => {
  ws.send(JSON.stringify({ type: "join", id: playerId }));
};

// Receive messages from server
ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);

  // Another player's state update
  if (msg.type === "state" && msg.id !== playerId) {
    applyStateFromMessage(msg);
    return;
  }

  // Server reports how many connections exist
  if (msg.type === "playerCount") {
    playerNumber = msg.count;
    assignSideIfNeeded();
    updateStartButtonUI();
  }
};

//AUTO ASSIGNING SIDES:
// 1st player is LEFT
// 2nd player is RIGHT
// Others are spectators, who are only with "watch-only modes", so it won't affect the game and logic of the game
function assignSideIfNeeded() {
  if (mySide !== null) return;

  if (playerNumber === 1) {
    mySide = "left";
    mySideLabel.textContent = "left";
    messageEl.textContent = "You are LEFT. Waiting for second player...";
  } else if (playerNumber === 2) {
    mySide = "right";
    mySideLabel.textContent = "right";
    messageEl.textContent = "You are RIGHT. You need to move right pieces.";
  } else {
    mySide = "spectator";
    mySideLabel.textContent = "spec";
    messageEl.textContent = "You are a spectator.";
  }
}


//START GAME BUTTON, and timer begins only after pressing it
 
startBtn.addEventListener("click", () => {
  // If statement for identifying if it's a player or not, 
  // since only actual players can start (not spectators)
  if (mySide !== "left" && mySide !== "right") return;
  if (timerRunning || gameOver) return;

  timerRunning = true;
  messageEl.textContent = "Game started! LEFT player's turn.";

  updateStartButtonUI();
  broadcastState();
});

// Enable or disable “Start Game” button based on game status
function updateStartButtonUI() {
  const isPlayer = mySide === "left" || mySide === "right";

  // Disabled when: not a player, game over, game already started, or only 1 player connected
  if (!isPlayer || gameOver || timerRunning || playerNumber < 2) {
    startBtn.disabled = true;
  } else {
    startBtn.disabled = false;
  }
}


//BROADCAST GAME STATE TO OTHER CLIENTS

function broadcastState() {
  if (ws.readyState !== WebSocket.OPEN) return;

  ws.send(
    JSON.stringify({
      type: "state",
      id: playerId,

      board,
      leftPool,
      rightPool,
      leftScore,
      rightScore,
      currentTurn,
      leftTime,
      rightTime,
      gameOver,
      winner,
      timerRunning,
    })
  );
}


//INITIALIZE or RESET GAME STATE

function initGame() {
  // reset board and pools
  board = new Array(boardCells).fill(null);
  leftPool = Array.from({ length: 15 }, (_, i) => i);
  rightPool = Array.from({ length: 15 }, (_, i) => 15 + i);

  leftScore = 0;
  rightScore = 0;
  currentTurn = "left";

  leftTime = 60;
  rightTime = 60;

  timerRunning = false;
  gameOver = false;
  winner = null;
  selectedTileIndex = null;

  messageEl.textContent =
    "Connect two players, then press Start Game to begin.";

  updateInfo();
  updateStartButtonUI();
}


//DRAWING FUNCTIONS such as board, left pool and right pool with canvas

function drawBoard() {
  bctx.clearRect(0, 0, boardCanvas.width, boardCanvas.height);

  for (let pos = 0; pos < boardCells; pos++) {
    const col = pos % cols;
    const row = Math.floor(pos / cols);
    const x = col * tileSize;
    const y = row * tileSize;
    const tileIndex = board[pos];

    // Empty cell
    if (tileIndex === null) {
      bctx.fillStyle = "#333";
      bctx.fillRect(x, y, tileSize, tileSize);
    } else {
      // Draw tile image
      bctx.drawImage(images[tileIndex], x, y, tileSize, tileSize);
    }

    // Cell border
    bctx.strokeStyle = "#444";
    bctx.strokeRect(x, y, tileSize, tileSize);
  }
}

function drawPool(ctx, poolArray) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  const tileH = 60;
  const tileW = ctx.canvas.width - 20;

  poolArray.forEach((tileIndex, i) => {
    const x = 10;
    const y = 10 + i * (tileH + 5);

    ctx.drawImage(images[tileIndex], x, y, tileW, tileH);

    // Highlight selected tile
    if (tileIndex === selectedTileIndex) {
      ctx.strokeStyle = "yellow";
      ctx.lineWidth = 3;
      ctx.strokeRect(x + 2, y + 2, tileW - 4, tileH - 4);
    } else {
      ctx.strokeStyle = "#555";
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, tileW, tileH);
    }
  });
}

function drawAll() {
  drawBoard();
  drawPool(lctx, leftPool);
  drawPool(rctx, rightPool);
}


//Updated Info 

function updateInfo() {
  leftScoreEl.textContent = leftScore;
  rightScoreEl.textContent = rightScore;
  leftTimeEl.textContent = leftTime;
  rightTimeEl.textContent = rightTime;
  turnLabel.textContent = currentTurn;
}

function isBoardFull() {
  return board.every((cell) => cell !== null);
}

// Winner rules:
// 1. Higher score wins
// 2. If score tied - more remaining time wins
// 3. If both tied - tie
function evaluateWinner() {
  if (leftScore > rightScore) return "left";
  if (rightScore > leftScore) return "right";

  if (leftTime > rightTime) return "left";
  if (rightTime > leftTime) return "right";

  return "tie"; // perfect tie
}

// Draw final original picture and text on top
function showFinalImage(winnerSide) {
  if (!finalImg.complete) return;

  bctx.clearRect(0, 0, boardCanvas.width, boardCanvas.height);
  bctx.drawImage(finalImg, 0, 0, boardCanvas.width, boardCanvas.height);

  // Black background line behind text 
  bctx.fillStyle = "rgba(0,0,0,0.7)";
  bctx.fillRect(0, boardCanvas.height - 60, boardCanvas.width, 60);

  bctx.fillStyle = "#fff";
  bctx.font = "24px sans-serif";
  bctx.textAlign = "center";

  let text =
    winnerSide === "left"
      ? "Winner: LEFT player 🎉"
      : winnerSide === "right"
      ? "Winner: RIGHT player 🎉"
      : "It's a tie! 🤝";

  bctx.fillText(text, boardCanvas.width / 2, boardCanvas.height - 25);
}


//TIMER: runs every second if game started
setInterval(() => {
  if (!timerRunning || gameOver) return;

  // Only decrease current player's time, if right goes, then right's timer, if left, then left's
  if (currentTurn === "left") leftTime = Math.max(0, leftTime - 1);
  else rightTime = Math.max(0, rightTime - 1);

  updateInfo();

  // End game if someone runs out of time
  if (leftTime === 0 || rightTime === 0) {
    gameOver = true;
    timerRunning = false;

  //Evaluate the winner and give the win
    winner = evaluateWinner();

    if (winner === "tie") {
      messageEl.textContent = "Game over: tie (same score and same time left).";
    } else {
      messageEl.textContent = "Game over: " + winner.toUpperCase() + " wins.";
    }

    showFinalImage(winner);
    updateStartButtonUI();
    broadcastState();
  }
}, 1000);


//STATE SYNC: apply other player's state to this client
 
function applyStateFromMessage(msg) {
  board = msg.board;
  leftPool = msg.leftPool;
  rightPool = msg.rightPool;
  leftScore = msg.leftScore;
  rightScore = msg.rightScore;
  currentTurn = msg.currentTurn;
  leftTime = msg.leftTime;
  rightTime = msg.rightTime;
  gameOver = msg.gameOver;
  winner = msg.winner;
  timerRunning = msg.timerRunning;

  selectedTileIndex = null;

  updateInfo();
  drawAll();

  if (gameOver && winner) {
    showFinalImage(winner);
  }

  updateStartButtonUI();
}


//INPUT HANDLERS: selecting tiles and placing tiles
 
// LEFT pool click
leftCanvas.addEventListener("click", (e) => {
  if (mySide !== "left") return;
  if (!timerRunning || gameOver) return;
  if (currentTurn !== "left") return;

  const rect = leftCanvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  const tileH = 60;
  const tileW = leftCanvas.width - 20;

  leftPool.forEach((tileIndex, i) => {
    const px = 10;
    const py = 10 + i * (tileH + 5);

    if (x >= px && x <= px + tileW && y >= py && y <= py + tileH) {
      selectedTileIndex = tileIndex;
      drawAll();
    }
  });
});

// RIGHT pool click
rightCanvas.addEventListener("click", (e) => {
  if (mySide !== "right") return;
  if (!timerRunning || gameOver) return;
  if (currentTurn !== "right") return;

  const rect = rightCanvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  const tileH = 60;
  const tileW = rightCanvas.width - 20;

  rightPool.forEach((tileIndex, i) => {
    const px = 10;
    const py = 10 + i * (tileH + 5);

    if (x >= px && x <= px + tileW && y >= py && y <= py + tileH) {
      selectedTileIndex = tileIndex;
      drawAll();
    }
  });
});

// BOARD click — place tile
boardCanvas.addEventListener("click", (e) => {
  if (!timerRunning || gameOver) return;
  if (mySide !== currentTurn) return;
  if (selectedTileIndex === null) return;

  const rect = boardCanvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  const col = Math.floor(x / tileSize);
  const row = Math.floor(y / tileSize);
  const pos = row * cols + col;

  if (pos < 0 || pos >= boardCells) return;

  // Cell is taken, hence cannot place here
  if (board[pos] !== null) {
    messageEl.textContent = "Cell already filled.";
    return;
  }

  // Place tile
  board[pos] = selectedTileIndex;

  // Remove from right/left pool and give +1 score
  if (mySide === "left") {
    leftPool = leftPool.filter((t) => t !== selectedTileIndex);
    leftScore++;
  } else {
    rightPool = rightPool.filter((t) => t !== selectedTileIndex);
    rightScore++;
  }

  selectedTileIndex = null;

  // Check win condition: FULL BOARD
  if (isBoardFull()) {
    gameOver = true;
    timerRunning = false;

    winner = evaluateWinner();

    if (winner === "tie") {
      messageEl.textContent = "Game over: tie (same score and same time left).";
    } else {
      messageEl.textContent = "Game over: " + winner.toUpperCase() + " wins.";
    }

    updateInfo();
    drawAll();
    showFinalImage(winner);
    updateStartButtonUI();
    broadcastState();
    return;
  }

  // Switch turns
  currentTurn = currentTurn === "left" ? "right" : "left";

  updateInfo();
  drawAll();
  broadcastState();
});
