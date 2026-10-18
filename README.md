# Sudoku

Offline sudoku for your phone. Every puzzle is freshly generated with a unique solution, across 4 difficulty levels. It is a Progressive Web App (PWA), so once installed it works without a connection.

Live: https://kenkoshaw.github.io/sudoku/

## Features

- **Daily challenge**: one puzzle per date, the same on every device. A calendar shows the days you solved, and a 🔥 streak counts the days in a row.
- **Number row and wheel**: tap a cell, then tap a number in the row below. Each number disappears from the row once all nine are placed. Or press and hold a cell, slide towards a number in the wheel and let go. Letting go in the middle cancels.
- **Score**: points for each correct number, doubled if you place it quickly, plus bonuses for completing a row, column, box or number. The finish bonus doubles if you make no mistakes.
- **3 mistakes and you're out**, with one second chance per game.
- **Stats**: games played, win rate, best and average time, best score and win streaks, for each level.
- **Amber Walnut colours** with a light/dark toggle (sun/moon button, or System/Light/Dark in Settings). 17 trophies unlock 5 more board themes.
- **Feedback**: wave animations, confetti, optional sound effects, floating points.
- Notes, auto notes, undo and pause. Leaving the app pauses the game.
- Easy, Medium, Hard and Expert puzzles. Each one is generated on the device and has exactly one solution.

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

- `src/engine.ts`: puzzle generator and solver (accepts a seeded random function)
- `src/daily.ts`: daily puzzle seeds, streaks
- `src/game.ts`: board, input, scoring, win and game-over screens
- `src/wheel.ts`: radial number picker
- `src/progress.ts`, `src/achievements.ts`, `src/score.ts`: stats, trophies, points
- `src/themes.ts`, `src/fx.ts`: board themes, sound, confetti, toasts
- `src/screens.ts`: home, daily calendar, stats, trophies, settings
- `tests/`: generator uniqueness, daily determinism, streaks, scoring, trophies

Split out of [mindgym](https://github.com/kenkoshaw/mindgym).
