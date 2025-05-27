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
      const label = document.createElement('label');
      label.textContent = f.replace('_', ' ');
      const input = document.createElement(f === 'bio' ? 'textarea' : 'input');
      input.type = 'text';
      input.value = user[f] || '';
      inputs[f] = input;
      label.appendChild(document.createElement('br'));
      label.appendChild(input);
      container.appendChild(label);
      container.appendChild(document.createElement('br'));
    });

    const passLabel = document.createElement('label');
    passLabel.textContent = 'New Password';
    const passInput = document.createElement('input');
    passInput.type = 'password';
    passInput.placeholder = 'Leave blank to keep current';
    passLabel.appendChild(document.createElement('br'));
    passLabel.appendChild(passInput);
    container.appendChild(passLabel);
    container.appendChild(document.createElement('br'));

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
