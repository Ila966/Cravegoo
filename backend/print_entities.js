const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const Business = require('./models/Business');
const Product = require('./models/Product');

const printEntities = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/localdash', {
      serverSelectionTimeoutMS: 2000
    });
    console.log('Connected.');
    const businesses = await Business.find({}, 'businessName');
    console.log('Businesses:');
    console.log(businesses);
    const products = await Product.find({}, 'name business');
    console.log('Products:');
    console.log(products);
    mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
  }
};

printEntities();
