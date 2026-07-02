// ─── APP STATE ──────────────────────────────────────────────────────────────
// CATS, CARDS, and QUIZ_QUESTIONS are defined in database.js (loaded first)
let state = {
  view: 'dashboard',
  dashboardMode: null,
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

const PHYSEXAM_CATS = ["All", "Musculoskeletal", "Neurological", "Cardiovascular", "Respiratory", "Abdominal", "HEENT", "Skin & Wound"];

// ─── STORAGE v2 ──────────────────────────────────────────────────────────────
const AVATAR_COLORS=["#0891b2","#7c3aed","#059669","#dc2626","#d97706","#db2777"];
function loadV2(){ try{ return JSON.parse(localStorage.getItem('mediclearn_v2')||'null'); }catch(e){ return null; } }
function saveV2(data){ try{ localStorage.setItem('mediclearn_v2',JSON.stringify(data)); }catch(e){} }
function activeProfile(){ const d=loadV2(); if(!d) return null; return d.profiles.find(p=>p.id===d.activeProfile)||null; }
function getStore(){ const p=activeProfile(); return p?p.store:{}; }
function saveStore(store){ const d=loadV2(); const p=d&&d.profiles.find(q=>q.id===d.activeProfile); if(!p) return; p.store=store; saveV2(d); }

function filteredCards(){
  if(state.cat==="All") return CARDS;
  return CARDS.filter(c=>c.cat===state.cat);
}

function updateGlobalProgress(){ renderHeader(); }

// ─── CATEGORY DROPDOWN ──────────────────────────────────────────────────────
function renderTabs(){
  const dd = document.getElementById('cat-dropdown');
  const counts = {};
  if(state.mode==='quiz'){
    CATS.forEach(c=>{
      counts[c] = c==="All" ? QUIZ_QUESTIONS.length
                : c==="Sick Call" ? QUIZ_QUESTIONS.filter(x=>x.sc).length
                : QUIZ_QUESTIONS.filter(x=>x.cat===c).length;
    });
  } else {
    CATS.forEach(c=>{ counts[c]= c==="All"? CARDS.length: CARDS.filter(x=>x.cat===c).length; });
  }
  dd.innerHTML = CATS.map(c=>`<div class="cat-dropdown-item${state.cat===c?' active':''}" onclick="selectCat('${c}')">${c} <span style="opacity:.6;font-weight:400">(${counts[c]})</span></div>`).join('');
}

function toggleCatDropdown(){
  document.getElementById('cat-dropdown').classList.toggle('open');
}

document.addEventListener('click',function(e){
  const bar = document.querySelector('.status-panel');
  const dd = document.getElementById('cat-dropdown');
  if(bar && dd && !bar.contains(e.target)) dd.classList.remove('open');
});

function selectCat(c){ state.cat=c; state.cardIndex=0; state.flipped=false; document.getElementById('cat-dropdown').classList.remove('open'); updateCatBtn(); renderTabs(); renderStatsBar(); renderCurrentMode(); }
function updateCatBtn(){ const b=document.getElementById('cat-btn'); if(b) b.textContent=state.cat+' ▾'; }

// ─── STATS BAR ──────────────────────────────────────────────────────────────
function renderStatsBar(){
  const cards = filteredCards();
  const st=getStore();
  const known = cards.filter(c=>st['known_'+c.id]).length;
  document.getElementById('stats-bar').innerHTML =
    `<div class="stat">Total: <span>${cards.length}</span></div>`+
    `<div class="stat">Known: <span>${known}</span></div>`+
    `<div class="stat">Left: <span>${cards.length-known}</span></div>`;
}

// ─── MODE TOGGLE ─────────────────────────────────────────────────────────────
function setMode(m){
  state.mode=m;
  state.view='content';
  document.getElementById('btn-flash').classList.toggle('active',m==='flash');
  document.getElementById('btn-quiz').classList.toggle('active',m==='quiz');
  document.getElementById('flashcard-mode').style.display=m==='flash'?'':'none';
  document.getElementById('quiz-mode').style.display=m==='quiz'?'':'none';
  const bb=document.getElementById('bottom-bar'); if(bb) bb.style.display=m==='flash'?'':'none';
  renderTabs();
  if(m==='quiz'){ state.quizIndex=0; state.quizScore=0; state.quizQuestions=buildQuiz(); renderQuiz(); }
  else renderFlash();
}
function renderCurrentMode(){ if(state.mode==='flash') renderFlash(); else { state.quizIndex=0; state.quizScore=0; state.quizQuestions=buildQuiz(); renderQuiz(); } }

// ─── FLASHCARD MODE ──────────────────────────────────────────────────────────
function renderFlash(){
  const cards = filteredCards();
  if(!cards.length){ document.getElementById('flashcard-mode').innerHTML='<div class="empty"><h3>No cards in this category</h3></div>'; return; }
  const idx = Math.min(state.cardIndex, cards.length-1);
  const card = cards[idx];
  const st=getStore(); st['seen_'+card.id]=true; saveStore(st); renderStatsBar();
  const known = st['known_'+card.id];
  const _prof=activeProfile(); const flagged=_prof&&_prof.flagged&&_prof.flagged.includes(card.id);

  const genericPills = card.generics.length? `<div class="pill-list">${card.generics.map(g=>`<span class="pill generic">${g}</span>`).join('')}</div>`:'';
  const tradePills = card.trades.length? `<div class="pill-list">${card.trades.map(t=>`<span class="pill trade">${t}</span>`).join('')}</div>`:'';
  const usePills = card.uses.length? `<div class="pill-list">${card.uses.map(u=>`<span class="pill use">${u}</span>`).join('')}</div>`:'';
  const sePills = card.sideEffects.length? `<div class="pill-list">${card.sideEffects.map(s=>`<span class="pill side">${s}</span>`).join('')}</div>`:'';
  const suffixBox = card.suffix? `<div class="suffix-box">${card.suffix}</div>`:'';
  const mnemonicBox = card.mnemonic? `<div class="mnemonic-box">🧠 ${card.mnemonic}</div>`:'';
  const nursingList = card.nursing.length? card.nursing.map(n=>`<li style="margin-bottom:4px">${n}</li>`).join(''):'';
  const pedList = card.patientEd.length? card.patientEd.map(p=>`<li style="margin-bottom:4px">${p}</li>`).join(''):'';

  const showClass = card.drugClass && card.drugClass!=='Pharmacology Concept'&&card.drugClass!=='Antibiotic Overview'&&card.drugClass!=='Antibiotic Concept'&&card.drugClass!=='Diagnostic Concept'&&card.drugClass!=='Infectious Disease Concept'&&card.drugClass!=='Cardiovascular Concept (Side Effect)'&&card.drugClass!=='Cardiovascular Concept (Complication)'&&card.drugClass!=='Antihypertensive Overview';

  const flagBtn = `<div class="flag-row"><button class="flag-btn${flagged?' flagged':''}" onclick="toggleFlagCard('${card.id}')">⚑ ${flagged?'Flagged':'Flag for Review'}</button></div>`;

  const backHeader = `
  <div class="card-back-header">
    <h3 class="back-card-title">${card.title}</h3>
    <button class="back-flip-btn" onclick="flipCard()">↩ flip back</button>
  </div>`;

  // Clinical cards (Ottawa Rules, Physical Exam checklists, etc.) — flat layout
  const clinicalBack = card.clinical ? `${backHeader}
  <div class="card-back-reveal">
    ${card.intro?`<div class="section-body" style="margin-bottom:12px">${card.intro}</div>`:''}
    ${(card.groups||[]).map(g=>`<div class="section"><div class="section-title">${g.label}</div><ul class="crit-list">${g.items.map(i=>`<li>${i}</li>`).join('')}</ul></div>`).join('')}
    ${card.note?`<div class="section"><div class="section-title">Clinical Pearl</div><div class="crit-note">🧠 ${card.note}</div></div>`:''}
    ${flagBtn}
  </div>` : null;

  // Drug cards — tabbed layout
  const tabPanes = !card.clinical ? `${backHeader}
  <div class="back-tabs-row">
    <button class="back-tab active" data-tab="overview" onclick="switchTab('overview')">Overview</button>
    <button class="back-tab" data-tab="uses" onclick="switchTab('uses')">Uses</button>
    <button class="back-tab" data-tab="side-fx" onclick="switchTab('side-fx')">Side FX</button>
    <button class="back-tab" data-tab="nursing" onclick="switchTab('nursing')">Nursing</button>
    <button class="back-tab" data-tab="pt-ed" onclick="switchTab('pt-ed')">Pt Ed</button>
  </div>
  <div class="back-tab-pane" data-pane="overview">
    ${card.generics.length||card.trades.length?`<div class="section"><div class="section-title">Drug Names</div>${genericPills}${tradePills}</div>`:''}
    ${card.drugClass?`<div class="section"><div class="section-title">Drug Class</div><div class="section-body">${card.drugClass}</div></div>`:''}
    ${card.suffix?`<div class="section"><div class="section-title">Suffix / Prefix</div>${suffixBox}</div>`:''}
    <div class="section"><div class="section-title">Mechanism of Action</div><div class="section-body">${card.mechanism}</div></div>
    ${flagBtn}
  </div>
  <div class="back-tab-pane" data-pane="uses" style="display:none">
    ${card.uses.length?`<div class="section"><div class="section-title">Therapeutic Uses</div>${usePills}</div>`:`<div class="tab-empty">No uses listed for this card.</div>`}
    ${flagBtn}
  </div>
  <div class="back-tab-pane" data-pane="side-fx" style="display:none">
    ${card.sideEffects.length?`<div class="section"><div class="section-title">⚠️ Must-Know Side Effects</div>${sePills}</div>`:`<div class="tab-empty">No side effects listed.</div>`}
    ${flagBtn}
  </div>
  <div class="back-tab-pane" data-pane="nursing" style="display:none">
    ${card.nursing.length?`<div class="section"><div class="section-title">Nursing Considerations</div><ul style="padding-left:16px;font-size:.82rem;line-height:1.55">${nursingList}</ul></div>`:`<div class="tab-empty">No nursing notes listed.</div>`}
    ${flagBtn}
  </div>
  <div class="back-tab-pane" data-pane="pt-ed" style="display:none">
    ${card.patientEd.length?`<div class="section"><div class="section-title">Patient Education</div><ul style="padding-left:16px;font-size:.82rem;line-height:1.55">${pedList}</ul></div>`:`<div class="tab-empty">No patient education listed.</div>`}
    ${card.mnemonic?`<div class="section"><div class="section-title">Mnemonic / Memory Tip</div>${mnemonicBox}</div>`:''}
    ${flagBtn}
  </div>` : null;

  document.getElementById('flashcard-mode').innerHTML = `
<div class="card-counter">${idx+1} / ${cards.length}</div>
<div class="soma-card">
  ${!state.flipped ? `
  <div class="card-front-banner" onclick="flipCard()">
    <div class="banner-cat-label">${card.cat}</div>
    <h2 class="banner-title">${card.title}</h2>
    ${card.subtitle?`<div class="banner-subtitle">${card.subtitle}</div>`:''}
    ${showClass?`<div class="banner-class">Class: ${card.drugClass}</div>`:''}
    <button class="reveal-btn" onclick="event.stopPropagation();flipCard()">Flip to reveal ↻</button>
  </div>
  ` : (card.clinical ? clinicalBack : tabPanes)}
</div>
<div class="flip-hint">tap card to flip</div>`;
  renderBottomBar(card, known);
}

function flipCard(){ state.flipped=!state.flipped; if(state.flipped) checkStreak('flip'); renderFlash(); }
function nextCard(){ const c=filteredCards(); state.cardIndex=(state.cardIndex+1)%c.length; state.flipped=false; renderFlash(); }
function prevCard(){ const c=filteredCards(); state.cardIndex=(state.cardIndex-1+c.length)%c.length; state.flipped=false; renderFlash(); }
function renderBottomBar(card, known){
  const bb=document.getElementById('bottom-bar');
  if(!bb) return;
  if(!card){ bb.innerHTML=''; return; }
  bb.innerHTML=`<div class="bottom-bar-nav">
  <button class="nav-btn" onclick="prevCard()">← Prev</button>
  <button class="known-btn${known?' known':''}" onclick="toggleKnown('${card.id}')">${known?'✓ Known':'Mark Known'}</button>
  <button class="nav-btn" onclick="nextCard()">Next →</button>
</div>
<div class="bottom-bar-secondary">
  <button class="shuffle-btn" onclick="shuffleCards()">🔀 Shuffle</button>
</div>`;
}
function goCard(i){ state.cardIndex=i; state.flipped=false; renderFlash(); }
function switchTab(name){
  document.querySelectorAll('.back-tab').forEach(b=>b.classList.toggle('active',b.dataset.tab===name));
  document.querySelectorAll('.back-tab-pane').forEach(p=>{ p.style.display=p.dataset.pane===name?'':'none'; });
}
function toggleKnown(id){ const st=getStore(); st['known_'+id]=!st['known_'+id]; saveStore(st); renderFlash(); renderStatsBar(); renderHeader(); }
function shuffleCards(){
  // Randomize current index
  const c=filteredCards();
  state.cardIndex=Math.floor(Math.random()*c.length);
  state.flipped=false;
  renderFlash();
}

function shuffle(a){ return a.slice().sort(()=>Math.random()-.5); }

// ─── QUIZ MODE ───────────────────────────────────────────────────────────────
function buildQuiz(){
  let pool = QUIZ_QUESTIONS;
  if(state.cat === "Sick Call"){
    pool = pool.filter(q=>q.sc);
  } else if(state.cat !== "All"){
    const catPool = pool.filter(q=>q.cat===state.cat);
    pool = catPool.length >= 5 ? catPool : pool;
  }
  return shuffle(pool).slice(0,20);
}

function renderQuiz(){
  const el = document.getElementById('quiz-mode');
  const qs = state.quizQuestions;
  if(!qs.length){ el.innerHTML='<div class="empty"><h3>No quiz questions available</h3><p>Try selecting "All" categories</p></div>'; return; }

  if(state.quizIndex>=qs.length){
    const pct = Math.round(state.quizScore/qs.length*100);
    el.innerHTML=`<div class="quiz-score-wrap">
      <h2>${pct}%</h2>
      <p>You got ${state.quizScore} out of ${qs.length} correct!</p>
      <p style="font-size:.85rem;margin-bottom:20px">${pct>=80?'🎉 Excellent work!':pct>=60?'👍 Good effort! Keep studying':'📚 Keep practicing — you got this!'}</p>
      <button class="restart-btn" onclick="restartQuiz()">🔄 Retry Quiz</button>
    </div>`;
    return;
  }

  const q = qs[state.quizIndex];
  const progress = (state.quizIndex/qs.length)*100;

  if(q.type==='multi'){
    // shuffle the options on EVERY presentation so positions are never predictable
    const shuffledOpts = shuffle(q.options);
    state.currentOpts = shuffledOpts;
    state.multiChecked = false;
    el.innerHTML=`
<div class="quiz-progress-bar-wrap"><div class="quiz-progress-bar" style="width:${progress}%"></div></div>
<div class="quiz-card">
  <div class="quiz-q-num">Question ${state.quizIndex+1} of ${qs.length} · Score: ${state.quizScore}</div>
  <div class="quiz-question">${q.q}</div>
  <div class="quiz-multi-hint">☑︎ Select ALL that apply, then tap Check Answer</div>
  ${shuffledOpts.map((opt,i)=>`<button class="quiz-option" id="opt${i}" onclick="toggleMulti(${i})"><span class="ms-box"></span>${opt}</button>`).join('')}
  <div class="quiz-explain ms-feedback" id="quiz-explain"></div>
  <button class="quiz-check-btn" id="multi-check-btn" onclick="checkMulti()">Check Answer</button>
</div>`;
    return;
  }

  const shuffledOpts = shuffle(q.opts);
  state.currentOpts = shuffledOpts;

  el.innerHTML=`
<div class="quiz-progress-bar-wrap"><div class="quiz-progress-bar" style="width:${progress}%"></div></div>
<div class="quiz-card">
  <div class="quiz-q-num">Question ${state.quizIndex+1} of ${qs.length} · Score: ${state.quizScore}</div>
  <div class="quiz-question">${q.q}</div>
  ${shuffledOpts.map((opt,i)=>`<button class="quiz-option" id="opt${i}" onclick="answerQuiz(${i})">${opt}</button>`).join('')}
  <div class="quiz-explain" id="quiz-explain"></div>
</div>`;
}

function toggleMulti(i){
  if(state.multiChecked) return;
  document.getElementById('opt'+i).classList.toggle('selected');
}

function checkMulti(){
  if(state.multiChecked) return;
  state.multiChecked = true;
  const q = state.quizQuestions[state.quizIndex];
  const opts = state.currentOpts;
  const correctSet = q.correct;
  const btns = document.querySelectorAll('.quiz-option');
  const rightMarked=[], wrongMarked=[], missed=[];
  btns.forEach((b,i)=>{
    b.disabled = true;
    const opt = opts[i];
    const isCorrect = correctSet.includes(opt);
    const isSel = b.classList.contains('selected');
    b.classList.remove('selected');
    if(isCorrect && isSel){ b.classList.add('correct'); rightMarked.push(opt); }
    else if(!isCorrect && isSel){ b.classList.add('wrong'); wrongMarked.push(opt); }
    else if(isCorrect && !isSel){ b.classList.add('missed'); missed.push(opt); }
  });
  const fullyCorrect = wrongMarked.length===0 && missed.length===0 && rightMarked.length===correctSet.length;
  playSound(fullyCorrect);
  if(fullyCorrect) state.quizScore++;
  updateAnalytics(q, fullyCorrect);
  if(!fullyCorrect) autoFlagFromQuiz(q);
  checkStreak('answer');
  let html = fullyCorrect
    ? '✅ Correct! You selected every right answer and nothing extra.'
    : '❌ Not quite — review the breakdown below:';
  if(rightMarked.length) html += `<div class="ms-row"><strong style="color:var(--green)">✓ Right (you marked these):</strong> ${rightMarked.join('; ')}</div>`;
  if(wrongMarked.length) html += `<div class="ms-row"><strong style="color:var(--red)">✗ Wrong (you marked these, but they don't apply):</strong> ${wrongMarked.join('; ')}</div>`;
  if(missed.length) html += `<div class="ms-row"><strong style="color:var(--yellow)">⚠ Missed (correct, but you didn't mark them):</strong> ${missed.join('; ')}</div>`;
  if(q.explain) html += `<div class="ms-row" style="margin-top:10px;color:var(--muted)">${q.explain}</div>`;
  const exp = document.getElementById('quiz-explain');
  exp.innerHTML = html;
  exp.classList.add('show');
  const cb = document.getElementById('multi-check-btn');
  if(cb) cb.remove();
  document.querySelector('.quiz-card').insertAdjacentHTML('beforeend',`<button class="quiz-next-btn" onclick="nextQuestion()">Next Question →</button>`);
}


let _soundOn=true;
let _audioCtx=null;

function _ensureAudio(){
  if(!_audioCtx){
    try{ _audioCtx=new(window.AudioContext||window.webkitAudioContext)(); }catch(e){ return; }
  }
  if(_audioCtx.state!=='running'){
    // iOS requires scheduling real audio (even silent) within a gesture to unlock.
    // A 1-sample buffer fulfills this without being audible.
    try{
      var b=_audioCtx.createBuffer(1,1,_audioCtx.sampleRate);
      var s=_audioCtx.createBufferSource();
      s.buffer=b; s.connect(_audioCtx.destination); s.start(0);
    }catch(e){}
    _audioCtx.resume().catch(function(){});
  }
}
['touchstart','click'].forEach(function(ev){
  document.addEventListener(ev,_ensureAudio,{passive:true,capture:true});
});

function _doPlay(fn){
  _ensureAudio();
  if(!_audioCtx) return;
  if(_audioCtx.state==='running'){
    try{ fn(_audioCtx); }catch(e){}
  } else {
    _audioCtx.resume().then(function(){ try{ fn(_audioCtx); }catch(e){} }).catch(function(){});
  }
}
function _correctFn(ctx){
  var t=ctx.currentTime;
  [0,0.18].forEach(function(delay,i){
    var osc=ctx.createOscillator(),gain=ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type='sine';
    osc.frequency.setValueAtTime(i===0?880:1175,t+delay);
    gain.gain.setValueAtTime(0,t+delay);
    gain.gain.linearRampToValueAtTime(0.28,t+delay+0.02);
    gain.gain.exponentialRampToValueAtTime(0.001,t+delay+0.18);
    osc.start(t+delay); osc.stop(t+delay+0.2);
  });
}
function _wrongFn(ctx){
  var t=ctx.currentTime;
  var osc=ctx.createOscillator(),gain=ctx.createGain();
  osc.connect(gain); gain.connect(ctx.destination);
  osc.type='sine';
  osc.frequency.setValueAtTime(350,t);
  osc.frequency.exponentialRampToValueAtTime(180,t+0.35);
  gain.gain.setValueAtTime(0.35,t);
  gain.gain.exponentialRampToValueAtTime(0.001,t+0.35);
  osc.start(t); osc.stop(t+0.35);
}
function toggleSound(){
  _soundOn=!_soundOn;
  updateSoundBtn();
  if(_soundOn) playSound(true);
}
function updateSoundBtn(){
  var b=document.getElementById('sound-btn');
  if(b){ b.textContent=_soundOn?'🔊':'🔇'; b.setAttribute('aria-label',_soundOn?'Sound on, tap to mute':'Sound off, tap to enable'); }
}
function playSound(correct){
  if(!_soundOn) return;
  _doPlay(correct?_correctFn:_wrongFn);
}






function answerQuiz(optIdx){
  const q = state.quizQuestions[state.quizIndex];
  const opts = state.currentOpts;
  const chosen = opts[optIdx];
  const isCorrect = chosen === q.correct;
  const btns = document.querySelectorAll('.quiz-option');
  btns.forEach((b,i)=>{
    b.disabled=true;
    if(opts[i]===q.correct) b.classList.add('correct');
    else if(i===optIdx && !isCorrect) b.classList.add('wrong');
  });
  playSound(isCorrect);
  if(isCorrect) state.quizScore++;
  updateAnalytics(q, isCorrect);
  if(!isCorrect) autoFlagFromQuiz(q);
  checkStreak('answer');
  const exp = document.getElementById('quiz-explain');
  exp.textContent = (isCorrect?'✅ Correct! ':'❌ Incorrect. ')+q.explain;
  exp.classList.add('show');
  document.querySelector('.quiz-card').insertAdjacentHTML('beforeend',`<button class="quiz-next-btn" onclick="nextQuestion()">Next Question →</button>`);
}

function nextQuestion(){ state.quizIndex++; renderQuiz(); }
function restartQuiz(){ state.quizIndex=0; state.quizScore=0; state.quizQuestions=buildQuiz(); renderQuiz(); }

// ─── PROFILE SYSTEM ──────────────────────────────────────────────────────────
function todayStr(){ return new Date().toISOString().slice(0,10); }

function checkStreak(type){
  const d=loadV2();
  const p=d&&d.profiles.find(q=>q.id===d.activeProfile);
  if(!p) return;
  const today=todayStr();
  if((p.todayCountDate||'')!==today){ p.todayFlips=0; p.todayAnswers=0; p.todayCountDate=today; }
  if(type==='flip') p.todayFlips=(p.todayFlips||0)+1;
  if(type==='answer') p.todayAnswers=(p.todayAnswers||0)+1;
  const thresholdMet=(p.todayFlips||0)>=5||(p.todayAnswers||0)>=10;
  if(thresholdMet && p.lastActiveDate!==today){
    const yesterday=new Date(Date.now()-86400000).toISOString().slice(0,10);
    p.streak = p.lastActiveDate===yesterday ? (p.streak||0)+1 : 1;
    p.lastActiveDate=today;
  }
  saveV2(d);
  renderHeader();
}

function questionId(q){ return q.q.slice(0,40).replace(/\W+/g,'_').toLowerCase(); }

function updateAnalytics(q, isCorrect){
  const d=loadV2();
  const p=d&&d.profiles.find(x=>x.id===d.activeProfile);
  if(!p) return;
  const qid=questionId(q);
  if(!p.analytics[qid]) p.analytics[qid]={correct:0,wrong:0};
  if(isCorrect) p.analytics[qid].correct++; else p.analytics[qid].wrong++;
  saveV2(d);
}

function autoFlagFromQuiz(q){
  const d=loadV2();
  const p=d&&d.profiles.find(x=>x.id===d.activeProfile);
  if(!p) return;
  const catCard=CARDS.find(c=>c.cat===q.cat);
  if(!catCard||p.flagged.includes(catCard.id)) return;
  p.flagged.unshift(catCard.id);
  saveV2(d);
}

function toggleFlagCard(id){
  const d=loadV2();
  const p=d&&d.profiles.find(x=>x.id===d.activeProfile);
  if(!p) return;
  const idx=p.flagged.indexOf(id);
  if(idx>=0) p.flagged.splice(idx,1); else p.flagged.unshift(id);
  saveV2(d);
  renderFlash();
}

function profileInitials(name){
  const parts=name.trim().split(/\s+/);
  return parts.length>=2?(parts[0][0]+parts[1][0]).toUpperCase():(parts[0][0]||'?').toUpperCase();
}

function renderHeader(){
  const p=activeProfile();
  const avatarBtn=document.getElementById('avatar-btn');
  const circle=document.getElementById('avatar-circle');
  const pill=document.getElementById('streak-pill');
  if(state.view==='content'||state.view==='physexam'){
    if(avatarBtn){ avatarBtn.onclick=null; avatarBtn.onclick=goBack; avatarBtn.style.background='none'; avatarBtn.style.border='none'; avatarBtn.style.padding='0'; }
    if(circle){ circle.innerHTML='&larr;'; circle.style.background='var(--surface)'; circle.style.color='var(--text)'; }
    if(pill) pill.style.display='none';
  } else {
    if(avatarBtn){ avatarBtn.onclick=toggleProfileDropdown; avatarBtn.style.background=''; avatarBtn.style.border=''; avatarBtn.style.padding=''; }
    if(circle){ circle.textContent=p?profileInitials(p.name):'?'; circle.style.background=p?p.color:AVATAR_COLORS[0]; circle.style.color='#fff'; }
    if(pill){ if(p&&p.streak>0){ pill.textContent='🔥 '+p.streak; pill.style.display=''; } else { pill.style.display='none'; } }
  }
}

function toggleProfileDropdown(){
  const dd=document.getElementById('profile-dropdown');
  if(dd.style.display==='none'||!dd.style.display){ renderProfileDropdown(); dd.style.display=''; }
  else { dd.style.display='none'; }
}

function closeProfileDropdown(){
  const dd=document.getElementById('profile-dropdown');
  if(dd) dd.style.display='none';
}

function renderProfileDropdown(){
  const d=loadV2();
  const profiles=d?d.profiles:[];
  const dd=document.getElementById('profile-dropdown');
  const soundLabel=_soundOn?'🔊 Sound: On':'🔇 Sound: Off';
  let html='<div class="pdd-section-label">PROFILES</div>';
  profiles.forEach(function(p){
    const isActive=d&&p.id===d.activeProfile;
    html+='<div class="pdd-item'+(isActive?' pdd-item-active':'')+'" onclick="selectProfile(\''+p.id+'\');closeProfileDropdown()">'
      +'<span class="pdd-dot" style="background:'+p.color+'"></span>'+p.name
      +(isActive?' <span class="pdd-check">✓</span>':'')+'</div>';
  });
  html+='<div class="pdd-divider"></div>'
    +'<div class="pdd-item" onclick="toggleSoundFromDropdown()">'+soundLabel+'</div>'
    +'<div class="pdd-item" onclick="showProfileOverlay();closeProfileDropdown()">🚪 Switch Profile</div>';
  dd.innerHTML=html;
}

function toggleSoundFromDropdown(){ toggleSound(); renderProfileDropdown(); }

document.addEventListener('click',function(e){
  const dd=document.getElementById('profile-dropdown');
  const avatarBtn=document.getElementById('avatar-btn');
  if(dd&&avatarBtn&&dd.style.display!=='none'&&!dd.contains(e.target)&&!avatarBtn.contains(e.target)) dd.style.display='none';
});
document.addEventListener('keydown',function(e){ if(e.key==='Escape') closeProfileDropdown(); });

function selectProfile(id){
  const d=loadV2();
  if(!d) return;
  d.activeProfile=id;
  const p=d.profiles.find(x=>x.id===id);
  if(p){ const today=todayStr(); if((p.todayCountDate||'')!==today){ p.todayFlips=0; p.todayAnswers=0; p.todayCountDate=today; } }
  saveV2(d);
  hideProfileOverlay();
  showDashboard();
}

function createProfile(name){
  name=(name||'').trim();
  const errEl=document.getElementById('profile-name-error');
  if(!name){ if(errEl) errEl.textContent="Name can't be empty"; return; }
  if(name.length>24){ if(errEl) errEl.textContent='Name must be 24 characters or less'; return; }
  const d=loadV2()||{activeProfile:null,profiles:[]};
  if(d.profiles.length>=4) return;
  const slug=name.toLowerCase().replace(/\W/g,'').slice(0,6);
  const id=slug+'-'+Math.random().toString(36).slice(2,6);
  const color=AVATAR_COLORS[d.profiles.length%AVATAR_COLORS.length];
  d.profiles.push({id,name,color,createdAt:todayStr(),lastActiveDate:'',streak:0,todayFlips:0,todayAnswers:0,todayCountDate:'',store:{},analytics:{},flagged:[]});
  d.activeProfile=id;
  saveV2(d);
  hideProfileOverlay();
  showDashboard();
}

function showProfileOverlay(){
  renderProfileOverlay();
  const ov=document.getElementById('profile-overlay');
  ov.style.display='flex';
  requestAnimationFrame(function(){ ov.classList.add('visible'); });
}

function hideProfileOverlay(){
  const ov=document.getElementById('profile-overlay');
  ov.classList.remove('visible');
  setTimeout(function(){ ov.style.display='none'; },200);
}

function renderProfileOverlay(){
  const d=loadV2();
  const profiles=d?d.profiles:[];
  const content=document.getElementById('profile-overlay-content');
  if(profiles.length===0){
    content.innerHTML='<p class="profile-overlay-sub">Create a profile to start tracking your progress.</p>'
      +'<input class="profile-name-input" id="profile-name-input" type="text" placeholder="Your name" maxlength="24" autocomplete="off"'
      +' onkeydown="if(event.key===\'Enter\') createProfile(this.value)">'
      +'<div class="profile-name-error" id="profile-name-error"></div>'
      +'<button class="profile-create-btn" onclick="createProfile(document.getElementById(\'profile-name-input\').value)">Create Profile</button>';
    requestAnimationFrame(function(){ const inp=document.getElementById('profile-name-input'); if(inp) inp.focus(); });
  } else {
    let tilesHtml=profiles.map(function(p){
      return '<div class="profile-tile" onclick="selectProfile(\'' + p.id + '\')">'
        +'<div class="profile-tile-avatar" style="background:'+p.color+'">'+profileInitials(p.name)+'</div>'
        +'<div class="profile-tile-name">'+p.name+'</div>'
        +(p.streak>0?'<div class="profile-tile-streak">🔥 '+p.streak+'</div>':'')
        +'</div>';
    }).join('');
    if(profiles.length<4){
      tilesHtml+='<div class="profile-tile profile-tile-add" onclick="showAddProfileForm()">'
        +'<div class="profile-tile-avatar profile-tile-add-icon">+</div>'
        +'<div class="profile-tile-name">Add</div></div>';
    }
    content.innerHTML='<p class="profile-overlay-sub">Who\'s studying?</p>'
      +'<div class="profile-grid">'+tilesHtml+'</div>'
      +'<div id="add-profile-form" style="display:none">'
      +'<input class="profile-name-input" id="profile-name-input" type="text" placeholder="New profile name" maxlength="24" autocomplete="off"'
      +' onkeydown="if(event.key===\'Enter\') createProfile(this.value)">'
      +'<div class="profile-name-error" id="profile-name-error"></div>'
      +'<button class="profile-create-btn" onclick="createProfile(document.getElementById(\'profile-name-input\').value)">Create Profile</button>'
      +'</div>';
  }
}

function showAddProfileForm(){
  const form=document.getElementById('add-profile-form');
  if(form){ form.style.display=''; const inp=document.getElementById('profile-name-input'); if(inp) inp.focus(); }
}

// ─── DASHBOARD ───────────────────────────────────────────────────────────────
function showDashboard(){
  state.view='dashboard';
  state.dashboardMode=null;
  document.getElementById('dashboard').style.display='';
  document.getElementById('status-panel').style.display='none';
  document.getElementById('flashcard-mode').style.display='none';
  document.getElementById('quiz-mode').style.display='none';
  const bb=document.getElementById('bottom-bar'); if(bb) bb.innerHTML='';
  renderHeader();
  renderDashboard();
}

function renderDashboard(){
  const dash=document.getElementById('dashboard');
  const ICON_FLASH=`<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>`;
  const ICON_QUIZ=`<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/></svg>`;
  const ICON_PHYSEXAM=`<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`;
  const modes=[
    {key:'flash', icon:ICON_FLASH, label:'Flashcards'},
    {key:'quiz',  icon:ICON_QUIZ, label:'Quizzes'},
    {key:'physexam', icon:ICON_PHYSEXAM, label:'Physical\nExams'},
  ];
  const modeGrid=`<div class="dash-mode-grid">${modes.map(m=>`
    <div class="dash-mode-card${state.dashboardMode===m.key?' active':''}" onclick="selectDashboardMode('${m.key}')">
      <div class="dash-mode-icon">${m.icon}</div>
      <div class="dash-mode-label">${m.label.replace('\n','<br>')}</div>
    </div>`).join('')}</div>`;

  let catsHtml='';
  if(state.dashboardMode==='flash'){
    const flashCats=CATS.filter(c=>{
      if(c==='All') return true;
      if(c==='Sick Call') return false;
      return CARDS.filter(x=>x.cat===c).length>0;
    });
    catsHtml=`<div class="dash-cats"><div class="dash-section-label">Choose a Category</div>`
      +flashCats.map(c=>{
        const count=c==='All'?CARDS.length:CARDS.filter(x=>x.cat===c).length;
        return `<div class="dash-cat-row" onclick="enterContent('flash','${c.replace(/'/g,"\\'")}')">`
          +`<span>${c}</span>`
          +`<div class="dash-cat-right"><span class="dash-cat-meta">${count} cards</span><span class="dash-cat-arrow">›</span></div>`
          +`</div>`;
      }).join('')+'</div>';
  } else if(state.dashboardMode==='quiz'){
    const validCats=CATS.filter(c=>{
      if(c==='All') return true;
      if(c==='Sick Call') return QUIZ_QUESTIONS.filter(q=>q.sc).length>0;
      return QUIZ_QUESTIONS.filter(q=>q.cat===c).length>0;
    });
    catsHtml=`<div class="dash-cats"><div class="dash-section-label">Choose a Category</div>`
      +validCats.map(c=>{
        const count=c==='All'?QUIZ_QUESTIONS.length:c==='Sick Call'?QUIZ_QUESTIONS.filter(q=>q.sc).length:QUIZ_QUESTIONS.filter(q=>q.cat===c).length;
        return `<div class="dash-cat-row" onclick="enterContent('quiz','${c.replace(/'/g,"\\'")}')">`
          +`<span>${c}</span>`
          +`<div class="dash-cat-right"><span class="dash-cat-meta">${count} questions</span><span class="dash-cat-arrow">›</span></div>`
          +`</div>`;
      }).join('')+'</div>';
  } else if(state.dashboardMode==='physexam'){
    catsHtml=`<div class="dash-cats"><div class="dash-section-label">Choose a Category</div>`
      +PHYSEXAM_CATS.map(c=>`<div class="dash-cat-row" onclick="enterContent('physexam','${c.replace(/'/g,"\\'")}')">`
        +`<span>${c}</span>`
        +`<div class="dash-cat-right"><span class="dash-cat-meta">Coming soon</span><span class="dash-cat-arrow">›</span></div>`
        +`</div>`).join('')+'</div>';
  }

  dash.innerHTML=`<div class="dash-section-label">Modes</div>${modeGrid}${catsHtml}`;
}

function selectDashboardMode(key){
  state.dashboardMode=key;
  renderDashboard();
}

function enterContent(mode, cat){
  if(mode==='physexam'){
    state.view='physexam';
    state.dashboardMode='physexam';
    document.getElementById('dashboard').style.display='none';
    document.getElementById('status-panel').style.display='none';
    document.getElementById('flashcard-mode').style.display='none';
    document.getElementById('quiz-mode').style.display='none';
    const bb=document.getElementById('bottom-bar'); if(bb) bb.innerHTML='';
    renderHeader();
    renderPhysExamPlaceholder(cat);
    return;
  }
  state.view='content';
  state.cat=cat;
  state.cardIndex=0;
  state.flipped=false;
  document.getElementById('dashboard').style.display='none';
  document.getElementById('status-panel').style.display='';
  updateCatBtn();
  renderTabs();
  renderStatsBar();
  renderHeader();
  if(mode==='flash'){
    state.mode='flash';
    document.getElementById('flashcard-mode').style.display='';
    document.getElementById('quiz-mode').style.display='none';
    document.getElementById('btn-flash').classList.add('active');
    document.getElementById('btn-quiz').classList.remove('active');
    const bb=document.getElementById('bottom-bar'); if(bb) bb.style.display='';
    renderFlash();
  } else {
    state.mode='quiz';
    document.getElementById('quiz-mode').style.display='';
    document.getElementById('flashcard-mode').style.display='none';
    document.getElementById('btn-quiz').classList.add('active');
    document.getElementById('btn-flash').classList.remove('active');
    const bb=document.getElementById('bottom-bar'); if(bb) bb.style.display='none';
    state.quizIndex=0; state.quizScore=0; state.quizQuestions=buildQuiz();
    renderQuiz();
  }
}

function goBack(){
  showDashboard();
}

function renderPhysExamPlaceholder(cat){
  const fc=document.getElementById('flashcard-mode');
  fc.style.display='';
  fc.innerHTML=`<div class="physexam-placeholder">
    <div class="physexam-icon"><svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg></div>
    <div class="physexam-title">Physical Exams</div>
    <div class="physexam-cat">${cat}</div>
    <div class="physexam-body">Advanced diagnostic and orthopedic assessment reasoning is coming soon. This module will include systematic physical exam frameworks, clinical reasoning pathways, and NCLEX-style case simulations.</div>
    <button class="physexam-back-btn" onclick="showDashboard()">← Back to Dashboard</button>
  </div>`;
}

function initProfiles(){
  const d=loadV2();
  if(!d||!d.activeProfile){ showProfileOverlay(); }
  else { hideProfileOverlay(); showDashboard(); }
}

// ─── INIT ────────────────────────────────────────────────────────────────────
initProfiles();
updateSoundBtn();
