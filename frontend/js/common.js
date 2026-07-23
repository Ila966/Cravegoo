// Common utilities, Dynamic Header/Footer, Auth Guards, and Custom Toast Notifications
document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  checkAuthGuard();
  initToastContainer();
});

// Toast System
function initToastContainer() {
  if (!document.getElementById('toast-container')) {
    const container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'fixed bottom-5 right-5 z-50 flex flex-col gap-3 pointer-events-none max-w-sm w-full';
    document.body.appendChild(container);
  }
}

function showToast(message, type = 'success') {
  initToastContainer();
  const container = document.getElementById('toast-container');
  
  const toast = document.createElement('div');
  toast.className = `glass-panel shadow-2xl p-4 rounded-xl flex items-center gap-3 border-l-4 translate-y-10 opacity-0 transition-all duration-300 pointer-events-auto toast-${type}`;
  
  let icon = '';
  if (type === 'success') {
    icon = `<svg class="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;
  } else if (type === 'error') {
    icon = `<svg class="w-5 h-5 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;
  } else {
    icon = `<svg class="w-5 h-5 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;
  }

  toast.innerHTML = `
    <div class="flex-shrink-0">${icon}</div>
    <div class="flex-grow text-sm font-medium text-slate-200">${message}</div>
    <button class="text-slate-400 hover:text-slate-200 focus:outline-none">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
    </button>
  `;

  // Close event listener
  toast.querySelector('button').addEventListener('click', () => {
    toast.classList.add('opacity-0', 'translate-y-5');
    setTimeout(() => toast.remove(), 300);
  });

  container.appendChild(toast);

  // Trigger animation frame
  requestAnimationFrame(() => {
    toast.classList.remove('opacity-0', 'translate-y-10');
  });

  // Auto remove
  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-5');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Cart Helpers
const Cart = {
  get: () => {
    try {
      return JSON.parse(localStorage.getItem('cart')) || [];
    } catch (e) {
      return [];
    }
  },
  
  save: (cart) => {
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCountBadge();
  },

  add: (product, businessId) => {
    let cart = Cart.get();
    
    // Check if item is from a different business. 
    // Usually customers can only order from one business at a time.
    if (cart.length > 0 && cart[0].businessId !== businessId) {
      const confirmClear = confirm("Your cart contains items from another business. Clear cart and add this item?");
      if (!confirmClear) return false;
      cart = [];
    }

    const existing = cart.find(item => item.productId === product._id);
    if (existing) {
      if (existing.quantity >= product.stock) {
        showToast(`Cannot add more. Only ${product.stock} items left in stock.`, 'error');
        return false;
      }
      existing.quantity++;
    } else {
      cart.push({
        productId: product._id,
        name: product.name,
        price: product.price,
        image: product.images[0] || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=100&q=80',
        quantity: 1,
        stock: product.stock,
        businessId
      });
    }

    Cart.save(cart);
    showToast(`Added ${product.name} to cart!`, 'success');
    return true;
  },

  updateQuantity: (productId, qty) => {
    let cart = Cart.get();
    const item = cart.find(item => item.productId === productId);
    if (item) {
      if (qty > item.stock) {
        showToast(`Only ${item.stock} items in stock`, 'error');
        return;
      }
      item.quantity = Math.max(1, qty);
      Cart.save(cart);
    }
  },

  remove: (productId) => {
    let cart = Cart.get();
    cart = cart.filter(item => item.productId !== productId);
    Cart.save(cart);
    showToast('Item removed from cart', 'info');
  },

  clear: () => {
    localStorage.removeItem('cart');
    updateCartCountBadge();
  }
};

function updateCartCountBadge() {
  const badge = document.getElementById('cart-badge');
  if (badge) {
    const cart = Cart.get();
    const totalCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    if (totalCount > 0) {
      badge.textContent = totalCount;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  }
}

// Dynamically Render Navbar based on Auth State & Role
function initNavbar() {
  const navContainer = document.getElementById('nav-container');
  if (!navContainer) return;

  const user = window.API.getUser();
  const token = window.API.getToken();

  let logoUrl = '/index.html';
  if (user) {
    if (user.role === 'customer') logoUrl = '/customer-home.html';
    else if (user.role === 'business') logoUrl = '/business-dashboard.html';
    else if (user.role === 'delivery') logoUrl = '/delivery-dashboard.html';
    else if (user.role === 'admin') logoUrl = '/admin-dashboard.html';
  }

  let navItemsHtml = '';
  
  if (!token || !user) {
    navItemsHtml = `
      <a href="/login.html" class="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition">Sign In</a>
      <a href="/register.html" class="px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg shadow-lg hover:shadow-indigo-500/20 transition">Register</a>
    `;
  } else {
    // Shared links based on role
    if (user.role === 'customer') {
      navItemsHtml = `
        <a href="/customer-home.html" class="px-3 py-2 text-sm font-medium text-slate-300 hover:text-white transition">Stores</a>
        <a href="/order-history.html" class="px-3 py-2 text-sm font-medium text-slate-300 hover:text-white transition">My Orders</a>
        <a href="/cart.html" class="relative px-3 py-2 text-sm font-medium text-slate-300 hover:text-white transition flex items-center gap-1.5">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
          Cart
          <span id="cart-badge" class="hidden absolute -top-1.5 -right-1 bg-rose-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center border border-slate-900 shadow">0</span>
        </a>
      `;
    } else if (user.role === 'business') {
      navItemsHtml = `
        <a href="/business-dashboard.html" class="px-3 py-2 text-sm font-medium text-slate-300 hover:text-white transition">Dashboard</a>
        <a href="/business-products.html" class="px-3 py-2 text-sm font-medium text-slate-300 hover:text-white transition">Products</a>
      `;
    } else if (user.role === 'delivery') {
      navItemsHtml = `
        <a href="/delivery-dashboard.html" class="px-3 py-2 text-sm font-medium text-slate-300 hover:text-white transition">Dashboard</a>
      `;
    } else if (user.role === 'admin') {
      navItemsHtml = `
        <a href="/admin-dashboard.html" class="px-3 py-2 text-sm font-medium text-slate-300 hover:text-white transition">Stats</a>
        <a href="/admin-users.html" class="px-3 py-2 text-sm font-medium text-slate-300 hover:text-white transition">Users</a>
      `;
    }

    navItemsHtml += `
      <div class="h-5 w-[1px] bg-slate-700 mx-2"></div>
      <a href="/profile.html" class="px-3 py-2 text-sm font-medium text-slate-300 hover:text-white transition flex items-center gap-1.5">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
        ${user.name.split(' ')[0]}
      </a>
      <button onclick="window.API.logout()" class="px-3 py-2 text-sm font-medium text-slate-400 hover:text-rose-400 transition flex items-center gap-1">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
        Logout
      </button>
    `;
  }

  navContainer.innerHTML = `
    <nav class="glass-panel border-b border-slate-800/80 fixed w-full top-0 left-0 z-40 transition-all duration-300">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-16">
          <div class="flex items-center">
            <a href="${logoUrl}" class="flex items-center gap-2">
              <div class="bg-[#e23744] p-2 rounded-xl text-white shadow-md shadow-rose-500/10">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
              </div>
              <span class="font-extrabold text-xl tracking-tight text-slate-900">
                CraveGo
              </span>
            </a>
          </div>
          <div class="flex items-center gap-2">
            ${navItemsHtml}
          </div>
        </div>
      </div>
    </nav>
  `;

  // Inject body margin
  document.body.style.paddingTop = '64px';
  updateCartCountBadge();
}

// Authentication Guards for Protected Routes
function checkAuthGuard() {
  const user = window.API.getUser();
  const token = window.API.getToken();
  const path = window.location.pathname;

  const publicPaths = ['/', '/index.html', '/login.html', '/register.html', '/about.html', '/contact.html'];
  const isPublicPath = publicPaths.includes(path) || path === '';

  // 1. If trying to access non-public page without credentials, redirect to login
  if (!isPublicPath && (!token || !user)) {
    window.location.href = '/login.html';
    return;
  }

  // 2. Role specific access blocks
  if (user) {
    if (path.includes('customer-') || path.includes('cart.html') || path.includes('checkout.html') || path.includes('order-') || path.includes('business-detail.html')) {
      if (user.role !== 'customer') {
        redirectRole(user.role);
      }
    } else if (path.includes('business-')) {
      if (user.role !== 'business') {
        redirectRole(user.role);
      }
    } else if (path.includes('delivery-')) {
      if (user.role !== 'delivery') {
        redirectRole(user.role);
      }
    } else if (path.includes('admin-')) {
      if (user.role !== 'admin') {
        redirectRole(user.role);
      }
    }
  }
}

function redirectRole(role) {
  if (role === 'customer') window.location.href = '/customer-home.html';
  else if (role === 'business') window.location.href = '/business-dashboard.html';
  else if (role === 'delivery') window.location.href = '/delivery-dashboard.html';
  else if (role === 'admin') window.location.href = '/admin-dashboard.html';
}

// Global Exports
window.showToast = showToast;
window.Cart = Cart;
