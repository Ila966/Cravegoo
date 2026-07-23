let businessProducts = [];

document.addEventListener('DOMContentLoaded', () => {
  loadProducts();
  const form = document.getElementById('product-form');
  if (form) {
    form.addEventListener('submit', handleProductSubmit);
  }
});

async function loadProducts() {
  const tbody = document.getElementById('products-table-body');
  try {
    const res = await window.API.get('/business/products');
    if (res.success) {
      businessProducts = res.data;
      renderProductsTable(businessProducts);
    }
  } catch (error) {
    window.showToast('Failed to load products: ' + error.message, 'error');
  }
}

function renderProductsTable(list) {
  const tbody = document.getElementById('products-table-body');
  if (!tbody) return;

  tbody.innerHTML = '';

  if (list.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="py-8 text-center text-slate-500 font-semibold">
          No products in catalog. Add your first item above!
        </td>
      </tr>
    `;
    return;
  }

  list.forEach(prod => {
    const img = prod.images && prod.images[0] ? prod.images[0] : 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=100&q=80';
    const tr = document.createElement('tr');
    tr.className = 'border-b border-slate-900 table-row-hover';

    tr.innerHTML = `
      <td class="py-4 px-6 flex items-center gap-3">
        <img src="${img}" alt="${prod.name}" class="w-12 h-12 object-cover rounded-lg bg-slate-900 border border-slate-800">
        <div>
          <span class="block font-bold text-slate-100">${prod.name}</span>
          <span class="block text-[10px] text-slate-500 line-clamp-1 max-w-xs">${prod.description || ''}</span>
        </div>
      </td>
      <td class="py-4 px-6 text-slate-400 font-medium">${prod.category}</td>
      <td class="py-4 px-6 text-indigo-400 font-bold">$${prod.price.toFixed(2)}</td>
      <td class="py-4 px-6">
        <span class="${prod.stock <= 5 ? 'text-rose-500 font-bold' : 'text-slate-400 font-medium'}">
          ${prod.stock} units
        </span>
      </td>
      <td class="py-4 px-6 text-right space-x-1.5 whitespace-nowrap">
        <button onclick="editProduct('${prod._id}')" class="px-3 py-1.5 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-lg text-slate-300 text-xs font-semibold hover:text-white transition">Edit</button>
        <button onclick="deleteProduct('${prod._id}')" class="px-3 py-1.5 bg-rose-600/20 hover:bg-rose-600/30 rounded-lg text-rose-400 text-xs font-semibold transition">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function openModal(prod = null) {
  const modal = document.getElementById('product-modal');
  const title = document.getElementById('modal-title');
  const form = document.getElementById('product-form');

  form.reset();

  if (prod) {
    title.textContent = 'Edit Menu Item';
    document.getElementById('edit-product-id').value = prod._id;
    document.getElementById('prod-name').value = prod.name;
    document.getElementById('prod-category').value = prod.category;
    document.getElementById('prod-price').value = prod.price;
    document.getElementById('prod-stock').value = prod.stock;
    document.getElementById('prod-image').value = prod.images && prod.images[0] ? prod.images[0] : '';
    document.getElementById('prod-desc').value = prod.description || '';
  } else {
    title.textContent = 'Add New Menu Item';
    document.getElementById('edit-product-id').value = '';
  }

  modal.classList.remove('hidden');
}

function closeModal() {
  document.getElementById('product-modal').classList.add('hidden');
}

function editProduct(id) {
  const prod = businessProducts.find(p => p._id === id);
  if (prod) {
    openModal(prod);
  }
}

async function handleProductSubmit(e) {
  e.preventDefault();

  const id = document.getElementById('edit-product-id').value;
  const name = document.getElementById('prod-name').value.trim();
  const category = document.getElementById('prod-category').value.trim();
  const price = Number(document.getElementById('prod-price').value);
  const stock = Number(document.getElementById('prod-stock').value);
  const image = document.getElementById('prod-image').value.trim();
  const description = document.getElementById('prod-desc').value.trim();

  const payload = {
    name,
    category,
    price,
    stock,
    images: image ? [image] : [],
    description
  };

  const btn = document.getElementById('btn-modal-submit');
  btn.disabled = true;
  btn.textContent = 'Saving...';

  try {
    let res;
    if (id) {
      res = await window.API.put(`/business/products/${id}`, payload);
    } else {
      res = await window.API.post('/business/products', payload);
    }

    if (res.success) {
      window.showToast('Product saved successfully!', 'success');
      closeModal();
      loadProducts();
    }
  } catch (error) {
    window.showToast('Failed to save: ' + error.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Save Product';
  }
}

async function deleteProduct(id) {
  const confirmDelete = confirm("Are you sure you want to delete this product from your menu?");
  if (!confirmDelete) return;

  try {
    const res = await window.API.delete(`/business/products/${id}`);
    if (res.success) {
      window.showToast('Product deleted', 'info');
      loadProducts();
    }
  } catch (error) {
    window.showToast('Deletion failed: ' + error.message, 'error');
  }
}

// Bind to window
window.openModal = openModal;
window.closeModal = closeModal;
window.editProduct = editProduct;
window.deleteProduct = deleteProduct;
