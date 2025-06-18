import PickrModule from './vendor/pickr.min.js';
const Pickr = PickrModule.default || PickrModule.Pickr || PickrModule;

export function createColorPicker(options = {}) {
  const {
    presetColors = [
      '#FF0000', '#FF4040', '#FFC0CB', '#FF00FF', '#800080', '#8A2BE2',
      '#00CED1', '#00FFFF', '#40E0D0', '#ADD8E6', '#4169E1', '#0047AB',
      '#008000', '#7CFC00', '#BFFF00', '#FFFF00', '#FFDAB9', '#FFA500',
      '#000000', '#A9A9A9', '#808080'
    ],
    userColors = [],
    themeColors = [],
    initialColor = presetColors[0],
    onSelect = () => {}
  } = options;

  let selectedColor = initialColor;
  const container = document.createElement('div');
  container.className = 'color-picker';

  function createSection(colors, label) {
    if (!colors || !colors.length) return;
    const wrapper = document.createElement('div');
    const section = document.createElement('div');
    section.className = 'color-section';
    if (label) {
      const lbl = document.createElement('span');
      lbl.className = 'color-section-label';
      lbl.textContent = label;
      wrapper.appendChild(lbl);
    }
    colors.forEach(c => {
      if (!c) return;
      const circle = document.createElement('div');
      circle.className = 'color-circle';
      circle.style.backgroundColor = c;
      if (c === selectedColor) circle.classList.add('active');
      circle.addEventListener('click', () => {
        selectedColor = c;
        container.querySelectorAll('.color-circle').forEach(n => n.classList.remove('active'));
        circle.classList.add('active');
        onSelect(selectedColor);
      });
      section.appendChild(circle);
    });
    const addCustom = document.createElement('div');
    addCustom.className = 'color-circle add-custom';

    const pickr = Pickr.create({
      el: addCustom,
      theme: 'nano',
      default: selectedColor,
      components: {
        preview: true,
        opacity: true,
        hue: true,
        interaction: {
          input: true,
          save: true
        }
      }
    });

    pickr.on('change', color => {
      selectedColor = color.toHEXA().toString();
      container.querySelectorAll('.color-circle').forEach(n => n.classList.remove('active'));
      addCustom.style.backgroundColor = selectedColor;
      addCustom.classList.add('active');
      onSelect(selectedColor);
    });

    pickr.on('save', () => pickr.hide());
    section.appendChild(addCustom);
    wrapper.appendChild(section);
    container.appendChild(wrapper);
  }

  createSection(presetColors, 'Presets');
  createSection(userColors, 'Your colors');
  createSection(themeColors, 'Theme');

  return {
    el: container,
    getColor() {
      return selectedColor;
    }
  };
}
