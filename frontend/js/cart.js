document.addEventListener('DOMContentLoaded', () => {
  renderCart();
});

function renderCart() {
  const container = document.getElementById('cart-items-container');
  const emptyState = document.getElementById('cart-empty-state');
  const mainGrid = document.querySelector('main > div.grid');
  
  const cart = window.Cart.get();

  if (cart.length === 0) {
    if (mainGrid) mainGrid.classList.add('hidden');
    if (emptyState) emptyState.classList.remove('hidden');
    return;
  }

  if (mainGrid) mainGrid.classList.remove('hidden');
  if (emptyState) emptyState.classList.add('hidden');
  if (!container) return;

  container.innerHTML = '';

  let subtotal = 0;

  cart.forEach(item => {
    subtotal += item.price * item.quantity;
    
    const card = document.createElement('div');
    card.className = 'glass-panel p-4 rounded-xl border border-slate-800 flex items-center gap-4 justify-between flex-wrap sm:flex-nowrap';
    
    card.innerHTML = `
      <div class="flex items-center gap-4">
        <img src="${item.image}" alt="${item.name}" class="w-20 h-20 object-cover rounded-lg bg-slate-900 border border-slate-800">
        <div>
          <h4 class="font-bold text-slate-100">${item.name}</h4>
          <span class="text-xs text-slate-500 font-medium">Price: $${item.price.toFixed(2)}</span>
          <span class="block text-[10px] text-slate-500 mt-1">Stock Limit: ${item.stock}</span>
        </div>
      </div>

      <div class="flex items-center gap-6 justify-between w-full sm:w-auto">
        <!-- Quantity control -->
        <div class="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-1">
          <button onclick="changeQty('${item.productId}', ${item.quantity - 1})"
                  class="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-white rounded-md hover:bg-slate-800 transition">-</button>
          <span class="w-8 text-center text-sm font-semibold text-slate-200">${item.quantity}</span>
          <button onclick="changeQty('${item.productId}', ${item.quantity + 1})"
                  class="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-white rounded-md hover:bg-slate-800 transition">+</button>
        </div>

        <div class="text-right whitespace-nowrap min-w-[70px]">
          <span class="font-bold text-indigo-400">$${(item.price * item.quantity).toFixed(2)}</span>
        </div>

        <button onclick="removeItem('${item.productId}')" class="text-slate-500 hover:text-rose-500 p-2 rounded-lg hover:bg-slate-900 transition">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
        </button>
      </div>
    `;

    container.appendChild(card);
  });

  // Calculate totals
  const deliveryFee = 3.99;
  const tax = subtotal * 0.08;
  const grandTotal = subtotal + deliveryFee + tax;

  document.getElementById('summary-subtotal').textContent = `$${subtotal.toFixed(2)}`;
  document.getElementById('summary-tax').textContent = `$${tax.toFixed(2)}`;
  document.getElementById('summary-total').textContent = `$${grandTotal.toFixed(2)}`;
}

function changeQty(prodId, newQty) {
  window.Cart.updateQuantity(prodId, newQty);
  renderCart();
}

function removeItem(prodId) {
  window.Cart.remove(prodId);
  renderCart();
}

function goToCheckout() {
  const cart = window.Cart.get();
  if (cart.length === 0) {
    window.showToast('Your cart is empty', 'error');
    return;
  }
  window.location.href = '/checkout.html';
}

// Bind to window
window.changeQty = changeQty;
window.removeItem = removeItem;
window.goToCheckout = goToCheckout;
