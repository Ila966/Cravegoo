document.addEventListener('DOMContentLoaded', () => {
  initCheckout();
  
  // Set payment card simulation toggles
  const paymentRadios = document.querySelectorAll('input[name="payment-method"]');
  paymentRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      const cardSim = document.getElementById('card-simulation');
      if (e.target.value === 'card') {
        cardSim.classList.remove('hidden');
      } else {
        cardSim.classList.add('hidden');
      }
    });
  });
});

function initCheckout() {
  const cart = window.Cart.get();
  if (cart.length === 0) {
    window.location.href = '/cart.html';
    return;
  }

  // Pre-fill user shipping destination address
  const user = window.API.getUser();
  if (user && user.address) {
    document.getElementById('checkout-address').value = user.address;
  }

  // Render items list
  const list = document.getElementById('checkout-items-list');
  if (!list) return;
  list.innerHTML = '';

  let subtotal = 0;
  cart.forEach(item => {
    subtotal += item.price * item.quantity;
    const div = document.createElement('div');
    div.className = 'flex justify-between items-center text-xs text-slate-300';
    div.innerHTML = `
      <span class="truncate max-w-[150px] font-medium">${item.name} <span class="text-slate-500">x${item.quantity}</span></span>
      <span class="font-semibold text-slate-200">$${(item.price * item.quantity).toFixed(2)}</span>
    `;
    list.appendChild(div);
  });

  const deliveryFee = 3.99;
  const tax = subtotal * 0.08;
  const grandTotal = subtotal + deliveryFee + tax;

  document.getElementById('checkout-subtotal').textContent = `$${subtotal.toFixed(2)}`;
  document.getElementById('checkout-tax').textContent = `$${tax.toFixed(2)}`;
  document.getElementById('checkout-total').textContent = `$${grandTotal.toFixed(2)}`;
}

async function placeOrder() {
  const addressInput = document.getElementById('checkout-address');
  const address = addressInput.value.trim();
  const paymentMethod = document.querySelector('input[name="payment-method"]:checked').value;
  const btn = document.getElementById('btn-submit-order');

  if (!address) {
    window.showToast('Please enter shipping destination address', 'error');
    addressInput.focus();
    return;
  }

  const cart = window.Cart.get();
  if (cart.length === 0) {
    window.showToast('Your cart is empty', 'error');
    return;
  }

  const payload = {
    businessId: cart[0].businessId,
    items: cart.map(item => ({
      productId: item.productId,
      quantity: item.quantity
    })),
    paymentMethod,
    deliveryAddress: address
  };

  btn.disabled = true;
  btn.innerHTML = `
    <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
    Placing Order...
  `;

  try {
    const res = await window.API.post('/customer/orders', payload);
    
    if (res.success) {
      window.showToast('Order placed successfully!', 'success');
      window.Cart.clear();
      
      setTimeout(() => {
        window.location.href = `/order-tracking.html?id=${res.data._id}`;
      }, 1000);
    }
  } catch (error) {
    window.showToast('Failed to place order: ' + error.message, 'error');
    btn.disabled = false;
    btn.innerHTML = `
      <span>Place Order</span>
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
    `;
  }
}

// Bind to window
window.placeOrder = placeOrder;
