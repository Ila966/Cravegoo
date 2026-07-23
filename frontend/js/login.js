// Login execution
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('login-form');
  if (form) {
    form.addEventListener('submit', handleLogin);
  }

  // Live password validation in forgot modal
  const newPw = document.getElementById('forgot-new-password');
  const confirmPw = document.getElementById('forgot-confirm-password');
  if (newPw) newPw.addEventListener('input', updatePasswordRules);
  if (confirmPw) confirmPw.addEventListener('input', updatePasswordRules);
});

// Password validation helper
function validatePassword(password) {
  const errors = [];
  if (password.length < 8) errors.push('Password must be at least 8 characters');
  if (!/[A-Z]/.test(password)) errors.push('Password must contain at least one uppercase letter');
  return errors;
}

async function handleLogin(e) {
  e.preventDefault();

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value.trim();
  const btnSubmit = document.getElementById('btn-submit');

  if (!email || !password) {
    window.showToast('Please fill in all fields', 'error');
    return;
  }

  // Disable button
  btnSubmit.disabled = true;
  btnSubmit.innerHTML = `
    <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
    Signing In...
  `;

  try {
    const data = await window.API.post('/auth/login', { email, password });
    
    if (data.success) {
      window.showToast('Logged in successfully!', 'success');
      window.API.setToken(data.token);
      window.API.setUser(data.user);
      
      // Let toast display briefly
      setTimeout(() => {
        if (data.user.role === 'customer') {
          window.location.href = '/customer-home.html';
        } else if (data.user.role === 'business') {
          window.location.href = '/business-dashboard.html';
        } else if (data.user.role === 'delivery') {
          window.location.href = '/delivery-dashboard.html';
        } else if (data.user.role === 'admin') {
          window.location.href = '/admin-dashboard.html';
        }
      }, 800);
    }
  } catch (error) {
    window.showToast(error.message || 'Login failed. Check your credentials.', 'error');
  } finally {
    // Restore button
    btnSubmit.disabled = false;
    btnSubmit.innerHTML = `
      <span>Sign In</span>
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
    `;
  }
}

// Global demo filler helper
function fillDemo(email) {
  document.getElementById('email').value = email;
  document.getElementById('password').value = 'password123';
}

// ============ Forgot Password Flow ============

let forgotEmail = ''; // Store verified email between steps

function showForgotModal() {
  const modal = document.getElementById('forgot-modal');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
  // Reset to step 1
  document.getElementById('forgot-step-1').classList.remove('hidden');
  document.getElementById('forgot-step-2').classList.add('hidden');
  document.getElementById('forgot-email').value = '';
  forgotEmail = '';
}

function hideForgotModal() {
  const modal = document.getElementById('forgot-modal');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
}

// Step 1: Verify email
async function handleForgotStep1() {
  const email = document.getElementById('forgot-email').value.trim();
  const btn = document.getElementById('btn-forgot-verify');

  if (!email) {
    window.showToast('Please enter your email address', 'error');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Verifying...';

  try {
    const data = await window.API.post('/auth/forgot-password', { email });
    if (data.success) {
      forgotEmail = email;
      window.showToast('Email verified! Set your new password.', 'success');
      // Transition to step 2
      document.getElementById('forgot-step-1').classList.add('hidden');
      document.getElementById('forgot-step-2').classList.remove('hidden');
    }
  } catch (error) {
    window.showToast(error.message || 'No account found with that email.', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Verify Email';
  }
}

// Live password rule indicators
function updatePasswordRules() {
  const pw = document.getElementById('forgot-new-password').value;
  const cpw = document.getElementById('forgot-confirm-password').value;

  const ruleLen = document.getElementById('rule-length');
  const ruleUpper = document.getElementById('rule-upper');
  const ruleMatch = document.getElementById('rule-match');

  // Length rule
  if (pw.length >= 8) {
    ruleLen.classList.remove('text-slate-500');
    ruleLen.classList.add('text-emerald-500');
    ruleLen.innerHTML = '&#x2714; At least 8 characters';
  } else {
    ruleLen.classList.remove('text-emerald-500');
    ruleLen.classList.add('text-slate-500');
    ruleLen.innerHTML = '&#x2022; At least 8 characters';
  }

  // Uppercase rule
  if (/[A-Z]/.test(pw)) {
    ruleUpper.classList.remove('text-slate-500');
    ruleUpper.classList.add('text-emerald-500');
    ruleUpper.innerHTML = '&#x2714; At least 1 uppercase letter';
  } else {
    ruleUpper.classList.remove('text-emerald-500');
    ruleUpper.classList.add('text-slate-500');
    ruleUpper.innerHTML = '&#x2022; At least 1 uppercase letter';
  }

  // Match rule
  if (pw && cpw && pw === cpw) {
    ruleMatch.classList.remove('text-slate-500');
    ruleMatch.classList.add('text-emerald-500');
    ruleMatch.innerHTML = '&#x2714; Passwords match';
  } else {
    ruleMatch.classList.remove('text-emerald-500');
    ruleMatch.classList.add('text-slate-500');
    ruleMatch.innerHTML = '&#x2022; Passwords match';
  }
}

// Step 2: Reset password
async function handleForgotStep2() {
  const newPassword = document.getElementById('forgot-new-password').value;
  const confirmPassword = document.getElementById('forgot-confirm-password').value;
  const btn = document.getElementById('btn-forgot-reset');

  // Client-side validation
  const errors = validatePassword(newPassword);
  if (errors.length > 0) {
    window.showToast(errors[0], 'error');
    return;
  }

  if (newPassword !== confirmPassword) {
    window.showToast('Passwords do not match', 'error');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Resetting...';

  try {
    const data = await window.API.post('/auth/reset-password', {
      email: forgotEmail,
      newPassword
    });

    if (data.success) {
      window.showToast('Password reset successfully! You can now log in.', 'success');
      hideForgotModal();
    }
  } catch (error) {
    window.showToast(error.message || 'Failed to reset password.', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Reset Password';
  }
}

// Global exports
window.fillDemo = fillDemo;
window.showForgotModal = showForgotModal;
window.hideForgotModal = hideForgotModal;
window.handleForgotStep1 = handleForgotStep1;
window.handleForgotStep2 = handleForgotStep2;
