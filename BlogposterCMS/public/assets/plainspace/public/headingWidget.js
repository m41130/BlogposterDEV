const ALLOWED_LEVELS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];

function sanitizeLevel(lvl) {
  const val = (lvl || '').toLowerCase();
  return ALLOWED_LEVELS.includes(val) ? val : 'h3';
}

import { registerElement, sanitizeHtml } from '../../js/globalTextEditor.js';

export function render(el, ctx = {}) {
  const defaultLevel = sanitizeLevel(ctx?.metadata?.category || 'h3');
  const defaultText = ctx?.metadata?.label || '';

  let level = defaultLevel;
  let heading = document.createElement(level);
  heading.textContent = defaultText;
  heading.dataset.textEditable = '';

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

    heading.addEventListener('headingLevelChange', async ev => {
      const newLevel = sanitizeLevel(ev.detail?.level);
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
  }

  el.innerHTML = '';
  el.appendChild(container);

  const safeHtml = sanitizeHtml(container.innerHTML);
  if (ctx.id) {
    document.dispatchEvent(new CustomEvent('textBlockHtmlUpdate', {
      detail: { instanceId: ctx.id, html: safeHtml }
    }));
  }
}
