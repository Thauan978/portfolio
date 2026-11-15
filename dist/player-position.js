(() => {
  'use strict';

  const STORAGE_KEY = 'terminal-player-position-v1';
  const MARGIN = 8;

  function attach() {
    const root = document.querySelector('.music-player');
    if (!root || root.dataset.positionReady) return;
    root.dataset.positionReady = 'true';

    const tools = document.createElement('div');
    tools.className = 'music-position-tools';
    tools.innerHTML = `<button type="button" class="music-drag-handle" aria-label="Mover player. Arraste ou use as setas; Home volta à posição inicial." title="Arraste para mover · setas para ajustar · Home para centralizar"><svg viewBox="0 0 20 12" width="20" height="12" aria-hidden="true"><g fill="currentColor"><circle cx="4" cy="3" r="1.2"/><circle cx="10" cy="3" r="1.2"/><circle cx="16" cy="3" r="1.2"/><circle cx="4" cy="9" r="1.2"/><circle cx="10" cy="9" r="1.2"/><circle cx="16" cy="9" r="1.2"/></g></svg><span>ARRASTAR</span></button><button type="button" class="music-position-reset" aria-label="Voltar o player à posição inicial" title="Centralizar na parte inferior"><svg viewBox="0 0 20 20" width="12" height="12" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8a6 6 0 1 1 0 4M4 3v5h5"/></svg></button>`;
    root.prepend(tools);
    const handle = tools.querySelector('.music-drag-handle');
    const reset = tools.querySelector('.music-position-reset');
    let normalized = { x: 0.5, y: 1 };
    let drag = null;
    let frame = 0;

    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (saved && Number.isFinite(saved.x) && Number.isFinite(saved.y)) {
        normalized = { x: Math.min(1, Math.max(0, saved.x)), y: Math.min(1, Math.max(0, saved.y)) };
      }
    } catch {}

    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
    function bounds() {
      const viewport = window.visualViewport;
      const width = viewport?.width || window.innerWidth || document.documentElement.clientWidth;
      const height = viewport?.height || window.innerHeight || document.documentElement.clientHeight;
      const left = viewport?.offsetLeft || 0;
      const top = viewport?.offsetTop || 0;
      const rect = root.getBoundingClientRect();
      return {
        left: left + MARGIN,
        top: top + MARGIN,
        right: Math.max(left + MARGIN, left + width - rect.width - MARGIN),
        bottom: Math.max(top + MARGIN, top + height - rect.height - MARGIN)
      };
    }
    function announce(x, y) {
      document.dispatchEvent(new CustomEvent('terminal-player-moved', { detail: { x, y } }));
    }
    function position(x, y, remember = false) {
      const area = bounds();
      x = clamp(x, area.left, area.right);
      y = clamp(y, area.top, area.bottom);
      root.style.left = `${Math.round(x)}px`;
      root.style.top = `${Math.round(y)}px`;
      root.style.right = 'auto';
      root.style.bottom = 'auto';
      root.style.transform = 'none';
      normalized = {
        x: area.right > area.left ? (x - area.left) / (area.right - area.left) : 0.5,
        y: area.bottom > area.top ? (y - area.top) / (area.bottom - area.top) : 1
      };
      if (remember) {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized)); } catch {}
      }
      announce(x, y);
    }
    function restorePosition() {
      const area = bounds();
      position(area.left + normalized.x * (area.right - area.left), area.top + normalized.y * (area.bottom - area.top));
    }
    function scheduleRestore() {
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => { frame = 0; restorePosition(); });
    }
    function finish(event) {
      if (!drag || (event && event.pointerId !== drag.pointerId)) return;
      const pointerId = drag.pointerId;
      drag = null;
      root.classList.remove('is-dragging');
      try { if (handle.hasPointerCapture(pointerId)) handle.releasePointerCapture(pointerId); } catch {}
      const rect = root.getBoundingClientRect();
      position(rect.left, rect.top, true);
    }

    handle.addEventListener('pointerdown', event => {
      if (event.isPrimary === false || (event.button !== undefined && event.button !== 0)) return;
      event.preventDefault();
      event.stopPropagation();
      const rect = root.getBoundingClientRect();
      drag = { pointerId: event.pointerId, clientX: event.clientX, clientY: event.clientY, left: rect.left, top: rect.top };
      root.classList.add('is-dragging');
      try { handle.setPointerCapture(event.pointerId); } catch {}
      handle.focus({ preventScroll: true });
    });
    document.addEventListener('pointermove', event => {
      if (!drag || event.pointerId !== drag.pointerId) return;
      event.preventDefault();
      position(drag.left + event.clientX - drag.clientX, drag.top + event.clientY - drag.clientY);
    }, { passive: false });
    document.addEventListener('pointerup', finish);
    document.addEventListener('pointercancel', finish);
    handle.addEventListener('lostpointercapture', finish);
    handle.addEventListener('keydown', event => {
      const directions = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
      if (event.key === 'Home') {
        event.preventDefault();
        event.stopPropagation();
        normalized = { x: 0.5, y: 1 };
        restorePosition();
        try { localStorage.removeItem(STORAGE_KEY); } catch {}
        return;
      }
      const direction = directions[event.key];
      if (!direction) return;
      event.preventDefault();
      event.stopPropagation();
      const rect = root.getBoundingClientRect();
      const step = event.shiftKey ? 32 : 8;
      position(rect.left + direction[0] * step, rect.top + direction[1] * step, true);
    });
    reset.addEventListener('click', () => {
      normalized = { x: 0.5, y: 1 };
      restorePosition();
      try { localStorage.removeItem(STORAGE_KEY); } catch {}
    });
    window.addEventListener('resize', scheduleRestore);
    window.addEventListener('orientationchange', scheduleRestore);
    window.visualViewport?.addEventListener('resize', scheduleRestore);
    window.visualViewport?.addEventListener('scroll', scheduleRestore);
    if ('ResizeObserver' in window) new ResizeObserver(scheduleRestore).observe(root);
    restorePosition();
    scheduleRestore();
  }

  document.addEventListener('terminal-player-ready', attach);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', attach, { once: true });
  attach();
})();
