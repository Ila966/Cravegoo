const mongoose = require('mongoose');
const { getModel } = require('../config/db');

const BusinessSchema = new mongoose.Schema({
  businessName: { type: String, required: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  logo: { type: String, default: '' },
  address: { type: String, required: true },
  contactNumber: { type: String, required: true },
  description: { type: String, default: '' },
  isApproved: { type: Boolean, default: false } // Admin approval
}, { timestamps: true });

module.exports = getModel('Business', BusinessSchema, 'businesses');
