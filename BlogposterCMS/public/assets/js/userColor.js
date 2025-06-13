export async function applyUserColor() {
  const jwt = window.ADMIN_TOKEN;
  if (!jwt || !window.meltdownEmit) return;
  try {
    const decoded = await window.meltdownEmit('validateToken', {
      jwt,
      moduleName: 'auth',
      moduleType: 'core',
      tokenToValidate: jwt
    });
    const userId = decoded?.userId;
    if (!userId) return;
    const res = await window.meltdownEmit('getUserDetailsById', {
      jwt,
      moduleName: 'userManagement',
      moduleType: 'core',
      userId
    });
    const user = res?.data ?? res;
    if (user && user.ui_color) {
      document.documentElement.style.setProperty('--user-color', user.ui_color);
    }
  } catch (err) {
    console.error('[userColor] Failed to set user color', err);
  }
}

document.addEventListener('DOMContentLoaded', applyUserColor);
