/**
 * public/assets/plainspace/admin/fetchPartial.js
 * Provides a function to load partial HTML from your server.
 * Example usage: `await fetchPartial('default-header', 'headers');`
 */
export async function fetchPartial(partialName) {
    const url = `/assets/plainspace/admin/partials/${partialName}.html`;
    const resp = await fetch(url);
    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status} while fetching ${url}`);
    }
    return await resp.text();
  }
  