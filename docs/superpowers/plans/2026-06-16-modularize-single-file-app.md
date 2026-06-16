# Modularize Single-File App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split `index.html` (748-line monolith) into `style.css`, `database.js`, `app.js`, and a lean `index.html` shell, organized so new non-pharmacology decks can be added by appending to `database.js`.

**Architecture:** No build tools or module system — plain script loading in `<body>`. `database.js` must load before `app.js` (globals `CARDS`, `QUIZ_QUESTIONS`, `CATS` are consumed by `app.js`). All existing `onclick="fn()"` attributes in the HTML call functions defined in `app.js`; this keeps working because both scripts load into the global scope before the user can interact.

**Tech Stack:** Vanilla HTML/CSS/JS, localStorage, Web Audio API (HTML5 Audio elements), no dependencies.

---

## File Map

| File | Responsibility | Source in current `index.html` |
|---|---|---|
| `style.css` | All visual styles, CSS variables, component classes | Lines 7–124 (inside `<style>`) |
| `database.js` | Card data, quiz questions, category list | `CARDS` (lines 155–255), `QUIZ_QUESTIONS` (lines 412–553), `CATS` (line 258) |
| `app.js` | State, storage, all render/logic functions, audio, init | Lines 258–748 (minus data arrays) |
| `index.html` | HTML skeleton + `<link>` + two `<script>` tags | Lines 127–151 (the body markup) |

---

## Task 1: Create `style.css`

**Files:**
- Create: `style.css`

- [ ] **Step 1: Create the file**

Create `/Users/erk/Pharmy/style.css` containing every rule from inside the `<style>` block (lines 7–124 of `index.html` — everything between `<style>` and `</style>`). The file starts with the `:root` block and ends with the `.empty` rule:

```css
*{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}
:root{
  --primary:#0891b2;--primary-dark:#0e7490;--accent:#f59e0b;
  --bg:#2c3a47;
  --surface:#36464f;
  --edge:#1d2730;
  --border:#4a5b66;
  --text:#e8eef2;--muted:#9fb0bd;
  --cyan:#4ccadf;
  --green:#4ade80;--green-edge:#166534;
  --red:#f87171;--yellow:#ca8a04;--purple:#a78bfa;
}
/* ... all remaining rules verbatim from the <style> block ... */
.empty{text-align:center;padding:60px 20px;color:var(--muted)}
.empty h3{font-size:1.1rem;margin-bottom:8px}
```

The exact content is everything between (and not including) the `<style>` and `</style>` tags. Copy it exactly — do not reformat or compress.

- [ ] **Step 2: Verify the file was created correctly**

Run:
```bash
wc -l /Users/erk/Pharmy/style.css
```
Expected: ~119 lines (matches the original block length).

---

## Task 2: Create `database.js`

**Files:**
- Create: `database.js`

- [ ] **Step 1: Create `database.js` with the organized deck structure**

Create `/Users/erk/Pharmy/database.js`. The structure separates each subject area so future decks can be added by declaring a new named array and spreading it into `CARDS` / `QUIZ_QUESTIONS`:

```js
// ── PHARMACOLOGY CARDS ─────────────────────────────────────────────────────
// Add new pharmacology cards here. For a new subject area (e.g. diseases,
// assessments), declare a new const array (e.g. DISEASE_CARDS) below and
// spread it into CARDS.
const PHARMA_CARDS = [
  // ... all entries from the CARDS array in index.html (lines 155–254) ...
];

// Future decks — declare and spread in below:
// const DISEASE_CARDS = [];
// const ASSESSMENT_CARDS = [];

const CARDS = [
  ...PHARMA_CARDS,
  // ...DISEASE_CARDS,
  // ...ASSESSMENT_CARDS,
];

// ── PHARMACOLOGY QUIZ QUESTIONS ─────────────────────────────────────────────
const PHARMA_QUIZ = [
  // ... all entries from the QUIZ_QUESTIONS array in index.html (lines 413–552) ...
];

// Future quiz banks — declare and spread in below:
// const DISEASE_QUIZ = [];

const QUIZ_QUESTIONS = [
  ...PHARMA_QUIZ,
  // ...DISEASE_QUIZ,
];

// ── CATEGORIES ──────────────────────────────────────────────────────────────
// When adding a new subject deck, add its category name(s) to this list.
const CATS = ["All","Sick Call","Basics","Respiratory","Immune","GI","CNS","Cardiovascular"];
```

