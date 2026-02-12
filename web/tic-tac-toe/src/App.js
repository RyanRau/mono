import React, { useState, useEffect, useRef } from "react";
import "./App.css";
import Board from "./Board";

function App() {
  const [ws, setWs] = useState(null);
  const [sessionId, setSessionId] = useState("");
  const [joined, setJoined] = useState(false);
  const [playerSymbol, setPlayerSymbol] = useState("");
  const [_playerId, setPlayerId] = useState("");
  const [gameState, setGameState] = useState({
    board: Array(9).fill(null),
    currentPlayer: "X",
    winner: null,
    gameOver: false,
    playersCount: 0,
  });
  const [error, setError] = useState("");
  const wsRef = useRef(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlSessionId = urlParams.get("session");
    if (urlSessionId) {
      setSessionId(urlSessionId);
    }
  }, []);

  const connect = (sessionToJoin) => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const websocket = new WebSocket(wsUrl);

    websocket.onopen = () => {
      console.log("Connected to server");
      websocket.send(
        JSON.stringify({
          type: "join",
          sessionId: sessionToJoin || "",
        })
      );
    };

    websocket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      console.log("Received:", message);

      switch (message.type) {
        case "joined": {
          setJoined(true);
          setPlayerSymbol(message.playerSymbol);
          setPlayerId(message.playerId);
          setSessionId(message.sessionId);
          const newUrl = `${window.location.pathname}?session=${message.sessionId}`;
          window.history.pushState({}, "", newUrl);
          setError("");
          break;
        }

        case "gameState":
          setGameState({
            board: message.board,
            currentPlayer: message.currentPlayer,
            winner: message.winner,
            gameOver: message.gameOver,
            playersCount: message.playersCount,
          });
          break;

        case "playerLeft":
          setGameState((prev) => ({
            ...prev,
            playersCount: message.playersCount,
          }));
          break;

        case "error":
          setError(message.message);
          setTimeout(() => setError(""), 3000);
          break;

        default:
          break;
      }
    };

    websocket.onerror = (error) => {
      console.error("WebSocket error:", error);
      setError("Connection error");
    };

    websocket.onclose = () => {
      console.log("Disconnected from server");
      setJoined(false);
      setWs(null);
    };

    wsRef.current = websocket;
    setWs(websocket);
  };

  const handleJoin = (e) => {
    e.preventDefault();
    connect(sessionId);
  };

  const handleMove = (position) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: "move",
          sessionId: sessionId,
          position: position,
        })
      );
    }
  };

  const handleReset = () => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: "reset",
          sessionId: sessionId,
        })
      );
    }
  };

  const copySessionLink = () => {
    const link = `${window.location.origin}${window.location.pathname}?session=${sessionId}`;
    navigator.clipboard.writeText(link);
    setError("Link copied to clipboard!");
    setTimeout(() => setError(""), 2000);
  };

  if (!joined) {
    return (
      <div className="app">
        <div className="join-container">
          <h1>Tic-Tac-Toe</h1>
          <form onSubmit={handleJoin}>
            <input
              type="text"
              placeholder="Enter session ID (or leave blank for new game)"
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              className="session-input"
            />
            <button type="submit" className="join-button">
              Join Game
            </button>
          </form>
          {error && <div className="error">{error}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="game-container">
        <div className="game-header">
          <h1>Tic-Tac-Toe</h1>
          <div className="player-info">
            <p>
              You are: <strong>{playerSymbol}</strong>
            </p>
            <p>
              Players: <strong>{gameState.playersCount}/2</strong>
            </p>
          </div>
          <div className="session-info">
            <p>Session: {sessionId}</p>
            <button onClick={copySessionLink} className="copy-button">
              Copy Link
            </button>
          </div>
        </div>

        {gameState.playersCount < 2 && (
          <div className="waiting">Waiting for opponent to join...</div>
        )}

        <Board
          board={gameState.board}
          onMove={handleMove}
          disabled={
            gameState.playersCount < 2 ||
            gameState.gameOver ||
            gameState.currentPlayer !== playerSymbol
          }
        />

        <div className="game-status">
          {gameState.gameOver ? (
            <>
              {gameState.winner === "draw" ? (
                <p className="status-text">It's a draw!</p>
              ) : (
                <p className="status-text">
                  {gameState.winner === playerSymbol ? "You win!" : "You lose!"}
                </p>
              )}
              <button onClick={handleReset} className="reset-button">
                Play Again
              </button>
            </>
          ) : (
            <p className="status-text">
              {gameState.currentPlayer === playerSymbol ? "Your turn" : "Opponent's turn"}
            </p>
          )}
        </div>

        {error && <div className="error">{error}</div>}
      </div>
    </div>
  );
}

export default App;
