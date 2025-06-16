const ALLOWED_LEVELS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];

function sanitizeLevel(lvl) {
  const val = (lvl || '').toLowerCase();
  return ALLOWED_LEVELS.includes(val) ? val : 'h3';
}

import { registerElement } from '../../js/globalTextEditor.js';

export function render(el, ctx = {}) {
  const defaultLevel = sanitizeLevel(ctx?.metadata?.category || 'h3');
  const defaultText = ctx?.metadata?.label || '';

  let level = defaultLevel;
  let heading = document.createElement(level);
  heading.textContent = defaultText;

  const container = document.createElement('div');
  container.className = 'heading-widget';
  container.appendChild(heading);

  if (ctx.jwt) {
    const saveHandler = async (_el) => {
      const newText = _el.textContent.trim();
      try {
        await window.meltdownEmit('updateWidget', {
          jwt: ctx.jwt,
          moduleName: 'widgetManager',
          moduleType: 'core',
          widgetId: ctx.widgetId,
          widgetType: 'public',
          newLabel: newText
        });
      } catch (err) {
        console.error('[headingWidget] save error', err);
      }
    };

    const select = document.createElement('select');
    select.className = 'heading-level-select';
    for (let i = 1; i <= 6; i++) {
      const tag = `h${i}`;
      const opt = document.createElement('option');
      opt.value = tag;
      opt.textContent = tag.toUpperCase();
      if (tag === level) opt.selected = true;
      select.appendChild(opt);
    }

    select.addEventListener('change', async () => {
      const newLevel = sanitizeLevel(select.value);
      if (newLevel !== level) {
        const newHeading = document.createElement(newLevel);
        newHeading.textContent = heading.textContent;
        container.replaceChild(newHeading, heading);
        heading = newHeading;
        level = newLevel;

        registerElement(heading, saveHandler);

        try {
          await window.meltdownEmit('updateWidget', {
            jwt: ctx.jwt,
            moduleName: 'widgetManager',
            moduleType: 'core',
            widgetId: ctx.widgetId,
            widgetType: 'public',
            newCategory: newLevel
          });
        } catch (err) {
          console.error('[headingWidget] level save error', err);
        }
      }
    });

    registerElement(heading, saveHandler);
    container.appendChild(select);
  }

  el.innerHTML = '';
  el.appendChild(container);
}
