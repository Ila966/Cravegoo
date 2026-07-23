let orderId = '';
let socket = null;
let currentStatus = 'Pending';

const trackingStages = [
  'Pending',
  'Confirmed',
  'Preparing',
  'Ready for Pickup',
  'Picked Up',
  'Out for Delivery',
  'Delivered'
];

document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  orderId = params.get('id');

  if (!orderId) {
    window.location.href = '/order-history.html';
    return;
  }

  document.getElementById('order-ref').textContent = orderId;

  loadOrderDetails();
  initSocketConnection();
});

async function loadOrderDetails() {
  try {
    const res = await window.API.get(`/customer/orders/${orderId}`);
    if (res.success) {
      const order = res.data;
      currentStatus = order.orderStatus;
      
      // Update UI panels
      document.getElementById('info-store').textContent = order.business.businessName;
      document.getElementById('info-address').textContent = order.deliveryAddress;
      document.getElementById('info-price').textContent = `$${order.totalPrice.toFixed(2)}`;
      
      if (order.deliveryPartner) {
        document.getElementById('info-driver').textContent = `${order.deliveryPartner.name} (${order.deliveryPartner.phone})`;
        document.getElementById('map-driver-name').textContent = order.deliveryPartner.name;
      } else {
        document.getElementById('info-driver').textContent = 'Assigning delivery partner...';
      }

      // Show/Hide Cancel button
      const cancelBtn = document.getElementById('btn-cancel');
      if (currentStatus === 'Pending') {
        cancelBtn.classList.remove('hidden');
      } else {
        cancelBtn.classList.add('hidden');
      }

      renderProgressSteps();
      updateMockMap(order);
      addLog(`Order status loaded: ${currentStatus}`, 'info');
    }
  } catch (error) {
    window.showToast('Failed to load tracking details: ' + error.message, 'error');
  }
}

function initSocketConnection() {
  try {
    // Connect to local Socket.io namespace
    socket = io();

    socket.on('connect', () => {
      console.log('Connected to socket server');
      socket.emit('join_order', orderId);
      addLog('Real-time updates socket online.', 'success');
      document.getElementById('gps-status').textContent = 'GPS Online';
      document.getElementById('gps-status').classList.replace('text-slate-400', 'text-emerald-400');
    });

    socket.on(`order_status_${orderId}`, (data) => {
      console.log('Socket received status update:', data);
      addLog(`Status changed to: ${data.status}`, 'success');
      
      // Update page state
      loadOrderDetails();
      
      if (data.status === 'Cancelled') {
        window.showToast('Order was cancelled.', 'error');
      } else {
        window.showToast(`Order status: ${data.status}`, 'info');
      }
    });

    socket.on(`delivery_location_${orderId}`, (data) => {
      console.log('Socket received location update:', data);
      addLog(`GPS: Courier coordinates updated.`, 'info');
      moveDriverMarker(data.location.lat, data.location.lng, data.location.address);
    });

    socket.on('disconnect', () => {
      addLog('Connection lost. Reconnecting...', 'error');
      document.getElementById('gps-status').textContent = 'GPS Offline';
      document.getElementById('gps-status').classList.replace('text-emerald-400', 'text-slate-400');
    });

  } catch (e) {
    console.error('Socket connection error:', e);
    addLog('Websocket error. Falling back to HTTP refresh.', 'error');
  }
}

function renderProgressSteps() {
  const container = document.getElementById('progress-steps-list');
  if (!container) return;

  container.innerHTML = '';

  const activeIndex = trackingStages.indexOf(currentStatus);
  
  if (currentStatus === 'Cancelled') {
    container.innerHTML = `
      <div class="flex items-center gap-4 text-rose-500 font-bold">
        <div class="w-8 h-8 bg-rose-950 border border-rose-500/50 rounded-full flex items-center justify-center">X</div>
        <div>
          <span>Cancelled</span>
          <p class="text-xs font-normal text-slate-500">This order was cancelled and refunded.</p>
        </div>
      </div>
    `;
    return;
  }

  trackingStages.forEach((stage, idx) => {
    const isCompleted = idx < activeIndex;
    const isActive = idx === activeIndex;
    
    let iconHtml = '';
    let textColor = 'text-slate-500';

    if (isCompleted) {
      iconHtml = `<svg class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>`;
      textColor = 'text-slate-300 font-medium';
    } else if (isActive) {
      iconHtml = `<span class="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-pulse"></span>`;
      textColor = 'text-indigo-400 font-bold';
    } else {
      iconHtml = `<span class="w-2 h-2 bg-slate-800 rounded-full"></span>`;
    }

    const step = document.createElement('div');
    step.className = 'flex items-start gap-4 relative';
    step.innerHTML = `
      <!-- Vertical Connecting Line -->
      ${idx < trackingStages.length - 1 ? `
        <div class="absolute left-[15px] top-8 bottom-[-32px] w-[2px] ${idx < activeIndex ? 'progress-line' : 'bg-slate-800'}"></div>
      ` : ''}
      
      <!-- Icon Bubble -->
      <div class="w-8 h-8 rounded-full flex items-center justify-center z-10 ${
        isCompleted ? 'bg-emerald-950 border border-emerald-500/30' :
        isActive ? 'bg-indigo-950 border border-indigo-500/60 glow-indigo' :
        'bg-slate-900 border border-slate-800'
      }">
        ${iconHtml}
      </div>

      <!-- Stage info -->
      <div class="pt-1">
        <span class="text-sm ${textColor}">${stage}</span>
      </div>
    `;

    container.appendChild(step);
  });
}

