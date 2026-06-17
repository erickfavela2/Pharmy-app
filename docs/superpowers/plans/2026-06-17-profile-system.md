# Profile System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add local multi-user profiles with streak tracking, per-profile progress storage, and flagged-card analytics to the Pharmy app.

**Architecture:** All changes land in `app.js` (logic) and `index.html` (markup), with new CSS appended to `style.css`. No build tools — plain globals, `file://` compatible. Profile data lives in a single localStorage key `mediclearn_v2`; the old `mediclearn` key is abandoned (fresh start per spec). Five sequential tasks: storage layer → header bar → profile overlay → streak tracking → analytics + flags.

**Tech Stack:** Vanilla HTML/CSS/JS, localStorage, no dependencies. No test framework — verification is browser-console + visual spot-checks.

**Spec:** `docs/superpowers/specs/2026-06-16-profile-system-design.md`

---

## File Map

| File | What changes |
|---|---|
| `app.js` | Replace storage layer; add profile, header, overlay, streak, analytics, flag functions; update `flipCard`, `answerQuiz`, `checkMulti`, `toggleKnown`, `renderFlash`, `renderStatsBar`, `toggleSound`, init block |
| `index.html` | Replace header markup; add profile overlay div; add profile dropdown div |
| `style.css` | Append profile system styles (avatar button, streak pill, dropdown, overlay, flag button) |

---

## Task 1: Replace storage layer

Swap the three old storage lines with the new `mediclearn_v2` data model and helper functions. Update every place in `app.js` that reads or writes the old `store` variable.

**Files:**
- Modify: `app.js:15-19` (old storage functions → new)
- Modify: `app.js:26-29` (`updateGlobalProgress` — use `getStore()`)
- Modify: `app.js:60-68` (`renderStatsBar` — use `getStore()`)
- Modify: `app.js:89-90` (inside `renderFlash` — use `getStore()`/`saveStore()`)
- Modify: `app.js:145` (`toggleKnown` — use `getStore()`/`saveStore()`)

- [ ] **Step 1: Replace lines 15–19 of `app.js`**

Delete:
```js
function loadStorage(){
  try{ return JSON.parse(localStorage.getItem('mediclearn')||'{}'); }catch(e){ return {}; }
}
function saveStorage(s){ try{ localStorage.setItem('mediclearn',JSON.stringify(s)); }catch(e){} }
let store = loadStorage();
```

Replace with:
```js
const AVATAR_COLORS=["#0891b2","#7c3aed","#059669","#dc2626","#d97706","#db2777"];

function loadV2(){
  try{ return JSON.parse(localStorage.getItem('mediclearn_v2')||'null'); }catch(e){ return null; }
}
function saveV2(d){ try{ localStorage.setItem('mediclearn_v2',JSON.stringify(d)); }catch(e){} }
function activeProfile(){
  const d=loadV2();
  if(!d) return null;
  return d.profiles.find(p=>p.id===d.activeProfile)||null;
}
function getStore(){
  const p=activeProfile();
  return p?Object.assign({},p.store):{};
}
function saveStore(s){
  const d=loadV2();
  const p=d&&d.profiles.find(q=>q.id===d.activeProfile);
  if(!p) return;
  p.store=s;
  saveV2(d);
}
function makeProfileId(name){
  return name.toLowerCase().replace(/\W+/g,'').slice(0,6)+'-'+Math.random().toString(36).slice(2,6);
}
```

- [ ] **Step 2: Update `updateGlobalProgress()` to use `getStore()`**

Current (`app.js:26-29`):
```js
function updateGlobalProgress(){
  const known = Object.keys(store).filter(k=>k.startsWith('known_')&&store[k]).length;
  document.getElementById('global-progress').textContent = known+' known';
}
```

Replace with:
```js
function updateGlobalProgress(){
  const s=getStore();
  const known=Object.keys(s).filter(k=>k.startsWith('known_')&&s[k]).length;
  const el=document.getElementById('global-progress');
  if(el) el.textContent=known+' known';
}
```

- [ ] **Step 3: Update `renderStatsBar()` to use `getStore()`**

Current (`app.js:60-68`):
```js
function renderStatsBar(){
  const cards = filteredCards();
  const known = cards.filter(c=>store['known_'+c.id]).length;
  const seen = cards.filter(c=>store['seen_'+c.id]).length;
```

