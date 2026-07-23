let allBusinesses = [];

document.addEventListener('DOMContentLoaded', () => {
  loadBusinesses();
});

async function loadBusinesses() {
  const grid = document.getElementById('stores-grid');
  const emptyState = document.getElementById('empty-state');

  try {
    const res = await window.API.get('/customer/businesses');
    if (res.success) {
      allBusinesses = res.data;
      renderBusinesses(allBusinesses);
    }
  } catch (error) {
    window.showToast('Failed to load stores: ' + error.message, 'error');
    if (grid) {
      grid.innerHTML = `<div class="col-span-full text-center text-rose-400 font-semibold py-8">Error loading businesses. Please try again.</div>`;
    }
  }
}

function renderBusinesses(list) {
  const grid = document.getElementById('stores-grid');
  const emptyState = document.getElementById('empty-state');
  
  if (!grid) return;
  grid.innerHTML = '';

  if (list.length === 0) {
    emptyState.classList.remove('hidden');
    return;
  }
  
  emptyState.classList.add('hidden');

  list.forEach(biz => {
    const logo = biz.logo || 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=400&q=80';
    
    const card = document.createElement('div');
    card.className = 'glass-panel rounded-2xl overflow-hidden shadow-xl border border-slate-800/80 hover:border-slate-700/80 transition duration-300 flex flex-col justify-between cursor-pointer transform hover:-translate-y-1';
    card.onclick = () => {
      window.location.href = `/business-detail.html?id=${biz._id}`;
    };

    card.innerHTML = `
      <div>
        <div class="relative h-44 overflow-hidden bg-slate-900">
          <img src="${logo}" alt="${biz.businessName}" class="w-full h-full object-cover transition-transform duration-300 hover:scale-105">
          <div class="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-80"></div>
          <span class="absolute bottom-3 left-4 bg-indigo-600/90 text-white text-xs font-bold px-2.5 py-1 rounded-md shadow uppercase tracking-wider">
            Verified
          </span>
        </div>
        <div class="p-5">
          <h3 class="text-xl font-bold text-slate-100 mb-1">${biz.businessName}</h3>
          <p class="text-slate-400 text-xs flex items-center gap-1 mb-3">
            <svg class="w-3.5 h-3.5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
            ${biz.address}
          </p>
          <p class="text-slate-400 text-sm line-clamp-2 leading-relaxed">
            ${biz.description || 'Welcome to our store. We offer fresh local delivery right to your door.'}
          </p>
        </div>
      </div>
      <div class="p-5 pt-0 border-t border-slate-800/40 flex justify-between items-center mt-4">
        <span class="text-xs text-slate-500 font-semibold flex items-center gap-1">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
          ${biz.contactNumber}
        </span>
        <button class="text-xs font-bold text-indigo-400 hover:text-indigo-300 transition flex items-center gap-1">
          Browse Menu
          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
        </button>
      </div>
    `;

    grid.appendChild(card);
  });
}

function filterBusinesses() {
  const query = document.getElementById('search-input').value.toLowerCase().trim();
  const filtered = allBusinesses.filter(biz => 
    biz.businessName.toLowerCase().includes(query) ||
    biz.address.toLowerCase().includes(query) ||
    biz.description.toLowerCase().includes(query)
  );
  renderBusinesses(filtered);
}

window.filterBusinesses = filterBusinesses;
