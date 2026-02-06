function $(s){return document.querySelector(s)}
function el(tag,cls){const e=document.createElement(tag);if(cls)e.className=cls;return e}
function todayKey(){return new Date().toISOString().slice(0,10)}
function showToast(message){
  if (window.cardStackManager && typeof window.cardStackManager.showToast === 'function') {
    window.cardStackManager.showToast(message);
    return;
  }
  const toast=document.createElement('div');
  toast.className='toast';
  toast.textContent=message;
  document.body.appendChild(toast);
  setTimeout(()=>{toast.classList.add('toast--out');setTimeout(()=>toast.remove(),260)},2600);
}
function yesterdayKey(dateKey){
  const d=new Date(dateKey+'T12:00:00.000Z');
  d.setUTCDate(d.getUTCDate()-1);
  return d.toISOString().slice(0,10);
}
function isSameDay(a,b){return a===b}
function isNextDay(prev,current){
  if(!prev||!current) return false;
  const a=new Date(prev+'T12:00:00.000Z');
  const b=new Date(current+'T12:00:00.000Z');
  const diff=(b-a)/(24*60*60*1000);
  return Math.round(diff)===1;
}
async function getStreak(){
  const s=await HomeDB.streaks.get('daily');
  if(s && typeof s.count==='number') return s;
  return {id:'daily',count:0,lastCompletedDate:null};
}
async function setStreak(streak){
  await HomeDB.streaks.put(streak);
}
async function updateStreakIfEligible(planDate, plan){
  if(!plan || !plan.tasks || plan.tasks.length<3) return;
  const allDone = plan.tasks.every(t=>t.status==='done');
  if(!allDone) return;
  const streak=await getStreak();
  if(isSameDay(streak.lastCompletedDate, planDate)) return;
  const nextCount = isNextDay(streak.lastCompletedDate, planDate) ? (streak.count + 1) : 1;
  await setStreak({id:'daily',count:nextCount,lastCompletedDate:planDate});
}
async function ensureDayRollover(){
  const today=todayKey();
  const lastSeen=localStorage.getItem('lastSeenDate');
  if(lastSeen !== today){
    const streak=await getStreak();
    const y=yesterdayKey(today);
    if(streak.lastCompletedDate && !isSameDay(streak.lastCompletedDate, y)){
      await setStreak({id:'daily',count:0,lastCompletedDate:null});
    }
    localStorage.setItem('lastSeenDate', today);
  }
  const existing = await HomeDB.dailyPlans.get(today);
  if(!existing) await HomeScheduler.generateDailyPlan();
}
function scheduleMidnightRefresh(){
  const now=new Date();
  const next=new Date(now);
  next.setHours(24,0,5,0);
  const ms=next-now;
  setTimeout(async()=>{
    await ensureDayRollover();
    await renderPlan();
    await renderStats();
    scheduleMidnightRefresh();
  }, ms);
}
async function ensureDefaults(){
  const hasAvail = await HomeDB.settings.get('availability');
  if(!hasAvail) await HomeDB.settings.put({key:'availability',mon:60,dienstag:60,mittwoch:60,donnerstag:60,freitag:60,samstag:90,sonntag:90});
  const themeEntry = await HomeDB.settings.get('theme');
  const theme = themeEntry && themeEntry.value ? themeEntry.value : 'dark';
  const normalizedTheme = theme === 'light' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', normalizedTheme);
  document.body.setAttribute('data-theme', normalizedTheme);
  const tasks = await HomeDB.tasks.list();
  if(!tasks.length){
    await HomeDB.tasks.add({title:'Küche aufräumen',duration:30});
    await HomeDB.tasks.add({title:'Bad reinigen',duration:60});
    await HomeDB.tasks.add({title:'Wäsche falten',duration:15});
    await HomeDB.tasks.add({title:'Boden saugen',duration:30});
    await HomeDB.tasks.add({title:'Fenster putzen',duration:60});
    await HomeDB.tasks.add({title:'Einkaufsliste erstellen',duration:15});
  }
}
function renderTaskItem(t){
  const li=el('div','list-item');
  const title=el('div','list-title');title.textContent=t.title;
  const meta=el('div','card-meta');meta.textContent=t.duration+' min';
  const left=el('div');left.append(title,meta);
  const actions=el('div','list-actions');
  const delBtn=el('button','icon-btn btn-danger');
  delBtn.setAttribute('aria-label','Aufgabe löschen');
  delBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M6 7h12v14H6V7zm3-3h6v2H9V4z"/></svg>';
  delBtn.onclick=async()=>{await HomeDB.tasks.del(t.id);await renderTasks()};
  actions.append(delBtn);
  li.append(left,actions);
  return li;
}
async function renderTasks(){
  const c=$('#tasks-container');
  if(!c) return;
  c.innerHTML='';
  const tasks=await HomeDB.tasks.list();
  tasks.forEach(t=>c.append(renderTaskItem(t)));
}
async function getOrFixTodayPlan(){
  if (window.HomeScheduler && typeof HomeScheduler.getOrFixTodayPlan === 'function') return HomeScheduler.getOrFixTodayPlan();
  let plan=await HomeDB.dailyPlans.get(todayKey());
  if(!plan || !plan.tasks || plan.tasks.length<3) plan=await HomeScheduler.generateDailyPlan();
  return plan;
}
let cardStackManager = null;
async function renderPlan(){
  const plan=await getOrFixTodayPlan();
  const cardsContainer = document.getElementById('cards-container');
  if (!cardsContainer) return;
  if (!cardStackManager) {
    cardStackManager = new CardStackManager('cards-container', {
      swipeThreshold: 80,
      swipeUpThreshold: 60,
      onSwap: async (task) => {
        if (!task || task.id < 0) return null;
        const updated = await HomeScheduler.swapTask(todayKey(), task.id);
        return { tasks: updated.tasks, swapsRemaining: updated.swapsRemaining };
      },
      onComplete: async (task) => {
        if (!task || task.id < 0) return null;
        const updated = await HomeScheduler.completeTask(todayKey(), task.id);
        const allDone = updated && updated.tasks && updated.tasks.every(t => t.status === 'done');
        if (allDone) {
          cardStackManager.showToast('Alle Aufgaben erledigt - Gut gemacht!');
          await updateStreakIfEligible(todayKey(), updated);
          await renderStats();
        }
        return { tasks: updated.tasks, swapsRemaining: updated.swapsRemaining };
      }
    });
    window.cardStackManager = cardStackManager;
  }
  await cardStackManager.loadCards(plan.tasks, { swapsRemaining: plan.swapsRemaining });
}
function initTabs(){
  const tabs=Array.from(document.querySelectorAll('.tab'));
  const sections={
    plan: document.querySelector('.daily-plan'),
    tasks: document.querySelector('.tasks'),
    stats: document.querySelector('.stats'),
    settings: document.querySelector('.settings'),
  };
  Object.values(sections).forEach((el)=>{if(el) el.classList.add('page');});
  let currentTab = tabs.find(t=>t.classList.contains('active'))?.dataset.tab || 'plan';
  const setActiveTab=async(tab)=>{
    const prevTab = currentTab;
    currentTab = tab;
    const prevEl = sections[prevTab];
    const nextEl = sections[tab];
    const fabBtn = document.getElementById('add-task');
    if(prevEl) prevEl.hidden = true;
    if(nextEl){
      nextEl.hidden = false;
      nextEl.classList.remove('page-enter-left','page-enter-right');
      const prevIdx = tabs.findIndex(t=>t.dataset.tab===prevTab);
      const nextIdx = tabs.findIndex(t=>t.dataset.tab===tab);
      const dir = prevIdx !== -1 && nextIdx !== -1 && nextIdx < prevIdx ? 'left' : 'right';
      nextEl.classList.add(dir === 'left' ? 'page-enter-left' : 'page-enter-right');
      const onEnd = () => {
        nextEl.classList.remove('page-enter-left','page-enter-right');
        nextEl.removeEventListener('animationend', onEnd);
      };
      nextEl.addEventListener('animationend', onEnd);
    }
    Object.entries(sections).forEach(([key,el])=>{
      if(!el) return;
      if(key!==tab) el.hidden = true;
    });
    tabs.forEach(btn=>{
      const active = btn.dataset.tab === tab;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-selected', active ? 'true' : 'false');
      btn.setAttribute('tabindex', active ? '0' : '-1');
    });
    if (fabBtn) {
      fabBtn.hidden = tab !== 'tasks';
    }
    if (tab==='plan') await renderPlan();
    if (tab==='tasks') await renderTasks();
    if (tab==='stats') await renderStats();
  };
  tabs.forEach((b,idx)=>{
    b.setAttribute('role','tab');
    b.onclick=()=>setActiveTab(b.dataset.tab);
    b.addEventListener('keydown',(e)=>{
      if(e.key!=='ArrowLeft'&&e.key!=='ArrowRight') return;
      e.preventDefault();
      const nextIdx = e.key==='ArrowRight' ? (idx+1)%tabs.length : (idx-1+tabs.length)%tabs.length;
      tabs[nextIdx].focus();
      setActiveTab(tabs[nextIdx].dataset.tab);
    });
  });
  const tabbar=document.querySelector('.tabbar');
  if(tabbar) tabbar.setAttribute('role','tablist');
  window.__setActiveTab = setActiveTab;
  setActiveTab('plan');
}
function initActions(){
  const shuffleBtn=$('#shuffle');
  if (shuffleBtn) shuffleBtn.onclick=async()=>{
    if (!cardStackManager) await renderPlan();
    const current = cardStackManager ? cardStackManager.getCurrentTask() : null;
    if (!current || current.id < 0) return;
    try {
      const updated = await HomeScheduler.swapTask(todayKey(), current.id);
      await cardStackManager.loadCards(updated.tasks, { swapsRemaining: updated.swapsRemaining });
    } catch (e) {
      if (cardStackManager) cardStackManager.showToast(e && e.message ? e.message : 'Keine Swaps mehr verfügbar');
    }
  };
  const completeBtn=$('#complete');
  if (completeBtn) completeBtn.onclick=async()=>{
    await HomeScheduler.completePlan(todayKey());
    await renderPlan();
    await renderStats();
    if (cardStackManager) cardStackManager.showToast('Abgeschlossen!');
  };
  $('#add-task').onclick=()=>openTaskModal();
  const toggle=$('#theme-toggle');
  if(toggle){
    const current=document.documentElement.getAttribute('data-theme') || 'dark';
    toggle.checked=current==='dark';
    toggle.onchange=async()=>{
      const next=toggle.checked?'dark':'light';
      document.documentElement.setAttribute('data-theme', next);
      document.body.setAttribute('data-theme', next);
      await HomeDB.settings.put({key:'theme',value:next});
      renderStats();
    };
  }

  const helpBtn = $('#open-help');
  if (helpBtn) helpBtn.onclick = () => openHelpSheet();
  const restartTutorialBtn = $('#restart-tutorial');
  if (restartTutorialBtn) restartTutorialBtn.onclick = () => {
    localStorage.removeItem('onboardingSeen');
    openTutorial();
  };
  const exportBtn = $('#export-data');
  if (exportBtn) exportBtn.onclick = () => exportData();
  const importBtn = $('#import-data');
  const importFile = $('#import-file');
  if (importBtn && importFile) {
    importBtn.onclick = () => importFile.click();
    importFile.onchange = async () => {
      const file = importFile.files && importFile.files[0];
      importFile.value = '';
      if (!file) return;
      try {
        await importData(file);
        showToast('Import erfolgreich');
        await renderPlan();
        await renderTasks();
        await renderStats();
      } catch (e) {
        showToast(e && e.message ? e.message : 'Import fehlgeschlagen');
      }
    };
  }
}

