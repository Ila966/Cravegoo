document.addEventListener('DOMContentLoaded', () => {
  // Preset role from URL queries
  const params = new URLSearchParams(window.location.search);
  const queryRole = params.get('role');
  const roleSelect = document.getElementById('role');
  
  if (roleSelect && queryRole) {
    if (['customer', 'business', 'delivery'].includes(queryRole)) {
      roleSelect.value = queryRole;
    }
  }

  toggleBusinessFields();

  const form = document.getElementById('register-form');
  if (form) {
    form.addEventListener('submit', handleRegister);
  }
});

function toggleBusinessFields() {
  const role = document.getElementById('role').value;
  const bizSection = document.getElementById('business-fields');
  
  if (bizSection) {
    if (role === 'business') {
      bizSection.classList.remove('hidden');
      document.getElementById('businessName').required = true;
    } else {
      bizSection.classList.add('hidden');
      document.getElementById('businessName').required = false;
    }
  }
}

async function handleRegister(e) {
  e.preventDefault();

  const name = document.getElementById('name').value.trim();
  const email = document.getElementById('email').value.trim();
  const phone = document.getElementById('phone').value.trim();
  const role = document.getElementById('role').value;
  const address = document.getElementById('address').value.trim();
  const password = document.getElementById('password').value.trim();
  const btnSubmit = document.getElementById('btn-submit');

  if (password.length < 6) {
    window.showToast('Password must be at least 6 characters', 'error');
    return;
  }

  const payload = { name, email, phone, role, address, password };

  if (role === 'business') {
    payload.businessName = document.getElementById('businessName').value.trim();
    payload.businessDescription = document.getElementById('businessDescription').value.trim();
  }

  // Disable button
  btnSubmit.disabled = true;
  btnSubmit.innerHTML = `
    <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
    Creating Account...
  `;

  try {
    const data = await window.API.post('/auth/register', payload);

    if (data.success) {
      window.showToast('Account registered successfully!', 'success');
      window.API.setToken(data.token);
      window.API.setUser(data.user);

      setTimeout(() => {
        if (data.user.role === 'customer') {
          window.location.href = '/customer-home.html';
        } else if (data.user.role === 'business') {
          window.location.href = '/business-dashboard.html';
        } else if (data.user.role === 'delivery') {
          window.location.href = '/delivery-dashboard.html';
        }
      }, 800);
    }
  } catch (error) {
    window.showToast(error.message || 'Registration failed. Try again.', 'error');
  } finally {
    btnSubmit.disabled = false;
    btnSubmit.innerHTML = `
      <span>Create Account</span>
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path></svg>
    `;
  }
}

// Global expose
window.toggleBusinessFields = toggleBusinessFields;
