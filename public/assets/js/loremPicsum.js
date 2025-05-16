//public/assets/js/loremPicsum.js
document.addEventListener("DOMContentLoaded", function() {
  const appScope = document.querySelector('.app-scope');
  const imageUrl = 'https://picsum.photos/1920/1080?random=' + Date.now();

  appScope.style.background = `
    url(${imageUrl}) center center / cover no-repeat fixed
  `;
});