function openHelpSheet(){
  const b=$('#help-backdrop');
  const s=$('#help-sheet');
  if(!b||!s) return;
  const previouslyFocused=document.activeElement;
  b.classList.add('open');
  b.setAttribute('aria-hidden','false');
  s.classList.add('open');
  s.setAttribute('aria-hidden','false');
  const close=()=>{
    s.classList.remove('open');
    s.setAttribute('aria-hidden','true');
    b.classList.remove('open');
    b.setAttribute('aria-hidden','true');
    document.removeEventListener('keydown', onKeyDown);
    if(previouslyFocused && typeof previouslyFocused.focus === 'function') previouslyFocused.focus();
  };
  const onKeyDown=(e)=>{
    if(e.key==='Escape'){e.preventDefault();close();return;}
  };
  document.addEventListener('keydown', onKeyDown);
  b.onclick=(e)=>{if(e.target===b) close();};
  const closeBtn=$('#help-close');
  if(closeBtn) closeBtn.onclick=close;
  const first=s.querySelector('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])');
  if(first) first.focus();
}

let tutorialIndex = 0;
function setTutorialSlide(nextIndex){
  const slides = document.getElementById('tutorial-slides');
  const dots = document.getElementById('tutorial-dots');
  const back = document.getElementById('tutorial-back');
  const next = document.getElementById('tutorial-next');
  if(!slides || !dots || !back || !next) return;
  tutorialIndex = Math.max(0, Math.min(2, nextIndex));
  slides.style.transform = `translateX(${-tutorialIndex * 100}%)`;
  Array.from(dots.querySelectorAll('.tutorial__dot')).forEach((d, i) => d.classList.toggle('active', i === tutorialIndex));
  back.disabled = tutorialIndex === 0;
  next.textContent = tutorialIndex === 2 ? 'Fertig' : 'Weiter';
}

