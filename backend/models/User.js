const mongoose = require('mongoose');
const { getModel } = require('../config/db');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String, required: true },
  address: { type: String, required: true },
  role: { type: String, enum: ['customer', 'business', 'delivery', 'admin'], default: 'customer' },
  profileImage: { type: String, default: '' }
}, { timestamps: true });

module.exports = getModel('User', UserSchema, 'users');
