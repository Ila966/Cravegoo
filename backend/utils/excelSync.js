const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

function getRefId(ref) {
  if (!ref) return null;
  if (typeof ref === 'string') return ref;
  if (typeof ref === 'object') {
    // Check if it is a Mongoose ObjectId (which serializes directly to a 24-char hex string)
    const strVal = typeof ref.toString === 'function' ? ref.toString() : '';
    if (strVal && strVal !== '[object Object]' && /^[0-9a-fA-F]{24}$/.test(strVal)) {
      return strVal;
    }
    // If it is a populated document or mock object containing _id
    if (ref._id && ref._id !== ref) {
      return getRefId(ref._id);
    }
    if (strVal && strVal !== '[object Object]') {
      return strVal;
    }
  }
  return String(ref);
}

function writeExcel(filePath, headers, rows) {
  const wsData = [headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  XLSX.writeFile(wb, filePath);
}

function getSheetData(sheetName, mockDb) {
  const users = mockDb.users || [];
  const businesses = mockDb.businesses || [];
  const products = mockDb.products || [];
  const orders = mockDb.orders || [];

  switch (sheetName) {
    case 'drivers': {
      const drivers = users.filter(u => u.role === 'delivery');
      const headers = ['Driver ID', 'Name', 'Email', 'Phone', 'Address', 'Status', 'Registered Date'];
      const rows = drivers.map(d => [
        getRefId(d._id),
        d.name,
        d.email,
        d.phone,
        d.address,
        'Active',
        d.createdAt || new Date().toISOString()
      ]);
      return { headers, rows };
    }
    case 'purchased-products':
    case 'purchased_products': {
      const headers = [
        'Order ID',
        'Date & Time',
        'Customer Name',
        'Customer Email',
        'Business Name',
        'Product Name',
        'Unit Price ($)',
        'Quantity',
        'Total Line Price ($)',
        'Payment Method',
        'Payment Status',
        'Order Status',
        'Delivery Address'
      ];
      const rows = [];
      orders.forEach(order => {
        const custId = getRefId(order.customer);
        const customer = users.find(u => getRefId(u._id) === custId) || {};

        const bizId = getRefId(order.business);
        const business = businesses.find(b => getRefId(b._id) === bizId) || {};

        const orderProducts = order.products || [];
        orderProducts.forEach(pItem => {
          const prodId = getRefId(pItem.product);
          const product = products.find(p => getRefId(p._id) === prodId) || {};
          
          const price = pItem.price || product.price || 0;
          const qty = pItem.quantity || 0;
          const lineTotal = (price * qty).toFixed(2);
          
          rows.push([
            getRefId(order._id),
            order.createdAt || new Date().toISOString(),
            customer.name || 'N/A',
            customer.email || 'N/A',
            business.businessName || 'N/A',
            product.name || pItem.name || 'Unknown Product',
            price,
            qty,
            lineTotal,
            order.paymentMethod || 'cod',
            order.paymentStatus || 'pending',
            order.orderStatus || 'Pending',
            order.deliveryAddress || ''
          ]);
        });
      });
      return { headers, rows };
    }
    case 'orders-summary':
    case 'orders_summary': {
      const headers = [
        'Order ID',
        'Date & Time',
        'Customer Name',
        'Business Name',
        'Total Price ($)',
        'Payment Method',
        'Payment Status',
        'Order Status',
        'Delivery Address',
        'Delivery Partner'
      ];
      const rows = orders.map(order => {
        const custId = getRefId(order.customer);
        const customer = users.find(u => getRefId(u._id) === custId) || {};

        const bizId = getRefId(order.business);
        const business = businesses.find(b => getRefId(b._id) === bizId) || {};

        const driverId = getRefId(order.deliveryPartner);
        const driver = driverId ? (users.find(u => getRefId(u._id) === driverId) || {}) : {};

        return [
          getRefId(order._id),
          order.createdAt || new Date().toISOString(),
          customer.name || 'N/A',
          business.businessName || 'N/A',
          order.totalPrice || 0,
          order.paymentMethod || 'cod',
          order.paymentStatus || 'pending',
          order.orderStatus || 'Pending',
          order.deliveryAddress || '',
          driver.name || 'Unassigned'
        ];
      });
      return { headers, rows };
    }
    case 'users':
    case 'all_users': {
      const headers = ['User ID', 'Name', 'Email', 'Phone', 'Address', 'Role', 'Registered Date'];
      const rows = users.map(u => [
        getRefId(u._id),
        u.name,
        u.email,
        u.phone,
        u.address,
        u.role,
        u.createdAt || new Date().toISOString()
      ]);
      return { headers, rows };
    }
    case 'businesses': {
      const headers = ['Business ID', 'Business Name', 'Owner Name', 'Owner Email', 'Address', 'Contact Number', 'Description', 'Status'];
      const rows = businesses.map(b => {
        const ownerId = getRefId(b.owner);
        const owner = users.find(u => getRefId(u._id) === ownerId) || {};
        return [
          getRefId(b._id),
          b.businessName,
          owner.name || 'N/A',
          owner.email || 'N/A',
          b.address,
          b.contactNumber,
          b.description,
          b.isApproved ? 'Approved' : 'Suspended'
        ];
      });
      return { headers, rows };
    }
    case 'products':
    case 'all_products': {
      const headers = ['Product ID', 'Product Name', 'Business Name', 'Category', 'Description', 'Price ($)', 'Stock Quantity'];
      const rows = products.map(p => {
        const bizId = getRefId(p.business);
        const business = businesses.find(b => getRefId(b._id) === bizId) || {};
        return [
          getRefId(p._id),
          p.name,
          business.businessName || 'N/A',
          p.category,
          p.description,
          p.price,
          p.stock
        ];
      });
      return { headers, rows };
    }
    default:
      return null;
  }
}

/**
 * Syncs the current database state to Excel files in the database_sheets directory.
 * Works with the mock db schema or populated plain objects.
 */
function syncToExcel(mockDb) {
  try {
    const dirPath = path.join(__dirname, '../../database_sheets');
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    const sheets = [
      { name: 'drivers.xlsx', key: 'drivers' },
      { name: 'purchased_products.xlsx', key: 'purchased-products' },
      { name: 'orders_summary.xlsx', key: 'orders-summary' },
      { name: 'all_users.xlsx', key: 'users' },
      { name: 'businesses.xlsx', key: 'businesses' },
      { name: 'all_products.xlsx', key: 'products' }
    ];

    sheets.forEach(sheet => {
      const data = getSheetData(sheet.key, mockDb);
      if (data) {
        writeExcel(path.join(dirPath, sheet.name), data.headers, data.rows);
      }
    });

    console.log(`✅ excelSync: Synchronized database state to Excel sheets in database_sheets/`);
  } catch (err) {
    console.error('❌ excelSync error:', err);
  }
}

module.exports = { syncToExcel, getSheetData };