function openTutorial(){
  const b=$('#tutorial-backdrop');
  const t=$('#tutorial');
  if(!b||!t) return;
  const help=$('#gesture-help');
  if(help) help.hidden = true;
  const previouslyFocused=document.activeElement;
  b.classList.add('open');
  b.setAttribute('aria-hidden','false');
  t.classList.add('open');
  t.setAttribute('aria-hidden','false');
  setTutorialSlide(0);
  const close=(markSeen)=>{
    t.classList.remove('open');
    t.setAttribute('aria-hidden','true');
    b.classList.remove('open');
    b.setAttribute('aria-hidden','true');
    document.removeEventListener('keydown', onKeyDown);
    if(markSeen){
      localStorage.setItem('onboardingSeen','1');
      localStorage.setItem('gestureHelpDismissed','1');
    }
    if(previouslyFocused && typeof previouslyFocused.focus === 'function') previouslyFocused.focus();
  };
  const onKeyDown=(e)=>{
    if(e.key==='Escape'){e.preventDefault();close(false);return;}
  };
  document.addEventListener('keydown', onKeyDown);
  b.onclick=(e)=>{if(e.target===b) close(false);};
  const skip=$('#tutorial-skip');
  const back=$('#tutorial-back');
  const next=$('#tutorial-next');
  if(skip) skip.onclick=()=>close(true);
  if(back) back.onclick=()=>setTutorialSlide(tutorialIndex-1);
  if(next) next.onclick=()=>{
    if(tutorialIndex>=2) close(true);
    else setTutorialSlide(tutorialIndex+1);
  };
  const first=t.querySelector('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])');
  if(first) first.focus();
}

