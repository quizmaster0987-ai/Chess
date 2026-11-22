# Chess / 3D

A browser-based 3D chess game built with React, Three.js, Vite and chess.js.

## Features

- Interactive 3D chessboard with orbit, zoom and touch-friendly controls
- Sculpted 3D chess pieces, board lighting and shadows
- Two-player local mode
- Play against a built-in minimax computer opponent
- Legal move validation through chess.js
- Check, checkmate, stalemate and draw detection
- Castling, en passant and pawn promotion
- Move history, undo, board flip and sound toggle
- Responsive desktop and mobile layout

## Run locally

```bash
npm install
npm run dev
```

Open the local URL printed by Vite.

## Production build

```bash
npm run build
npm run preview
```

The computer opponent uses a small material-and-position evaluation with a depth-two minimax search. It is designed as a friendly casual opponent rather than a tournament-strength engine.