The content of `PHARMA_CARDS` is a verbatim copy of the `CARDS` array literal from `index.html` (everything between `const CARDS = [` and the matching `];`). Same for `PHARMA_QUIZ` — verbatim copy of the `QUIZ_QUESTIONS` array literal.

- [ ] **Step 2: Verify counts**

```bash
grep -c '"id":' /Users/erk/Pharmy/database.js
```
Expected: same count as in the original (count first with `grep -c '"id":' /Users/erk/Pharmy/index.html`).

```bash
grep -c '"correct":' /Users/erk/Pharmy/database.js
```
Expected: same count as in the original.

---

## Task 3: Create `app.js`

**Files:**
- Create: `app.js`

- [ ] **Step 1: Create `app.js` with all logic**

Create `/Users/erk/Pharmy/app.js`. This file contains everything from the `<script>` block in `index.html` **except** the three data declarations (`const CARDS`, `const QUIZ_QUESTIONS`, and `const CATS`) which now live in `database.js`.

The file starts at the `// ─── APP STATE` comment and ends with the init block at the bottom of the script. Structure:

```js
// ─── APP STATE ──────────────────────────────────────────────────────────────
// CATS, CARDS, and QUIZ_QUESTIONS are defined in database.js (loaded first)
let state = {
  cat: "All",
  mode: "flash",
  cardIndex: 0,
  flipped: false,
  quizIndex: 0,
  quizAnswered: false,
  quizQuestions: [],
  quizScore: 0,
  currentOpts: []
};

function loadStorage(){
  try{ return JSON.parse(localStorage.getItem('mediclearn')||'{}'); }catch(e){ return {}; }
}
function saveStorage(s){ try{ localStorage.setItem('mediclearn',JSON.stringify(s)); }catch(e){} }
let store = loadStorage();

// ... all remaining functions verbatim: filteredCards, updateGlobalProgress,
//     renderTabs, toggleCatDropdown, document click listener, selectCat,
//     renderStatsBar, setMode, renderCurrentMode, renderFlash, flipCard,
//     nextCard, prevCard, goCard, toggleKnown, shuffleCards, shuffle,
//     buildQuiz, renderQuiz, toggleMulti, checkMulti,
//     audio system (_soundOn, _unlocked, _AUD with base64 data, _makeEl,
//     _initEls, _unlockAudio, event listeners, toggleSound, updateSoundBtn,
//     playSound), answerQuiz, nextQuestion, restartQuiz ...

// ─── INIT ────────────────────────────────────────────────────────────────────
renderTabs();
renderStatsBar();
renderFlash();
updateGlobalProgress();
updateSoundBtn();
```

The `_AUD` object (with its embedded base64 audio data URIs) stays in this file, unchanged.

- [ ] **Step 2: Verify key functions exist**

```bash
grep -c "^function " /Users/erk/Pharmy/app.js
```
Expected: matches `grep -c "^function " /Users/erk/Pharmy/index.html` (should be the same function count).

---

## Task 4: Strip `index.html` to a clean shell

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Replace `index.html` with the clean shell**

