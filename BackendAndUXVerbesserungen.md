---
DETAILLIERTER IMPLEMENTIERUNGSPLAN: Karteikarten-System v2.0
---
1. PROJEKT-ANALYSE & STATUS QUO
1.1 Aktuelle Architektur
C:\Users\Benja\Desktop\CleanHome\
├── index.html              (112 Zeilen - HTML Struktur)
├── js/
│   ├── db/idb.js          (64 Zeilen - IndexedDB Wrapper)
│   ├── logic/scheduler.js  (58 Zeilen - Plan-Logik)
│   └── ui/app.js           (229 Zeilen - UI/Events)
├── styles/design-system.css (544 Zeilen - Neo-Brutalism CSS)
├── manifest.json           (PWA Manifest)
└── sw.js                   (Service Worker)
1.2 Aktuelle Funktionalität
- 3-Aufgaben-Prinzip: Täglich 3 Aufgaben basierend auf verfügbarer Zeit
- Horizontales Swipen: Wechsel zwischen Karten (nur Index-basierend)
- Einfache Buttons: "Plan neu" und "Abschließen"
- Task CRUD: Aufgaben hinzufügen/löschen
- Theme Toggle: Dark/Light Mode
- IndexedDB: Lokale Datenspeicherung
1.3 Fehlende Features
| Feature | Status | Priorität |
|---------|--------|-----------|
| Swipe-Up für nächste Karte | ❌ Nicht vorhanden | 🔴 Hoch |
| Swipe-Left für "Neu" | ❌ Teilweise (Button) | 🔴 Hoch |
| Swipe-Right für "Abschließen" | ❌ Teilweise (Button) | 🔴 Hoch |
| Zirkuläre Navigation (1→2→3→1) | ❌ Nein | 🟡 Mittel |
| Difficulty-Level (2x leicht, 1x schwer) | ❌ Nein | 🟡 Mittel |
| Max 3x "Neu" pro Tag | ❌ Nein | 🟡 Mittel |
| Smooth Animations | ⚠️ Basic | 🔴 Hoch |
| Card Stack Physics | ⚠️ Basic | 🟡 Mittel |
---
2. BACKEND-VERBESSERUNGEN
2.1 Neue IndexedDB Schema-Struktur
// js/db/idb.js - ERWEITERT
const DB_NAME = 'homeorganizer';
const DB_VERSION = 2;  // Version erhöhen!
// Neue Object Stores
const STORES = {
  tasks: { keyPath: 'id', autoIncrement: true },
  dailyPlans: { keyPath: 'date' },
  streaks: { keyPath: 'id' },
  settings: { keyPath: 'key' },
  learningPatterns: { keyPath: 'id', autoIncrement: true },
  taskSwaps: { keyPath: 'id', autoIncrement: true }  // NEU: Swap-Tracking
};
// Schema-Erweiterungen
interface DailyPlan {
  date: string;
  tasks: PlanTask[];
  minutes: number;
  difficulty: 'easy' | 'medium' | 'hard';  // NEU
  swapsRemaining: number;  // NEU: 3 pro Tag
}
interface PlanTask {
  id: number;
  title: string;
  duration: number;
  difficulty: 'easy' | 'medium' | 'hard';  // NEU
  status: 'pending' | 'done' | 'skipped';
  swappedAt?: ISOString;  // NEU: Zeitstempel für Swaps
}
interface TaskSwap {
  id: number;
  originalTaskId: number;
  newTaskId: number;
  date: string;
  timestamp: ISOString;
}
2.2 Scheduler Logic - Neue Funktionen
// js/logic/scheduler.js - ERWEITERT
class TaskDifficulty {
  static EASY = 'easy';      // 15 min
  static MEDIUM = 'medium'; // 30 min
  static HARD = 'hard';     // 60+ min
}
class DailyPlanner {
  // NEU: Difficulty-basierte Auswahl
  async generateBalancedPlan() {
    const tasks = await HomeDB.tasks.list();
    const availableMinutes = await this.getAvailableMinutes();
    
    // 2 leichte + 1 schwere Aufgabe
    const combo = this.getDifficultyCombo(availableMinutes);
    
    const easyTasks = tasks.filter(t => t.duration <= 20);
    const hardTasks = tasks.filter(t => t.duration >= 45);
    
    // Starte mit 2 leichten Aufgaben
    const picks = [
      this.pickRandom(easyTasks),
      this.pickRandom(easyTasks.filter(t => t.id !== picks[0]?.id)),
      this.pickRandom(hardTasks)
    ];
    
    return this.createDailyPlan(picks, 'balanced');
  }
  
