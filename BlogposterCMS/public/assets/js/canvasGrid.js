// public/assets/js/canvasGrid.js
// Lightweight drag & resize grid for the builder

export class CanvasGrid {
  constructor(options = {}, el) {
    this.options = Object.assign(
      { cellHeight: 5, columnWidth: 5, columns: Infinity, rows: Infinity },
      options
    );
    this.staticGrid = Boolean(this.options.staticGrid);
    if (Number.isFinite(this.options.column)) {
      this.options.columns = this.options.column;
    }
    this.el = typeof el === 'string' ? document.querySelector(el) : el;
    this.el.classList.add('canvas-grid');
    this.widgets = [];
    this.activeEl = null;
    this._emitter = new EventTarget();
    this._createBBox();
  }

  on(evt, cb) {
    this._emitter.addEventListener(evt, e => cb(e.detail));
  }

  _emit(evt, detail) {
    this._emitter.dispatchEvent(new CustomEvent(evt, { detail }));
  }

  _applyPosition(el) {
    const { columnWidth, cellHeight, columns, rows } = this.options;
    let x = +el.getAttribute('gs-x') || 0;
    let y = +el.getAttribute('gs-y') || 0;
    let w = +el.getAttribute('gs-w') || 1;
    let h = +el.getAttribute('gs-h') || 1;

    w = Math.max(1, w);
    h = Math.max(1, h);

    if (Number.isFinite(columns)) {
      if (w > columns) w = columns;
      if (x < 0) x = 0;
      if (x + w > columns) x = columns - w;
    } else if (x < 0) {
      x = 0;
    }

    if (Number.isFinite(rows)) {
      if (h > rows) h = rows;
      if (y < 0) y = 0;
      if (y + h > rows) y = rows - h;
    } else if (y < 0) {
      y = 0;
    }

    el.setAttribute('gs-x', x);
    el.setAttribute('gs-y', y);
    el.setAttribute('gs-w', w);
    el.setAttribute('gs-h', h);

    el.style.position = 'absolute';
    el.style.left = '0px';
    el.style.top = '0px';
    el.style.transform =
      `translate3d(${x * columnWidth}px, ${y * cellHeight}px, 0)`;
    el.style.width = `${w * columnWidth}px`;
    el.style.height = `${h * cellHeight}px`;
  }

  makeWidget(el) {
    this._applyPosition(el);
    this._enableDrag(el);
    this.widgets.push(el);
    this._emit('change', el);
  }

  addWidget(opts = {}) {
    const el = document.createElement('div');
    el.className = 'canvas-item';
    el.setAttribute('gs-x', opts.x || 0);
    el.setAttribute('gs-y', opts.y || 0);
    el.setAttribute('gs-w', opts.w || 1);
    el.setAttribute('gs-h', opts.h || 1);
    this.el.appendChild(el);
    this.makeWidget(el);
    return el;
  }

  removeWidget(el) {
    if (el.parentNode === this.el) {
      el.remove();
      this._emit('change', el);
    }
  }

  update(el, opts = {}) {
    if (!el) return;
    if (opts.x != null) el.setAttribute('gs-x', opts.x);
    if (opts.y != null) el.setAttribute('gs-y', opts.y);
    if (opts.w != null) el.setAttribute('gs-w', opts.w);
    if (opts.h != null) el.setAttribute('gs-h', opts.h);
    if (opts.locked != null) el.setAttribute('gs-locked', opts.locked);
    if (opts.noMove != null) el.setAttribute('gs-no-move', opts.noMove);
    if (opts.noResize != null) el.setAttribute('gs-no-resize', opts.noResize);
    this._applyPosition(el);
    this._emit('change', el);
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
      if (pos.includes('w')) { w -= dx; gx += Math.round(dx / this.options.columnWidth); }
      if (pos.includes('n')) { h -= dy; gy += Math.round(dy / this.options.cellHeight); }
      w = Math.max(20, w);
      h = Math.max(20, h);
      const opts = { w: Math.round(w / this.options.columnWidth), h: Math.round(h / this.options.cellHeight) };
      if (pos.includes('w')) opts.x = gx;
      if (pos.includes('n')) opts.y = gy;
      this.update(this.activeEl, opts);
    };
    const up = () => {
      if (pos != null) this._emit('resizestop', this.activeEl);
      pos = null;
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
    };
    Object.values(this.handles).forEach(h => {
      h.addEventListener('mousedown', e => {
        if (!this.activeEl || this.staticGrid) return;
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
        this._emit('resizestart', this.activeEl);
        document.addEventListener('mousemove', move);
        document.addEventListener('mouseup', up);
      });
    });
  }

  _enableDrag(el) {
    let startX, startY, startGX, startGY, dragging = false;
    let targetX = 0, targetY = 0;
    const frame = () => {
      if (!dragging) return;
      const snap = this._snap(targetX, targetY);
      el.style.transform =
        `translate3d(${snap.x * this.options.columnWidth}px, ${snap.y * this.options.cellHeight}px, 0)`;
      this._updateBBox();
      requestAnimationFrame(frame);
    };
    const move = e => {
      targetX = startGX * this.options.columnWidth + (e.clientX - startX);
      targetY = startGY * this.options.cellHeight + (e.clientY - startY);
    };
    const up = () => {
      dragging = false;
      document.removeEventListener('mousemove', move);
      document.removeEventListener('mouseup', up);
      const snap = this._snap(targetX, targetY);
      this.update(el, { x: snap.x, y: snap.y });
      el.style.transform = '';
      this._emit('dragstop', el);
    };
    el.addEventListener('mousedown', e => {
      if (e.target.closest('.bbox-handle')) return;
      if (this.staticGrid) return;
      if (el.getAttribute('gs-locked') === 'true' || el.getAttribute('gs-no-move') === 'true') return;
      e.preventDefault();
      this.select(el);
      startX = e.clientX; startY = e.clientY;
      startGX = +el.getAttribute('gs-x');
      startGY = +el.getAttribute('gs-y');
      targetX = startGX * this.options.columnWidth;
      targetY = startGY * this.options.cellHeight;
      dragging = true;
      this._emit('dragstart', el);
      document.addEventListener('mousemove', move);
      document.addEventListener('mouseup', up);
      requestAnimationFrame(frame);
    });
  }

  _snap(x, y) {
    const gx = Math.round(x / this.options.columnWidth);
    const gy = Math.round(y / this.options.cellHeight);
    return { x: gx, y: gy };
  }

  _updateBBox() {
    if (!this.activeEl || this.staticGrid) return;
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

  setStatic(flag = true) {
    this.staticGrid = Boolean(flag);
    if (this.staticGrid) this.clearSelection();
    this.el.classList.toggle('static-grid', this.staticGrid);
    this._emit('staticchange', this.staticGrid);
  }

  removeAll() {
    this.widgets.slice().forEach(w => this.removeWidget(w));
  }
}

export function init(options, el) {
  return new CanvasGrid(options, el);
}