Replace those first three inner lines with:
```js
function renderStatsBar(){
  const cards=filteredCards();
  const s=getStore();
  const known=cards.filter(c=>s['known_'+c.id]).length;
  const seen=cards.filter(c=>s['seen_'+c.id]).length;
```

(Leave the `document.getElementById('stats-bar').innerHTML = ...` line untouched.)

- [ ] **Step 4: Update `renderFlash()` to use `getStore()`/`saveStore()`**

Current (`app.js:89-90`):
```js
  store['seen_'+card.id]=true; saveStorage(store); renderStatsBar();
  const known = store['known_'+card.id];
```

Replace with:
```js
  const s=getStore(); s['seen_'+card.id]=true; saveStore(s); renderStatsBar();
  const known=s['known_'+card.id];
```

- [ ] **Step 5: Update `toggleKnown()` to use `getStore()`/`saveStore()`**

Current (`app.js:145`):
```js
function toggleKnown(id){ store['known_'+id]=!store['known_'+id]; saveStorage(store); renderFlash(); renderStatsBar(); updateGlobalProgress(); }
```

Replace with:
```js
function toggleKnown(id){ const s=getStore(); s['known_'+id]=!s['known_'+id]; saveStore(s); renderFlash(); renderStatsBar(); updateGlobalProgress(); }
```

- [ ] **Step 6: Verify in browser**

Open `index.html` in a browser. Open DevTools Console and run:
```js
// should return null (no v2 data yet)
localStorage.getItem('mediclearn_v2')

// manually seed a profile to test store reads
const testData = {activeProfile:'test-1',profiles:[{id:'test-1',name:'Test',color:'#0891b2',createdAt:'2026-06-17',lastActiveDate:'',streak:0,todayFlips:0,todayAnswers:0,store:{},analytics:{},flagged:[]}]};
localStorage.setItem('mediclearn_v2', JSON.stringify(testData));
location.reload();
// App should load. Open console again:
getStore()   // should return {}
getStore()['known_r1']  // should return undefined (no data yet)
```

Flip to a card's answer, then check:
```js
getStore()  // should have seen_<id>: true for the card you viewed
```

Click "Mark as Known" on a card:
```js
getStore()  // should have known_<id>: true
```

Clear the test data after verifying:
```js
localStorage.removeItem('mediclearn_v2'); location.reload();
```

- [ ] **Step 7: Commit**

```bash
git add app.js
git commit -m "feat: replace storage layer with mediclearn_v2 profile-aware functions"
```

---

## Task 2: Header bar + profile dropdown

Replace the header's sound button + progress pill with an avatar button + streak pill. Add the profile dropdown element and its rendering/toggle functions. Move sound toggle into the dropdown.

**Files:**
- Modify: `index.html:10-16` (header div contents)
- Modify: `style.css` (append profile system CSS)
- Modify: `app.js` (add `profileInitials`, `renderHeader`, `toggleProfileDropdown`, `closeProfileDropdown`, `renderProfileDropdown`; update `document.addEventListener` click handler; update `toggleSound`; remove `updateSoundBtn`; update init block)

- [ ] **Step 1: Update `index.html` header**

Replace lines 10–16 of `index.html`:
```html
<div class="header">
  <div style="width:70px;display:flex;align-items:center">
    <button id="sound-btn" onclick="toggleSound()" style="background:rgba(255,255,255,.22);border:none;border-radius:50%;width:38px;height:38px;font-size:1.1rem;line-height:1;cursor:pointer;color:#fff;padding:0" aria-label="Sound on, tap to mute">🔊</button>
  </div>
  <div style="flex:1;text-align:center"><h1>💊 Pharmy</h1></div>
  <div class="progress-pill" id="global-progress">0 known</div>
</div>
```

With:
```html
<div class="header">
  <button id="avatar-btn" class="avatar-btn" onclick="toggleProfileDropdown()">?</button>
  <div style="flex:1;text-align:center"><h1>💊 Pharmy</h1></div>
  <div id="streak-pill" class="streak-pill" style="visibility:hidden">🔥 0</div>
</div>
<div id="profile-dropdown" class="profile-dropdown" style="display:none"></div>
```