  // NEU: Swap-Tracking
  async swapTask(planDate, oldTaskId, newTaskId) {
    const plan = await HomeDB.dailyPlans.get(planDate);
    
    if (!plan.swapsRemaining || plan.swapsRemaining <= 0) {
      throw new Error('Keine Swaps mehr verfügbar (max 3/Tag)');
    }
    
    const swapRecord = {
      originalTaskId: oldTaskId,
      newTaskId: newTaskId,
      date: planDate,
      timestamp: new Date().toISOString()
    };
    
    await HomeDB.taskSwaps.add(swapRecord);
    
    // Update Plan
    const taskIndex = plan.tasks.findIndex(t => t.id === oldTaskId);
    if (taskIndex !== -1) {
      const newTask = await HomeDB.tasks.get(newTaskId);
      plan.tasks[taskIndex] = {
        ...newTask,
        status: 'pending',
        swappedAt: swapRecord.timestamp
      };
    }
    
    plan.swapsRemaining--;
    await HomeDB.dailyPlans.put(plan);
    
    return plan;
  }
  
  // NEU: Circular Navigation Support
  getNextCardIndex(currentIndex, totalCards, direction) {
    if (direction === 'up' || direction === 'next') {
      return (currentIndex + 1) % totalCards;
    }
    if (direction === 'down' || direction === 'prev') {
      return (currentIndex - 1 + totalCards) % totalCards;
    }
    return currentIndex;
  }
}
window.HomeScheduler = {
  generateBalancedPlan: () => new DailyPlanner().generateBalancedPlan(),
  swapTask: (date, oldId, newId) => new DailyPlanner().swapTask(date, oldId, newId),
  completeTask: (date, taskId) => new DailyPlanner().completeTask(date, taskId),
  getNextIndex: (idx, total, dir) => new DailyPlanner().getNextCardIndex(idx, total, dir)
};
2.3 API Layer für zukünftige Erweiterungen
// js/api/service.js - NEU
class APIService {
  constructor() {
    this.baseUrl = '/api';
  }
  
  async request(endpoint, options = {}) {
    // Fallback zu IndexedDB wenn offline
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        }
      });
      return response.json();
    } catch (error) {
      // Offline - nutze IndexedDB
      return this.handleOfflineRequest(endpoint, options);
    }
  }
  
  async handleOfflineRequest(endpoint, options) {
    // Route zu entsprechender DB-Operation
    const routes = {
      '/tasks': HomeDB.tasks,
      '/plans': HomeDB.dailyPlans,
      '/settings': HomeDB.settings
    };
    
    const [resource, action] = endpoint.split('/').filter(Boolean);
    const store = routes[`/${resource}`];
    
    if (!store) throw new Error('Unknown resource');
    
    switch (options.method) {
      case 'GET': return store.list ? store.list() : store.get(action);
      case 'POST': return store.add(options.body);
      case 'PUT': return store.put(options.body);
      case 'DELETE': return store.del(action);
    }
  }
}
---
3. UI/UX VERBESSERUNGEN
3.1 Neue Card Stack Komponente
<!-- index.html - NEUE STRUKTUR -->
<section class="daily-plan">
  <h2 class="section-title">
    Heutiger Plan 
    <span class="plan-progress" id="plan-progress">1/3</span>
  </h2>
  
  <!-- Swipe-Container mit Visual Feedback -->
  <div class="card-stack" id="card-stack">
    
    <!-- Swipe-Indikatoren -->
    <div class="swipe-indicator swipe-left" id="swipe-left">
      <span class="swipe-label">NEU</span>
      <span class="swipe-count" id="swipe-left-count">3</span>
    </div>
    
    <div class="swipe-indicator swipe-right" id="swipe-right">
      <span class="swipe-icon">✓</span>
      <span class="swipe-label">ERLEDIGT</span>
    </div>
    
    <div class="swipe-indicator swipe-up" id="swipe-up">
      <span class="swipe-icon">↑</span>
      <span class="swipe-label">Nächste</span>
    </div>
    
    <!-- Karten-Container -->
    <div class="cards-container" id="cards-container">
      <!-- Cards werden dynamisch eingefügt -->
    </div>
    
    <!-- Haptic Feedback Zone -->
    <div class="haptic-zone" id="haptic-zone"></div>
  </div>
  
  <!-- Desktop Fallback Buttons -->
  <div class="actions actions--desktop">
    <button id="shuffle" class="btn btn-primary">
      <span class="icon"><img src="assets/icons/material/refresh.svg" alt=""></span>
      <span class="label">Neu</span>
    </button>
    <button id="complete" class="btn btn-success">
      <span class="icon"><img src="assets/icons/material/check_circle.svg" alt=""></span>
      <span class="label">Abschließen</span>
    </button>
  </div>
  
  <!-- Mobile-Help Overlay (einmalig anzeigen) -->
  <div class="gesture-help" id="gesture-help">
    <div class="gesture-help__content">
      <h3>Willkommen bei Karteikarten!</h3>
      <ul>
        <li><span class="gesture gesture--right">→</span> Streichen für Erledigt</li>
        <li><span class="gesture gesture--left">←</span> Streichen für Neue Aufgabe</li>
        <li><span class="gesture gesture--up">↑</span> Hoch zur nächsten Karte</li>
      </ul>
      <button class="btn btn-primary" id="gesture-help-dismiss">Verstanden!</button>
    </div>
  </div>
