export async function render(el) {
  const meltdownEmit = window.meltdownEmit;
  const jwt = window.ADMIN_TOKEN;
  const userId = window.PAGE_ID;

  if (!jwt || !userId) {
    el.innerHTML = '<p>Missing credentials or user ID.</p>';
    return;
  }

  try {
    const userRes = await meltdownEmit('getUserDetailsById', {
      jwt,
      moduleName: 'userManagement',
      moduleType: 'core',
      userId
    });
    const user = userRes?.data ?? userRes;
    if (!user) {
      el.innerHTML = '<p>User not found.</p>';
      return;
    }

    const fields = [
      'username',
      'email',
      'first_name',
      'last_name',
      'display_name',
      'phone',
      'company',
      'website',
      'avatar_url',
      'bio'
    ];
    const inputs = {};
    const container = document.createElement('div');
    container.className = 'user-edit-widget';

    fields.forEach(f => {
      const field = document.createElement('div');
      field.className = 'field';

      const input = document.createElement(f === 'bio' ? 'textarea' : 'input');
      const id = `ue-${f}`;
      if (input.tagName === 'INPUT') {
        input.type = 'text';
      }
      input.id = id;
      input.placeholder = ' ';
      input.value = user[f] || '';
      inputs[f] = input;

      const label = document.createElement('label');
      label.setAttribute('for', id);
      label.textContent = f.replace('_', ' ');

      field.appendChild(input);
      field.appendChild(label);
      container.appendChild(field);
    });

    const passField = document.createElement('div');
    passField.className = 'field';
    const passInput = document.createElement('input');
    passInput.id = 'ue-new-pass';
    passInput.type = 'password';
    passInput.placeholder = ' ';
    const passLabel = document.createElement('label');
    passLabel.setAttribute('for', 'ue-new-pass');
    passLabel.textContent = 'New Password';
    passField.appendChild(passInput);
    passField.appendChild(passLabel);
    container.appendChild(passField);

    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'Save';
    container.appendChild(saveBtn);

    el.innerHTML = '';
    el.appendChild(container);

    saveBtn.addEventListener('click', async () => {
      const payload = {
        jwt,
        moduleName: 'userManagement',
        moduleType: 'core',
        userId: user.id,
        newUsername: inputs.username.value.trim(),
        newEmail: inputs.email.value.trim(),
        newFirstName: inputs.first_name.value.trim(),
        newLastName: inputs.last_name.value.trim(),
        newDisplayName: inputs.display_name.value.trim(),
        newPhone: inputs.phone.value.trim(),
        newCompany: inputs.company.value.trim(),
        newWebsite: inputs.website.value.trim(),
        newAvatarUrl: inputs.avatar_url.value.trim(),
        newBio: inputs.bio.value
      };
      if (passInput.value.trim()) {
        payload.newPassword = passInput.value.trim();
      }
      try {
        await meltdownEmit('updateUserProfile', payload);
        alert('Saved');
      } catch (err) {
        alert('Error: ' + err.message);
      }
    });
  } catch (err) {
    el.innerHTML = `<div class="error">Failed to load user: ${err.message}</div>`;
  }
}