- [ ] **Step 2: Append profile system CSS to `style.css`**

Add at the end of `style.css` (after the `.empty h3` rule):
```css
/* PROFILE SYSTEM */
.avatar-btn{width:38px;height:38px;border-radius:50%;background:rgba(255,255,255,.22);border:2px solid rgba(255,255,255,.35);color:#fff;font-size:.88rem;font-weight:800;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;padding:0;line-height:1}
.streak-pill{background:rgba(255,255,255,.18);border-radius:20px;padding:5px 11px;font-size:.82rem;font-weight:800;color:#fbbf24;white-space:nowrap;min-width:52px;text-align:center}
.profile-dropdown{position:absolute;top:64px;left:8px;background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:8px;min-width:190px;box-shadow:0 6px 16px rgba(0,0,0,.4);z-index:110}
.pd-label{font-size:.6rem;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:var(--muted);padding:4px 12px 2px}
.pd-row{padding:9px 12px;border-radius:8px;cursor:pointer;display:flex;align-items:center;gap:8px;font-weight:600;font-size:.82rem;color:var(--text)}
.pd-row:hover,.pd-row:active{background:rgba(255,255,255,.06)}
.pd-row.pd-active{color:var(--cyan)}
.pd-divider{border:none;border-top:1px solid rgba(255,255,255,.08);margin:4px 0}
.pd-icon{width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:.7rem;font-weight:800;color:#fff;flex-shrink:0}
```

- [ ] **Step 3: Add `profileInitials`, `renderHeader`, and dropdown functions to `app.js`**

Insert the following block immediately after the `makeProfileId` function (after the closing `}` on that line):

```js
function profileInitials(name){
  const parts=name.trim().split(/\s+/);
  return parts.length>1?(parts[0][0]+parts[1][0]).toUpperCase():name.slice(0,2).toUpperCase();
}
function renderHeader(){
  const p=activeProfile();
  const btn=document.getElementById('avatar-btn');
  if(btn){
    btn.textContent=p?profileInitials(p.name):'?';
    btn.style.background=p?p.color:'rgba(255,255,255,.22)';
  }
  const pill=document.getElementById('streak-pill');
  if(pill){
    if(p&&p.streak>0){ pill.textContent='🔥 '+p.streak; pill.style.visibility=''; }
    else pill.style.visibility='hidden';
  }
}
function toggleProfileDropdown(){
  const dd=document.getElementById('profile-dropdown');
  if(dd.style.display==='none'){ renderProfileDropdown(); dd.style.display=''; }
  else dd.style.display='none';
}
function closeProfileDropdown(){
  const dd=document.getElementById('profile-dropdown');
  if(dd) dd.style.display='none';
}
function renderProfileDropdown(){
  const d=loadV2()||{profiles:[],activeProfile:null};
  const dd=document.getElementById('profile-dropdown');
  const rows=d.profiles.map(p=>`<div class="pd-row${p.id===d.activeProfile?' pd-active':''}" onclick="selectProfile('${p.id}');closeProfileDropdown()"><div class="pd-icon" style="background:${p.color}">${profileInitials(p.name)}</div>${p.name}${p.id===d.activeProfile?'<span style="margin-left:auto;font-size:.68rem;opacity:.6">active</span>':''}</div>`).join('');
  const addBtn=d.profiles.length<4?`<div class="pd-row" onclick="showAddProfile();closeProfileDropdown()"><div class="pd-icon" style="background:var(--border);color:var(--muted)">+</div>Add Profile</div>`:'';
  const soundLabel=_soundOn?'On':'Off';
  dd.innerHTML=`<div class="pd-label">Profiles</div>${rows}${addBtn}<hr class="pd-divider"><div class="pd-row" onclick="toggleSound();renderProfileDropdown()">🔊 Sound: ${soundLabel}</div><div class="pd-row" onclick="showProfileOverlay();closeProfileDropdown()">🚪 Switch Profile</div>`;
}
```

- [ ] **Step 4: Update the `document.addEventListener('click',...)` block to also dismiss the profile dropdown**

Current (`app.js:51-55`):
```js
document.addEventListener('click',function(e){
  const bar = document.querySelector('.cat-bar');
  const dd = document.getElementById('cat-dropdown');
  if(bar && dd && !bar.contains(e.target)) dd.classList.remove('open');
});
```

