const express = require('express');
const router = express.Router();
const {
  getGlobalStats,
  getAllUsers,
  updateUserRole,
  deleteUser,
  getAllBusinesses,
  approveBusiness,
  getAllOrders,
  exportExcelSheet
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.use(authorize('admin'));

router.get('/stats', getGlobalStats);
router.get('/users', getAllUsers);
router.put('/users/:id/role', updateUserRole);
router.delete('/users/:id', deleteUser);
router.get('/businesses', getAllBusinesses);
router.put('/businesses/:id/approve', approveBusiness);
router.get('/orders', getAllOrders);
router.get('/export/:sheetName', exportExcelSheet);

module.exports = router;
