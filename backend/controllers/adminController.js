const User = require('../models/User');
const Business = require('../models/Business');
const Product = require('../models/Product');
const Order = require('../models/Order');

exports.getGlobalStats = async (req, res) => {
  try {
    const customersCount = await User.countDocuments({ role: 'customer' });
    const businessesCount = await User.countDocuments({ role: 'business' });
    const driversCount = await User.countDocuments({ role: 'delivery' });
    const adminCount = await User.countDocuments({ role: 'admin' });

    const totalStores = await Business.countDocuments();
    const approvedStores = await Business.countDocuments({ isApproved: true });
    const pendingStores = totalStores - approvedStores;

    const totalProducts = await Product.countDocuments();

    const orders = await Order.find();
    let totalSales = 0;
    const orderStatusCounts = {
      Pending: 0,
      Confirmed: 0,
      Preparing: 0,
      'Ready for Pickup': 0,
      'Picked Up': 0,
      'Out for Delivery': 0,
      Delivered: 0,
      Cancelled: 0
    };

    orders.forEach(o => {
      if (o.orderStatus === 'Delivered') {
        totalSales += o.totalPrice;
      }
      if (orderStatusCounts[o.orderStatus] !== undefined) {
        orderStatusCounts[o.orderStatus]++;
      }
    });

    res.status(200).json({
      success: true,
      data: {
        users: {
          customer: customersCount,
          business: businessesCount,
          delivery: driversCount,
          admin: adminCount,
          total: customersCount + businessesCount + driversCount + adminCount
        },
        stores: {
          total: totalStores,
          approved: approvedStores,
          pending: pendingStores
        },
        productsCount: totalProducts,
        orders: {
          total: orders.length,
          statusBreakdown: orderStatusCounts,
          totalVolume: Number(totalSales.toFixed(2))
        }
      }
    });
  } catch (error) {
    console.error('getGlobalStats error:', error);
    res.status(500).json({ success: false, message: 'Server error loading admin statistics' });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password').sort('-createdAt');
    res.status(200).json({ success: true, count: users.length, data: users });
  } catch (error) {
    console.error('getAllUsers error:', error);
    res.status(500).json({ success: false, message: 'Server error listing users' });
  }
};

exports.updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    if (!['customer', 'business', 'delivery', 'admin'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid target role configuration' });
    }

    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({ success: true, message: 'User role updated', data: user });
  } catch (error) {
    console.error('updateUserRole error:', error);
    res.status(500).json({ success: false, message: 'Server error updating user role' });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    await User.findByIdAndDelete(req.params.id);
    // Remove store if business
    if (user.role === 'business') {
      await Business.deleteOne({ owner: user._id });
    }

    res.status(200).json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('deleteUser error:', error);
    res.status(500).json({ success: false, message: 'Server error deleting user' });
  }
};

exports.getAllBusinesses = async (req, res) => {
  try {
    const businesses = await Business.find().populate('owner', 'name email');
    res.status(200).json({ success: true, count: businesses.length, data: businesses });
  } catch (error) {
    console.error('getAllBusinesses error:', error);
    res.status(500).json({ success: false, message: 'Server error loading business index' });
  }
};

exports.approveBusiness = async (req, res) => {
  try {
    const { isApproved } = req.body;
    const business = await Business.findByIdAndUpdate(
      req.params.id,
      { isApproved: !!isApproved },
      { new: true }
    );

    if (!business) {
      return res.status(404).json({ success: false, message: 'Business store not found' });
    }

    res.status(200).json({
      success: true,
      message: `Store status set to ${business.isApproved ? 'Approved' : 'Suspended'}`,
      data: business
    });
  } catch (error) {
    console.error('approveBusiness error:', error);
    res.status(500).json({ success: false, message: 'Server error editing business approval' });
  }
};

exports.getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('customer', 'name phone')
      .populate('business', 'businessName address')
      .populate('deliveryPartner', 'name phone')
      .sort('-createdAt');

    res.status(200).json({ success: true, count: orders.length, data: orders });
  } catch (error) {
    console.error('getAllOrders error:', error);
    res.status(500).json({ success: false, message: 'Server error loading master orders index' });
  }
};

const path = require('path');
const fs = require('fs');
const { isMockMode, getMockDb } = require('../config/db');
const { syncToExcel } = require('../utils/excelSync');

exports.exportExcelSheet = async (req, res) => {
  try {
    const { sheetName } = req.params;
    
    const sheetMap = {
      'drivers': 'drivers.xlsx',
      'purchased-products': 'purchased_products.xlsx',
      'orders-summary': 'orders_summary.xlsx',
      'users': 'all_users.xlsx',
      'businesses': 'businesses.xlsx',
      'products': 'all_products.xlsx'
    };

    const fileName = sheetMap[sheetName];
    if (!fileName) {
      return res.status(400).json({ success: false, message: 'Invalid spreadsheet identifier' });
    }

    let dbState;
    if (isMockMode()) {
      dbState = getMockDb();
    } else {
      dbState = {
        users: await User.find().lean(),
        businesses: await Business.find().lean(),
        products: await Product.find().lean(),
        orders: await Order.find().lean()
      };
    }
    
    // Check if preview is requested as JSON
    const { getSheetData } = require('../utils/excelSync');
    if (req.query.preview === 'true') {
      const data = getSheetData(sheetName, dbState);
      if (!data) {
        return res.status(404).json({ success: false, message: 'Sheet data not found' });
      }
      return res.status(200).json({ success: true, ...data });
    }

    // Regeregente the CSVs dynamically to guarantee up-to-date data
    syncToExcel(dbState);

    const filePath = path.join(__dirname, '../../database_sheets', fileName);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'Spreadsheet file not found' });
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('exportExcelSheet error:', error);
    res.status(500).json({ success: false, message: 'Server error generating spreadsheet export' });
  }
};

