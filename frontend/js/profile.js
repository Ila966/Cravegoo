document.addEventListener('DOMContentLoaded', () => {
  loadProfile();
  const form = document.getElementById('profile-form');
  if (form) {
    form.addEventListener('submit', handleProfileUpdate);
  }
});

async function loadProfile() {
  try {
    const res = await window.API.get('/auth/me');
    if (res.success) {
      const user = res.user;

      document.getElementById('prof-name').value = user.name || '';
      document.getElementById('prof-role').value = user.role || '';
      document.getElementById('prof-email').value = user.email || '';
      document.getElementById('prof-phone').value = user.phone || '';
      document.getElementById('prof-address').value = user.address || '';
    }
  } catch (error) {
    window.showToast('Failed to fetch profile: ' + error.message, 'error');
  }
}

async function handleProfileUpdate(e) {
  e.preventDefault();

  const name = document.getElementById('prof-name').value.trim();
  const phone = document.getElementById('prof-phone').value.trim();
  const address = document.getElementById('prof-address').value.trim();
  const password = document.getElementById('prof-password').value.trim();
  const btn = document.getElementById('btn-profile-submit');

  const payload = { name, phone, address };

  if (password) {
    if (password.length < 6) {
      window.showToast('Password must be at least 6 characters long', 'error');
      return;
    }
    payload.password = password;
  }

  btn.disabled = true;
  btn.textContent = 'Updating...';

  try {
    const res = await window.API.put('/auth/profile', payload);
    if (res.success) {
      window.showToast('Profile updated successfully!', 'success');
      
      // Update cached credentials
      window.API.setUser(res.user);
      
      // Clear password field
      document.getElementById('prof-password').value = '';
      
      loadProfile();
    }
  } catch (error) {
    window.showToast('Update failed: ' + error.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Update Profile Information';
  }
}
