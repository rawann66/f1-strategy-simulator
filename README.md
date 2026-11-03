# F1 Strategy & Tyre Degradation Simulator

A browser front-end for `f1Simulator.cpp`'s data and lap-time model.

## Folder structure
```
index.html          markup
style.css            styling (black/red telemetry theme)
script.js             loads data, runs the simulation, animates the graph
data/
  drivers.txt         same file f1Simulator.cpp reads
  teams.txt
  circuits.txt
  pitstrategy.txt
assets/
  drivers/*.jpg        22 driver photos
  cars/*.jpg            11 team livery photos
f1Simulator.cpp       your original C++ source, for reference
```

## Running it
Browsers block `fetch()` on files opened directly from disk (`file://`), so this
needs a tiny local server — don't just double-click `index.html`.

- **VS Code**: install the "Live Server" extension, right-click `index.html` →
  "Open with Live Server".
- **Any terminal**: `python3 -m http.server 8000` from this folder, then open
  `http://localhost:8000`.

## What was fixed in this version
- The tyre-degradation graph previously drew Hard/Medium/Soft as three fixed
  reference curves regardless of what you picked. It now plots the real,
  lap-by-lap time of your actual selected driver + strategy, colored only by
  the compound that strategy actually uses.
- Strategies in `pitstrategy.txt` that end on a long Soft stint at a
  high-lap circuit (e.g. "M,S,30" at Monaco) genuinely finish near the back —
  Soft degrades 18x faster per lap than Hard in the formula, so a 40+ lap
  stint on it compounds into a huge time loss versus the AI's low-wear
  Medium→Hard default. That's the degradation formula working as written in
  `f1Simulator.cpp`, not a bug — the dropdown now flags those strategies with
  a ⚠ so it's not a surprise.
- The Drivers Standing table now scrolls inside a fixed-height panel instead
  of stretching the whole page on long driver lists.

## Data flow
`script.js` fetches the four `.txt` files from `data/`, parses them exactly
like `uploadDrivers`, `uploadteams`, `uploadCircuits` and `uploadStrategy` do
in the C++ source, and runs the same per-lap formula as the working single-
driver loop in `main()`:

```
lapTime = circuit.baseLapTime + team.base + tyre.initDelta
        + (wearCounter * tyre.baseDegRate * driver.tireSkill)
totalLapTime += lapTime + pitStopLoss   // pitStopLoss = circuit.BasePitStop + team.avgPit, once per stop
```

AI opponents use the same Medium→Hard-at-half-distance default as
`allSimulation()`. If you add drivers/teams/circuits/strategies to the `.txt`
files, the page picks them up automatically — no code changes needed.
