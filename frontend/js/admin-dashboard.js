let socket = null;

document.addEventListener('DOMContentLoaded', () => {
  loadAdminPortal();
  initAdminSocket();
});

async function loadAdminPortal() {
  loadStats();
  loadBusinesses();
}

async function loadStats() {
  try {
    const res = await window.API.get('/admin/stats');
    if (res.success) {
      const stats = res.data;
      
      document.getElementById('admin-revenue').textContent = `$${stats.orders.totalVolume.toFixed(2)}`;
      document.getElementById('admin-users').textContent = stats.users.total;
      document.getElementById('admin-stores').textContent = stats.stores.total;
      document.getElementById('admin-orders').textContent = stats.orders.total;
    }
  } catch (error) {
    window.showToast('Failed to load stats: ' + error.message, 'error');
  }
}

async function loadBusinesses() {
  const tbody = document.getElementById('businesses-table-body');
  try {
    const res = await window.API.get('/admin/businesses');
    if (res.success) {
      if (!tbody) return;
      tbody.innerHTML = '';

      if (res.data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="py-6 text-center text-slate-500">No stores registered.</td></tr>`;
        return;
      }

      res.data.forEach(biz => {
        const ownerEmail = biz.owner ? biz.owner.email : 'Unknown Owner';
        const ownerName = biz.owner ? biz.owner.name : 'Unknown Owner';

        const tr = document.createElement('tr');
        tr.className = 'border-b border-slate-900/60 table-row-hover';

        tr.innerHTML = `
          <td class="py-3 px-4 font-bold text-slate-100">${biz.businessName}</td>
          <td class="py-3 px-4">
            <span class="block text-slate-300 font-semibold">${ownerName}</span>
            <span class="block text-[10px] text-slate-500 font-mono">${ownerEmail}</span>
          </td>
          <td class="py-3 px-4">
            <span class="inline-block text-[9px] font-bold px-2 py-0.5 rounded-full ${
              biz.isApproved ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/20' : 'bg-rose-950 text-rose-400 border border-rose-500/20'
            }">
              ${biz.isApproved ? 'APPROVED' : 'SUSPENDED'}
            </span>
          </td>
          <td class="py-3 px-4 text-right">
            <button onclick="toggleStoreApproval('${biz._id}', ${!biz.isApproved})"
                    class="px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition ${
                      biz.isApproved ? 'bg-rose-600/20 hover:bg-rose-600/30 text-rose-400' : 'bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400'
                    }">
              ${biz.isApproved ? 'Suspend' : 'Approve'}
            </button>
          </td>
        `;

        tbody.appendChild(tr);
      });
    }
  } catch (error) {
    window.showToast('Failed to load store catalog: ' + error.message, 'error');
  }
}

async function toggleStoreApproval(id, approve) {
  try {
    const res = await window.API.put(`/admin/businesses/${id}/approve`, { isApproved: approve });
    if (res.success) {
      window.showToast(`Store status set to ${approve ? 'Approved' : 'Suspended'}`, 'success');
      loadAdminPortal();
    }
  } catch (error) {
    window.showToast('Failed to modify status: ' + error.message, 'error');
  }
}

function initAdminSocket() {
  try {
    socket = io();

    socket.on('connect', () => {
      addLog('Auditing log channel established.', 'info');
    });

    socket.on('admin_new_order', (order) => {
      console.log('Admin socket got order receipt alert:', order);
      window.showToast(`🔔 Checkout session: Order #${order._id.substr(-6).toUpperCase()} placed at ${order.business.businessName}`, 'info');
      addLog(`Order #${order._id.substr(-6).toUpperCase()} ($${order.totalPrice.toFixed(2)}) processed at ${order.business.businessName}`, 'success');
      
      // Refresh stats
      loadStats();
    });

  } catch (e) {
    console.warn('Admin WebSocket connection error:', e);
  }
}

