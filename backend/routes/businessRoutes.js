const express = require('express');
const router = express.Router();
const {
  getBusinessOverview,
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getOrders,
  updateOrderStatus
} = require('../controllers/businessController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.use(authorize('business'));

router.get('/overview', getBusinessOverview);
router.get('/products', getProducts);
router.post('/products', createProduct);
router.put('/products/:id', updateProduct);
router.delete('/products/:id', deleteProduct);
router.get('/orders', getOrders);
router.put('/orders/:id/status', updateOrderStatus);

module.exports = router;
