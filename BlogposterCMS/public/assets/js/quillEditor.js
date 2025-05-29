export function initQuill(element, options = {}) {
  if (!window.Quill) {
    console.error('[quillEditor] Quill library not loaded');
    return null;
  }
  const defaults = { theme: 'snow' };
  return new Quill(element, Object.assign({}, defaults, options));
}
