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

## Production build

```bash
npm run build
npm run preview
```

## Publish on GitHub Pages

The repository includes a GitHub Actions workflow at `.github/workflows/deploy.yml`.
In GitHub, open **Settings → Pages** and set **Build and deployment → Source** to **GitHub Actions**.
Every push to `main` will then build and deploy the site.

After a successful deployment, the site URL is:
https://quizmaster0987-ai.github.io/Chess/

The computer opponent uses a small material-and-position evaluation with a depth-two minimax search. It is designed as a friendly casual opponent rather than a tournament-strength engine.
