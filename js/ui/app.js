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
  if(!hasAvail) await HomeDB.settings.put({key:'availability',montag:60,dienstag:60,mittwoch:60,donnerstag:60,freitag:60,samstag:90,sonntag:90});
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
  const wrapper = el('div', 'list-item-wrapper');
  wrapper.dataset.taskId = String(t.id);

  const editAction = el('div', 'list-item-action list-item-action--edit');
  editAction.innerHTML = '<svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg><span>Bearbeiten</span>';

  const deleteAction = el('div', 'list-item-action list-item-action--delete');
  deleteAction.innerHTML = '<span>Löschen</span><svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>';

  const li=el('div','list-item');
  const title=el('div','list-title');title.textContent=t.title;
  const meta=el('div','card-meta');
  const isFixed = t && t.repeat && t.repeat.kind && t.repeat.kind !== 'none';
  const parts = [];
  if (isFixed) {
    const fmt = window.HomeRecurrence && typeof window.HomeRecurrence.formatGermanDateTime === 'function' ? window.HomeRecurrence.formatGermanDateTime : null;
    const due = t.nextDue ? (fmt ? fmt(t.nextDue, t.repeat && t.repeat.time ? t.repeat.time : null) : t.nextDue) : '—';
    parts.push(`nächster Termin am ${due}`);
  }
  parts.push(`${t.duration} min`);
  if (t && t.repeatError) parts.push(String(t.repeatError));
  meta.textContent = parts.join(' • ');
  const left=el('div');left.append(title,meta);
  li.append(left);

  wrapper.append(editAction, deleteAction, li);
  return wrapper;
}
let listSwipeManager = null;
async function renderTasks(){
  const c=$('#tasks-container');
  if(!c) return;
  c.innerHTML='';
  const tasks=await HomeDB.tasks.list();
  tasks.forEach(t=>c.append(renderTaskItem(t)));

  if (!listSwipeManager) {
    listSwipeManager = new ListSwipeManager('tasks-container', {
      threshold: 60,
      onEdit: async (id) => {
        const task = await HomeDB.tasks.get(parseInt(id, 10));
        if (task) openTaskModal(task);
      },
      onDelete: async (id) => {
        await HomeDB.tasks.del(parseInt(id, 10));
        await renderTasks();
      }
    });
  }
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
    try {
      if (tab==='plan') await renderPlan();
      if (tab==='tasks') {
        await renderTasks();
        showUpdatePopupIfNeeded();
      }
      if (tab==='stats') await renderStats();
    } catch (err) {
      console.error(`Error rendering tab ${tab}:`, err);
      showToast('Fehler beim Anzeigen: ' + err.message);
    }
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

  const resetBtn = $('#danger-reset');
  if (resetBtn) resetBtn.onclick = async () => {
    if (confirm('Möchtest du wirklich alle Daten löschen? Dies kann nicht rückgängig gemacht werden.')) {
      localStorage.clear();
      const req = indexedDB.deleteDatabase('homeorganizer');
      req.onsuccess = () => {
        alert('Daten gelöscht. Die App wird neu geladen.');
        location.reload();
      };
      req.onerror = () => {
        alert('Fehler beim Löschen der Datenbank.');
      };
    }
  };
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

let updateIndex = 0;
function setUpdateSlide(nextIndex){
  const slides = document.getElementById('update-slides');
  const dots = document.getElementById('update-dots');
  const back = document.getElementById('update-back');
  const next = document.getElementById('update-next');
  if(!slides || !dots || !back || !next) return;
  updateIndex = Math.max(0, Math.min(1, nextIndex));
  slides.style.transform = `translateX(${-updateIndex * 100}%)`;
  Array.from(dots.querySelectorAll('.tutorial__dot')).forEach((d, i) => d.classList.toggle('active', i === updateIndex));
  back.disabled = updateIndex === 0;
  next.textContent = updateIndex === 1 ? 'Fertig' : 'Weiter';
}

function openUpdateModal(){
  const b=$('#update-backdrop');
  const m=$('#update-modal');
  if(!b||!m) return;
  const previouslyFocused=document.activeElement;
  b.classList.add('open');
  b.setAttribute('aria-hidden','false');
  m.classList.add('open');
  m.setAttribute('aria-hidden','false');
  setUpdateSlide(0);
  const close=()=>{
    m.classList.remove('open');
    m.setAttribute('aria-hidden','true');
    b.classList.remove('open');
    b.setAttribute('aria-hidden','true');
    localStorage.setItem('swipeUpdateSeen', '1');
    document.removeEventListener('keydown', onKeyDown);
    if(previouslyFocused && typeof previouslyFocused.focus === 'function') previouslyFocused.focus();
  };
  const onKeyDown=(e)=>{
    if(e.key==='Escape'){e.preventDefault();close();return;}
  };
  document.addEventListener('keydown', onKeyDown);
  b.onclick=(e)=>{if(e.target===b) close();};
  const closeBtn=$('#update-close');
  if(closeBtn) closeBtn.onclick=close;
  const backBtn=$('#update-back');
  const nextBtn=$('#update-next');
  if(backBtn) backBtn.onclick=()=>setUpdateSlide(updateIndex-1);
  if(nextBtn) nextBtn.onclick=()=>{
    if(updateIndex>=1) close();
    else setUpdateSlide(updateIndex+1);
  };
  const first=m.querySelector('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])');
  if(first) first.focus();
}

function showUpdatePopupIfNeeded(){
  const seen = localStorage.getItem('swipeUpdateSeen') === '1';
  if(!seen) openUpdateModal();
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
function openTaskModal(taskToEdit = null){
  const m=$('#task-modal');
  const b=$('#modal-backdrop');
  if(!m||!b) return;

  const titleEl = $('#task-modal-title');
  if (titleEl) titleEl.textContent = taskToEdit ? 'Aufgabe bearbeiten' : 'Neue Aufgabe';

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
  const durationSelect = $('#task-duration');
  const repeatSelect = $('#task-repeat');
  const startGroup = $('#repeat-start-group');
  const startDateInput = $('#task-start-date');
  const weekdaysGroup = $('#repeat-weekdays-group');
  const weekdayButtons = Array.from(m.querySelectorAll('.weekday-chip'));
  const monthdayGroup = $('#repeat-monthday-group');
  const monthdayInput = $('#task-monthday');
  const customGroup = $('#repeat-custom-group');
  const customEveryInput = $('#task-custom-every');
  const customUnitSelect = $('#task-custom-unit');
  const previewGroup = $('#repeat-preview-group');
  const previewEl = $('#repeat-preview');

  const today = todayKey();

  // Reset / Set Initial Values
  if (titleInput) {
    titleInput.value = taskToEdit ? taskToEdit.title : '';
    titleInput.focus();
  }
  if (durationSelect) durationSelect.value = taskToEdit ? String(taskToEdit.duration) : '30';
  if (repeatSelect) {
    if (!taskToEdit || !taskToEdit.repeat || taskToEdit.repeat.kind === 'none') {
      repeatSelect.value = 'none';
    } else {
      const r = taskToEdit.repeat;
      if (r.kind === 'weekly') {
        if (r.intervalWeeks === 1) {
          repeatSelect.value = r.daysOfWeek && r.daysOfWeek.length > 1 ? 'multi_week' : 'weekly';
        } else if (r.intervalWeeks === 2) {
          repeatSelect.value = 'biweekly';
        } else {
          repeatSelect.value = 'custom';
        }
      } else if (r.kind === 'monthly' && r.intervalMonths === 1) {
        repeatSelect.value = 'monthly';
      } else if (r.kind === 'quarterly') {
        repeatSelect.value = 'quarterly';
      } else if (r.kind === 'halfyear') {
        repeatSelect.value = 'halfyear';
      } else if (r.kind === 'yearly') {
        repeatSelect.value = 'yearly';
      } else {
        repeatSelect.value = 'custom';
      }
    }
  }

  if (startDateInput) startDateInput.value = taskToEdit && taskToEdit.repeat && taskToEdit.repeat.startDate ? taskToEdit.repeat.startDate : today;
  if (monthdayInput) monthdayInput.value = taskToEdit && taskToEdit.repeat && taskToEdit.repeat.dayOfMonth ? taskToEdit.repeat.dayOfMonth : '';
  if (customEveryInput) {
    if (taskToEdit && taskToEdit.repeat && taskToEdit.repeat.kind === 'custom') {
      customEveryInput.value = taskToEdit.repeat.every || '';
    } else if (taskToEdit && taskToEdit.repeat && taskToEdit.repeat.kind === 'weekly') {
      customEveryInput.value = taskToEdit.repeat.intervalWeeks || '';
    } else if (taskToEdit && taskToEdit.repeat && taskToEdit.repeat.kind === 'monthly') {
      customEveryInput.value = taskToEdit.repeat.intervalMonths || '';
    } else {
      customEveryInput.value = '';
    }
  }
  if (customUnitSelect) {
    if (taskToEdit && taskToEdit.repeat && taskToEdit.repeat.kind === 'custom') {
      customUnitSelect.value = taskToEdit.repeat.unit || 'day';
    } else if (taskToEdit && taskToEdit.repeat && taskToEdit.repeat.kind === 'weekly') {
      customUnitSelect.value = 'week';
    } else if (taskToEdit && taskToEdit.repeat && taskToEdit.repeat.kind === 'monthly') {
      customUnitSelect.value = 'month';
    } else {
      customUnitSelect.value = 'day';
    }
  }

  weekdayButtons.forEach(btn => {
    const dow = parseInt(btn.dataset.dow, 10);
    const isSelected = taskToEdit && taskToEdit.repeat && taskToEdit.repeat.daysOfWeek && taskToEdit.repeat.daysOfWeek.includes(dow);
    btn.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
  });

  const clearError = (input) => {
    if (!input) return;
    input.classList.remove('input-field--error');
    input.removeAttribute('aria-invalid');
    const group = input.closest('.input-group');
    const msg = group ? group.querySelector('.input-error-message[data-for="' + input.id + '"]') : null;
    if (msg) msg.remove();
  };
  const setError = (input, message) => {
    if (!input) return;
    input.classList.add('input-field--error');
    input.setAttribute('aria-invalid', 'true');
    const group = input.closest('.input-group');
    if (!group) return;
    let msg = group.querySelector('.input-error-message[data-for="' + input.id + '"]');
    if (!msg) {
      msg = document.createElement('span');
      msg.className = 'input-error-message';
      msg.dataset.for = input.id;
      group.appendChild(msg);
    }
    msg.textContent = message;
  };

  const getSelectedDays = () => weekdayButtons.filter(b => b.getAttribute('aria-pressed') === 'true').map(b => parseInt(b.dataset.dow, 10)).filter(Number.isFinite).sort((a, c) => a - c);
  const ensureDefaultWeekday = () => {
    if (!weekdayButtons.length) return;
    const anySelected = weekdayButtons.some(b => b.getAttribute('aria-pressed') === 'true');
    if (anySelected) return;
    const dow = window.HomeRecurrence && typeof window.HomeRecurrence.weekdayIndexMonday0 === 'function' ? window.HomeRecurrence.weekdayIndexMonday0(today) : 0;
    const btn = weekdayButtons.find(b => parseInt(b.dataset.dow, 10) === dow);
    if (btn) btn.setAttribute('aria-pressed', 'true');
  };

  const buildRepeatInput = () => {
    if (!repeatSelect) return null;
    const mode = repeatSelect.value;
    if (mode === 'none') return { kind: 'none' };
    const startDate = startDateInput && startDateInput.value ? startDateInput.value : today;
    const time = null;
    if (mode === 'multi_week') return { kind: 'weekly', startDate, time, daysOfWeek: getSelectedDays(), intervalWeeks: 1 };
    if (mode === 'weekly') return { kind: 'weekly', startDate, time, daysOfWeek: getSelectedDays(), intervalWeeks: 1 };
    if (mode === 'biweekly') return { kind: 'weekly', startDate, time, daysOfWeek: getSelectedDays(), intervalWeeks: 2 };
    if (mode === 'monthly') return { kind: 'monthly', startDate, time, dayOfMonth: monthdayInput && monthdayInput.value ? parseInt(monthdayInput.value, 10) : null, intervalMonths: 1 };
    if (mode === 'quarterly') return { kind: 'quarterly', startDate, time };
    if (mode === 'halfyear') return { kind: 'halfyear', startDate, time };
    if (mode === 'yearly') return { kind: 'yearly', startDate, time };
    if (mode === 'custom') {
      const unit = customUnitSelect ? customUnitSelect.value : 'day';
      const every = customEveryInput && customEveryInput.value ? parseInt(customEveryInput.value, 10) : null;
      const base = { kind: 'custom', startDate, time, unit, every };
      if (unit === 'week') return { ...base, daysOfWeek: getSelectedDays() };
      if (unit === 'month') return { ...base, dayOfMonth: monthdayInput && monthdayInput.value ? parseInt(monthdayInput.value, 10) : null };
      return base;
    }
    return { kind: 'none' };
  };

  const updatePreview = () => {
    if (!previewEl || !previewGroup || !repeatSelect) return;
    const mode = repeatSelect.value;
    previewGroup.hidden = mode === 'none';
    if (mode === 'none') {
      previewEl.textContent = '—';
      return;
    }
    if (!window.HomeRecurrence) {
      previewEl.textContent = '—';
      return;
    }
    try {
      const normalized = window.HomeRecurrence.normalizeRepeatConfig(buildRepeatInput());
      const next = window.HomeRecurrence.nextDueOnOrAfter(today, normalized);
      const fmt = window.HomeRecurrence.formatGermanDateTime;
      const dueStr = next ? (fmt ? fmt(next, normalized.time) : next) : '—';
    const duration = parseInt($('#task-duration').value, 10) || 0;
    previewEl.textContent = `nächster Termin am ${dueStr} • ${duration} min`;
  } catch (e) {
      previewEl.textContent = e && e.message ? e.message : 'Ungültiges Intervall';
    }
  };

  const updateRepeatUI = () => {
    if (!repeatSelect) return;
    const mode = repeatSelect.value;
    if (startGroup) startGroup.hidden = mode === 'none';
    if (weekdaysGroup) weekdaysGroup.hidden = !(mode === 'multi_week' || mode === 'weekly' || mode === 'biweekly' || (mode === 'custom' && customUnitSelect && customUnitSelect.value === 'week'));
    if (monthdayGroup) monthdayGroup.hidden = !(mode === 'monthly' || (mode === 'custom' && customUnitSelect && customUnitSelect.value === 'month'));
    if (customGroup) customGroup.hidden = mode !== 'custom';
    if (mode === 'weekly' || mode === 'biweekly') ensureDefaultWeekday();
    updatePreview();
  };

  weekdayButtons.forEach(btn => {
    btn.onclick = () => {
      const isSingleMode = repeatSelect && (repeatSelect.value === 'weekly' || repeatSelect.value === 'biweekly');
      const pressed = btn.getAttribute('aria-pressed') === 'true';
      if (isSingleMode) {
        weekdayButtons.forEach(b => b.setAttribute('aria-pressed', 'false'));
        btn.setAttribute('aria-pressed', 'true');
      } else {
        btn.setAttribute('aria-pressed', pressed ? 'false' : 'true');
      }
      updatePreview();
    };
  });
  if (repeatSelect) repeatSelect.onchange = () => updateRepeatUI();
  if (durationSelect) durationSelect.onchange = () => updatePreview();
  if (customUnitSelect) customUnitSelect.onchange = () => updateRepeatUI();
  if (startDateInput) startDateInput.onchange = () => updatePreview();
  if (monthdayInput) monthdayInput.oninput = () => updatePreview();
  if (customEveryInput) customEveryInput.oninput = () => updatePreview();
  updateRepeatUI();

  $('#task-form').onsubmit=async(e)=>{
    e.preventDefault();
    clearError(titleInput);
    clearError(durationSelect);
    if (repeatSelect) clearError(repeatSelect);
    clearError(startDateInput);
    clearError(monthdayInput);
    clearError(customEveryInput);
    clearError(customUnitSelect);

    const title=$('#task-title').value.trim();
    const duration=parseInt($('#task-duration').value,10);
    if(!title){setError(titleInput,'Titel ist erforderlich');return;}
    if(!duration){setError(durationSelect,'Dauer ist erforderlich');return;}

    const repeatInput = buildRepeatInput();
    let task = { title, duration };
    if (repeatInput && repeatInput.kind && repeatInput.kind !== 'none') {
      if (!startDateInput || !startDateInput.value) { setError(startDateInput,'Startdatum ist erforderlich'); return; }
      try {
        const normalized = window.HomeRecurrence ? window.HomeRecurrence.normalizeRepeatConfig(repeatInput) : repeatInput;
        if ((repeatSelect.value === 'weekly' || repeatSelect.value === 'biweekly') && normalized.kind === 'weekly' && normalized.daysOfWeek.length !== 1) {
          showToast('Bitte genau einen Wochentag auswählen');
          return;
        }
        const nextDue = window.HomeRecurrence ? window.HomeRecurrence.nextDueOnOrAfter(today, normalized) : null;
        task = { ...task, repeat: normalized, nextDue, lastCompletedDue: taskToEdit ? taskToEdit.lastCompletedDue : null };
      } catch (err) {
        showToast(err && err.message ? err.message : 'Ungültiges Intervall');
        return;
      }
    }

    if (taskToEdit) {
      task.id = taskToEdit.id;
      await HomeDB.tasks.put(task);
    } else {
      await HomeDB.tasks.add(task);
    }
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
  try {
    await ensureDefaults();
    await ensureDayRollover();
    initTabs();
    initActions();
    await renderTasks();
    await renderStats();
    scheduleMidnightRefresh();
    showTutorialIfNeeded();
  } catch (err) {
    console.error('Initialization error:', err);
    showToast('Fehler beim Laden: ' + (err.message || 'Unbekannter Fehler'));
    // Fallback: try to show the plan at least
    const container = document.getElementById('cards-container');
    if (container) {
      container.innerHTML = `<div class="card"><div class="card-title">Fehler</div><div class="card-meta">${err.message || 'Die App konnte nicht korrekt geladen werden.'}</div></div>`;
    }
  }
}
document.addEventListener('DOMContentLoaded',start);
