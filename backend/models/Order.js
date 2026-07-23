const mongoose = require('mongoose');
const { getModel } = require('../config/db');

const OrderSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
  deliveryPartner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  products: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true } // Captured at purchase
  }],
  totalPrice: { type: Number, required: true },
  paymentMethod: { type: String, enum: ['cod', 'card'], default: 'cod' },
  paymentStatus: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' },
  deliveryAddress: { type: String, required: true },
  orderStatus: {
    type: String,
    enum: ['Pending', 'Confirmed', 'Preparing', 'Ready for Pickup', 'Picked Up', 'Out for Delivery', 'Delivered', 'Cancelled'],
    default: 'Pending'
  },
  estimatedDeliveryTime: { type: String, default: '30-45 mins' }
}, { timestamps: true });

module.exports = getModel('Order', OrderSchema, 'orders');
