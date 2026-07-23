const express = require('express');
const router = express.Router();
const {
  getBusinesses,
  getBusinessProducts,
  placeOrder,
  getOrderHistory,
  getOrderDetails,
  cancelOrder
} = require('../controllers/customerController');
const { protect, authorize } = require('../middleware/auth');

router.get('/businesses', protect, authorize('customer'), getBusinesses);
router.get('/businesses/:businessId/products', protect, authorize('customer'), getBusinessProducts);
router.post('/orders', protect, authorize('customer'), placeOrder);
router.get('/orders', protect, authorize('customer'), getOrderHistory);
router.get('/orders/:id', protect, getOrderDetails); // Can also be accessed by business / delivery / admin
router.put('/orders/:id/cancel', protect, authorize('customer'), cancelOrder);

module.exports = router;
