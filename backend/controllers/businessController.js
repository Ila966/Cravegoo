const Business = require('../models/Business');
const Product = require('../models/Product');
const Order = require('../models/Order');

// Helper to get active business for current user
const getMyBusiness = async (ownerId) => {
  const store = await Business.findOne({ owner: ownerId });
  return store;
};

exports.getBusinessOverview = async (req, res) => {
  try {
    const store = await getMyBusiness(req.user._id);
    if (!store) {
      return res.status(404).json({ success: false, message: 'Business profile not found for this account' });
    }

    const productsCount = await Product.countDocuments({ business: store._id });
    
    // Fetch all orders for this store
    const orders = await Order.find({ business: store._id });
    
    let totalRevenue = 0;
    let pendingOrders = 0;
    let activeOrders = 0;
    let completedOrders = 0;

    orders.forEach(order => {
      if (order.orderStatus === 'Delivered') {
        totalRevenue += order.totalPrice;
        completedOrders++;
      } else if (order.orderStatus === 'Cancelled') {
        // Skip
      } else {
        activeOrders++;
        if (order.orderStatus === 'Pending') {
          pendingOrders++;
        }
      }
    });

    // Generate recent orders
    const recentOrders = await Order.find({ business: store._id })
      .populate('customer', 'name phone')
      .sort('-createdAt')
      .limit(5);

    // Sales by category chart data (mock aggregated or generated from current products)
    const storeProducts = await Product.find({ business: store._id });
    const categoryStatsMap = {};
    storeProducts.forEach(p => {
      categoryStatsMap[p.category] = (categoryStatsMap[p.category] || 0) + 1;
    });

    const categoryStats = Object.keys(categoryStatsMap).map(cat => ({
      name: cat,
      value: categoryStatsMap[cat]
    }));

    res.status(200).json({
      success: true,
      data: {
        business: store,
        stats: {
          totalRevenue,
          productsCount,
          pendingOrders,
          activeOrders,
          completedOrders,
          totalOrders: orders.length
        },
        recentOrders,
        categoryStats
      }
    });
  } catch (error) {
    console.error('getBusinessOverview error:', error);
    res.status(500).json({ success: false, message: 'Server error loading store dashboard' });
  }
};

exports.getProducts = async (req, res) => {
  try {
    const store = await getMyBusiness(req.user._id);
    if (!store) {
      return res.status(404).json({ success: false, message: 'Business profile not found' });
    }

    const products = await Product.find({ business: store._id });
    res.status(200).json({ success: true, count: products.length, data: products });
  } catch (error) {
    console.error('getProducts error:', error);
    res.status(500).json({ success: false, message: 'Server error loading products' });
  }
};

exports.createProduct = async (req, res) => {
  try {
    const store = await getMyBusiness(req.user._id);
    if (!store) {
      return res.status(404).json({ success: false, message: 'Business profile not found' });
    }

    const { name, category, description, price, stock, images } = req.body;
    
    // In actual multer implementation we might have files, but mock allows direct string arrays
    const product = await Product.create({
      business: store._id,
      name,
      category,
      description,
      price: Number(price),
      stock: Number(stock),
      images: images || []
    });

    res.status(201).json({ success: true, message: 'Product created successfully', data: product });
  } catch (error) {
    console.error('createProduct error:', error);
    res.status(500).json({ success: false, message: 'Server error creating product' });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const store = await getMyBusiness(req.user._id);
    if (!store) {
      return res.status(404).json({ success: false, message: 'Business profile not found' });
    }

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    if (product.business.toString() !== store._id.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized product modification' });
    }

    const { name, category, description, price, stock, images } = req.body;

    const updated = await Product.findByIdAndUpdate(product._id, {
      name: name || product.name,
      category: category || product.category,
      description: description || product.description,
      price: price !== undefined ? Number(price) : product.price,
      stock: stock !== undefined ? Number(stock) : product.stock,
      images: images || product.images
    }, { new: true });

    res.status(200).json({ success: true, message: 'Product updated successfully', data: updated });
  } catch (error) {
    console.error('updateProduct error:', error);
    res.status(500).json({ success: false, message: 'Server error updating product' });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const store = await getMyBusiness(req.user._id);
    if (!store) {
      return res.status(404).json({ success: false, message: 'Business profile not found' });
    }

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    if (product.business.toString() !== store._id.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized product action' });
    }

    await Product.findByIdAndDelete(product._id);

    res.status(200).json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    console.error('deleteProduct error:', error);
    res.status(500).json({ success: false, message: 'Server error deleting product' });
  }
};

exports.getOrders = async (req, res) => {
  try {
    const store = await getMyBusiness(req.user._id);
    if (!store) {
      return res.status(404).json({ success: false, message: 'Business profile not found' });
    }

    const orders = await Order.find({ business: store._id })
      .populate('customer', 'name phone address')
      .populate('deliveryPartner', 'name phone')
      .populate('products.product')
      .sort('-createdAt');

    res.status(200).json({ success: true, count: orders.length, data: orders });
  } catch (error) {
    console.error('getOrders error:', error);
    res.status(500).json({ success: false, message: 'Server error loading store orders' });
  }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const store = await getMyBusiness(req.user._id);
    if (!store) {
      return res.status(404).json({ success: false, message: 'Business profile not found' });
    }

    const { status } = req.body; // Confirmed, Preparing, Ready for Pickup, Cancelled
    const allowedStatuses = ['Confirmed', 'Preparing', 'Ready for Pickup', 'Cancelled'];
    
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status update code' });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.business.toString() !== store._id.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized action' });
    }

    // Revert stock if Cancelled
    if (status === 'Cancelled' && order.orderStatus !== 'Cancelled') {
      for (let item of order.products) {
        const product = await Product.findById(item.product);
        if (product) {
          product.stock += item.quantity;
          await Product.findByIdAndUpdate(product._id, { stock: product.stock });
        }
      }
    }

    order.orderStatus = status;
    await Order.findByIdAndUpdate(order._id, { orderStatus: status });

    // Emit live updates to Customer and Driver boards via socket
    const io = req.app.get('io');
    if (io) {
      io.emit(`order_status_${order._id}`, { status, orderId: order._id });
      // If Ready for Pickup, notify delivery partners
      if (status === 'Ready for Pickup') {
        io.emit('delivery_job_available', {
          orderId: order._id,
          businessName: store.businessName,
          address: store.address,
          totalPrice: order.totalPrice
        });
      }
    }

    res.status(200).json({ success: true, message: `Order status set to ${status}`, data: order });
  } catch (error) {
    console.error('updateOrderStatus error:', error);
    res.status(500).json({ success: false, message: 'Server error updating status' });
  }
};
