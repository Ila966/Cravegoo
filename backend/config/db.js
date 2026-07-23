const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

let isMock = false;
const mockDataPath = path.join(__dirname, '../data_mock.json');

let mockDb = {
  users: [],
  businesses: [],
  products: [],
  orders: [],
  deliveries: []
};

// Load existing mock data if any
if (fs.existsSync(mockDataPath)) {
  try {
    mockDb = JSON.parse(fs.readFileSync(mockDataPath, 'utf8'));
    // Initial sync after startup
    setTimeout(() => {
      try {
        const { syncToExcel } = require('../utils/excelSync');
        syncToExcel(mockDb);
      } catch (err) {
        console.error("Initial excel sync failed:", err);
      }
    }, 500);
  } catch (e) {
    console.error("Failed to parse mock DB file, resetting:", e);
  }
}

function saveMockDb() {
  try {
    fs.writeFileSync(mockDataPath, JSON.stringify(mockDb, null, 2), 'utf8');
    try {
      const { syncToExcel } = require('../utils/excelSync');
      syncToExcel(mockDb);
    } catch (err) {
      console.error("Excel sync failed during save:", err);
    }
  } catch (e) {
    console.error("Failed to save mock DB:", e);
  }
}

// A simple mock query builder to mimic Mongoose chainables (thenable)
class MockQuery {
  constructor(data, collectionName) {
    this.data = data;
    this.collectionName = collectionName;
  }
  
  populate(field) {
    if (Array.isArray(this.data)) {
      this.data = this.data.map(item => this._populateItem(item, field));
    } else if (this.data) {
      this.data = this._populateItem(this.data, field);
    }
    return this;
  }

  _populateItem(item, field) {
    if (!item) return item;
    const newItem = { ...item };
    
    // Support nested population like 'products.product'
    if (field === 'products.product' && newItem.products) {
      newItem.products = newItem.products.map(p => {
        const prodId = typeof p.product === 'object' ? p.product._id : p.product;
        const matchedProduct = mockDb.products.find(pr => pr._id === prodId);
        return {
          ...p,
          product: matchedProduct ? { ...matchedProduct } : p.product
        };
      });
      return newItem;
    }

    // Direct field population
    const idVal = newItem[field];
    if (!idVal) return newItem;

    const idStr = typeof idVal === 'object' && idVal._id ? idVal._id : idVal;

    let match = null;
    if (field === 'owner' || field === 'customer' || field === 'deliveryPartner') {
      match = mockDb.users.find(u => u._id === idStr);
    } else if (field === 'business') {
      match = mockDb.businesses.find(b => b._id === idStr);
    } else if (field === 'order' || field === 'orderId') {
      match = mockDb.orders.find(o => o._id === idStr);
    }

    if (match) {
      newItem[field] = { ...match };
    }
    return newItem;
  }

  sort(criteria) {
    // Simplified sort: e.g. -createdAt or createdAt
    if (Array.isArray(this.data)) {
      const field = typeof criteria === 'string' ? criteria.replace('-', '') : '';
      const desc = typeof criteria === 'string' && criteria.startsWith('-');
      if (field) {
        this.data.sort((a, b) => {
          const valA = a[field] || '';
          const valB = b[field] || '';
          if (valA < valB) return desc ? 1 : -1;
          if (valA > valB) return desc ? -1 : 1;
          return 0;
        });
      }
    }
    return this;
  }

  limit(num) {
    if (Array.isArray(this.data)) {
      this.data = this.data.slice(0, num);
    }
    return this;
  }

  select(fields) {
    // Dummy select for mock database compatibility
    return this;
  }

  lean() {
    // Dummy lean for mock database compatibility
    return this;
  }

  then(onFulfilled, onRejected) {
    return Promise.resolve(this.data).then(onFulfilled, onRejected);
  }
}

class MockModel {
  constructor(collectionName) {
    this.collectionName = collectionName;
  }

  _getCollection() {
    if (!mockDb[this.collectionName]) {
      mockDb[this.collectionName] = [];
    }
    return mockDb[this.collectionName];
  }

  _matchesQuery(item, query) {
    for (let key in query) {
      if (query[key] === undefined) continue;
      const itemVal = item[key];
      const queryVal = query[key];

      // Handle null check explicitly
      if (queryVal === null) {
        if (itemVal !== null && itemVal !== undefined) return false;
        continue;
      }

      // Handle Mongoose operators ($in, $nin, $ne, etc.)
      if (queryVal !== null && typeof queryVal === 'object' && !Array.isArray(queryVal)) {
        if (queryVal.$in !== undefined) {
          if (!queryVal.$in.includes(itemVal)) return false;
          continue;
        }
        if (queryVal.$nin !== undefined) {
          if (queryVal.$nin.includes(itemVal)) return false;
          continue;
        }
        if (queryVal.$ne !== undefined) {
          if (itemVal === queryVal.$ne) return false;
          continue;
        }
        if (queryVal.$gt !== undefined && !(itemVal > queryVal.$gt)) return false;
        if (queryVal.$gte !== undefined && !(itemVal >= queryVal.$gte)) return false;
        if (queryVal.$lt !== undefined && !(itemVal < queryVal.$lt)) return false;
        if (queryVal.$lte !== undefined && !(itemVal <= queryVal.$lte)) return false;
        continue;
      }

      // Simple equality
      if (itemVal !== queryVal) return false;
    }
    return true;
  }

