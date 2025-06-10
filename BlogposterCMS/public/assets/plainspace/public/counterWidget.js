// mother/modules/plainSpace/assets/counterWidget.js
// Example of a simple public widget

export function render(containerEl, ctx = {}) {
    // minimal example with a counter
    containerEl.innerHTML = `
      <div>
        <p>${ctx?.metadata?.label || ''}<span x-text="count"></span></p>
        <button @click="count++">Increment</button>
      </div>
    `;
  
    // If you're using Alpine, you can do:
    // containerEl.setAttribute('x-data', '{ count:0 }');
    // Or just a manual approach with DOM events if you prefer vanilla JS.
  
    // For a vanilla approach:
    const button = containerEl.querySelector('button');
    const span   = containerEl.querySelector('span');
    let count    = 0;
  
    button.addEventListener('click', () => {
      count++;
      span.textContent = count;
    });
  }
  