Replace with:
```js
document.addEventListener('click',function(e){
  const bar=document.querySelector('.cat-bar');
  const dd=document.getElementById('cat-dropdown');
  if(bar&&dd&&!bar.contains(e.target)) dd.classList.remove('open');
  const pdrop=document.getElementById('profile-dropdown');
  const abtn=document.getElementById('avatar-btn');
  if(pdrop&&abtn&&pdrop.style.display!=='none'&&!pdrop.contains(e.target)&&!abtn.contains(e.target)) closeProfileDropdown();
});
```

- [ ] **Step 5: Remove `updateSoundBtn()` call from `toggleSound()` and delete `updateSoundBtn()`**

Current `toggleSound` (around `app.js:299-304`):
```js
function toggleSound(){
  _soundOn=!_soundOn;
  _unlockAudio();
  updateSoundBtn();
  if(_soundOn) playSound(true); // audible confirmation that sound is on
}
function updateSoundBtn(){
  const b=document.getElementById('sound-btn');
  if(b){ b.textContent=_soundOn?'🔊':'🔇'; b.setAttribute('aria-label',_soundOn?'Sound on, tap to mute':'Sound off, tap to enable'); }
}
```

Replace with (remove `updateSoundBtn()` call and delete the entire `updateSoundBtn` function):
```js
function toggleSound(){
  _soundOn=!_soundOn;
  _unlockAudio();
  if(_soundOn) playSound(true); // audible confirmation that sound is on
}
```

- [ ] **Step 6: Update the init block (last 5 lines of `app.js`)**

Current:
```js
renderTabs();
renderStatsBar();
renderFlash();
updateGlobalProgress();
updateSoundBtn();
```

Replace with:
```js
renderTabs();
renderStatsBar();
renderFlash();
renderHeader();
```

(`initProfiles()` is added in Task 3 and will be appended to the init block there.)

- [ ] **Step 7: Verify in browser**

Open `index.html`. You should see:
- Header shows `?` avatar button (grey circle) on the left, `💊 Pharmy` centered, streak pill invisible on the right
- Tapping the `?` button opens a dropdown showing "PROFILES / + Add Profile / 🔊 Sound: On / 🚪 Switch Profile"
- Tapping 🔊 Sound toggles and re-renders the dropdown label (On ↔ Off), plays a chime when turning on
- Tapping outside the dropdown closes it
- Category dropdown still works
- Flashcard still renders and "Mark as Known" still works

- [ ] **Step 8: Commit**

```bash
git add app.js index.html style.css
git commit -m "feat: add profile header bar and dropdown (avatar, streak pill, sound moved to dropdown)"
```

---

## Task 3: Profile overlay (welcome / profile select screen)

Add a full-screen overlay that appears on first launch or when switching profiles. It shows "Create a profile" on first launch and "Who's studying?" for returning users.

**Files:**
- Modify: `index.html` (add overlay div before the `<script>` tags)
- Modify: `style.css` (append overlay styles)
- Modify: `app.js` (add `showProfileOverlay`, `hideProfileOverlay`, `renderProfileOverlay`, `showAddProfile`, `createProfile`, `selectProfile`, `initProfiles`; update init block)

- [ ] **Step 1: Add overlay div to `index.html`**

Insert before `<script src="database.js"></script>` (currently the second-to-last line):
```html
<div id="profile-overlay" class="profile-overlay" style="display:none"></div>
```

- [ ] **Step 2: Append overlay CSS to `style.css`**

