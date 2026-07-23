const mongoose = require('mongoose');
const { getModel } = require('../config/db');

const DeliverySchema = new mongoose.Schema({
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  deliveryPartner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  currentLocation: {
    lat: { type: Number, default: 0 },
    lng: { type: Number, default: 0 },
    address: { type: String, default: '' }
  },
  deliveryStatus: {
    type: String,
    enum: ['assigned', 'picked_up', 'out_for_delivery', 'delivered', 'cancelled'],
    default: 'assigned'
  },
  pickupTime: { type: Date, default: null },
  deliveryTime: { type: Date, default: null }
}, { timestamps: true });

module.exports = getModel('Delivery', DeliverySchema, 'deliveries');