The new `index.html` keeps only:
1. The `<head>` with meta tags, title, and a `<link>` to `style.css` (no more `<style>` block).
2. The `<body>` HTML markup exactly as it was (lines 127–151).
3. Two `<script>` tags at the end of `<body>`: `database.js` first, then `app.js`. `database.js` **must** come first because `app.js` references `CARDS`, `QUIZ_QUESTIONS`, and `CATS` at parse time.

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
<title>💊 Pharmy</title>
<link rel="stylesheet" href="style.css">
</head>
<body>
<div class="header">
  <div style="width:70px;display:flex;align-items:center">
    <button id="sound-btn" onclick="toggleSound()" style="background:rgba(255,255,255,.22);border:none;border-radius:50%;width:38px;height:38px;font-size:1.1rem;line-height:1;cursor:pointer;color:#fff;padding:0" aria-label="Sound on, tap to mute">🔊</button>
  </div>
  <div style="flex:1;text-align:center"><h1>💊 Pharmy</h1></div>
  <div class="progress-pill" id="global-progress">0 known</div>
</div>

<div class="cat-bar">
  <div class="cat-bar-inner">
    <button class="cat-btn" onclick="toggleCatDropdown()">Categories ▾</button>
    <div class="mode-toggle">
      <button class="mode-btn active" id="btn-flash" onclick="setMode('flash')">Flashcards</button>
      <button class="mode-btn" id="btn-quiz" onclick="setMode('quiz')">Quiz</button>
    </div>
    <div class="cat-dropdown" id="cat-dropdown"></div>
  </div>
</div>

<div class="stats-bar" id="stats-bar"></div>

<div id="flashcard-mode"></div>
<div id="quiz-mode" style="display:none"></div>

<script src="database.js"></script>
<script src="app.js"></script>
</body>
</html>
```

- [ ] **Step 2: Verify `index.html` is clean**

```bash
wc -l /Users/erk/Pharmy/index.html
```
Expected: ~40 lines (down from 748).

```bash
grep -c "<style\|<script>" /Users/erk/Pharmy/index.html
```
Expected: `0` — no inline style or script blocks remain.

---

## Task 5: Smoke-test the refactored app

**Files:** None — verification only.

- [ ] **Step 1: Verify all four files exist**

```bash
ls -lh /Users/erk/Pharmy/
```
Expected: `index.html`, `style.css`, `database.js`, `app.js` all present.

- [ ] **Step 2: Check for any dangling references**

```bash
grep -n "const CARDS\|const QUIZ_QUESTIONS\|const CATS\b" /Users/erk/Pharmy/app.js
```
Expected: no matches — these must not appear in `app.js`.

```bash
grep -n "const CARDS\|const QUIZ_QUESTIONS\|const CATS\b" /Users/erk/Pharmy/database.js
```
Expected: exactly 3 matches — the merged declarations.

- [ ] **Step 3: Open in browser and verify**

Open `index.html` directly in a browser (file:// protocol). Check:
1. App loads — header, category bar, mode buttons visible.
2. A flashcard renders immediately.
3. "Reveal Answer" button works (flips the card).
4. "Next →" and "← Prev" navigate between cards.
5. "Mark as Known" toggles and persists on page refresh.
6. Switching to Quiz mode and answering a question plays a sound.
7. Category dropdown changes the card pool.

No console errors should appear in DevTools.

---

## Self-Review Checklist

- [x] **Spec coverage**: CSS → `style.css` ✓, data organized in `database.js` with named sub-arrays for future expansion ✓, logic in `app.js` ✓, `index.html` stripped to shell ✓.
- [x] **No placeholders**: All task steps show exact file structure and commands. The array contents are described precisely (verbatim copy from specific lines), not left as "TODO".
- [x] **Load order**: `database.js` before `app.js` specified in Task 4 and justified — `app.js` uses `CARDS`/`QUIZ_QUESTIONS`/`CATS` as globals set by `database.js`.
- [x] **Audio data**: Explicitly noted to stay in `app.js` inside `_AUD` — no accidental omission.
- [x] **No module system**: Confirmed — no `import`/`export`, plain globals, works with `file://` protocol.
