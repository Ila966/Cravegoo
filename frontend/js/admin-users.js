let systemUsers = [];

document.addEventListener('DOMContentLoaded', () => {
  loadUsersList();
});

async function loadUsersList() {
  const tbody = document.getElementById('users-table-body');
  try {
    const res = await window.API.get('/admin/users');
    if (res.success) {
      systemUsers = res.data;
      renderUsersTable(systemUsers);
    }
  } catch (error) {
    window.showToast('Failed to load accounts list: ' + error.message, 'error');
  }
}

function renderUsersTable(list) {
  const tbody = document.getElementById('users-table-body');
  if (!tbody) return;

  tbody.innerHTML = '';

  list.forEach(user => {
    const tr = document.createElement('tr');
    tr.className = 'border-b border-slate-900 table-row-hover';

    let roleBadgeColor = 'bg-slate-800 text-slate-400';
    if (user.role === 'customer') roleBadgeColor = 'bg-indigo-950/60 text-indigo-400 border border-indigo-500/20';
    else if (user.role === 'business') roleBadgeColor = 'bg-teal-950/60 text-teal-400 border border-teal-500/20';
    else if (user.role === 'delivery') roleBadgeColor = 'bg-amber-950/60 text-amber-400 border border-amber-500/20';
    else if (user.role === 'admin') roleBadgeColor = 'bg-rose-950/60 text-rose-400 border border-rose-500/20';

    tr.innerHTML = `
      <td class="py-4 px-6">
        <span class="block font-bold text-slate-100">${user.name}</span>
        <span class="block text-xs text-slate-500 leading-tight">${user.address || 'No address specified'}</span>
      </td>
      <td class="py-4 px-6">
        <span class="block font-semibold text-slate-300 font-mono text-xs">${user.email}</span>
        <span class="block text-xs text-slate-500">${user.phone}</span>
      </td>
      <td class="py-4 px-6">
        <select onchange="updateRole('${user._id}', this.value)"
                class="bg-slate-900 border border-slate-800 text-slate-200 text-xs font-bold rounded-lg p-1.5 focus:border-indigo-500 focus:outline-none">
          <option value="customer" ${user.role === 'customer' ? 'selected' : ''}>Customer</option>
          <option value="business" ${user.role === 'business' ? 'selected' : ''}>Store Owner</option>
          <option value="delivery" ${user.role === 'delivery' ? 'selected' : ''}>Delivery Courier</option>
          <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
        </select>
      </td>
      <td class="py-4 px-6 text-right">
        <button onclick="deleteAccount('${user._id}')"
                class="px-3 py-1.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 text-xs font-semibold rounded-lg transition">
          Delete
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

async function updateRole(userId, newRole) {
  try {
    const res = await window.API.put(`/admin/users/${userId}/role`, { role: newRole });
    if (res.success) {
      window.showToast(`User role updated to ${newRole}`, 'success');
      loadUsersList();
    }
  } catch (error) {
    window.showToast('Failed to modify role: ' + error.message, 'error');
  }
}

async function deleteAccount(userId) {
  const currentAdmin = window.API.getUser();
  if (currentAdmin && currentAdmin.id === userId) {
    window.showToast('Cannot self-delete active administrator session.', 'error');
    return;
  }

  const confirmDelete = confirm("Are you sure you want to delete this user profile? Doing so will permanently wipe their databases, orders, and credentials.");
  if (!confirmDelete) return;

  try {
    const res = await window.API.delete(`/admin/users/${userId}`);
    if (res.success) {
      window.showToast('User profile purged successfully', 'info');
      loadUsersList();
    }
  } catch (error) {
    window.showToast('Failed to purge account: ' + error.message, 'error');
  }
}

// Bind to window
window.updateRole = updateRole;
window.deleteAccount = deleteAccount;
