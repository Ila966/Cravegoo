let activeJob = null;
let socket = null;
let simulationInterval = null;

document.addEventListener('DOMContentLoaded', () => {
  loadCourierDashboard();
  initCourierSocket();
});

async function loadCourierDashboard() {
  loadMetricsAndLedger();
  loadAvailableJobs();
  loadActiveAssignment();
}

async function loadMetricsAndLedger() {
  try {
    const res = await window.API.get('/delivery/earnings');
    if (res.success) {
      const { totalDeliveries, totalEarnings, history } = res.data;
      
      document.getElementById('earnings-count').textContent = totalDeliveries;
      document.getElementById('earnings-total').textContent = `$${totalEarnings.toFixed(2)}`;

      const list = document.getElementById('ledger-history-list');
      if (!list) return;
      list.innerHTML = '';

      if (history.length === 0) {
        list.innerHTML = `<div class="text-slate-600 italic">No completed deliveries on record.</div>`;
        return;
      }

      history.forEach(item => {
        const date = new Date(item.date).toLocaleDateString([], { month: 'short', day: 'numeric' });
        const div = document.createElement('div');
        div.className = 'flex justify-between items-center py-2 border-b border-slate-900';
        div.innerHTML = `
          <div>
            <span class="block font-bold text-slate-300">Order #${item.orderId.substr(-6).toUpperCase()}</span>
            <span class="block text-[10px] text-slate-500">${date} &bull; Vol: $${item.totalPrice.toFixed(2)}</span>
          </div>
          <span class="font-bold text-emerald-400">+$${item.fare.toFixed(2)}</span>
        `;
        list.appendChild(div);
      });
    }
  } catch (error) {
    console.error('Error loading ledger:', error);
  }
}

async function loadAvailableJobs() {
  const container = document.getElementById('available-jobs-list');
  const emptyState = document.getElementById('jobs-empty-state');

  try {
    const res = await window.API.get('/delivery/jobs/available');
    if (res.success) {
      if (!container) return;
      container.innerHTML = '';

      if (res.data.length === 0) {
        emptyState.classList.remove('hidden');
        return;
      }

      emptyState.classList.add('hidden');

      res.data.forEach(job => {
        const estPay = (5.50 + (job.totalPrice * 0.10)).toFixed(2);
        
        const card = document.createElement('div');
        card.className = 'glass-panel p-5 rounded-2xl border border-slate-800 flex justify-between items-center gap-4 flex-wrap sm:flex-nowrap hover:border-slate-700 transition';
        
        card.innerHTML = `
          <div class="space-y-1.5 flex-grow">
            <div class="flex items-center gap-2">
              <h4 class="font-bold text-slate-100">${job.business.businessName}</h4>
              <span class="text-[10px] bg-slate-900 border border-slate-800 text-slate-400 px-2 py-0.5 rounded">Payout: $${estPay}</span>
            </div>
            
            <div class="text-xs space-y-1">
              <p class="text-slate-400"><span class="font-semibold text-slate-500">Pick:</span> ${job.business.address}</p>
              <p class="text-slate-400"><span class="font-semibold text-slate-500">Drop:</span> ${job.deliveryAddress}</p>
            </div>
          </div>

          <button onclick="claimDelivery('${job._id}')"
                  class="w-full sm:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition shadow-md whitespace-nowrap">
            Accept Job
          </button>
        `;

        container.appendChild(card);
      });
    }
  } catch (error) {
    window.showToast('Failed to load jobs board: ' + error.message, 'error');
  }
}