function updateMockMap(order) {
  const driverMarker = document.getElementById('map-driver-node');
  const storeNode = document.getElementById('map-store-node');
  const customerNode = document.getElementById('map-customer-node');

  if (!order.deliveryPartner) {
    if (driverMarker) driverMarker.classList.add('hidden');
    return;
  }

  // Show Nodes
  if (storeNode) storeNode.classList.remove('opacity-45');
  if (customerNode) customerNode.classList.remove('opacity-45');
  if (driverMarker) driverMarker.classList.remove('hidden');

  // Initial driver placement based on orderStatus stage
  if (order.orderStatus === 'Picked Up' || order.orderStatus === 'Ready for Pickup') {
    // Place driver at store coordinates (top-left on mock canvas grid)
    driverMarker.style.top = '72px';
    driverMarker.style.left = '48px';
  } else if (order.orderStatus === 'Out for Delivery') {
    // Place driver mid-route
    driverMarker.style.top = '160px';
    driverMarker.style.left = '180px';
  } else if (order.orderStatus === 'Delivered') {
    // Place driver at customer (bottom-right)
    driverMarker.style.top = '220px';
    driverMarker.style.left = '320px';
  }
}

function moveDriverMarker(lat, lng, address) {
  const marker = document.getElementById('map-driver-node');
  if (!marker) return;

  marker.classList.remove('hidden');

  // Simulating custom coordinates mapping to local layout positions
  // For safety, drivers emit custom 0-100 values or lat/long that we map:
  // e.g. mapping coordinates to style top / left percentages
  let top = '150px';
  let left = '200px';

  if (lat && lng) {
    // Normalize coordinates mapping logic
    // Just map it using linear interpolation if coords were relative, 
    // or simulate a nice slide effect.
    // If delivery-dashboard emits lat/lng, we map:
    // e.g. maps lat: 40.7128 to 40.7300, lng: -74.0060 to -73.9800
    // We map to px bounding dimensions:
    const topVal = Math.max(50, Math.min(300, 200 - (lat - 40.7128) * 5000));
    const leftVal = Math.max(50, Math.min(450, 150 + (lng + 74.0060) * 5000));
    
    top = `${topVal}px`;
    left = `${leftVal}px`;
  }

  marker.style.top = top;
  marker.style.left = left;
}

function addLog(msg, type = 'info') {
  const container = document.getElementById('live-logs');
  if (!container) return;

  const time = new Date().toLocaleTimeString('en-US', { hour12: false });
  const log = document.createElement('div');
  
  let color = 'text-slate-500';
  if (type === 'success') color = 'text-emerald-400';
  if (type === 'error') color = 'text-rose-500';

  log.className = `${color}`;
  log.innerHTML = `<span class="text-slate-600">[${time}]</span> &gt;&gt; ${msg}`;
  
  // Clear default message if present
  if (container.children.length === 1 && container.children[0].textContent.includes('Connecting')) {
    container.innerHTML = '';
  }

  container.appendChild(log);
  container.scrollTop = container.scrollHeight;
}

async function cancelOrder() {
  const confirmCancel = confirm("Are you sure you want to cancel this order? This action cannot be undone.");
  if (!confirmCancel) return;

  try {
    const res = await window.API.put(`/customer/orders/${orderId}/cancel`, {});
    if (res.success) {
      window.showToast('Order cancelled', 'info');
      loadOrderDetails();
    }
  } catch (error) {
    window.showToast('Cancellation failed: ' + error.message, 'error');
  }
}

// Bind to window
window.cancelOrder = cancelOrder;
