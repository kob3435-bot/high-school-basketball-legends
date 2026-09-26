# HIGH SCHOOL BASKETBALL LEGENDS

A tactical high-school basketball simulation and dream-team builder that runs in the browser. You coach: you pick the lineup, bench, tactics, matchups, substitutions and timeouts. The players do the rest, possession by possession.

**Play:** https://kob3435-bot.github.io/high-school-basketball-legends/

## Modes
- **Quick Match:** pick five players, find a CPU opponent, tip off.
- **Dream Team:** build, save, edit, duplicate and delete rosters. They are saved to localStorage.
- **Tournament:** a 16-team knockout (R16 → QF → SF → Final). CPU-vs-CPU games are fully simulated.
- **Random Battle:** two random teams, simulated instantly. You can then watch the same game live.
- **Player Database:** 76 original characters. Search, filter and sort, with a detail card and radar chart.
- **Match History:** every finished game with its full box score.
- **Settings:** volume, mute, default speed and auto-sub.

## Tech
Vite + TypeScript + Preact. The simulation engine lives in `src/engine/` as pure TypeScript with no DOM access. It uses a seedable PRNG and runs headless in Node.

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm test` | Run the Vitest unit and simulation tests |
| `npm run sim` | Headless run of 1,000+ matches plus balance tests; writes `reports/sim-report.md` |
| `npm run e2e` | Run the Playwright end-to-end tests against `vite preview` |
| `BASE_URL=https://… npx playwright test` | Smoke-test the production site |
| `npm run gen:players` | Regenerate the static player database. It is deterministic. |

All characters, school names, logos, uniforms and portraits are original and procedurally generated. This is a fan-made tribute to the 90s sports-manga style.
