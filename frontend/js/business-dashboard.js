let storeId = '';
let categoryChartInstance = null;
let socket = null;

document.addEventListener('DOMContentLoaded', () => {
  const user = window.API.getUser();
  if (user && user.businessId) {
    storeId = user.businessId;
  }

  loadOverview();
  loadOrders();
  initMerchantSocket();
});

async function loadOverview() {
  try {
    const res = await window.API.get('/business/overview');
    if (res.success) {
      const { stats, business, categoryStats } = res.data;
      
      // Update UI Header & stats
      document.getElementById('store-title').textContent = business.businessName;
      document.getElementById('stat-revenue').textContent = `$${stats.totalRevenue.toFixed(2)}`;
      document.getElementById('stat-active').textContent = stats.activeOrders;
      document.getElementById('stat-pending').textContent = stats.pendingOrders;
      document.getElementById('stat-products').textContent = stats.productsCount;

      renderCategoryChart(categoryStats);
    }
  } catch (error) {
    window.showToast('Failed to load store stats: ' + error.message, 'error');
  }
}

async function loadOrders() {
  const container = document.getElementById('active-orders-list');
  const emptyState = document.getElementById('queue-empty-state');

  try {
    const res = await window.API.get('/business/orders');
    if (res.success) {
      const activeOrders = res.data.filter(o => !['Delivered', 'Cancelled'].includes(o.orderStatus));
      
      if (!container) return;
      container.innerHTML = '';

      if (activeOrders.length === 0) {
        emptyState.classList.remove('hidden');
        return;
      }

      emptyState.classList.add('hidden');

      activeOrders.forEach(order => {
        const date = new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        // Products list HTML
        const itemsHtml = order.products.map(p => {
          const pName = p.product ? p.product.name : 'Unknown Product';
          return `<div class="text-xs text-slate-300 font-medium">${pName} <span class="text-slate-500">x${p.quantity}</span></div>`;
        }).join('');

        // Action buttons based on status
        let buttonsHtml = '';
        if (order.orderStatus === 'Pending') {
          buttonsHtml = `
            <button onclick="changeStatus('${order._id}', 'Confirmed')" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg shadow-md transition">Accept</button>
            <button onclick="changeStatus('${order._id}', 'Cancelled')" class="px-4 py-2 bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 text-xs font-bold rounded-lg transition">Reject</button>
          `;
        } else if (order.orderStatus === 'Confirmed') {
          buttonsHtml = `
            <button onclick="changeStatus('${order._id}', 'Preparing')" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg shadow-md transition">Start Preparing</button>
          `;
        } else if (order.orderStatus === 'Preparing') {
          buttonsHtml = `
            <button onclick="changeStatus('${order._id}', 'Ready for Pickup')" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-md transition">Ready for Pickup</button>
          `;
        } else {
          // Ready for Pickup, Picked Up, Out for Delivery
          buttonsHtml = `
            <span class="text-xs text-slate-500 font-semibold italic flex items-center gap-1">
              <span class="inline-block w-1.5 h-1.5 bg-amber-500 rounded-full animate-ping"></span>
              Status: ${order.orderStatus}
            </span>
          `;
        }

        const card = document.createElement('div');
        card.className = 'glass-panel p-5 rounded-2xl border border-slate-800/80 flex flex-col md:flex-row justify-between gap-4 items-start md:items-center';
        
        card.innerHTML = `
          <div class="space-y-2 flex-grow">
            <div class="flex items-center gap-3">
              <h4 class="font-bold text-slate-100">Order #${order._id.substr(-6).toUpperCase()}</h4>
              <span class="text-[10px] bg-slate-900 border border-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono">${date}</span>
              <span class="text-xs font-bold text-indigo-400">Total: $${order.totalPrice.toFixed(2)}</span>
            </div>
            
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div class="space-y-1">
                <span class="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Customer Details</span>
                <span class="block font-semibold text-slate-300">${order.customer.name} (${order.customer.phone})</span>
                <span class="block text-slate-400 leading-tight">${order.deliveryAddress}</span>
              </div>
              <div class="space-y-1">
                <span class="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Ordered Items</span>
                ${itemsHtml}
              </div>
            </div>
          </div>

          <div class="flex items-center gap-2 self-end md:self-auto">
            ${buttonsHtml}
          </div>
        `;

        container.appendChild(card);
      });
    }
  } catch (error) {
    window.showToast('Failed to load active orders: ' + error.message, 'error');
  }
}

async function changeStatus(orderId, status) {
  try {
    const res = await window.API.put(`/business/orders/${orderId}/status`, { status });
    if (res.success) {
      window.showToast(`Order status updated to ${status}`, 'success');
      loadOverview();
      loadOrders();
    }
  } catch (error) {
    window.showToast('Failed to update status: ' + error.message, 'error');
  }
}

function renderCategoryChart(data) {
  const ctx = document.getElementById('categoryChart');
  if (!ctx) return;

  if (categoryChartInstance) {
    categoryChartInstance.destroy();
  }

  if (!data || data.length === 0) {
    data = [{ name: 'No products', value: 1 }];
  }

  const categories = data.map(item => item.name);
  const counts = data.map(item => item.value);

  categoryChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: categories,
      datasets: [{
        label: 'Items count',
        data: counts,
        backgroundColor: 'rgba(99, 102, 241, 0.6)',
        borderColor: 'rgba(99, 102, 241, 1)',
        borderWidth: 1,
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: {
            color: 'rgba(255,255,255,0.05)'
          },
          ticks: {
            color: '#64748b'
          }
        },
        x: {
          grid: {
            display: false
          },
          ticks: {
            color: '#64748b'
          }
        }
      }
    }
  });
}

function initMerchantSocket() {
  if (!storeId) return;

  try {
    socket = io();

    socket.on('connect', () => {
      addLog(`Listening room: new_order_${storeId}`, 'info');
    });

    socket.on(`new_order_${storeId}`, (order) => {
      console.log('Merchant socket got new order:', order);
      window.showToast('🔔 New incoming order received!', 'success');
      addLog(`New order #${order._id.substr(-6).toUpperCase()} placed by ${order.customer.name}`, 'success');
      
      // Reload details
      loadOverview();
      loadOrders();
    });

  } catch (e) {
    console.warn('Merchant socket connection error:', e);
  }
}

function addLog(msg, type = 'info') {
  const container = document.getElementById('merchant-socket-log');
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

// Bind to window
window.changeStatus = changeStatus;
