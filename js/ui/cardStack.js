function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

class CardStackManager {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    if (!this.container) throw new Error(`CardStack container not found: ${containerId}`);

    this.options = {
      swipeThreshold: options.swipeThreshold ?? 80,
      swipeUpThreshold: options.swipeUpThreshold ?? 60,
      onSwap: options.onSwap ?? null,
      onComplete: options.onComplete ?? null
    };

    this.cards = [];
    this.currentIndex = 0;
    this.swapsRemaining = 3;

    this.progressEl = document.getElementById('plan-progress');
    this.hapticZone = document.getElementById('haptic-zone');
    this.indicators = {
      left: document.getElementById('swipe-left'),
      right: document.getElementById('swipe-right'),
      up: document.getElementById('swipe-up')
    };
    this.swapCountEl = document.getElementById('swipe-left-count');

    this.pointer = {
      active: false,
      pointerId: null,
      startX: 0,
      startY: 0,
      dx: 0,
      dy: 0
    };

    this.onPointerDown = this.onPointerDown.bind(this);
    this.onPointerMove = this.onPointerMove.bind(this);
    this.onPointerUp = this.onPointerUp.bind(this);

    this.container.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
    window.addEventListener('pointercancel', this.onPointerUp);
  }

  destroy() {
    this.container.removeEventListener('pointerdown', this.onPointerDown);
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    window.removeEventListener('pointercancel', this.onPointerUp);
  }

  getCurrentTask() {
    return this.cards[this.currentIndex] || null;
  }

  async loadCards(tasks, meta = {}) {
    this.cards = Array.isArray(tasks) ? tasks.slice(0, 3) : [];
    this.swapsRemaining = typeof meta.swapsRemaining === 'number' ? meta.swapsRemaining : (this.swapsRemaining ?? 3);
    this.currentIndex = clamp(this.currentIndex, 0, Math.max(0, this.cards.length - 1));

    this.container.innerHTML = '';
    this.cards.forEach((t) => {
      this.container.appendChild(this.renderCard(t));
    });

    this.applyStackClasses(this.currentIndex);
    this.updateProgress();
    this.updateSwapCount();

    this.ensureGestureHelp();
  }

  ensureGestureHelp() {
    const help = document.getElementById('gesture-help');
    if (!help) return;
    const onboardingSeen = localStorage.getItem('onboardingSeen') === '1';
    if (!onboardingSeen) return;
    const dismissed = localStorage.getItem('gestureHelpDismissed') === '1';
    if (!dismissed) help.hidden = false;
    const btn = document.getElementById('gesture-help-dismiss');
    if (btn && !btn.__bound) {
      btn.__bound = true;
      btn.onclick = () => {
        help.hidden = true;
        localStorage.setItem('gestureHelpDismissed', '1');
      };
    }
  }

  renderCard(t) {
    const card = document.createElement('div');
    card.className = 'card';
    card.dataset.taskId = String(t.id);

    const badge = document.createElement('div');
    badge.className = `card__difficulty card__difficulty--${t.difficulty || 'medium'}`;
    badge.textContent = (t.difficulty || 'medium').toUpperCase();

    const title = document.createElement('div');
    title.className = 'card-title';
    title.textContent = t.title;

    const meta = document.createElement('div');
    meta.className = 'card-meta';
    const isFixed = !!t.fixed;
    const fmt = window.HomeRecurrence && typeof window.HomeRecurrence.formatGermanDate === 'function' ? window.HomeRecurrence.formatGermanDate : null;
    const due = isFixed && t.dueDate ? (fmt ? fmt(t.dueDate) : t.dueDate) : null;
    meta.textContent = `${isFixed ? 'Fest' : 'Frei'}${due ? ' • fällig ' + due : ''} • ${t.duration} min${t.status === 'done' ? ' • erledigt' : ''}`;

    card.append(badge, title, meta);
    return card;
  }

  applyStackClasses(idx) {
    const cards = Array.from(this.container.querySelectorAll('.card'));
    cards.forEach((c, i) => {
      c.classList.remove('stack-current', 'stack-next', 'stack-prev', 'stack-hidden');
      c.style.transform = '';
      c.style.transition = '';
      if (i === idx) c.classList.add('stack-current');
      else if (i === (idx + 1) % cards.length) c.classList.add('stack-next');
      else if (i === (idx - 1 + cards.length) % cards.length) c.classList.add('stack-prev');
      else c.classList.add('stack-hidden');
    });
  }

  updateProgress() {
    if (!this.progressEl) return;
    const done = this.cards.filter(t => t.status === 'done').length;
    this.progressEl.textContent = `${done}/${Math.max(3, this.cards.length || 3)}`;
  }

  updateSwapCount() {
    if (this.swapCountEl) this.swapCountEl.textContent = String(this.swapsRemaining ?? 0);
  }

  showIndicator(kind, amount) {
    const left = this.indicators.left;
    const right = this.indicators.right;
    const up = this.indicators.up;
    if (!left || !right || !up) return;
    left.classList.toggle('active', kind === 'left' && amount > 0);
    right.classList.toggle('active', kind === 'right' && amount > 0);
    up.classList.toggle('active', kind === 'up' && amount > 0);
    const val = clamp(amount, 0, 1);
    if (kind === 'left') left.style.opacity = String(val);
    if (kind === 'right') right.style.opacity = String(val);
    if (kind === 'up') up.style.opacity = String(val);
  }

  clearIndicators() {
    Object.values(this.indicators).forEach((el) => {
      if (!el) return;
      el.classList.remove('active');
      el.style.opacity = '';
    });
  }

  triggerFeedback(type) {
    const zone = this.hapticZone;
    if (zone) {
      const colors = {
        success: 'var(--success)',
        warning: 'var(--warning)',
        error: 'var(--error)',
        light: 'var(--accent-light)'
      };
      zone.style.background = colors[type] || colors.light;
      zone.style.opacity = '0.2';
      setTimeout(() => {
        zone.style.opacity = '0';
        zone.style.background = 'transparent';
      }, 200);
    }
    if (navigator.vibrate) navigator.vibrate(15);
  }

  showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('toast--out');
      setTimeout(() => toast.remove(), 260);
    }, 2600);
  }

  onPointerDown(e) {
    const currentEl = this.container.querySelector('.stack-current');
    if (!currentEl) return;
    if (!currentEl.contains(e.target)) return;

    this.pointer.active = true;
    this.pointer.pointerId = e.pointerId;
    this.pointer.startX = e.clientX;
    this.pointer.startY = e.clientY;
    this.pointer.dx = 0;
    this.pointer.dy = 0;
    currentEl.setPointerCapture?.(e.pointerId);
  }

  onPointerMove(e) {
    if (!this.pointer.active) return;
    if (this.pointer.pointerId !== e.pointerId) return;
    const currentEl = this.container.querySelector('.stack-current');
    if (!currentEl) return;

    this.pointer.dx = e.clientX - this.pointer.startX;
    this.pointer.dy = e.clientY - this.pointer.startY;

    const dx = this.pointer.dx;
    const dy = this.pointer.dy;

    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    const rotate = clamp(dx / 18, -10, 10);
    currentEl.style.transition = 'none';
    currentEl.style.transform = `translate(${dx}px, ${dy}px) rotate(${rotate}deg)`;

    if (absX > absY && absX > 10) {
      this.showIndicator(dx < 0 ? 'left' : 'right', absX / this.options.swipeThreshold);
    } else if (absY > absX && dy < -10) {
      this.showIndicator('up', (-dy) / this.options.swipeUpThreshold);
    } else {
      this.clearIndicators();
    }
  }

  async onPointerUp(e) {
    if (!this.pointer.active) return;
    if (this.pointer.pointerId !== e.pointerId) return;
    this.pointer.active = false;

    const currentEl = this.container.querySelector('.stack-current');
    if (!currentEl) return;

    const dx = this.pointer.dx;
    const dy = this.pointer.dy;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    const swipeHorizontal = absX > this.options.swipeThreshold && absX > absY;
    const swipeUp = (-dy) > this.options.swipeUpThreshold && absY > absX;

    this.clearIndicators();

    if (!swipeHorizontal && !swipeUp) {
      currentEl.style.transition = 'transform .2s ease';
      currentEl.style.transform = '';
      return;
    }

    if (swipeUp) {
      this.triggerFeedback('light');
      this.currentIndex = (this.currentIndex + 1) % Math.max(1, this.cards.length);
      this.applyStackClasses(this.currentIndex);
      return;
    }

    const isLeft = dx < 0;
    const kind = isLeft ? 'left' : 'right';

    if (isLeft && (this.swapsRemaining ?? 0) <= 0) {
      this.triggerFeedback('error');
      this.showToast('Keine Swaps mehr verfügbar (max 3/Tag)');
      currentEl.style.transition = 'transform .2s ease';
      currentEl.style.transform = '';
      return;
    }

    currentEl.style.transition = 'transform .22s ease, opacity .22s ease';
    currentEl.style.opacity = '0';
    currentEl.style.transform = `translate(${isLeft ? -window.innerWidth : window.innerWidth}px, ${dy}px) rotate(${isLeft ? -12 : 12}deg)`;

    await new Promise(resolve => setTimeout(resolve, 230));

    const currentTask = this.getCurrentTask();
    try {
      if (kind === 'left' && typeof this.options.onSwap === 'function') {
        this.triggerFeedback('warning');
        const updated = await this.options.onSwap(currentTask);
        if (updated && updated.tasks) {
          this.swapsRemaining = updated.swapsRemaining ?? this.swapsRemaining;
          await this.loadCards(updated.tasks, { swapsRemaining: this.swapsRemaining });
        } else {
          currentEl.style.opacity = '1';
          currentEl.style.transition = '';
          currentEl.style.transform = '';
        }
        return;
      }
      if (kind === 'right' && typeof this.options.onComplete === 'function') {
        this.triggerFeedback('success');
        const updated = await this.options.onComplete(currentTask);
        if (updated && updated.tasks) {
          this.swapsRemaining = updated.swapsRemaining ?? this.swapsRemaining;
          await this.loadCards(updated.tasks, { swapsRemaining: this.swapsRemaining });
        } else {
          currentEl.style.opacity = '1';
          currentEl.style.transition = '';
          currentEl.style.transform = '';
        }
        return;
      }
    } catch (err) {
      this.triggerFeedback('error');
      this.showToast(err && err.message ? err.message : 'Aktion fehlgeschlagen');
    }

    currentEl.style.opacity = '1';
    currentEl.style.transition = '';
    currentEl.style.transform = '';
  }
}

window.CardStackManager = CardStackManager;
