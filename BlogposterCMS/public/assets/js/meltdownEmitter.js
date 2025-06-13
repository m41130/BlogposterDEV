// public/assets/js/meltdownEmitter.js
;(function(window) {
  window.meltdownEmit = async function(eventName, payload = {}) {
    if (
      (eventName === 'openExplorer' || eventName === 'openMediaExplorer') &&
      window._openMediaExplorer
    ) {
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

  // Batch multiple meltdown events in one request
  window.meltdownEmitBatch = async function(events = [], jwt = null) {
    if (!Array.isArray(events) || events.length === 0) return [];

    const headers = {
      'Content-Type': 'application/json'
    };

    const token = jwt || window.PUBLIC_TOKEN;
    if (token) headers['X-Public-Token'] = token;
    if (window.CSRF_TOKEN) headers['X-CSRF-Token'] = window.CSRF_TOKEN;

    if (window.DEBUG_MELTDOWN) {
      console.debug('[MELTDOWN][OUT][BATCH]', {
        url: '/api/meltdown/batch',
        method: 'POST',
        headers,
        body: { events }
      });
    }

    const resp = await fetch('/api/meltdown/batch', {
      method: 'POST',
      credentials: 'same-origin',
      headers,
      body: JSON.stringify({ events })
    });

    let json;
    let rawText;
    try {
      rawText = await resp.clone().text();
      json = JSON.parse(rawText);
    } catch (e) {
      console.error('[MELTDOWN][IN][BATCH] invalid JSON', resp.status, rawText);
      throw e;
    }

    if (window.DEBUG_MELTDOWN) {
      console.debug('[MELTDOWN][IN][BATCH]', {
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

    return json.results;
  };
})(window);
