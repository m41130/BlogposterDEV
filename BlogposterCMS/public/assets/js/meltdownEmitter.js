// public/assets/js/meltdownEmitter.js
;(function(window) {
  window.meltdownEmit = async function(eventName, payload = {}) {
    if (eventName === 'openExplorer' && window._openMediaExplorer) {
      return window._openMediaExplorer(payload);
    }
    const headers = {
      'Content-Type': 'application/json'
    };

    if (payload.jwt) {
      headers['X-Public-Token'] = payload.jwt;
      delete payload.jwt;
    } else if (window.PUBLIC_TOKEN) {
      headers['X-Public-Token'] = window.PUBLIC_TOKEN;
    }

    if (window.CSRF_TOKEN) {
      headers['X-CSRF-Token'] = window.CSRF_TOKEN;
    }

    // Advanced debug: log outgoing request
    if (window.DEBUG_MELTDOWN) {
      console.debug('[MELTDOWN][OUT]', {
        url: '/api/meltdown',
        method: 'POST',
        headers,
        body: { eventName, payload }
      });
    }

    const resp = await fetch('/api/meltdown', {
      method: 'POST',
      credentials: 'same-origin',
      headers,
      body: JSON.stringify({ eventName, payload })
    });

    let json;
    let rawText;
    try {
      rawText = await resp.clone().text();
      json = JSON.parse(rawText);
    } catch(e) {
      console.error('[MELTDOWN][IN] invalid JSON', resp.status, rawText);
      throw e;
    }

    // Advanced debug: log incoming response
    if (window.DEBUG_MELTDOWN) {
      console.debug('[MELTDOWN][IN]', {
        status: resp.status,
        statusText: resp.statusText,
        headers: Object.fromEntries(resp.headers.entries()),
        raw: rawText,
        json
      });
    }

    if (!resp.ok || json.error) {
      throw new Error(json.error || resp.statusText);
    }

    return json.data;
  };
})(window);