function addLog(msg, type = 'info') {
  const container = document.getElementById('admin-socket-log');
  if (!container) return;

  const time = new Date().toLocaleTimeString('en-US', { hour12: false });
  const log = document.createElement('div');
  
  let color = 'text-slate-500';
  if (type === 'success') color = 'text-emerald-400';
  if (type === 'error') color = 'text-rose-500';

  log.className = `${color}`;
  log.innerHTML = `<span class="text-slate-600">[${time}]</span> ${msg}`;
  
  if (container.children.length === 1 && container.children[0].textContent.includes('Listening')) {
    container.innerHTML = '';
  }

  container.appendChild(log);
  container.scrollTop = container.scrollHeight;
}

async function downloadExcelSheet(sheetName) {
  try {
    window.showToast(`Generating sheet: ${sheetName}...`, 'info');
    
    const token = window.API.getToken();
    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`/api/admin/export/${sheetName}`, {
      method: 'GET',
      headers
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.message || 'Export failed');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    
    const dateStr = new Date().toISOString().split('T')[0];
    a.download = `${sheetName}_export_${dateStr}.xlsx`;
    
    document.body.appendChild(a);
    a.click();
    
    setTimeout(() => {
      a.remove();
      window.URL.revokeObjectURL(url);
    }, 100);

    window.showToast('Spreadsheet downloaded successfully!', 'success');
  } catch (error) {
    window.showToast('Failed to export sheet: ' + error.message, 'error');
  }
}

// Bind to window
window.toggleStoreApproval = toggleStoreApproval;
window.downloadExcelSheet = downloadExcelSheet;

let currentPreviewData = null;

async function previewExcelSheet(sheetName, title) {
  try {
    window.showToast(`Loading preview for ${title}...`, 'info');
    
    const token = window.API.getToken();
    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`/api/admin/export/${sheetName}?preview=true`, {
      method: 'GET',
      headers
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.message || 'Failed to fetch preview');
    }

    const resData = await response.json();
    if (resData.success) {
      currentPreviewData = resData;
      
      document.getElementById('preview-title').textContent = `${title} - Live Preview`;
      document.getElementById('preview-subtitle').textContent = `Total Records: ${resData.rows.length}`;
      
      // Bind download button
      const downloadBtn = document.getElementById('modal-download-btn');
      downloadBtn.onclick = () => downloadExcelSheet(sheetName);
      
      // Setup Search Input
      const searchInput = document.getElementById('preview-search');
      searchInput.value = '';
      searchInput.oninput = (e) => filterPreviewTable(e.target.value);
      
      renderPreviewTable(resData.headers, resData.rows);
      
      // Show modal
      document.getElementById('preview-modal').classList.remove('hidden');
    }
  } catch (error) {
    window.showToast('Failed to open preview: ' + error.message, 'error');
  }
}

function renderPreviewTable(headers, rows) {
  const thead = document.getElementById('preview-thead');
  const tbody = document.getElementById('preview-tbody');
  
  if (!thead || !tbody) return;

  // Headers
  thead.innerHTML = `
    <tr class="bg-slate-900 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
      ${headers.map(h => `<th class="py-3 px-4 whitespace-nowrap">${h}</th>`).join('')}
    </tr>
  `;
  
  // Rows
  if (rows.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="${headers.length}" class="py-8 text-center text-slate-500 italic">No records found.</td>
      </tr>
    `;
    return;
  }
  
  tbody.innerHTML = rows.map(row => `
    <tr class="border-b border-slate-900/60 table-row-hover">
      ${row.map(val => `<td class="py-2.5 px-4 text-slate-300 whitespace-nowrap">${val === null || val === undefined ? '' : val}</td>`).join('')}
    </tr>
  `).join('');
}

function filterPreviewTable(query) {
  if (!currentPreviewData) return;
  const lowercaseQuery = query.toLowerCase().trim();
  
  if (!lowercaseQuery) {
    renderPreviewTable(currentPreviewData.headers, currentPreviewData.rows);
    return;
  }
  
  const filteredRows = currentPreviewData.rows.filter(row => 
    row.some(val => String(val).toLowerCase().includes(lowercaseQuery))
  );
  
  renderPreviewTable(currentPreviewData.headers, filteredRows);
}

function closePreviewModal() {
  const modal = document.getElementById('preview-modal');
  if (modal) modal.classList.add('hidden');
  currentPreviewData = null;
}

window.previewExcelSheet = previewExcelSheet;
window.closePreviewModal = closePreviewModal;


