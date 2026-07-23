const Business = require('../models/Business');
const Product = require('../models/Product');
const Order = require('../models/Order');
const { isMockMode } = require('../config/db');

exports.getBusinesses = async (req, res) => {
  try {
    const businesses = await Business.find({ isApproved: true }).populate('owner', 'name');
    res.status(200).json({ success: true, count: businesses.length, data: businesses });
  } catch (error) {
    console.error('getBusinesses error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching businesses' });
  }
};

exports.getBusinessProducts = async (req, res) => {
  try {
    const { businessId } = req.params;
    const { search, category } = req.query;

    let query = { business: businessId };

    if (search) {
      // In mock database, regex search matches literally or case insensitively
      query.name = { $regex: search, $options: 'i' };
    }
    if (category && category !== 'All') {
      query.category = category;
    }

    // Handled filter for MongoDB / Mock fallback
    let products;
    if (isMockMode()) {
      // Manual simple filter for mock
      products = await Product.find({ business: businessId });
      if (search) {
        const searchRegex = new RegExp(search, 'i');
        products = products.filter(p => searchRegex.test(p.name));
      }
      if (category && category !== 'All') {
        products = products.filter(p => p.category === category);
      }
    } else {
      // MongoDB
      const dbQuery = { business: businessId };
      if (search) {
        dbQuery.name = { $regex: search, $options: 'i' };
      }
      if (category && category !== 'All') {
        dbQuery.category = category;
      }
      products = await Product.find(dbQuery);
    }

    const business = await Business.findById(businessId);

    res.status(200).json({
      success: true,
      business,
      count: products.length,
      data: products
    });
  } catch (error) {
    console.error('getBusinessProducts error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching business products' });
  }
};

exports.placeOrder = async (req, res) => {
  try {
    const { businessId, items, paymentMethod, deliveryAddress } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Cart is empty' });
    }

    // Verify products and calculate total
    let totalPrice = 0;
    const productList = [];

    for (let item of items) {
      const product = await Product.findById(item.productId);
      if (!product) {
        return res.status(404).json({ success: false, message: `Product not found: ${item.productId}` });
      }

      if (product.stock < item.quantity) {
        return res.status(400).json({ success: false, message: `Insufficient stock for product: ${product.name}` });
      }

      totalPrice += product.price * item.quantity;
      productList.push({
        product: product._id,
        quantity: item.quantity,
        price: product.price
      });

      // Deduct stock
      product.stock -= item.quantity;
      await Product.findByIdAndUpdate(product._id, { stock: product.stock });
    }

    // Create order
    const order = await Order.create({
      customer: req.user._id,
      business: businessId,
      products: productList,
      totalPrice,
      paymentMethod: paymentMethod || 'cod',
      paymentStatus: paymentMethod === 'card' ? 'paid' : 'pending',
      deliveryAddress,
      orderStatus: 'Pending',
      estimatedDeliveryTime: '30-45 mins'
    });

    const populatedOrder = await Order.findById(order._id)
      .populate('customer', 'name phone')
      .populate('business', 'businessName address contactNumber');

    // Notify Business Owner in Real-time via Socket.io
    const io = req.app.get('io');
    if (io) {
      // Emit to business-specific room
      io.emit(`new_order_${businessId}`, populatedOrder);
      // Emit general admin room
      io.emit('admin_new_order', populatedOrder);
    }

    res.status(201).json({
      success: true,
      message: 'Order placed successfully',
      data: populatedOrder
    });
  } catch (error) {
    console.error('placeOrder error:', error);
    res.status(500).json({ success: false, message: 'Server error placing order' });
  }
};

exports.getOrderHistory = async (req, res) => {
  try {
    const orders = await Order.find({ customer: req.user._id })
      .populate('business', 'businessName logo address')
      .populate('deliveryPartner', 'name phone')
      .sort('-createdAt');

    res.status(200).json({ success: true, count: orders.length, data: orders });
  } catch (error) {
    console.error('getOrderHistory error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching order history' });
  }
};

exports.getOrderDetails = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('customer', 'name phone address')
      .populate('business', 'businessName address contactNumber logo')
      .populate('deliveryPartner', 'name phone')
      .populate('products.product');

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Security check: Only customer, store owner, driver, or admin can view
    const isCustomer = order.customer._id.toString() === req.user._id.toString();
    const isOwner = order.business.owner && order.business.owner.toString() === req.user._id.toString();
    const isDriver = order.deliveryPartner && order.deliveryPartner._id.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    // In mock database, the reference object is resolved, let's also support direct comparison
    const isOwnerMock = order.business.owner === req.user._id.toString();

    if (!isCustomer && !isOwner && !isDriver && !isAdmin && !isOwnerMock) {
      // Find business of current user if they are a business role
      let isStoreOwner = false;
      if (req.user.role === 'business') {
        const store = await Business.findOne({ owner: req.user._id });
        if (store && store._id.toString() === order.business._id.toString()) {
          isStoreOwner = true;
        }
      }
      if (!isStoreOwner) {
        return res.status(403).json({ success: false, message: 'Unauthorized to view this order' });
      }
    }

    res.status(200).json({ success: true, data: order });
  } catch (error) {
    console.error('getOrderDetails error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching order details' });
  }
};

exports.cancelOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.customer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized action' });
    }

    if (order.orderStatus !== 'Pending') {
      return res.status(400).json({ success: false, message: 'Cannot cancel order after confirmation' });
    }

    // Revert stock
    for (let item of order.products) {
      const product = await Product.findById(item.product);
      if (product) {
        product.stock += item.quantity;
        await Product.findByIdAndUpdate(product._id, { stock: product.stock });
      }
    }

    order.orderStatus = 'Cancelled';
    await Order.findByIdAndUpdate(order._id, { orderStatus: 'Cancelled' });

    // Notify Business Owner & Admin via Socket.io
    const io = req.app.get('io');
    if (io) {
      io.emit(`order_status_${order._id}`, { status: 'Cancelled', orderId: order._id });
      io.emit(`business_order_status_${order.business}`, { status: 'Cancelled', orderId: order._id });
    }

    res.status(200).json({ success: true, message: 'Order cancelled successfully', data: order });
  } catch (error) {
    console.error('cancelOrder error:', error);
    res.status(500).json({ success: false, message: 'Server error cancelling order' });
  }
};
