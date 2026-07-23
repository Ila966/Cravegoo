const Order = require('../models/Order');
const Delivery = require('../models/Delivery');

exports.getAvailableJobs = async (req, res) => {
  try {
    // Available jobs are orders that are 'Ready for Pickup' and don't have a delivery partner assigned yet
    const jobs = await Order.find({
      orderStatus: 'Ready for Pickup',
      deliveryPartner: null
    })
    .populate('customer', 'name phone address')
    .populate('business', 'businessName address contactNumber logo');

    res.status(200).json({ success: true, count: jobs.length, data: jobs });
  } catch (error) {
    console.error('getAvailableJobs error:', error);
    res.status(500).json({ success: false, message: 'Server error loading jobs board' });
  }
};

exports.getAssignedJobs = async (req, res) => {
  try {
    // Active jobs assigned to this driver that are not yet Delivered or Cancelled
    const jobs = await Order.find({
      deliveryPartner: req.user._id,
      orderStatus: { $in: ['Picked Up', 'Out for Delivery', 'Ready for Pickup'] }
    })
    .populate('customer', 'name phone address')
    .populate('business', 'businessName address contactNumber logo')
    .sort('-updatedAt');

    res.status(200).json({ success: true, count: jobs.length, data: jobs });
  } catch (error) {
    console.error('getAssignedJobs error:', error);
    res.status(500).json({ success: false, message: 'Server error loading assigned jobs' });
  }
};

exports.acceptJob = async (req, res) => {
  try {
    const orderId = req.params.id;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.orderStatus !== 'Ready for Pickup') {
      return res.status(400).json({ success: false, message: 'Order is not ready for pickup' });
    }

    if (order.deliveryPartner) {
      return res.status(400).json({ success: false, message: 'Order already accepted by another partner' });
    }

    // Assign driver and update status to 'Picked Up'
    const updatedOrder = await Order.findByIdAndUpdate(orderId, {
      deliveryPartner: req.user._id,
      orderStatus: 'Picked Up'
    }, { new: true });

    // Create Delivery tracking record
    await Delivery.create({
      orderId: order._id,
      deliveryPartner: req.user._id,
      currentLocation: {
        lat: 40.7128 + (Math.random() - 0.5) * 0.01, // Mock NYC lat
        lng: -74.0060 + (Math.random() - 0.5) * 0.01, // Mock NYC lng
        address: 'Picked Up at Store'
      },
      deliveryStatus: 'picked_up',
      pickupTime: new Date()
    });

    const populated = await Order.findById(orderId)
      .populate('customer', 'name phone address')
      .populate('business', 'businessName address contactNumber logo')
      .populate('deliveryPartner', 'name phone');

    // Notify customer in real-time
    const io = req.app.get('io');
    if (io) {
      io.emit(`order_status_${orderId}`, {
        status: 'Picked Up',
        orderId,
        deliveryPartner: { name: req.user.name, phone: req.user.phone }
      });
      io.emit('delivery_job_claimed', { orderId });
    }

    res.status(200).json({ success: true, message: 'Delivery job accepted', data: populated });
  } catch (error) {
    console.error('acceptJob error:', error);
    res.status(500).json({ success: false, message: 'Server error accepting job' });
  }
};

exports.updateJobStatus = async (req, res) => {
  try {
    const { status } = req.body; // Out for Delivery, Delivered
    const orderId = req.params.id;

    if (!['Out for Delivery', 'Delivered'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid delivery status change' });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.deliveryPartner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized driver action' });
    }

    const updateFields = { orderStatus: status };
    if (status === 'Delivered') {
      updateFields.paymentStatus = 'paid'; // Assumed payment complete on delivery
    }

    const updatedOrder = await Order.findByIdAndUpdate(orderId, updateFields, { new: true });

    // Update corresponding Delivery record
    const devStatusMap = {
      'Out for Delivery': 'out_for_delivery',
      'Delivered': 'delivered'
    };

    const deliveryUpdate = {
      deliveryStatus: devStatusMap[status]
    };

    if (status === 'Delivered') {
      deliveryUpdate.deliveryTime = new Date();
    }

    await Delivery.findOneAndUpdate({ orderId }, deliveryUpdate);

    // Notify Customer via Socket
    const io = req.app.get('io');
    if (io) {
      io.emit(`order_status_${orderId}`, { status, orderId });
    }

    res.status(200).json({ success: true, message: `Status updated to ${status}`, data: updatedOrder });
  } catch (error) {
    console.error('updateJobStatus error:', error);
    res.status(500).json({ success: false, message: 'Server error updating status' });
  }
};

exports.updateLocation = async (req, res) => {
  try {
    const { lat, lng, address } = req.body;
    const orderId = req.params.id;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.deliveryPartner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized driver action' });
    }

    const delivery = await Delivery.findOneAndUpdate(
      { orderId },
      {
        currentLocation: {
          lat: Number(lat),
          lng: Number(lng),
          address: address || 'On Route'
        }
      },
      { new: true }
    );

    // Broadcast live location to Customer Socket Room
    const io = req.app.get('io');
    if (io) {
      io.emit(`delivery_location_${orderId}`, {
        orderId,
        location: { lat: Number(lat), lng: Number(lng), address: address || 'On Route' }
      });
    }

    res.status(200).json({ success: true, message: 'Location updated', data: delivery });
  } catch (error) {
    console.error('updateLocation error:', error);
    res.status(500).json({ success: false, message: 'Server error updating location coordinates' });
  }
};

exports.getEarningsHistory = async (req, res) => {
  try {
    // Deliveries done by this driver
    const deliveries = await Delivery.find({
      deliveryPartner: req.user._id,
      deliveryStatus: 'delivered'
    }).populate('orderId');

    const totalCount = deliveries.length;
    // Deliveries pay $5.50 each base + 10% order bonus
    let totalEarnings = 0;
    const history = [];

    deliveries.forEach(del => {
      if (del.orderId) {
        const fare = 5.50 + (del.orderId.totalPrice * 0.10);
        totalEarnings += fare;
        history.push({
          orderId: del.orderId._id,
          totalPrice: del.orderId.totalPrice,
          date: del.deliveryTime,
          fare: Number(fare.toFixed(2))
        });
      }
    });

    res.status(200).json({
      success: true,
      data: {
        totalDeliveries: totalCount,
        totalEarnings: Number(totalEarnings.toFixed(2)),
        history
      }
    });
  } catch (error) {
    console.error('getEarningsHistory error:', error);
    res.status(500).json({ success: false, message: 'Server error calculating driver ledger' });
  }
};