</section>
3.2 CSS Erweiterungen für Animations
/* styles/design-system.css - ERWEITERT */
/* ========================================
   CARD STACK SYSTEM
   ======================================== */
.card-stack {
  position: relative;
  width: 100%;
  max-width: 400px;
  height: 320px;
  margin: 0 auto;
  perspective: 1000px;
}
.cards-container {
  position: relative;
  width: 100%;
  height: 100%;
}
/* ========================================
   SWIPE INDICATORS
   ======================================== */
.swipe-indicator {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  padding: 12px 20px;
  border: 3px solid var(--border-color);
  border-radius: var(--radius-2);
  font-family: var(--font-display);
  font-weight: var(--font-black);
  text-transform: uppercase;
  opacity: 0;
  transition: opacity 0.2s ease, transform 0.2s ease;
  pointer-events: none;
  z-index: 10;
}
.swipe-indicator.active {
  opacity: 1;
}
.swipe-indicator.swipe-left {
  left: 10%;
  background: var(--warning);
  color: var(--bg-primary);
  transform: translateY(-50%) translateX(-20px);
}
.swipe-indicator.swipe-left.active {
  transform: translateY(-50%) translateX(0);
}
.swipe-indicator.swipe-right {
  right: 10%;
  background: var(--success);
  color: var(--bg-primary);
  transform: translateY(-50%) translateX(20px);
}
.swipe-indicator.swipe-right.active {
  transform: translateY(-50%) translateX(0);
}
.swipe-indicator.swipe-up {
  bottom: -40px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--accent-primary);
  color: var(--bg-primary);
  opacity: 0;
}
.swipe-indicator.swipe-up.active {
  opacity: 1;
  transform: translateX(-50%) translateY(-10px);
}
.swipe-label {
  font-size: var(--text-sm);
  letter-spacing: 0.1em;
}
.swipe-count {
  display: inline-block;
  margin-left: 8px;
  padding: 2px 8px;
  background: var(--bg-primary);
  border-radius: var(--radius-1);
  font-size: var(--text-xs);
}
/* ========================================
   CARD ANIMATIONS
   ======================================== */
.card {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  min-height: 200px;
  padding: 24px;
  background: var(--bg-tertiary);
  border: 4px solid var(--border-color);
  box-shadow: 6px 6px 0 var(--shadow-color);
  border-radius: var(--radius-3);
  transition: transform 0.4s cubic-bezier(0.25, 0.8, 0.25, 1),
              box-shadow 0.4s ease,
              opacity 0.4s ease;
  cursor: grab;
  touch-action: none;
  user-select: none;
}
.card:active {
  cursor: grabbing;
}
/* Card States */
.card.stack-current {
  transform: translate(0, 0) scale(1);
  opacity: 1;
  z-index: 3;
}
.card.stack-next {
  transform: translate(15px, 15px) scale(0.95);
  opacity: 0.85;
  z-index: 2;
  pointer-events: none;
}
.card.stack-prev {
  transform: translate(-15px, 15px) scale(0.95);
  opacity: 0.85;
  z-index: 2;
  pointer-events: none;
}
.card.stack-hidden {
  transform: translate(0, 30px) scale(0.9);
  opacity: 0;
  z-index: 1;
  pointer-events: none;
}
/* Card Difficulty Badge */
.card__difficulty {
  position: absolute;
  top: -12px;
  right: 16px;
  padding: 4px 12px;
  font-size: var(--text-xs);
  font-weight: var(--font-bold);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  border: 3px solid var(--border-color);
  box-shadow: 3px 3px 0 var(--shadow-color);
}
.card__difficulty--easy {
  background: var(--success);
  color: var(--bg-primary);
}
.card__difficulty--medium {
  background: var(--warning);
  color: var(--bg-primary);
}
.card__difficulty--hard {
  background: var(--error);
  color: var(--bg-primary);
}
/* ========================================
   SWIPE ANIMATIONS
   ======================================== */