function showTutorialIfNeeded(){
  const seen = localStorage.getItem('onboardingSeen') === '1';
  if(!seen) openTutorial();
}

function downloadJSON(filename, obj){
  const blob=new Blob([JSON.stringify(obj,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;
  a.download=filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}

async function exportData(){
  const payload={
    exportedAt:new Date().toISOString(),
    data:{
      tasks: await HomeDB.tasks.list(),
      dailyPlans: await HomeDB.dailyPlans.list(),
      streaks: await HomeDB.streaks.list(),
      settings: await HomeDB.settings.list(),
      learningPatterns: await HomeDB.learningPatterns.list(),
      taskSwaps: await HomeDB.taskSwaps.list()
    }
  };
  downloadJSON(`cleanhome-export-${todayKey()}.json`, payload);
  showToast('Export erstellt');
}

async function importData(file){
  const text = await file.text();
  let json;
  try { json = JSON.parse(text); } catch { throw new Error('Ungültige JSON-Datei'); }
  const data = json && json.data ? json.data : json;
  if (!data || typeof data !== 'object') throw new Error('Ungültiges Datenformat');

  await HomeDB.taskSwaps.clear();
  await HomeDB.learningPatterns.clear();
  await HomeDB.dailyPlans.clear();
  await HomeDB.tasks.clear();
  await HomeDB.settings.clear();
  await HomeDB.streaks.clear();

  const tasks = Array.isArray(data.tasks) ? data.tasks : [];
  for (const t of tasks) await HomeDB.tasks.put(t);
  const dailyPlans = Array.isArray(data.dailyPlans) ? data.dailyPlans : [];
  for (const p of dailyPlans) await HomeDB.dailyPlans.put(p);
  const streaks = Array.isArray(data.streaks) ? data.streaks : [];
  for (const st of streaks) await HomeDB.streaks.put(st);
  const settings = Array.isArray(data.settings) ? data.settings : [];
  for (const s of settings) await HomeDB.settings.put(s);
  const learningPatterns = Array.isArray(data.learningPatterns) ? data.learningPatterns : [];
  for (const lp of learningPatterns) await HomeDB.learningPatterns.add(lp);
  const swaps = Array.isArray(data.taskSwaps) ? data.taskSwaps : [];
  for (const sw of swaps) await HomeDB.taskSwaps.add(sw);
}
function openTaskModal(){
  const m=$('#task-modal');
  const b=$('#modal-backdrop');
  if(!m||!b) return;
  const previouslyFocused=document.activeElement;
  b.classList.add('open');
  b.setAttribute('aria-hidden','false');
  m.classList.add('open');
  m.setAttribute('aria-hidden','false');
  const close=()=>{
    m.classList.remove('open');
    m.setAttribute('aria-hidden','true');
    b.classList.remove('open');
    b.setAttribute('aria-hidden','true');
    document.removeEventListener('keydown', onKeyDown);
    if(previouslyFocused && typeof previouslyFocused.focus === 'function') previouslyFocused.focus();
  };
  const getFocusable=()=>{
    const selectors='button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])';
    return Array.from(m.querySelectorAll(selectors)).filter(el=>!el.hasAttribute('disabled') && !el.getAttribute('aria-hidden'));
  };
  const onKeyDown=(e)=>{
    if(e.key==='Escape'){e.preventDefault();close();return;}
    if(e.key!=='Tab') return;
    const focusable=getFocusable();
    if(!focusable.length) return;
    const first=focusable[0];
    const last=focusable[focusable.length-1];
    if(e.shiftKey && document.activeElement===first){e.preventDefault();last.focus();return;}
    if(!e.shiftKey && document.activeElement===last){e.preventDefault();first.focus();return;}
  };
  document.addEventListener('keydown', onKeyDown);
  $('#task-cancel').onclick=close;
  const closeBtn=$('#task-close');
  if(closeBtn) closeBtn.onclick=close;
  b.onclick=(e)=>{if(e.target===b) close();};
  const titleInput=$('#task-title');
  if(titleInput){
    titleInput.value='';
    titleInput.focus();
  }
  $('#task-form').onsubmit=async(e)=>{
    e.preventDefault();
    const title=$('#task-title').value.trim();
    const duration=parseInt($('#task-duration').value,10);
    if(!title||!duration) return;
    await HomeDB.tasks.add({title,duration});
    await renderTasks();
    close();
  };
}
async function renderStats(){
  const c=$('#stats-container');if(!c)return;c.innerHTML='';
  const plan=await getOrFixTodayPlan();
  const total=Math.max(3, plan.tasks.length);
  const done=plan.tasks.filter(t=>t.status==='done').length;
  const card1=el('div','card');const t1=el('div','card-title');t1.textContent='Heute erledigt';const m1=el('div','card-meta');m1.textContent=done+' / '+total;card1.append(t1,m1);c.append(card1);
  const plans=await HomeDB.dailyPlans.list();
  const allTimeDone=plans.reduce((sum,p)=>sum+(p.tasks||[]).filter(x=>x.status==='done').length,0);
  const card2=el('div','card');const t2=el('div','card-title');t2.textContent='Insgesamt schon erledigt';const m2=el('div','card-meta');m2.textContent=String(allTimeDone);card2.append(t2,m2);c.append(card2);
  const streak=await getStreak();
  const card3=el('div','card');const t3=el('div','card-title');t3.textContent='Streak';const m3=el('div','card-meta');m3.textContent=String(streak.count||0)+' Tage';card3.append(t3,m3);c.append(card3);
}
async function start(){
  await ensureDefaults();
  await ensureDayRollover();
  initTabs();
  initActions();
  await renderTasks();
  await renderStats();
  scheduleMidnightRefresh();
  showTutorialIfNeeded();
}
document.addEventListener('DOMContentLoaded',start);
