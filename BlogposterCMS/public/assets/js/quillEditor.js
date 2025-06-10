export function initQuill(element, options = {}) {
  if (!window.Quill) {
    console.error('[quillEditor] Quill library not loaded');
    return null;
  }
  element.style.width = '100%';
  element.style.height = '100%';
  const defaults = { theme: 'snow' };
  return new Quill(element, Object.assign({}, defaults, options));
}