async function loadActiveAssignment() {
  const container = document.getElementById('active-assignment-card');
  if (!container) return;

  try {
    const res = await window.API.get('/delivery/jobs/assigned');
    if (res.success && res.data.length > 0) {
      activeJob = res.data[0];
      
      const job = activeJob;
      const date = new Date(job.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      let buttonHtml = '';
      let trackingSimHtml = '';

      if (job.orderStatus === 'Ready for Pickup') {
        buttonHtml = `
          <button onclick="updateStatus('${job._id}', 'Out for Delivery')"
                  class="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow transition">
            Mark as Out for Delivery
          </button>
        `;
      } else if (job.orderStatus === 'Picked Up') {
        buttonHtml = `
          <button onclick="updateStatus('${job._id}', 'Out for Delivery')"
                  class="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow transition">
            Mark as Out for Delivery
          </button>
        `;
      } else if (job.orderStatus === 'Out for Delivery') {
        buttonHtml = `
          <button onclick="updateStatus('${job._id}', 'Delivered')"
                  class="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow transition">
            Mark as Delivered
          </button>
        `;
        
        trackingSimHtml = `
          <div class="border-t border-slate-800 pt-4 space-y-3">
            <span class="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">GPS Simulation</span>
            <button onclick="simulateGPSProgress('${job._id}')" id="btn-gps-sim"
                    class="w-full py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1.5 shadow">
              <svg class="w-4 h-4 text-amber-400 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
              Simulate Transit Routes
            </button>
            <div id="sim-gps-info" class="hidden text-[10px] text-center text-amber-500 font-mono">
              Vehicle transiting towards client destination...
            </div>
          </div>
        `;
      }

      container.innerHTML = `
        <div class="glass-panel p-5 rounded-2xl border border-indigo-500/20 space-y-4 shadow-xl glow-indigo">
          <div class="flex justify-between items-center border-b border-slate-800/60 pb-3">
            <h4 class="font-bold text-slate-100">Order #${job._id.substr(-6).toUpperCase()}</h4>
            <span class="text-xs font-bold text-amber-500 uppercase tracking-wider">${job.orderStatus}</span>
          </div>

          <div class="text-xs space-y-2 text-slate-400">
            <p><span class="font-semibold text-slate-300">Merchant Store:</span> ${job.business.businessName}</p>
            <p><span class="font-semibold text-slate-300">Pick address:</span> ${job.business.address}</p>
            <p><span class="font-semibold text-slate-300">Contact:</span> ${job.business.contactNumber}</p>
            
            <hr class="border-slate-800/40 my-2">

            <p><span class="font-semibold text-slate-300">Customer Name:</span> ${job.customer.name}</p>
            <p><span class="font-semibold text-slate-300">Drop Address:</span> ${job.deliveryAddress}</p>
            <p><span class="font-semibold text-slate-300">Customer Phone:</span> ${job.customer.phone}</p>
          </div>

          <div class="space-y-2 pt-2">
            ${buttonHtml}
          </div>

          ${trackingSimHtml}
        </div>
      `;

    } else {
      activeJob = null;
      container.innerHTML = `
        <div class="glass-panel p-6 rounded-2xl border border-slate-800 text-center text-slate-500 text-sm">
          No active assignment. Claim a job from the Available deliveries board.
        </div>
      `;
    }
  } catch (error) {
    console.error('Error loading assignment:', error);
  }
}

async function claimDelivery(orderId) {
  try {
    const res = await window.API.put(`/delivery/jobs/${orderId}/accept`, {});
    if (res.success) {
      window.showToast('Job claimed successfully! Pick up the order.', 'success');
      loadCourierDashboard();
    }
  } catch (error) {
    window.showToast('Failed to claim job: ' + error.message, 'error');
  }
}

async function updateStatus(orderId, status) {
  try {
    const res = await window.API.put(`/delivery/jobs/${orderId}/status`, { status });
    if (res.success) {
      window.showToast(`Status updated to ${status}!`, 'success');
      
      // Stop GPS simulation if order delivered
      if (status === 'Delivered' && simulationInterval) {
        clearInterval(simulationInterval);
        simulationInterval = null;
      }

      loadCourierDashboard();
    }
  } catch (error) {
    window.showToast('Update failed: ' + error.message, 'error');
  }
}

// GPS Simulation progress updates
function simulateGPSProgress(orderId) {
  const btn = document.getElementById('btn-gps-sim');
  const info = document.getElementById('sim-gps-info');
  
  if (simulationInterval) {
    clearInterval(simulationInterval);
    simulationInterval = null;
    btn.innerHTML = `
      <svg class="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
      Simulate Transit Routes
    `;
    info.classList.add('hidden');
    return;
  }

  btn.innerHTML = `
    <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-amber-500" fill="none" viewBox="0 0 24 24">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
    Tracking active... (Click to stop)
  `;
  info.classList.remove('hidden');

  // Interpolation coordinates (from Store NYC to Customer NYC)
  const startLat = 40.7128;
  const startLng = -74.0060;
  const endLat = 40.7250;
  const endLng = -73.9910;

  let step = 0;
  const totalSteps = 10;

  simulationInterval = setInterval(async () => {
    step++;
    const ratio = step / totalSteps;
    const currentLat = startLat + (endLat - startLat) * ratio;
    const currentLng = startLng + (endLng - startLng) * ratio;

    info.textContent = `Progress: ${Math.round(ratio * 100)}% Coords: (${currentLat.toFixed(4)}, ${currentLng.toFixed(4)})`;

    try {
      await window.API.put(`/delivery/jobs/${orderId}/location`, {
        lat: currentLat,
        lng: currentLng,
        address: `Transiting mid-route: ${Math.round(ratio * 100)}%`
      });
    } catch (e) {
      console.warn('GPS location simulation update failed:', e);
    }

    if (step >= totalSteps) {
      clearInterval(simulationInterval);
      simulationInterval = null;
      btn.innerHTML = `
        <svg class="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
        Simulate Transit Routes
      `;
      info.textContent = 'Arrived at Destination!';
      window.showToast('Courier has arrived at client destination address!', 'info');
    }
  }, 2000);
}

function initCourierSocket() {
  try {
    socket = io();

    socket.on('delivery_job_available', (job) => {
      console.log('Available delivery job notification:', job);
      window.showToast(`🔔 New job prepared: ${job.businessName} needs pickup!`, 'info');
      loadAvailableJobs();
    });

    socket.on('delivery_job_claimed', (data) => {
      // Reload list because another driver took it
      loadAvailableJobs();
    });

  } catch (e) {
    console.warn('Courier socket fail:', e);
  }
}

// Bind to window
window.claimDelivery = claimDelivery;
window.updateStatus = updateStatus;
window.simulateGPSProgress = simulateGPSProgress;
window.loadCourierDashboard = loadCourierDashboard;