Add after the profile dropdown CSS added in Task 2:
```css
/* PROFILE OVERLAY */
.profile-overlay{position:fixed;inset:0;background:var(--bg);z-index:200;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px}
.po-title{font-size:1.4rem;font-weight:800;color:var(--text);margin-bottom:6px;text-align:center}
.po-sub{font-size:.82rem;color:var(--muted);margin-bottom:24px;text-align:center}
.profile-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;width:100%;max-width:320px;margin-bottom:16px}
.profile-tile{background:var(--surface);border:2px solid var(--border);border-radius:14px;padding:18px 12px;display:flex;flex-direction:column;align-items:center;gap:8px;cursor:pointer;text-align:center}
.profile-tile:hover,.profile-tile:active{border-color:var(--cyan);background:rgba(76,202,223,.08)}
.profile-tile.pt-add{border-style:dashed;opacity:.7}
.pt-avatar{width:48px;height:48px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:.95rem;font-weight:800;color:#fff}
.pt-name{font-size:.78rem;font-weight:700;color:var(--text)}
.pt-streak{font-size:.7rem;color:#fbbf24;font-weight:700;min-height:1em}
.po-name-input{width:100%;max-width:280px;background:var(--surface);border:2px solid var(--border);border-radius:12px;padding:12px 14px;color:var(--text);font-size:.9rem;margin-bottom:10px;font-family:inherit;outline:none}
.po-name-input:focus{border-color:var(--cyan)}
.po-name-input::placeholder{color:var(--muted)}
.po-create-btn{width:100%;max-width:280px;padding:13px;background:var(--primary);color:#fff;border:2px solid var(--primary);border-radius:14px;font-size:.9rem;font-weight:700;cursor:pointer;box-shadow:0 4px 0 var(--primary-dark);transition:transform .04s,box-shadow .04s}
.po-create-btn:active{transform:translateY(3px);box-shadow:0 1px 0 var(--primary-dark)}
.po-err{font-size:.75rem;color:var(--red);margin-bottom:8px;min-height:1.2em;max-width:280px;text-align:center}
.po-back{background:none;border:none;color:var(--muted);font-size:.8rem;cursor:pointer;margin-top:10px;padding:6px 12px}
```

- [ ] **Step 3: Add overlay + profile management functions to `app.js`**

Insert the following block immediately after the `renderProfileDropdown` function:

```js
function showProfileOverlay(){ renderProfileOverlay(); document.getElementById('profile-overlay').style.display='flex'; }
function hideProfileOverlay(){ document.getElementById('profile-overlay').style.display='none'; }

function initProfiles(){
  const d=loadV2();
  if(!d||!d.activeProfile||!d.profiles.find(p=>p.id===d.activeProfile)){
    showProfileOverlay();
  }
  renderHeader();
}

function renderProfileOverlay(){
  const d=loadV2();
  const ov=document.getElementById('profile-overlay');
  if(!d||!d.profiles.length){
    ov.innerHTML=`<div class="po-title">💊 Pharmy</div>
<div class="po-sub">Create a profile to start tracking your progress.</div>
<div class="po-err" id="po-err"></div>
<input class="po-name-input" id="po-name" placeholder="Enter your name…" maxlength="24" onkeydown="if(event.key==='Enter')createProfile()">
<button class="po-create-btn" onclick="createProfile()">Create Profile</button>`;
    setTimeout(function(){ var n=document.getElementById('po-name'); if(n) n.focus(); },50);
  } else {
    const tiles=d.profiles.map(p=>`<div class="profile-tile" onclick="selectProfile('${p.id}')"><div class="pt-avatar" style="background:${p.color}">${profileInitials(p.name)}</div><div class="pt-name">${p.name}</div><div class="pt-streak">${p.streak>0?'🔥 '+p.streak:''}</div></div>`).join('');
    const addTile=d.profiles.length<4?`<div class="profile-tile pt-add" onclick="showAddProfile()"><div class="pt-avatar" style="background:var(--border);color:var(--muted)">+</div><div class="pt-name" style="color:var(--muted)">Add</div></div>`:'';
    ov.innerHTML=`<div class="po-title">Who's studying?</div><div class="profile-grid">${tiles}${addTile}</div>`;
  }
}

function showAddProfile(){
  const ov=document.getElementById('profile-overlay');
  ov.innerHTML=`<div class="po-title">Add Profile</div>
<div class="po-err" id="po-err"></div>
<input class="po-name-input" id="po-name" placeholder="Enter your name…" maxlength="24" onkeydown="if(event.key==='Enter')createProfile()">
<button class="po-create-btn" onclick="createProfile()">Create Profile</button>
<button class="po-back" onclick="renderProfileOverlay()">← Back</button>`;
  setTimeout(function(){ var n=document.getElementById('po-name'); if(n) n.focus(); },50);
}

