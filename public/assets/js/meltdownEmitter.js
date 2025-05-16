// public/assets/js/meltdownEmitter.js
;(function(window) {
  window.meltdownEmit = async function(eventName, payload = {}) {
    delete payload.jwt;

    const resp = await fetch('/api/meltdown', {
      method:      'POST',
      credentials: 'include',
      headers:     { 'Content-Type': 'application/json' },
      body:        JSON.stringify({ eventName, payload })
    });

    let json;
    try {
      json = await resp.json();
    } catch(e) {
      console.error('[MELTDOWN] invalid JSON', resp.status, await resp.text());
      throw e;
    }

    if (!resp.ok || json.error) {
      throw new Error(json.error || resp.statusText);
    }

    return json.data;
  };
})(window);
