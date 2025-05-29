export function render(el, ctx = {}) {
  const defaultLevel = (ctx?.metadata?.category || 'h3').toLowerCase();
  const defaultText = ctx?.metadata?.label || 'Section Heading';

  let level = defaultLevel;
  let heading = document.createElement(level);
  heading.textContent = defaultText;

  const container = document.createElement('div');
  container.className = 'heading-widget';
  container.appendChild(heading);

  if (ctx.jwt) {
    heading.contentEditable = 'true';

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
      const newLevel = select.value;
      if (newLevel !== level) {
        const newHeading = document.createElement(newLevel);
        newHeading.textContent = heading.textContent;
        newHeading.contentEditable = 'true';
        container.replaceChild(newHeading, heading);
        heading = newHeading;
        level = newLevel;

        try {
          await window.meltdownEmit('updateWidget', {
            jwt: ctx.jwt,
            moduleName: 'widgetManager',
            moduleType: 'core',
            widgetId: ctx.id,
            widgetType: 'public',
            newCategory: newLevel
          });
        } catch (err) {
          console.error('[headingWidget] level save error', err);
        }
      }
    });

    heading.addEventListener('blur', async () => {
      const newText = heading.textContent.trim();
      try {
        await window.meltdownEmit('updateWidget', {
          jwt: ctx.jwt,
          moduleName: 'widgetManager',
          moduleType: 'core',
          widgetId: ctx.id,
          widgetType: 'public',
          newLabel: newText
        });
      } catch (err) {
        console.error('[headingWidget] save error', err);
      }
    });

    container.appendChild(select);
  }

  el.innerHTML = '';
  el.appendChild(container);
}
