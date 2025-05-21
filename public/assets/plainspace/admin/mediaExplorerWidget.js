export async function render(el) {
  const jwt = window.ADMIN_TOKEN;
  const emitter = window.meltdownEmit;

  const container = document.createElement('div');
  container.className = 'media-explorer';
  const listEl = document.createElement('ul');
  listEl.className = 'media-list';
  container.appendChild(listEl);

  async function load(path = '') {
    try {
      const res = await emitter('listLocalFolder', {
        jwt,
        moduleName: 'mediaManager',
        moduleType: 'core',
        subPath: path
      });
      const { folders = [], files = [] } = res || {};
      listEl.innerHTML = '';
      folders.forEach(name => {
        const li = document.createElement('li');
        li.textContent = name + '/';
        li.onclick = () => load(path ? path + '/' + name : name);
        listEl.appendChild(li);
      });
      files.forEach(name => {
        const li = document.createElement('li');
        li.textContent = name;
        listEl.appendChild(li);
      });
    } catch (err) {
      listEl.innerHTML = `<li>Error: ${err.message}</li>`;
    }
  }

  el.innerHTML = '';
  el.appendChild(container);
  load();
}