/* Swipe Left (Replace/New) */
.card.swiping-left {
  transition: transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  box-shadow: 20px 20px 0 var(--warning);
}
.card.swipe-out-left {
  animation: swipeOutLeft 0.4s cubic-bezier(0.25, 0.8, 0.25, 1) forwards;
}
@keyframes swipeOutLeft {
  to {
    transform: translateX(-150%) rotate(-15deg);
    opacity: 0;
  }
}
/* Swipe Right (Complete) */
.card.swiping-right {
  transition: transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  box-shadow: -20px 20px 0 var(--success);
}
.card.swipe-out-right {
  animation: swipeOutRight 0.4s cubic-bezier(0.25, 0.8, 0.25, 1) forwards;
}
@keyframes swipeOutRight {
  to {
    transform: translateX(150%) rotate(15deg);
    opacity: 0;
  }
}
/* Swipe Up (Next Card) */
.card.swipe-up {
  animation: cardStackUp 0.5s cubic-bezier(0.25, 0.8, 0.25, 1) forwards;
}
@keyframes cardStackUp {
  0% {
    transform: translateY(0) scale(1);
    opacity: 1;
  }
  50% {
    transform: translateY(-50%) scale(1.1);
    opacity: 0.5;
  }
  100% {
    transform: translateY(-100%) scale(0.9);
    opacity: 0;
  }
}
.card.swipe-up-enter {
  animation: cardStackUpEnter 0.5s cubic-bezier(0.25, 0.8, 0.25, 1) forwards;
}
@keyframes cardStackUpEnter {
  0% {
    transform: translateY(100%) scale(0.9);
    opacity: 0;
  }
  50% {
    transform: translateY(50%) scale(1.05);
    opacity: 0.5;
  }
  100% {
    transform: translateY(0) scale(1);
    opacity: 1;
  }
}
/* ========================================
   PROGRESS INDICATOR
   ======================================== */
.plan-progress {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 4px 12px;
  background: var(--bg-secondary);
  border: 2px solid var(--border-color);
  border-radius: var(--radius-1);
  font-size: var(--text-sm);
  font-weight: var(--font-bold);
  color: var(--accent-primary);
}
/* ========================================
   GESTURE HELP OVERLAY
   ======================================== */
.gesture-help {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.3s ease, visibility 0.3s ease;
}
.gesture-help.visible {
  opacity: 1;
  visibility: visible;
}
.gesture-help__content {
  background: var(--bg-secondary);
  border: 4px solid var(--border-color);
  box-shadow: 12px 12px 0 var(--shadow-color);
  border-radius: var(--radius-3);
  padding: 32px;
  max-width: 320px;
  text-align: center;
}
.gesture-help__content h3 {
  font-family: var(--font-display);
  font-size: var(--text-xl);
  color: var(--accent-primary);
  margin-bottom: 24px;
}
.gesture-help__content ul {
  list-style: none;
  padding: 0;
  margin: 0 0 24px;
}
.gesture-help__content li {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 0;
  font-size: var(--text-base);
  color: var(--text-primary);
  border-bottom: 2px solid var(--border-color);
}
.gesture-help__content li:last-child {
  border-bottom: none;
}
.gesture {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  background: var(--bg-tertiary);
  border: 2px solid var(--border-color);
  border-radius: var(--radius-1);
  font-size: var(--text-lg);
  font-weight: var(--font-bold);
}
/* ========================================
   DESKTOP FALLBACK ACTIONS
   ======================================== */
.actions--desktop {
  display: none;
}
@media (hover: hover) {
  .actions--desktop {
    display: flex;
    gap: var(--space-md);
    margin-top: var(--space-xl);
  }
  
  .swipe-indicators {
    display: none;
  }
}
/* ========================================
   HAPTIC FEEDBACK ZONE
   ======================================== */
.haptic-zone {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 100;
}
/* ========================================
   DESKTOP MOUSE SWIPE
   ======================================== */
.card--draggable {
  cursor: grab;
}
.card--draggable:active {
  cursor: grabbing;
}
/* Mouse drag preview */
.card.dragging {
  transition: none;
  z-index: 100;
  box-shadow: 20px 20px 0 var(--shadow-color);
}
/* Desktop fallback buttons visibility */
@media (pointer: coarse) {
  .actions--desktop {
    display: none;
  }
}
---
4. JAVASCRIPT UI IMPLEMENTIERUNG
4.1 CardStackManager Klasse
// js/ui/cardStack.js - NEUE DATEI
class CardStackManager {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    this.cards = [];
    this.currentIndex = 0;
    this.totalCards = 0;
    this.isAnimating = false;
    
    this.options = {
      swipeThreshold: 100,
      swipeUpThreshold: 80,
      maxSwipesPerDay: 3,
      ...options
    };
    
