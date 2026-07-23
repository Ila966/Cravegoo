document.addEventListener('DOMContentLoaded', () => {
  loadOrderHistory();
});

async function loadOrderHistory() {
  const container = document.getElementById('orders-list');
  const emptyState = document.getElementById('history-empty-state');

  try {
    const res = await window.API.get('/customer/orders');
    if (res.success) {
      renderOrders(res.data);
    }
  } catch (error) {
    window.showToast('Failed to load orders: ' + error.message, 'error');
    if (container) {
      container.innerHTML = `<div class="text-rose-400 font-semibold py-8 text-center">Error loading orders.</div>`;
    }
  }
}

function renderOrders(list) {
  const container = document.getElementById('orders-list');
  const emptyState = document.getElementById('history-empty-state');

  if (!container) return;
  container.innerHTML = '';

  if (list.length === 0) {
    emptyState.classList.remove('hidden');
    return;
  }

  emptyState.classList.add('hidden');

  list.forEach(order => {
    const date = new Date(order.createdAt).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const productsSummary = order.products && order.products.length > 0
      ? `${order.products.length} item(s) purchased`
      : 'No items details';

    const card = document.createElement('div');
    card.className = 'glass-panel p-5 rounded-2xl border border-slate-800 flex items-center justify-between gap-4 flex-wrap sm:flex-nowrap';

    let statusBadgeColor = 'bg-slate-800 text-slate-400';
    if (['Pending', 'Confirmed'].includes(order.orderStatus)) statusBadgeColor = 'bg-indigo-950 text-indigo-400 border border-indigo-500/30';
    else if (['Preparing', 'Ready for Pickup'].includes(order.orderStatus)) statusBadgeColor = 'bg-amber-950 text-amber-400 border border-amber-500/30';
    else if (['Picked Up', 'Out for Delivery'].includes(order.orderStatus)) statusBadgeColor = 'bg-sky-950 text-sky-400 border border-sky-500/30';
    else if (order.orderStatus === 'Delivered') statusBadgeColor = 'bg-emerald-950 text-emerald-400 border border-emerald-500/30';
    else if (order.orderStatus === 'Cancelled') statusBadgeColor = 'bg-rose-950 text-rose-400 border border-rose-500/30';

    card.innerHTML = `
      <div class="space-y-1">
        <div class="flex items-center gap-3">
          <h3 class="text-lg font-bold text-slate-100">${order.business.businessName}</h3>
          <span class="text-xs px-2.5 py-0.5 rounded-full font-semibold uppercase tracking-wider ${statusBadgeColor}">
            ${order.orderStatus}
          </span>
        </div>
        <p class="text-xs text-slate-500">${date}</p>
        <p class="text-sm text-slate-400 font-medium">${productsSummary} &bull; Total: <span class="text-indigo-400 font-bold">$${order.totalPrice.toFixed(2)}</span></p>
      </div>

      <div class="flex items-center gap-3 w-full sm:w-auto">
        <a href="/order-tracking.html?id=${order._id}"
           class="w-full sm:w-auto text-center px-4 py-2 bg-slate-900 border border-slate-700 hover:border-slate-600 rounded-xl text-slate-200 text-sm font-semibold transition flex items-center justify-center gap-1.5 shadow">
          <svg class="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
          Track Order
        </a>
      </div>
    `;

    container.appendChild(card);
  });
}

// Bind to window
window.loadOrderHistory = loadOrderHistory;
