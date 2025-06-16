// public/assets/js/canvasGrid.js
// Wrapper around GridStack that adds transformable bounding boxes

export class CanvasGrid {
  constructor(options, el) {
    this.grid = GridStack.init(options, el);
    this.activeEl = null;
    this._createBBox();
    this._exposeGridMethods();
    this.grid.on('change', () => {
      if (this.activeEl) this._updateBBox();
    });
  }

  _exposeGridMethods() {
    const methods = ['makeWidget', 'removeWidget', 'update', 'addWidget'];
    for (const m of methods) {
      if (typeof this.grid[m] === 'function') {
        this[m] = (...args) => this.grid[m](...args);
      }
    }
  }

  _createBBox() {
    this.bbox = document.createElement('div');
    this.bbox.className = 'bounding-box';
    this.bbox.style.display = 'none';
    const positions = ['nw','n','ne','e','se','s','sw','w'];
    this.handles = {};
    positions.forEach(p => {
      const h = document.createElement('div');
      h.className = `bbox-handle ${p}`;
      h.dataset.pos = p;
      this.bbox.appendChild(h);
      this.handles[p] = h;
    });
    document.body.appendChild(this.bbox);
    this._bindResize();
  }

  _bindResize() {
    let startX, startY, startW, startH, startGX, startGY, pos;
    const move = e => {
      if (!this.activeEl || pos == null) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      let w = startW, h = startH;
      let gx = startGX, gy = startGY;
      if (pos.includes('e')) w += dx;
      if (pos.includes('s')) h += dy;
      if (pos.includes('w')) { w -= dx; gx += Math.round(dx/5); }
      if (pos.includes('n')) { h -= dy; gy += Math.round(dy/5); }
      w = Math.max(20, w);
      h = Math.max(20, h);
      const opts = {w: Math.round(w/5), h: Math.round(h/5)};
      if (pos.includes('w')) opts.x = gx;
      if (pos.includes('n')) opts.y = gy;
      this.grid.update(this.activeEl, opts);
      this._updateBBox();
    };
    const up = () => { pos = null; document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); };
    Object.values(this.handles).forEach(h => {
      h.addEventListener('mousedown', e => {
        if (!this.activeEl) return;
        if (this.activeEl.getAttribute('gs-locked') === 'true' ||
            this.activeEl.getAttribute('gs-no-resize') === 'true') {
          return;
        }
        e.stopPropagation();
        pos = h.dataset.pos;
        const rect = this.activeEl.getBoundingClientRect();
        startX = e.clientX; startY = e.clientY;
        startW = rect.width; startH = rect.height;
        startGX = +this.activeEl.getAttribute('gs-x');
        startGY = +this.activeEl.getAttribute('gs-y');
        document.addEventListener('mousemove', move);
        document.addEventListener('mouseup', up);
      });
    });
  }

  _updateBBox() {
    if (!this.activeEl) return;
    const locked = this.activeEl.getAttribute('gs-locked') === 'true';
    const noResize = this.activeEl.getAttribute('gs-no-resize') === 'true';
    const noMove = this.activeEl.getAttribute('gs-no-move') === 'true';
    const hide = locked || noResize || noMove;
    this.bbox.classList.toggle('disabled', hide);
    if (hide) return;
    const rect = this.activeEl.getBoundingClientRect();
    this.bbox.style.top = `${rect.top + window.scrollY}px`;
    this.bbox.style.left = `${rect.left + window.scrollX}px`;
    this.bbox.style.width = `${rect.width}px`;
    this.bbox.style.height = `${rect.height}px`;
    this.bbox.style.display = 'block';
  }

  select(el) {
    this.activeEl = el;
    this._updateBBox();
  }

  clearSelection() {
    this.activeEl = null;
    this.bbox.style.display = 'none';
  }
}

export function init(options, el) {
  return new CanvasGrid(options, el);
}