    this.init();
  }
  
  init() {
    this.createIndicators();
    this.bindEvents();
  }
  
  createIndicators() {
    // Indicator Elements existieren bereits im HTML
    this.leftIndicator = document.getElementById('swipe-left');
    this.rightIndicator = document.getElementById('swipe-right');
    this.upIndicator = document.getElementById('swipe-up');
    this.swipeLeftCount = document.getElementById('swipe-left-count');
  }
  
  bindEvents() {
    this.container.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
    this.container.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
    this.container.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
    
    // Mouse events für Desktop
    this.container.addEventListener('mousedown', this.handleMouseDown.bind(this));
    document.addEventListener('mousemove', this.handleMouseMove.bind(this));
    document.addEventListener('mouseup', this.handleMouseUp.bind(this));
  }
  
  async loadCards(tasks) {
    this.cards = tasks;
    this.totalCards = tasks.length;
    this.currentIndex = 0;
    
    await this.renderCards();
    this.updateProgress();
    this.updateSwipeCount();
  }
  
  async renderCards() {
    const container = document.getElementById('cards-container');
    container.innerHTML = '';
    
    this.cards.forEach((task, index) => {
      const card = this.createCardElement(task, index);
      container.appendChild(card);
    });
    
    this.applyStackClasses();
  }
  
  createCardElement(task, index) {
    const card = document.createElement('div');
    card.className = 'card';
    card.dataset.index = index;
    card.dataset.taskId = task.id;
    
    card.innerHTML = `
      <div class="card__difficulty card__difficulty--${task.difficulty || 'medium'}">
        ${this.getDifficultyLabel(task.difficulty)}
      </div>
      <div class="card-title">${task.title}</div>
      <div class="card-meta">${task.duration} min ${task.status === 'done' ? '• erledigt' : ''}</div>
    `;
    
    return card;
  }
  
  getDifficultyLabel(difficulty) {
    const labels = {
      easy: 'Leicht',
      medium: 'Mittel',
      hard: 'Schwer'
    };
    return labels[difficulty] || 'Mittel';
  }
  
  applyStackClasses() {
    const cardElements = Array.from(this.container.querySelectorAll('.card'));
    
    cardElements.forEach((card, i) => {
      card.classList.remove('stack-current', 'stack-next', 'stack-prev', 'stack-hidden');
      
      if (i === this.currentIndex) {
        card.classList.add('stack-current');
      } else if (i === this.getNextIndex()) {
        card.classList.add('stack-next');
      } else if (i === this.getPrevIndex()) {
        card.classList.add('stack-prev');
      } else {
        card.classList.add('stack-hidden');
      }
    });
  }
  
  getNextIndex() {
    return (this.currentIndex + 1) % this.totalCards;
  }
  
  getPrevIndex() {
    return (this.currentIndex - 1 + this.totalCards) % this.totalCards;
  }
  
  // Touch Handler
  handleTouchStart(e) {
    if (this.isAnimating) return;
    
    this.touchStartX = e.touches[0].clientX;
    this.touchStartY = e.touches[0].clientY;
    this.currentCard = this.container.querySelector('.stack-current');
    
    this.currentCard.style.transition = 'none';
  }
  
  handleTouchMove(e) {
    if (!this.touchStartX || this.isAnimating) return;
    
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    
    this.deltaX = currentX - this.touchStartX;
    this.deltaY = currentY - this.touchStartY;
    
    // Bestimme dominante Richtung
    if (Math.abs(this.deltaY) > Math.abs(this.deltaX) && this.deltaY < -this.options.swipeUpThreshold) {
      // Swipe Up
      this.handleSwipeUp();
    } else if (this.deltaX < -this.options.swipeThreshold) {
      // Swipe Left
      this.handleSwipeLeftMove();
    } else if (this.deltaX > this.options.swipeThreshold) {
      // Swipe Right
      this.handleSwipeRightMove();
    }
  }
  
  handleTouchEnd(e) {
    if (!this.touchStartX || this.isAnimating) return;
    
    this.touchStartX = null;
    this.touchStartY = null;
    
    if (Math.abs(this.deltaY) > Math.abs(this.deltaX) && this.deltaY < -this.options.swipeUpThreshold) {
      // Swipe Up completed
      this.executeSwipeUp();
    } else if (this.deltaX < -this.options.swipeThreshold) {
      // Swipe Left completed
      this.executeSwipeLeft();
    } else if (this.deltaX > this.options.swipeThreshold) {
      // Swipe Right completed
      this.executeSwipeRight();
    } else {
      // Reset position
      this.resetCardPosition();
    }
    
    this.deltaX = 0;
    this.deltaY = 0;
    this.updateIndicators();
  }
  
  // Mouse Handler (Desktop Fallback)
  handleMouseDown(e) {
    if (this.isAnimating) return;
    if (!e.target.closest('.stack-current')) return;
    
    this.isDragging = true;
    this.touchStartX = e.clientX;
    this.touchStartY = e.clientY;
    this.currentCard = this.container.querySelector('.stack-current');
    this.currentCard.classList.add('dragging');
  }
  
  handleMouseMove(e) {
    if (!this.isDragging) return;
    
    this.deltaX = e.clientX - this.touchStartX;
    this.deltaY = e.clientY - this.touchStartY;
    
    if (Math.abs(this.deltaY) > Math.abs(this.deltaX) && this.deltaY < -this.options.swipeUpThreshold) {
      this.currentCard.style.transform = `translateY(${this.deltaY}px)`;
      this.upIndicator.classList.add('active');
    } else if (this.deltaX < -this.options.swipeThreshold) {
      this.currentCard.style.transform = `translateX(${this.deltaX}px) rotate(${this.deltaX * 0.1}deg)`;
      this.leftIndicator.classList.add('active');
    } else if (this.deltaX > this.options.swipeThreshold) {
      this.currentCard.style.transform = `translateX(${this.deltaX}px) rotate(${this.deltaX * 0.1}deg)`;
      this.rightIndicator.classList.add('active');
    }
  }
  
  handleMouseUp(e) {
    if (!this.isDragging) return;
    
    this.isDragging = false;
    this.currentCard.classList.remove('dragging');
    this.currentCard.style.transform = '';
    this.currentCard.style.transition = '';
    
    if (Math.abs(this.deltaY) > Math.abs(this.deltaX) && this.deltaY < -this.options.swipeUpThreshold) {
      this.executeSwipeUp();
    } else if (this.deltaX < -this.options.swipeThreshold) {
      this.executeSwipeLeft();
    } else if (this.deltaX > this.options.swipeThreshold) {
      this.executeSwipeRight();
    }
    
    this.deltaX = 0;
    this.deltaY = 0;
    this.updateIndicators();
  }
  
  // Swipe Left (New/Replace)
  async handleSwipeLeftMove() {
    this.currentCard.style.transform = `translateX(${this.deltaX}px) rotate(${this.deltaX * 0.1}deg)`;
    this.currentCard.classList.add('swiping-left');
    this.leftIndicator.classList.add('active');
  }
  
  async executeSwipeLeft() {
    const swapsRemaining = await this.getSwapsRemaining();
    
    if (swapsRemaining <= 0) {
      this.triggerFeedback('error');
      this.showToast('Keine Swaps mehr verfügbar (max 3/Tag)');
      this.resetCardPosition();
      return;
    }
    
    this.isAnimating = true;
    this.triggerFeedback('warning');
    
    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
    
    this.currentCard.classList.add('swipe-out-left');
    
    await this.wait(300);
    
    // Ersetze die Karte
    await this.replaceCurrentCard();
    
    this.currentIndex = this.getNextIndex();
    this.applyStackClasses();
    
    this.isAnimating = false;
    this.updateSwipeCount();
  }
  
  async replaceCurrentCard() {
    const newTask = await HomeScheduler.generateRandomTask();
    
    this.cards[this.currentIndex] = {
      ...newTask,
      status: 'pending',
      swappedAt: new Date().toISOString()
    };
    
    await this.savePlan();
    
    // Animiere neue Karte ein
    const newCardEl = this.createCardElement(this.cards[this.currentIndex], this.currentIndex);
    newCardEl.classList.add('swipe-up-enter');
    
    const container = document.getElementById('cards-container');
    const oldCard = container.querySelector(`[data-index="${this.currentIndex}"]`);
    
    if (oldCard) {
      oldCard.remove();
    }
    
    container.appendChild(newCardEl);
    
    await this.wait(500);
    newCardEl.classList.remove('swipe-up-enter');
  }
  
  // Swipe Right (Complete)
  handleSwipeRightMove() {
    this.currentCard.style.transform = `translateX(${this.deltaX}px) rotate(${this.deltaX * 0.1}deg)`;
    this.currentCard.classList.add('swiping-right');
    this.rightIndicator.classList.add('active');
  }
  
  async executeSwipeRight() {
    this.isAnimating = true;
    this.triggerFeedback('success');
    
    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate([30, 50, 30]);
    }
    
    this.currentCard.classList.add('swipe-out-right');
    
    await this.wait(300);
    
    // Markiere als erledigt
    this.cards[this.currentIndex].status = 'done';
    await this.savePlan();
    
    this.currentIndex = this.getNextIndex();
    this.applyStackClasses();
    this.updateProgress();
    
    this.isAnimating = false;
    
    // Prüfe ob alle Aufgaben erledigt
    if (this.cards.every(t => t.status === 'done')) {
      this.celebrateCompletion();
    }
  }
  
  // Swipe Up (Next Card)
  handleSwipeUp() {
    this.currentCard.style.transform = `translateY(${this.deltaY}px) scale(1.05)`;
    this.upIndicator.classList.add('active');
  }
  
  async executeSwipeUp() {
    this.isAnimating = true;
    
    const currentCard = this.currentCard;
    currentCard.classList.add('swipe-up');
    
    await this.wait(200);
    
    // Alle Karten neu anordnen für zirkulären Effekt
    this.currentIndex = this.getNextIndex();
    this.applyStackClasses();
    
    // Reset animations
    currentCard.classList.remove('swipe-up');
    this.isAnimating = false;
    
    this.triggerFeedback('light');
    this.updateProgress();
  }
  
  resetCardPosition() {
    if (this.currentCard) {
      this.currentCard.style.transform = '';
      this.currentCard.classList.remove('swiping-left', 'swiping-right');
    }
    this.updateIndicators();
  }
  
  updateIndicators() {
    this.leftIndicator.classList.remove('active');
    this.rightIndicator.classList.remove('active');
    this.upIndicator.classList.remove('active');
  }
  
  async getSwapsRemaining() {
    const plan = await HomeDB.dailyPlans.get(todayKey());
    return plan?.swapsRemaining ?? this.options.maxSwipesPerDay;
  }
  
  async updateSwipeCount() {
    const swaps = await this.getSwapsRemaining();
    if (this.swipeLeftCount) {
      this.swipeLeftCount.textContent = swaps;
    }
    
    // Disable swipe left wenn keine Swaps mehr
    if (swaps <= 0) {
      this.leftIndicator.style.opacity = '0.3';
    }
  }
  
  updateProgress() {
    const progress = document.getElementById('plan-progress');
    if (progress) {
      const done = this.cards.filter(t => t.status === 'done').length;
      progress.textContent = `${done}/${this.totalCards}`;
    }
  }
  
  async savePlan() {
    const plan = await HomeDB.dailyPlans.get(todayKey());
    if (plan) {
      plan.tasks = this.cards;
      await HomeDB.dailyPlans.put(plan);
    }
  }
  
  triggerFeedback(type) {
    // Visual feedback
    const colors = {
      success: 'var(--success)',
      warning: 'var(--warning)',
      error: 'var(--error)',
      light: 'var(--accent-light)'
    };
    
    const zone = document.getElementById('haptic-zone');
    zone.style.background = colors[type] || colors.light;
    zone.style.opacity = '0.2';
    
    setTimeout(() => {
      zone.style.opacity = '0';
      zone.style.background = 'transparent';
    }, 200);
  }
  
  showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      bottom: 120px;
      left: 50%;
      transform: translateX(-50%);
      background: var(--bg-secondary);
      border: 3px solid var(--border-color);
      box-shadow: 6px 6px 0 var(--shadow-color);
      padding: 12px 24px;
      border-radius: var(--radius-2);
      font-weight: var(--font-bold);
      z-index: 10000;
      animation: toastIn 0.3s ease;
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.animation = 'toastOut 0.3s ease forwards';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
  
  celebrateCompletion() {
    this.showToast('Alle Aufgaben erledigt - Gut gemacht!');
    
    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100, 50, 200]);
    }
  }
  
  wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
