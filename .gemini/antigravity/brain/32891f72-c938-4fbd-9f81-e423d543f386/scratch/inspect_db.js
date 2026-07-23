const path = require('path');
// Add backend node_modules to require search path
module.paths.push('c:/Users/Vishnu teja/Downloads/local-business-delivery-platform/local-business-delivery-platform/backend/node_modules');

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const fs = require('fs');

// Load env
dotenv.config({ path: 'c:/Users/Vishnu teja/Downloads/local-business-delivery-platform/local-business-delivery-platform/backend/.env' });

const mockDataPath = 'c:/Users/Vishnu teja/Downloads/local-business-delivery-platform/local-business-delivery-platform/backend/data_mock.json';

async function inspectMongoDB() {
  console.log('--- MongoDB Inspection ---');
  if (!process.env.MONGODB_URI) {
    console.log('No MONGODB_URI found in env.');
    return;
  }
  try {
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 2000 });
    console.log('Connected to MongoDB.');

    const db = mongoose.connection.db;
    
    // Get all collections
    const collections = await db.listCollections().toArray();
    console.log('Collections:', collections.map(c => c.name));

    // Inspect businesses
    if (collections.some(c => c.name === 'businesses')) {
      const businesses = await db.collection('businesses').find({}).toArray();
      console.log(`\nBusinesses found (${businesses.length}):`);
      businesses.forEach(b => {
        console.log(`- ID: ${b._id}, Name: ${b.businessName || b.name}, Owner: ${b.owner}, isApproved: ${b.isApproved}`);
      });
    } else {
      console.log('No businesses collection found.');
    }

    // Inspect products
    if (collections.some(c => c.name === 'products')) {
      const products = await db.collection('products').find({}).toArray();
      console.log(`\nProducts found (${products.length}):`);
      products.forEach(p => {
        console.log(`- ID: ${p._id}, Name: ${p.name}, Business: ${p.business}, Price: ${p.price}, Stock: ${p.stock}`);
      });
    } else {
      console.log('No products collection found.');
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error('Error connecting to MongoDB:', err.message);
  }
}

function inspectMockDB() {
  console.log('\n--- Mock DB Inspection ---');
  if (!fs.existsSync(mockDataPath)) {
    console.log('Mock DB file does not exist.');
    return;
  }
  try {
    const mockDb = JSON.parse(fs.readFileSync(mockDataPath, 'utf8'));
    console.log(`Businesses found (${mockDb.businesses.length}):`);
    mockDb.businesses.forEach(b => {
      console.log(`- ID: ${b._id}, Name: ${b.businessName}, Owner: ${b.owner}, isApproved: ${b.isApproved}`);
    });

    console.log(`\nProducts found (${mockDb.products.length}):`);
    mockDb.products.forEach(p => {
      console.log(`- ID: ${p._id}, Name: ${p.name}, Business: ${p.business}, Price: ${p.price}, Stock: ${p.stock}`);
    });
  } catch (err) {
    console.error('Error reading Mock DB:', err.message);
  }
}

async function run() {
  await inspectMongoDB();
  inspectMockDB();
}

run();
