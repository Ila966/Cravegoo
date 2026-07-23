const express = require('express');
const router = express.Router();
const {
  getAvailableJobs,
  getAssignedJobs,
  acceptJob,
  updateJobStatus,
  updateLocation,
  getEarningsHistory
} = require('../controllers/deliveryController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.use(authorize('delivery'));

router.get('/jobs/available', getAvailableJobs);
router.get('/jobs/assigned', getAssignedJobs);
router.put('/jobs/:id/accept', acceptJob);
router.put('/jobs/:id/status', updateJobStatus);
router.put('/jobs/:id/location', updateLocation);
router.get('/earnings', getEarningsHistory);

module.exports = router;