window.CardStackManager = CardStackManager;
4.2 App.js Integration
// js/ui/app.js - ERWEITERT
let cardStackManager = null;
async function renderPlan() {
  const container = $('#plan-container');
  container.innerHTML = '';
  
  const plan = await getOrFixTodayPlan();
  
  // Initialisiere CardStackManager
  if (!cardStackManager) {
    cardStackManager = new CardStackManager('cards-container', {
      swipeThreshold: 80,
      swipeUpThreshold: 60,
      maxSwipesPerDay: 3
    });
  }
  
  await cardStackManager.loadCards(plan.tasks);
  
  // Initialisiere Swipe-Tracking für den Tag
  await initDailySwipeTracking(plan.date);
}
async function initDailySwipeTracking(dateKey) {
  let plan = await HomeDB.dailyPlans.get(dateKey);
  
  if (!plan) {
    plan = {
      date: dateKey,
      tasks: [],
      minutes: 60,
      swapsRemaining: 3,
      difficulty: 'balanced'
    };
    await HomeDB.dailyPlans.put(plan);
  }
  
  // Reset swaps um Mitternacht prüfen
  const storedDate = localStorage.getItem('lastPlanDate');
  const today = todayKey();
  
  if (storedDate !== today) {
    // Neuer Tag - Swaps zurücksetzen
    plan.swapsRemaining = 3;
    await HomeDB.dailyPlans.put(plan);
    localStorage.setItem('lastPlanDate', today);
  }
}
// Erweitere ensureDefaults für Difficulty
async function ensureDefaults() {
  const hasAvail = await HomeDB.settings.get('availability');
  if (!hasAvail) {
    await HomeDB.settings.put({
      key: 'availability',
      mon: 60, dienstag: 60, mittwoch: 60, 
      donnerstag: 60, freitag: 60, 
      samstag: 90, sonntag: 90
    });
  }
  
  // ... rest der Funktion
}
// Neue Hilfsfunktionen
function todayKey() {
  return new Date().toISOString().slice(0, 10);
}
// Toast Styles hinzufügen
const toastStyles = document.createElement('style');
toastStyles.textContent = `
  @keyframes toastIn {
    from { transform: translateX(-50%) translateY(20px); opacity: 0; }
    to { transform: translateX(-50%) translateY(0); opacity: 1; }
  }
  @keyframes toastOut {
    from { transform: translateX(-50%) translateY(0); opacity: 1; }
    to { transform: translateX(-50%) translateY(20px); opacity: 0; }
  }
`;
document.head.appendChild(toastStyles);
---
5. IMPLEMENTIERUNGS-REIHENFOLGE
Phase 1: Backend & Datenbank (Tag 1)
| Aufgabe | Geschätzte Zeit | Abhängigkeit |
|---------|-----------------|--------------|
| IndexedDB Schema Update auf v2 | 30 min | - |
| learningPatterns Store hinzufügen | 15 min | Schema Update |
| taskSwaps Store hinzufügen | 15 min | Schema Update |
| DailyPlanner Class mit Difficulty | 2h | - |
| Swap-Tracking Logik | 1h | DailyPlanner |
| Unit Tests schreiben | 1h | Alle Above |
Geschätzte Zeit Phase 1: ~5 Stunden
Phase 2: UI Foundation (Tag 2)
| Aufgabe | Geschätzte Zeit | Abhängigkeit |
|---------|-----------------|--------------|
| HTML Struktur erweitern | 1h | - |
| CSS Card Stack System | 3h | HTML |
| Swipe Indicator Styles | 1h | CSS Card Stack |
| Animation Keyframes | 1h | CSS Card Stack |
| Responsive Anpassungen | 1h | Alle Above |
Geschätzte Zeit Phase 2: ~7 Stunden
Phase 3: CardStackManager (Tag 3-4)
| Aufgabe | Geschätzte Zeit | Abhängigkeit |
|---------|-----------------|--------------|
| CardStackManager Klasse Basis | 2h | Phase 2 |
| Touch Event Handler | 2h | Basis |
| Mouse Event Handler (Desktop) | 1h | Touch Handler |
| Swipe Left (Replace) Logic | 2h | Touch Handler |
| Swipe Right (Complete) Logic | 2h | Touch Handler |
| Swipe Up (Next Card) Logic | 1.5h | Touch Handler |
| Haptic Feedback Integration | 30min | Alle Above |
Geschätzte Zeit Phase 3: ~11 Stunden
Phase 4: Integration & Polish (Tag 5)
| Aufgabe | Geschätzte Zeit | Abhängigkeit |
|---------|-----------------|--------------|
| App.js Integration | 2h | Phase 3 |
| Plan Progress Indicator | 30min | App.js |
| Toast Notifications | 30min | App.js |
| Gesture Help Overlay | 1h | App.js |
| Desktop Fallback Buttons | 1h | App.js |
| Accessibility Tests | 1h | Alle Above |
Geschätzte Zeit Phase 4: ~6 Stunden
Phase 5: Testing & Bugfixing (Tag 6)
| Aufgabe | Geschätzte Zeit | Abhängigkeit |
|---------|-----------------|--------------|
| Cross-Browser Testing | 2h | - |
| Mobile Device Testing | 2h | - |
| Performance Optimierung | 1h | Testing |
| Bugfixing | 3h | Testing |
| Lighthouse Audit | 1h | Testing |
Geschätzte Zeit Phase 5: ~9 Stunden
---
6. GESAMTÜBERSICHT
Neue Dateien
js/ui/cardStack.js          (Neue CardStackManager Klasse)
styles/components/
├── card-stack.css          (Card Stack Styles)
├── swipe-indicators.css    (Swipe Feedback)
├── gestures.css            (Gesture Help)
└── animations.css          (Alle Animationen)
Geänderte Dateien
js/db/idb.js                (Schema Update v2)
js/logic/scheduler.js       (DailyPlanner Class)
js/ui/app.js                (Integration)
index.html                  (HTML Struktur)
styles/design-system.css    (CSS Erweiterungen)