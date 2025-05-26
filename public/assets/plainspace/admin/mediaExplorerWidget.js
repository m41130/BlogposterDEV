export async function render(el) {
  const jwt = window.ADMIN_TOKEN;
  const emitter = window.meltdownEmit;

  const container = document.createElement('div');
  container.className = 'media-explorer';
  const controlBar = document.createElement('div');
  controlBar.className = 'media-controls';
  const uploadBtn = document.createElement('button');
  uploadBtn.textContent = '+';
  uploadBtn.title = 'Upload file';
  const folderBtn = document.createElement('button');
  folderBtn.textContent = '📁+';
  folderBtn.title = 'New folder';
  const hiddenInput = document.createElement('input');
  hiddenInput.type = 'file';
  hiddenInput.style.display = 'none';
  controlBar.appendChild(uploadBtn);
  controlBar.appendChild(folderBtn);
  controlBar.appendChild(hiddenInput);
  container.appendChild(controlBar);

  const listEl = document.createElement('ul');
  listEl.className = 'media-list';
  container.appendChild(listEl);

  let currentPath = '';

  uploadBtn.onclick = () => hiddenInput.click();
  hiddenInput.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result.split(',')[1];
      try {
        await emitter('uploadFileToFolder', {
          jwt,
          moduleName: 'mediaManager',
          moduleType: 'core',
          fileName: file.name,
          fileData: base64,
          subPath: currentPath,
          mimeType: file.type
        });
        await load(currentPath);
      } catch (err) {
        alert('Upload failed: ' + err.message);
      }
    };
    reader.readAsDataURL(file);
  };

  folderBtn.onclick = async () => {
    const name = prompt('New folder name:');
    if (!name) return;
    try {
      await emitter('createLocalFolder', {
        jwt,
        moduleName: 'mediaManager',
        moduleType: 'core',
        currentPath,
        newFolderName: name
      });
      await load(currentPath);
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  async function share(fullPath) {
    try {
      const { shareURL } = await emitter('createShareLink', {
        jwt,
        moduleName: 'shareManager',
        moduleType: 'core',
        filePath: fullPath
      });
      prompt('Share link', shareURL);
    } catch (err) {
      alert('Error: ' + err.message);
    }
  }

  async function load(path = '') {
    currentPath = path;
    try {
      const res = await emitter('listLocalFolder', {
        jwt,
        moduleName: 'mediaManager',
        moduleType: 'core',
        subPath: path
      });
      const { folders = [], files = [] } = res || {};
      listEl.innerHTML = '';
      if (folders.length === 0 && files.length === 0) {
        const empty = document.createElement('li');
        empty.textContent = 'This folder is empty.';
        listEl.appendChild(empty);
      }
      folders.forEach(name => {
        const li = document.createElement('li');
        li.textContent = name + '/';
        li.onclick = () => load(path ? path + '/' + name : name);
        const shareBtn = document.createElement('button');
        shareBtn.textContent = 'share';
        shareBtn.onclick = (ev) => {
          ev.stopPropagation();
          const full = (path ? path + '/' + name : name);
          share(full);
        };
        li.appendChild(shareBtn);
        listEl.appendChild(li);
      });
      files.forEach(name => {
        const li = document.createElement('li');
        li.textContent = name;
        const shareBtn = document.createElement('button');
        shareBtn.textContent = 'share';
        shareBtn.onclick = (ev) => {
          ev.stopPropagation();
          const full = path ? path + '/' + name : name;
          share(full);
        };
        li.appendChild(shareBtn);
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
