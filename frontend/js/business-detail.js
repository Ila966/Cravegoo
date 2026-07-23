let businessId = '';
let storeInfo = null;
let allProducts = [];
let activeCategory = 'All';

document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  businessId = params.get('id');

  if (!businessId) {
    window.location.href = '/customer-home.html';
    return;
  }

  loadStoreAndProducts();
});

async function loadStoreAndProducts() {
  try {
    const url = `/customer/businesses/${businessId}/products?category=${activeCategory}`;
    const res = await window.API.get(url);

    if (res.success) {
      storeInfo = res.business;
      allProducts = res.data;
      
      renderStoreHeader();
      renderCategoryTabs();
      renderProducts(allProducts);
    }
  } catch (error) {
    window.showToast('Failed to load menu: ' + error.message, 'error');
  }
}

function renderStoreHeader() {
  const banner = document.getElementById('store-banner');
  if (!banner || !storeInfo) return;

  const bgImage = storeInfo.logo || 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&q=80';

  banner.innerHTML = `
    <div class="absolute inset-0 bg-cover bg-center" style="background-image: url('${bgImage}')"></div>
    <div class="absolute inset-0 bg-slate-950/80 backdrop-blur-xs"></div>
    <div class="absolute bottom-0 left-0 w-full p-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
      <div class="space-y-2">
        <h1 class="text-3xl md:text-4xl font-extrabold text-white">${storeInfo.businessName}</h1>
        <p class="text-slate-300 text-sm max-w-2xl">${storeInfo.description || 'Welcome to our store. We offer fresh local delivery right to your door.'}</p>
        <p class="text-slate-400 text-xs flex items-center gap-1">
          <svg class="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
          ${storeInfo.address}
        </p>
      </div>
      <div class="flex items-center gap-4 bg-slate-900/60 backdrop-blur border border-slate-800 p-4 rounded-2xl w-fit">
        <div class="text-xs text-slate-400">
          <span class="block font-semibold text-slate-300">Contact Shop</span>
          ${storeInfo.contactNumber}
        </div>
      </div>
    </div>
  `;
}

function renderCategoryTabs() {
  const container = document.getElementById('categories-tabs');
  if (!container) return;

  // Extract unique categories
  const categories = ['All', ...new Set(allProducts.map(p => p.category))];
  
  container.innerHTML = '';
  categories.forEach(cat => {
    const isActive = activeCategory === cat;
    const btn = document.createElement('button');
    btn.className = `px-4 py-2 rounded-xl text-sm font-semibold transition ${
      isActive ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'
    }`;
    btn.textContent = cat;
    btn.onclick = () => selectCategory(cat);
    container.appendChild(btn);
  });
}

function renderProducts(list) {
  const grid = document.getElementById('products-grid');
  const emptyMenu = document.getElementById('empty-menu');

  if (!grid) return;
  grid.innerHTML = '';

  const filtered = activeCategory === 'All' ? list : list.filter(p => p.category === activeCategory);

  if (filtered.length === 0) {
    emptyMenu.classList.remove('hidden');
    return;
  }

  emptyMenu.classList.add('hidden');

  filtered.forEach(prod => {
    const card = document.createElement('div');
    card.className = 'glass-panel rounded-2xl overflow-hidden shadow-lg border border-slate-800/80 flex flex-col justify-between glass-panel-hover';

    const pImage = prod.images && prod.images[0] ? prod.images[0] : 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80';
    const isOutOfStock = prod.stock <= 0;

    card.innerHTML = `
      <div>
        <div class="relative h-44 overflow-hidden bg-slate-900">
          <img src="${pImage}" alt="${prod.name}" class="w-full h-full object-cover">
          ${isOutOfStock ? `
            <div class="absolute inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center">
              <span class="bg-rose-600/90 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-lg">OUT OF STOCK</span>
            </div>
          ` : ''}
        </div>
        <div class="p-5">
          <div class="flex justify-between items-start gap-2 mb-1">
            <h3 class="font-bold text-slate-100 line-clamp-1">${prod.name}</h3>
            <span class="text-indigo-400 font-bold">$${prod.price.toFixed(2)}</span>
          </div>
          <span class="inline-block text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-semibold uppercase tracking-wider mb-2">
            ${prod.category}
          </span>
          <p class="text-slate-400 text-xs line-clamp-2 leading-relaxed">
            ${prod.description || 'No description available for this product.'}
          </p>
        </div>
      </div>

      <div class="p-5 pt-0 mt-4 flex items-center justify-between">
        <span class="text-[11px] text-slate-500 font-medium">
          Stock: <span class="${isOutOfStock ? 'text-rose-500 font-bold' : 'text-slate-400'}">${prod.stock} left</span>
        </span>
        <button onclick="addToCart('${prod._id}')" ${isOutOfStock ? 'disabled' : ''}
                class="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg transition flex items-center gap-1 shadow">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
          Add to Cart
        </button>
      </div>
    `;

    grid.appendChild(card);
  });
}

function selectCategory(category) {
  activeCategory = category;
  renderCategoryTabs();
  renderProducts(allProducts);
}

function searchProducts() {
  const query = document.getElementById('product-search').value.toLowerCase().trim();
  const searchRegex = new RegExp(query, 'i');
  const filtered = allProducts.filter(p => searchRegex.test(p.name) || searchRegex.test(p.description));
  renderProducts(filtered);
}

function addToCart(prodId) {
  const product = allProducts.find(p => p._id === prodId);
  if (product) {
    window.Cart.add(product, businessId);
  }
}

// Bind to window
window.selectCategory = selectCategory;
window.searchProducts = searchProducts;
window.addToCart = addToCart;
