// public/assets/js/tokenLoader.js

export function loadAuthTokens() {
  window.ADMIN_TOKEN = null;
  window.PUBLIC_TOKEN = null;
  console.log('[tokenLoader] JWT managed securely via cookies.');
}

loadAuthTokens();
