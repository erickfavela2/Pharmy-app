# Profile System Design

## Goal

Add a local multi-user profile system so multiple people can track their own progress on the same device without mixing data.

## Approved Decisions

| Decision | Choice | Notes |
|---|---|---|
| Migration | Fresh start | No migration of existing `mediclearn` key |
| Max profiles | 4 | Hard cap enforced in UI and storage |
| Flagged cards | Auto + manual | Auto on quiz wrong answer; manual button on flashcard |
| Streak activity | 5+ flips OR 10+ quiz answers | Tracked per calendar day |
| Header layout | Hybrid (avatar left, title center, streak right) | Sound moves into profile dropdown |
| Welcome screen | Full-screen takeover | Shows profile grid on return; name input on first launch |
| Storage architecture | Single `mediclearn_v2` key, all profiles in one JSON object | See Data Model |

---

## Data Model

Single localStorage key `mediclearn_v2`:

```js
{
  activeProfile: "erk-1234",   // id of the currently active profile, or null
  profiles: [
    {
      id: string,              // e.g. "erk-1234" — name-slug + 4-char random suffix
      name: string,            // display name, 1-24 chars
      color: string,           // hex bg color for avatar (from a fixed palette of 6)
      createdAt: string,       // ISO date "YYYY-MM-DD"
      lastActiveDate: string,  // ISO date — date of last qualifying session
      streak: number,          // current day streak (0 if never active)
      todayFlips: number,      // flashcard flips on lastActiveDate
      todayAnswers: number,    // quiz answers on lastActiveDate
      store: {                 // per-card known/seen booleans (same shape as old 'mediclearn' key)
        "known_<id>": boolean,
        "seen_<id>": boolean,
      },
      analytics: {             // per-question performance
        "<questionId>": { correct: number, wrong: number }
      },
      flagged: string[],       // card ids flagged for review (ordered by most recently flagged)
    }
  ]
}
```

**ID generation:** `name.toLowerCase().replace(/\W/g,'').slice(0,6) + '-' + Math.random().toString(36).slice(2,6)`.

**Avatar colors (fixed palette of 6, assigned by profile index mod 6):**
`["#0891b2","#7c3aed","#059669","#dc2626","#d97706","#db2777"]`

**Storage overhead:** ~100 known/seen booleans + analytics for 125 questions ≈ ~8 KB per profile, well within localStorage's 5 MB limit.

---

## Storage Functions

Replace the existing `loadStorage()` / `saveStorage()` pair with:

```js
function loadV2() {
  try { return JSON.parse(localStorage.getItem('mediclearn_v2') || 'null'); }
  catch(e) { return null; }
}
function saveV2(data) {
  try { localStorage.setItem('mediclearn_v2', JSON.stringify(data)); } catch(e) {}
}
function activeProfile() {
  const d = loadV2();
  if (!d) return null;
  return d.profiles.find(p => p.id === d.activeProfile) || null;
}
function getStore() {
  const p = activeProfile();
  return p ? p.store : {};
}
function saveStore(store) {
  const d = loadV2();
  const p = d && d.profiles.find(q => q.id === d.activeProfile);
  if (!p) return;
  p.store = store;
  saveV2(d);
}
```

All existing `store` reads/writes (`store['known_<id>']`, `store['seen_<id>']`) are redirected to `activeProfile().store`.

---

## Profile Management

### Creation

- Name: 1–24 characters, trimmed. Empty name → show inline error "Name can't be empty".
- If 4 profiles already exist, the "Add Profile" button is hidden (not just disabled).
- On create: generate id, assign next color in palette, push to `profiles`, set as `activeProfile`, save, dismiss welcome screen.

### Switching

- Tapping a profile tile on the welcome screen (or in the dropdown) sets `activeProfile` and re-renders everything.
- No confirmation required for switching.

### Deletion

- Not in v1 scope. The profile dropdown has no delete option.

---

## Welcome / Profile Select Screen

**Trigger:** App startup when `mediclearn_v2` is null OR `activeProfile` is null.

**Render:** Full-screen overlay (`position:fixed`, covers everything including the header). The main app content exists in the DOM but is hidden behind the overlay.

**First launch (no profiles):**
```
💊 Pharmy
Welcome!
Create a profile to start tracking your progress.
[Name input]
[Create Profile button]
```

**Returning user (1–4 profiles exist):**
```
💊 Pharmy
Who's studying?
[2-column grid of profile tiles]
  [Avatar + Name + 🔥 N streak each]
  [+ Add tile if < 4 profiles]
```

Tapping a profile tile: set active, dismiss overlay, render app.
Tapping "+": show name input form inline within the overlay.

**Dismissal:** Overlay fades out (`opacity 0 → 1, 200ms`). No hard transition.

---

## Header Bar

Replaces the existing `<div class="header">` markup and related JS.

