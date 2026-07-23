const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const User = require('./models/User');

const printUsers = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/localdash', {
      serverSelectionTimeoutMS: 2000
    });
    console.log('Connected to DB.');
    const users = await User.find({}, 'name email role');
    console.log('Users in database:');
    console.log(users);
    mongoose.disconnect();
  } catch (err) {
    console.error('Error connecting/querying database:', err.message);
  }
};

printUsers();
