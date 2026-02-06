;(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory();
  else root.ListSwipeManager = factory();
})(typeof window !== 'undefined' ? window : globalThis, function () {
  class ListSwipeManager {
    constructor(containerId, options = {}) {
      this.container = document.getElementById(containerId);
      if (!this.container) return;

      this.options = {
        threshold: options.threshold ?? 60,
        onEdit: options.onEdit ?? null,
        onDelete: options.onDelete ?? null
      };

      this.activeItem = null;
      this.pointer = {
        active: false,
        id: null,
        startX: 0,
        dx: 0
      };

      this.onPointerDown = this.onPointerDown.bind(this);
      this.onPointerMove = this.onPointerMove.bind(this);
      this.onPointerUp = this.onPointerUp.bind(this);

      this.container.addEventListener('pointerdown', this.onPointerDown);
      window.addEventListener('pointermove', this.onPointerMove);
      window.addEventListener('pointerup', this.onPointerUp);
      window.addEventListener('pointercancel', this.onPointerUp);
    }

    onPointerDown(e) {
      const wrapper = e.target.closest('.list-item-wrapper');
      if (!wrapper) return;

      const content = wrapper.querySelector('.list-item');
      if (!content) return;

      this.activeItem = { wrapper, content };
      this.pointer.active = true;
      this.pointer.id = e.pointerId;
      this.pointer.startX = e.clientX;
      this.pointer.dx = 0;

      content.style.transition = 'none';
      content.setPointerCapture?.(e.pointerId);
    }

    onPointerMove(e) {
      if (!this.pointer.active || this.pointer.id !== e.pointerId) return;

      this.pointer.dx = e.clientX - this.pointer.startX;
      const dx = this.pointer.dx;
      const absX = Math.abs(dx);

      this.activeItem.content.style.transform = `translateX(${dx}px)`;

      const editAction = this.activeItem.wrapper.querySelector('.list-item-action--edit');
      const deleteAction = this.activeItem.wrapper.querySelector('.list-item-action--delete');

      if (dx > 10) {
        if (editAction) editAction.classList.add('active');
        if (deleteAction) deleteAction.classList.remove('active');
      } else if (dx < -10) {
        if (editAction) editAction.classList.remove('active');
        if (deleteAction) deleteAction.classList.add('active');
      } else {
        if (editAction) editAction.classList.remove('active');
        if (deleteAction) deleteAction.classList.remove('active');
      }
    }

    async onPointerUp(e) {
      if (!this.pointer.active || this.pointer.id !== e.pointerId) return;
      this.pointer.active = false;

      const dx = this.pointer.dx;
      const absX = Math.abs(dx);
      const content = this.activeItem.content;
      const wrapper = this.activeItem.wrapper;
      const taskId = wrapper.dataset.taskId;

      content.style.transition = 'transform .2s ease, opacity .2s ease';

      if (absX > this.options.threshold) {
        const isDelete = dx < 0;
        content.style.transform = `translateX(${isDelete ? -100 : 100}%)`;
        content.style.opacity = '0';

        setTimeout(async () => {
          if (isDelete) {
            if (this.options.onDelete) await this.options.onDelete(taskId);
          } else {
            // Reset position for edit so it stays visible
            content.style.transition = 'transform .2s ease';
            content.style.transform = 'translateX(0)';
            content.style.opacity = '1';
            if (this.options.onEdit) await this.options.onEdit(taskId);
          }
        }, 200);
      } else {
        content.style.transform = 'translateX(0)';
      }

      const editAction = wrapper.querySelector('.list-item-action--edit');
      const deleteAction = wrapper.querySelector('.list-item-action--delete');
      if (editAction) editAction.classList.remove('active');
      if (deleteAction) deleteAction.classList.remove('active');

      this.activeItem = null;
    }
  }

  return ListSwipeManager;
});