  find(query = {}) {
    let items = this._getCollection();
    items = items.filter(item => this._matchesQuery(item, query));
    // Return deep copy
    return new MockQuery(JSON.parse(JSON.stringify(items)), this.collectionName);
  }

  findOne(query = {}) {
    let items = this._getCollection();
    const found = items.find(item => this._matchesQuery(item, query));
    return new MockQuery(found ? JSON.parse(JSON.stringify(found)) : null, this.collectionName);
  }

  findById(id) {
    let items = this._getCollection();
    const found = items.find(item => item._id === id);
    return new MockQuery(found ? JSON.parse(JSON.stringify(found)) : null, this.collectionName);
  }

  async create(data) {
    const items = this._getCollection();
    const newItem = {
      _id: 'mock_' + Math.random().toString(36).substring(2, 11),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...data
    };
    items.push(newItem);
    saveMockDb();
    return JSON.parse(JSON.stringify(newItem));
  }

  findByIdAndUpdate(id, update, options = {}) {
    const items = this._getCollection();
    const idx = items.findIndex(item => item._id === id);
    if (idx === -1) return new MockQuery(null, this.collectionName);
    
    let updated = { ...items[idx], updatedAt: new Date().toISOString() };
    
    // Support standard updates and $set
    if (update.$set) {
      updated = { ...updated, ...update.$set };
    } else {
      updated = { ...updated, ...update };
    }

    items[idx] = updated;
    saveMockDb();
    return new MockQuery(JSON.parse(JSON.stringify(updated)), this.collectionName);
  }

  findOneAndUpdate(query, update, options = {}) {
    const items = this._getCollection();
    const idx = items.findIndex(item => this._matchesQuery(item, query));
    if (idx === -1) return new MockQuery(null, this.collectionName);

    let updated = { ...items[idx], updatedAt: new Date().toISOString() };
    if (update.$set) {
      updated = { ...updated, ...update.$set };
    } else {
      updated = { ...updated, ...update };
    }

    items[idx] = updated;
    saveMockDb();
    return new MockQuery(JSON.parse(JSON.stringify(updated)), this.collectionName);
  }

  async updateOne(query, update) {
    const res = await this.findOneAndUpdate(query, update);
    return { modifiedCount: res ? 1 : 0 };
  }

  async deleteOne(query) {
    const items = this._getCollection();
    const idx = items.findIndex(item => this._matchesQuery(item, query));
    if (idx === -1) return { deletedCount: 0 };
    items.splice(idx, 1);
    saveMockDb();
    return { deletedCount: 1 };
  }

  async findByIdAndDelete(id) {
    return this.deleteOne({ _id: id });
  }

  async countDocuments(query = {}) {
    const res = await this.find(query);
    return res.length;
  }
}

const mockModels = {};

const connectDB = async () => {
  if (process.env.NODE_ENV === 'test') {
    isMock = true;
    console.log('⚠️ Running in TEST mode. Forcing Mock Database.');
    return;
  }

  try {
    // Attempt Mongoose connection with a quick 2-second timeout
    mongoose.set('strictQuery', false);
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 2000
    });
    console.log('✅ MongoDB connected successfully.');
  } catch (error) {
    isMock = true;
    console.warn('⚠️ MongoDB connection failed. Falling back to In-Memory/JSON Mock Database.');
    console.warn(`Original error: ${error.message}`);
  }
};

const getModel = (modelName, schema, collectionName) => {
  // Return either mongoose model or mock model based on connection state
  if (isMock) {
    if (!mockModels[modelName]) {
      mockModels[modelName] = new MockModel(collectionName);
    }
    return mockModels[modelName];
  } else {
    // If mongoose has not connected yet, we still return a proxy that delegates dynamically at runtime!
    return new Proxy(function() {}, {
      get: (target, prop) => {
        if (isMock) {
          if (!mockModels[modelName]) {
            mockModels[modelName] = new MockModel(collectionName);
          }
          const val = mockModels[modelName][prop];
          if (typeof val === 'function') {
            return val.bind(mockModels[modelName]);
          }
          return val;
        } else {
          // If we fail over or are connected to mongoose
          let mModel;
          try {
            mModel = mongoose.model(modelName);
          } catch (e) {
            mModel = mongoose.model(modelName, schema);
          }
          const val = mModel[prop];
          if (typeof val === 'function') {
            return val.bind(mModel);
          }
          return val;
        }
      },
      construct: (target, args) => {
        if (isMock) {
          // Mock constructor - returns plain object that has a .save() method
          const data = args[0] || {};
          return {
            ...data,
            save: async function() {
              if (!mockModels[modelName]) {
                mockModels[modelName] = new MockModel(collectionName);
              }
              const created = await mockModels[modelName].create(this);
              Object.assign(this, created);
              return this;
            }
          };
        } else {
          let mModel;
          try {
            mModel = mongoose.model(modelName);
          } catch (e) {
            mModel = mongoose.model(modelName, schema);
          }
          return new mModel(...args);
        }
      }
    });
  }
};

const getMockDb = () => mockDb;

module.exports = {
  connectDB,
  getModel,
  getMockDb,
  isMockMode: () => isMock,
  setMockMode: (val) => { isMock = val; }
};
