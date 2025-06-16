// public/assets/js/canvasGrid.js
// Wrapper around GridStack that adds transformable bounding boxes

export class CanvasGrid {
  constructor(options, el) {
    this.grid = GridStack.init(options, el);
    this.activeEl = null;
    this._createBBox();
    this.grid.on('change', () => {
      if (this.activeEl) this._updateBBox();
    });
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
    let startX, startY, startW, startH, pos;
    const move = e => {
      if (!this.activeEl || pos == null) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      let w = startW, h = startH;
      if (pos.includes('e')) w += dx;
      if (pos.includes('s')) h += dy;
      if (pos.includes('w')) w -= dx;
      if (pos.includes('n')) h -= dy;
      w = Math.max(20, w);
      h = Math.max(20, h);
      this.grid.update(this.activeEl, {w: Math.round(w/5), h: Math.round(h/5)});
      this._updateBBox();
    };
    const up = () => { pos = null; document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); };
    Object.values(this.handles).forEach(h => {
      h.addEventListener('mousedown', e => {
        if (!this.activeEl) return;
        e.stopPropagation();
        pos = h.dataset.pos;
        const rect = this.activeEl.getBoundingClientRect();
        startX = e.clientX; startY = e.clientY;
        startW = rect.width; startH = rect.height;
        document.addEventListener('mousemove', move);
        document.addEventListener('mouseup', up);
      });
    });
  }

  _updateBBox() {
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
