const mongoose = require('mongoose');
const { getModel } = require('../config/db');

const ProductSchema = new mongoose.Schema({
  business: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true },
  name: { type: String, required: true },
  category: { type: String, required: true },
  description: { type: String, default: '' },
  price: { type: Number, required: true },
  stock: { type: Number, required: true, default: 0 },
  images: [{ type: String }]
}, { timestamps: true });

module.exports = getModel('Product', ProductSchema, 'products');