function createProfile(){
  var nameEl=document.getElementById('po-name');
  var errEl=document.getElementById('po-err');
  var name=(nameEl?nameEl.value:'').trim();
  if(!name){ if(errEl) errEl.textContent="Name can't be empty"; return; }
  var d=loadV2()||{activeProfile:null,profiles:[]};
  if(d.profiles.length>=4){ if(errEl) errEl.textContent="Max 4 profiles reached"; return; }
  var colorIdx=d.profiles.length%AVATAR_COLORS.length;
  var today=new Date().toISOString().slice(0,10);
  var profile={id:makeProfileId(name),name:name,color:AVATAR_COLORS[colorIdx],createdAt:today,lastActiveDate:'',streak:0,todayFlips:0,todayAnswers:0,store:{},analytics:{},flagged:[]};
  d.profiles.push(profile);
  d.activeProfile=profile.id;
  saveV2(d);
  hideProfileOverlay();
  renderHeader();
  renderStatsBar();
}

function selectProfile(id){
  var d=loadV2();
  if(!d) return;
  d.activeProfile=id;
  saveV2(d);
  hideProfileOverlay();
  renderHeader();
  renderStatsBar();
  renderCurrentMode();
}
```

- [ ] **Step 4: Update the init block to call `initProfiles()`**

Current (last 4 lines of `app.js` after Task 2):
```js
renderTabs();
renderStatsBar();
renderFlash();
renderHeader();
```

Replace with:
```js
renderTabs();
renderStatsBar();
renderFlash();
initProfiles();
```

(`initProfiles()` calls `renderHeader()` internally, so `renderHeader()` is no longer needed in the init block directly.)

- [ ] **Step 5: Verify in browser**

Clear localStorage first (DevTools → Application → Clear site data or run `localStorage.clear()` in console), then reload.

Expected behavior:
1. **First launch (no data):** Full-screen overlay appears with "💊 Pharmy / Create a profile to start tracking your progress." and a name input.
2. Type a name (e.g. "Erick") and press Create Profile → overlay dismisses, header shows "ER" avatar in teal, streak pill hidden.
3. Reload page → app loads directly with "ER" avatar visible (no overlay).
4. Click the avatar → dropdown shows "PROFILES / Erick (active) / + Add Profile / divider / 🔊 Sound: On / 🚪 Switch Profile".
5. Click "Switch Profile" → overlay reopens showing "Who's studying?" grid with Erick's tile.
6. Click "Add" tile → shows name input. Create second profile (e.g. "Maria") → avatar updates to "MA" in purple.
7. Tap Erick's tile in the overlay → switches back to Erick.
8. Confirm: category filter still works, flashcards still render, Mark as Known still works.

- [ ] **Step 6: Commit**

```bash
git add app.js index.html style.css
git commit -m "feat: add profile overlay (welcome screen, create/select/switch profiles)"
```

---

## Task 4: Streak tracking

Record each flashcard flip and quiz answer per profile. When a profile crosses the daily activity threshold (5 flips or 10 answers), increment the streak counter and update the header pill.

**Files:**
- Modify: `app.js` (add `recordActivity`; update `flipCard`, `answerQuiz`, `checkMulti`)

- [ ] **Step 1: Add `recordActivity` function to `app.js`**

Insert immediately after the `selectProfile` function:

```js
function recordActivity(type){
  var d=loadV2();
  var p=d&&d.profiles.find(function(q){ return q.id===d.activeProfile; });
  if(!p) return;
  var today=new Date().toISOString().slice(0,10);
  if(p.lastActiveDate!==today){ p.todayFlips=0; p.todayAnswers=0; }
  if(type==='flip') p.todayFlips++;
  if(type==='answer') p.todayAnswers++;
  var threshold=p.todayFlips>=5||p.todayAnswers>=10;
  if(threshold&&p.lastActiveDate!==today){
    var prev=p.lastActiveDate;
    var yesterday=new Date(new Date().setDate(new Date().getDate()-1)).toISOString().slice(0,10);
    p.streak=prev===yesterday?(p.streak+1):1;
    p.lastActiveDate=today;
  }
  saveV2(d);
  renderHeader();
}
```

- [ ] **Step 2: Update `flipCard()` to record flips**

Current (`app.js:141`):
```js
function flipCard(){ state.flipped=!state.flipped; renderFlash(); }
```

Replace with:
```js
function flipCard(){ state.flipped=!state.flipped; if(state.flipped) recordActivity('flip'); renderFlash(); }
```

(Only count when revealing the answer — flipping to front doesn't count.)

- [ ] **Step 3: Update `answerQuiz()` to record answers**

Current (`app.js:317`):
```js
function answerQuiz(optIdx){
```

Find the line `if(isCorrect) state.quizScore++;` inside `answerQuiz` and add `recordActivity('answer');` immediately after it:

```js
  if(isCorrect) state.quizScore++;
  recordActivity('answer');
```

- [ ] **Step 4: Update `checkMulti()` to record answers**

Find the line `if(fullyCorrect) state.quizScore++;` inside `checkMulti` and add `recordActivity('answer');` immediately after it:

```js
  if(fullyCorrect) state.quizScore++;
  recordActivity('answer');
```

- [ ] **Step 5: Verify in browser**

With a profile active, open the app and run this in the console to set a lower threshold for fast testing:
```js
// Check current flip count
var d = loadV2(); d.profiles[0].todayFlips; // should be 0
```

Flip 5 cards' answers. After the 5th flip:
```js
var d = loadV2(); d.profiles[0];
// streak should be 1, todayFlips should be 5, lastActiveDate should be today
```

The streak pill in the header should show `🔥 1`.

Also test quiz: go to quiz mode, answer 10 questions (if streak already set from flips, `todayAnswers` will still increment).

- [ ] **Step 6: Commit**

```bash
git add app.js
git commit -m "feat: add daily streak tracking (5 flips or 10 quiz answers)"
```

---

## Task 5: Analytics + flagged cards

Record per-question correct/wrong analytics on every quiz answer. Auto-flag a card when a quiz question is answered wrong. Add a manual Flag button to the flashcard back face.

**Files:**
- Modify: `app.js` (add `questionId`, `toggleFlagCard`; update `answerQuiz`, `renderFlash`)
- Modify: `style.css` (append flag button styles)

- [ ] **Step 1: Add `questionId` and `toggleFlagCard` functions to `app.js`**

Insert immediately after the `recordActivity` function:

```js
function questionId(q){ return q.q.slice(0,40).replace(/\W+/g,'_').toLowerCase(); }

function toggleFlagCard(id){
  var d=loadV2();
  var p=d&&d.profiles.find(function(q){ return q.id===d.activeProfile; });
  if(!p) return;
  var idx=p.flagged.indexOf(id);
  if(idx>-1) p.flagged.splice(idx,1);
  else p.flagged.unshift(id);
  saveV2(d);
  renderFlash();
}
```

- [ ] **Step 2: Update `answerQuiz()` to record analytics and auto-flag**

Inside `answerQuiz`, find this block:
```js
  if(isCorrect) state.quizScore++;
  recordActivity('answer');
```

Replace with:
```js
  if(isCorrect) state.quizScore++;
  recordActivity('answer');
  var _d=loadV2();
  var _p=_d&&_d.profiles.find(function(x){ return x.id===_d.activeProfile; });
  if(_p){
    var _qid=questionId(q);
    if(!_p.analytics[_qid]) _p.analytics[_qid]={correct:0,wrong:0};
    if(isCorrect) _p.analytics[_qid].correct++;
    else{
      _p.analytics[_qid].wrong++;
      var _fc=CARDS.find(function(c){ return c.cat===q.cat; });
      if(_fc&&!_p.flagged.includes(_fc.id)) _p.flagged.unshift(_fc.id);
    }
    saveV2(_d);
  }
```

- [ ] **Step 3: Update `renderFlash()` to show flag button on back face**

Inside `renderFlash()`, find:
```js
  const s=getStore(); s['seen_'+card.id]=true; saveStore(s); renderStatsBar();
  const known=s['known_'+card.id];
```

Add one line after `const known`:
```js
  const s=getStore(); s['seen_'+card.id]=true; saveStore(s); renderStatsBar();
  const known=s['known_'+card.id];
  const _fp=activeProfile(); const flagged=_fp&&(_fp.flagged||[]).includes(card.id);
```

Then find the closing `</div>` of the `known-row` in the `renderFlash` HTML template (comes right before the closing backtick of the big template literal). The current HTML ends with:
```js
<div class="known-row">
  <button class="known-btn${known?' known':''}" onclick="toggleKnown('${card.id}')">
    ${known?'Known':'Mark as Known'}
  </button>
  <button class="shuffle-btn" onclick="shuffleCards()">🔀 Shuffle</button>
</div>`;
```

Replace with:
```js
<div class="known-row">
  <button class="known-btn${known?' known':''}" onclick="toggleKnown('${card.id}')">
    ${known?'Known':'Mark as Known'}
  </button>
  <button class="shuffle-btn" onclick="shuffleCards()">🔀 Shuffle</button>
</div>
${state.flipped?`<div class="flag-row"><button class="flag-btn${flagged?' flagged':''}" onclick="toggleFlagCard('${card.id}')">${flagged?'⚑ Flagged':'⚑ Flag'}</button></div>`:''}`;
```

- [ ] **Step 4: Append flag button CSS to `style.css`**

Add after the overlay styles:
```css
/* FLAG BUTTON */
.flag-row{max-width:520px;margin:10px auto 0;text-align:right;padding:0 4px}
.flag-btn{background:transparent;border:1px solid var(--border);border-radius:20px;padding:5px 14px;font-size:.75rem;color:var(--muted);cursor:pointer}
.flag-btn.flagged{border-color:var(--accent);color:var(--accent)}
```

- [ ] **Step 5: Verify in browser**

**Test analytics:**
1. Go to Quiz mode. Answer a question wrong (click a wrong option).
2. Open console:
```js
var d = loadV2();
var p = d.profiles.find(x => x.id === d.activeProfile);
Object.keys(p.analytics); // should have 1 entry
Object.values(p.analytics)[0]; // should show { correct: 0, wrong: 1 }
p.flagged; // should have 1 card id from that category
```

**Test manual flag:**
1. Go to Flashcard mode. Navigate to any card.
2. Reveal the answer (flip card). Confirm the "⚑ Flag" button appears below the shuffle button.
3. Click "⚑ Flag" → button label changes to "⚑ Flagged" with amber color.
4. Click again → back to "⚑ Flag".
5. Flip to front of card → flag button disappears (only shows on back).
6. Check console:
```js
var d = loadV2();
d.profiles.find(x => x.id === d.activeProfile).flagged; // should show the card id when flagged
```

- [ ] **Step 6: Commit**

```bash
git add app.js style.css
git commit -m "feat: add quiz analytics, auto-flag on wrong answer, manual flag button on flashcard"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Covered by |
|---|---|
| Fresh start (no migration) | Task 1 — new `mediclearn_v2` key |
| Max 4 profiles | Task 3 — `createProfile` guard + "Add" tile hidden at 4 |
| Profile name 1–24 chars | Task 3 — `maxlength="24"` + empty check |
| Avatar initials + color palette | Task 2 — `profileInitials()` + `AVATAR_COLORS` |
| Welcome screen (full-screen takeover) | Task 3 — `profile-overlay` fixed overlay |
| First launch: name input | Task 3 — `renderProfileOverlay` no-profiles branch |
| Returning user: profile grid | Task 3 — `renderProfileOverlay` profiles branch |
| Header: avatar left, title center, streak right | Task 2 — updated `index.html` header |
| Dropdown: profiles, add, sound, switch | Task 2 — `renderProfileDropdown` |
| Sound toggle moved to dropdown | Task 2 — removed `#sound-btn`, `updateSoundBtn` |
| Per-profile `store` (known/seen) | Task 1 — `getStore()`/`saveStore()` |
| Streak: 5 flips OR 10 answers | Task 4 — `recordActivity` with threshold check |
| Streak: yesterday logic | Task 4 — `recordActivity` yesterday comparison |
| Streak: resets if day skipped | Task 4 — `else p.streak=1` branch |
| Per-question analytics | Task 5 — `questionId` + analytics update in `answerQuiz` |
| Auto-flag on wrong quiz answer | Task 5 — `answerQuiz` auto-flag block |
| Manual flag on flashcard back | Task 5 — `toggleFlagCard` + flag button in `renderFlash` |
| Profile deletion: out of scope | Not implemented (no task) ✓ |
