// public/assets/js/pageDataLoader.js
;(function (window) {
  const meltdownEmit = window.meltdownEmit;
  const jwt = window.ADMIN_TOKEN;

  if (!meltdownEmit) return;

  const cache = new Map();

  function sanitize(data, fields) {
    if (!fields || !data || typeof data !== 'object') return data;
    const out = {};
    for (const f of fields) {
      if (Object.hasOwn(data, f)) out[f] = data[f];
    }
    return out;
  }

  async function load(eventName, payload = {}, opts = {}) {
    if (!jwt || !eventName) return null;
    const key = `${eventName}:${JSON.stringify(payload)}`;
    if (cache.has(key)) return cache.get(key);

    const p = meltdownEmit(eventName, { jwt, ...payload })
      .then(res => sanitize(res?.data ?? res ?? null, opts.fields))
      .catch(err => {
        console.error('[pageDataLoader] fetch error', err);
        cache.delete(key);
        return null;
      });

    cache.set(key, p);
    return p;
  }

  function clear(eventName, payload) {
    if (!eventName) return cache.clear();
    const key = `${eventName}:${JSON.stringify(payload || {})}`;
    cache.delete(key);
  }

  window.pageDataLoader = { load, clear };

  window.addEventListener('pagehide', () => clear());

  if (window.PAGE_ID) {
    const fields = [
      'id',
      'slug',
      'status',
      'title',
      'seo_image',
      'translations',
      'meta',
      'language',
      'lane',
      'parent_id',
      'is_content'
    ];
    window.pageDataPromise = load(
      'getPageById',
      { moduleName: 'pagesManager', moduleType: 'core', pageId: window.PAGE_ID },
      { fields }
    );
  }
})(window);