```html
<div class="header">
  <button id="avatar-btn" onclick="toggleProfileDropdown()">ER</button>
  <div style="flex:1;text-align:center"><h1>💊 Pharmy</h1></div>
  <div id="streak-pill" class="streak-pill">🔥 7</div>
</div>
```

- Avatar initials: first letter of first word + first letter of second word (if present), uppercased. "Erick" → "E". "Maria R" → "MR".
- Avatar bg color: the profile's `color` field.
- Streak pill hidden if streak is 0.
- The existing `progress-pill` ("X known") is removed from the header. Known-card count moves to the stats bar below the category row (already rendered there via `renderStatsBar()`).

### Profile Dropdown

Appears below the avatar button, positioned absolute. Dismissed by clicking outside or pressing Escape.

```
PROFILES
● Erick    [active checkmark]
  Maria
─────────────
🔊 Sound: On/Off
🚪 Switch Profile   (opens welcome overlay)
```

"Switch Profile" shows the welcome overlay even when a profile is active (lets you switch without needing to log out).

Sound toggle moves here — removed from the top-level header.

---

## Streak Counter

**Activity:** A day counts as active if the profile accumulates ≥5 flashcard flips OR ≥10 quiz answers on that calendar date (local time).

**Streak logic** (run on every flip/answer):
1. Get today's date string `YYYY-MM-DD`.
2. If `lastActiveDate === today` → already counted, just increment `todayFlips`/`todayAnswers`.
3. If activity threshold newly crossed today:
   - If `lastActiveDate` was yesterday → `streak += 1`.
   - If `lastActiveDate` was before yesterday → `streak = 1` (reset).
   - If `lastActiveDate === today` and threshold already crossed → no change.
   - Set `lastActiveDate = today`.
4. If `lastActiveDate` is before yesterday AND threshold not yet crossed today → streak is broken on next render (display current streak as-is; reset happens when threshold is crossed again).

**Streak display:** Updated live in the streak pill after each qualifying action.

---

## Per-Profile Analytics

### Quiz Performance

On every `answerQuiz()` call, record the result against the question object.

Questions do not currently have stable IDs. We derive one from question content:

```js
function questionId(q) {
  return q.q.slice(0, 40).replace(/\W+/g, '_').toLowerCase();
}
```

Update: `analytics[questionId(q)].correct++` or `.wrong++`.

### Flagged Cards

A card is flagged when:
- **Auto:** `answerQuiz()` selects a wrong answer — the card ID associated with that question's `cat` is flagged. Since quiz questions carry a `cat` but not a card `id`, we flag by looking up the first card in that category. *(Simple v1 behavior — can be made more precise later.)*
- **Manual:** User taps a "Flag for review" button shown on the back face of a flashcard.

Flagged state: `flagged` array on the profile. `flagged.includes(cardId)` is the check. Toggle adds/removes.

Flag button on flashcard back: small pill button labeled `⚑ Flag` / `⚑ Flagged`. Shown only when card is flipped.

---

## Flashcard Mode Changes

- `store` reads/writes go through `activeProfile().store` (wrapped helpers, not the global `store` variable).
- "Mark as Known" button remains unchanged in appearance and behavior.
- Flag button added to back face of card (see Flagged Cards above).

---

## Quiz Mode Changes

- `buildQuiz()` samples from `QUIZ_QUESTIONS` as before.
- On wrong answer: auto-flag (see above).
- `analytics` updated on every answer.

---

## File Changes

All changes are in `app.js` and `index.html`. `database.js` and `style.css` are unchanged.

### `index.html` changes
- Replace header markup: swap sound button + progress pill for avatar button + streak pill.
- Add profile overlay `<div id="profile-overlay">` (hidden by default, shown on first launch).
- Add profile dropdown `<div id="profile-dropdown">` (hidden, absolute positioned).

### `app.js` changes
- Remove global `store` variable and `loadStorage()`/`saveStorage()`.
- Add `loadV2()`, `saveV2()`, `activeProfile()`, `getStore()`.
- Add `initProfiles()` — run at startup, shows overlay if needed.
- Add `renderHeader()` — updates avatar initials, color, streak pill.
- Add `toggleProfileDropdown()`, `closeProfileDropdown()`.
- Add `renderProfileOverlay()`, `selectProfile(id)`, `createProfile(name)`.
- Add `toggleFlagCard(id)` — for manual flag button.
- Add `checkStreak()` — called from `flipCard()` and `answerQuiz()`.
- Modify `flipCard()`, `nextCard()`, `prevCard()` — use `getStore()`, call `checkStreak()`.
- Modify `toggleKnown(id)` — use `getStore()`.
- Modify `answerQuiz()` — update analytics, auto-flag, call `checkStreak()`.
- Modify `renderFlash()` — show flag button on back face.
- Modify init block — call `initProfiles()` before other renders.

---

## Out of Scope (v1)

- Profile deletion
- Profile rename
- Profile avatar image (initials only)
- Analytics dashboard / review screen for flagged cards
- Exporting or syncing data
- Password / PIN protection
