# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Pharmy is a pharmacology flashcard and quiz app for nursing students. No build tools, no dependencies, no framework — plain HTML/CSS/JS.

**To run:** Open `index.html` directly in a browser. No server required.

## File Structure

| File | Responsibility |
|---|---|
| `index.html` | HTML shell (~37 lines) — meta, body markup, `<link>` + `<script>` tags |
| `style.css` | All CSS: variables, layout, component styles |
| `database.js` | All data: `PHARMA_CARDS` → `CARDS`, `PHARMA_QUIZ` → `QUIZ_QUESTIONS`, `CATS` |
| `app.js` | All logic: state, localStorage, render functions, audio system, init |

**Load order matters:** `database.js` must load before `app.js` (already set in `index.html`). Both files use global scope — no `import`/`export`.

## Architecture

### Data Schemas

**CARDS entry:**
```js
{
  id: string,           // unique, e.g. "r6", "c2"
  cat: string,          // one of CATS values
  title: string,
  subtitle: string,
  generics: string[],
  trades: string[],
  drugClass: string,
  suffix: string,       // drug class suffix/prefix hint, e.g. "Suffix: -TEROL"
  mechanism: string,
  uses: string[],
  sideEffects: string[],
  patientEd: string[],
  nursing: string[],
  mnemonic: string,
  clinical?: string,    // optional additional clinical notes (HTML string)
}
```

**QUIZ_QUESTIONS entry:**
```js
{
  cat: string,          // matches CATS
  q: string,            // question text
  opts: string[],       // 4 answer choices
  correct: string,      // must exactly match one of opts
  explain: string,      // shown after answering
  sc?: 1,               // marks as "Sick Call" question
}
```

**Categories** (`CATS` array, line 258):
`["All", "Sick Call", "Basics", "Respiratory", "Immune", "GI", "CNS", "Cardiovascular"]`

### State & Persistence

**Runtime state** (`state` object):
- `cat`: active category filter
- `cardIndex`: current flashcard index within filtered set
- `flipped`: whether answer side is showing
- `mode`: `'flash'` or `'quiz'`
- `quizIndex`, `quizScore`, `quizQuestions`: quiz progress

**Persistence** (localStorage key: `'mediclearn'`):
- `known_<id>`: boolean — user marked card as known
- `seen_<id>`: boolean — card has been viewed

### Two Modes

- **Flash mode**: `renderFlash()` renders the current card. `flipCard()` toggles front/back. Navigation via `nextCard()`, `prevCard()`, `goCard(i)`. `toggleKnown(id)` marks mastery.
- **Quiz mode**: `buildQuiz()` samples from `QUIZ_QUESTIONS` filtered by category. `renderQuiz()` renders the current question with 4 options. `answerQuiz(optIdx)` handles selection, reveals explanation, enables "Next". `restartQuiz()` resets.

### UI Style

Uses a Duolingo-inspired dark theme with CSS custom properties (`--primary`, `--surface`, `--edge`, etc.). Buttons use a "3D" raised style via `box-shadow` + `translateY` on `:active`. All rendering is DOM manipulation via `innerHTML`.
