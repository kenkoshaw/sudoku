# Sudoku

Offline sudoku for your phone. Every puzzle is freshly generated with a unique solution, across 4 difficulty levels. It is a Progressive Web App (PWA), so once installed it works without a connection.

Live: https://kenkoshaw.github.io/sudoku/

## Features

- Easy, Medium, Hard and Expert puzzles, generated on the device
- Notes, Undo, Erase and Hint
- Highlights for the selected row, column, box and matching numbers
- Wave animations when you complete a row, column, box, number or puzzle
- Progress and best times saved on the device

## Install on your phone

1. Open the live link in Safari (iPhone) or Chrome (Android).
2. iPhone: tap **Share → Add to Home Screen**. Android: tap **⋮ → Install app**.
3. Open it once while online. After that it works offline.

## Develop

```bash
npm install
npm run dev      # local dev server
npm test         # unit tests (vitest)
npm run build    # type-check and build to dist/
```

Pushing to `main` runs tests, builds, and deploys to GitHub Pages.

## Layout

- `src/engine.ts`: puzzle generator and solver
- `src/game.ts`: board UI, input, animations
- `tests/engine.test.ts`: checks every generated puzzle has exactly one solution

Split out of [mindgym](https://github.com/kenkoshaw/mindgym).
