# TOC Simulator: Interactive DFA Engine

A browser-based, interactive **Deterministic Finite Automaton (DFA)** simulator built as a Theory of Computation assignment. Explore a library of 100+ procedurally generated automata, enter binary strings, and watch the DFA animate through its states in real time — step by step or all at once.

---

## Features

- **DFA Library** — Browse 100+ presets across 5 categories, with search and sort support
- **SVG Visualization** — Each DFA is rendered as a live state diagram with labeled transitions, self-loops, and curved arcs
- **Step-by-step Mode** — Advance through the input one character at a time
- **Auto-play Mode** — Watch the full simulation run automatically with smooth animations
- **Input Tape** — Visual tape tracks which characters have been consumed and which is currently active
- **Accept / Reject Verdict** — Clear visual feedback when the simulation ends, with state highlighting

---

## DFA Categories

| Category | Description |
|---|---|
| **Divisibility** | Binary numbers divisible by N, for N = 2 to 32 |
| **Prefix Matching** | Strings that start with a given pattern (length 1–4) |
| **Substring Matching** | Strings that contain a given pattern anywhere (length 2–4) |
| **Suffix Matching** | Strings that end with a given pattern (length 2–4) |
| **Exact Length** | Strings of exactly N characters, for N = 1 to 10 |

---

## How to Run

No build step or dependencies required — it's plain HTML, CSS, and JavaScript.

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/your-repo-name.git
   ```
2. Open `index.html` in any modern browser.

That's it.

---

## Project Structure

```
application/
├── index.html          # App shell and UI layout
├── style.css           # Dark glassmorphism theme
├── dfaGenerators.js    # Procedural DFA preset generation
└── script.js           # Simulation engine, SVG renderer, controls
```

---

## How It Works

**`dfaGenerators.js`** procedurally constructs all DFA configurations at runtime using formal automata theory:

- Divisibility DFAs use modular arithmetic — each state represents a remainder, and transitions are computed as `(2r + bit) mod N`
- Substring and suffix matching use a KMP-inspired algorithm to correctly handle overlapping patterns in transitions

**`script.js`** takes a selected DFA and:
1. Lays out states in a circle and renders them as an SVG diagram
2. Draws transitions as curved quadratic arcs (with self-loops for trap/accept states)
3. Simulates input character-by-character, animating the active state and edge on each step
4. Determines accept or reject based on whether the final state is an accept state

---

## Built With

- Vanilla JavaScript (no frameworks)
- SVG for state diagram rendering
- CSS with glassmorphism styling
- [Fira Code](https://fonts.google.com/specimen/Fira+Code) + [Outfit](https://fonts.google.com/specimen/Outfit) (Google Fonts)
