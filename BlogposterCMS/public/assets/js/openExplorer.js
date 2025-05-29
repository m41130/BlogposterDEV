;(function(window){
  async function openMediaExplorer(opts = {}) {
    const jwt = opts.jwt || window.ADMIN_TOKEN || window.PUBLIC_TOKEN;
    if (!jwt) throw new Error('openExplorer: missing JWT');
    const subPath = opts.subPath || 'public';

    return new Promise((resolve, reject) => {
      const dialog = document.createElement('dialog');
      dialog.className = 'media-explorer';

      const closeBtn = document.createElement('button');
      closeBtn.textContent = '×';
      closeBtn.className = 'close-btn';
      closeBtn.onclick = () => { dialog.close(); reject(new Error('cancelled')); };

      const uploadBtn = document.createElement('button');
      uploadBtn.textContent = 'Upload';
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = 'image/*';
      fileInput.style.display = 'none';
      uploadBtn.onclick = () => fileInput.click();
      fileInput.onchange = async e => {
        const file = e.target.files[0];
        if (!file) return;
        const form = new FormData();
        form.append('file', file);
        try {
          const resp = await fetch('/admin/api/upload?subPath=' + encodeURIComponent(subPath), {
            method: 'POST',
            headers: { 'X-CSRF-Token': window.CSRF_TOKEN },
            body: form,
            credentials: 'same-origin'
          });
          const json = await resp.json();
          if (!resp.ok || json.error) throw new Error(json.error || resp.statusText);
          await loadList();
        } catch(err) {
          alert('Upload failed: ' + err.message);
        }
      };

      const listEl = document.createElement('ul');
      listEl.className = 'media-list';

      dialog.appendChild(closeBtn);
      dialog.appendChild(uploadBtn);
      dialog.appendChild(fileInput);
      dialog.appendChild(listEl);

      async function choose(name) {
        try {
          const { shareURL } = await window.meltdownEmit('createShareLink', {
            jwt,
            moduleName: 'shareManager',
            moduleType: 'core',
            filePath: subPath + '/' + name
          });
          dialog.close();
          resolve({ shareURL, name });
        } catch(err) {
          alert('Error: ' + err.message);
        }
      }

      async function loadList() {
        try {
          const res = await window.meltdownEmit('listLocalFolder', {
            jwt,
            moduleName: 'mediaManager',
            moduleType: 'core',
            subPath
          });
          const files = res?.files || [];
          listEl.innerHTML = '';
          if (!files.length) {
            const li = document.createElement('li');
            li.textContent = 'No images found';
            listEl.appendChild(li);
          }
          files.forEach(name => {
            const li = document.createElement('li');
            li.textContent = name;
            li.onclick = () => choose(name);
            listEl.appendChild(li);
          });
        } catch(err) {
          listEl.innerHTML = `<li>Error: ${err.message}</li>`;
        }
      }

      document.body.appendChild(dialog);
      dialog.addEventListener('close', () => dialog.remove());
      loadList();
      dialog.showModal();
    });
  }

  window._openMediaExplorer = openMediaExplorer;
})(window);
