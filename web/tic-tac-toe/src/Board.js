import React from "react";
import "./Board.css";

function Square({ value, onClick, disabled }) {
  return (
    <button
      className={`square ${value ? "filled" : ""}`}
      onClick={onClick}
      disabled={disabled || value !== null}
    >
      {value}
    </button>
  );
}

function Board({ board, onMove, disabled }) {
  return (
    <div className="board">
      {board.map((value, index) => (
        <Square key={index} value={value} onClick={() => onMove(index)} disabled={disabled} />
      ))}
    </div>
  );
}

export default Board;
