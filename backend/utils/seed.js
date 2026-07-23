const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Business = require('../models/Business');
const Product = require('../models/Product');
const { isMockMode, getMockDb } = require('../config/db');

const seedData = async () => {
  try {
    let userCount = 0;
    if (isMockMode()) {
      userCount = getMockDb().users.length;
    } else {
      userCount = await User.countDocuments();
    }

    if (userCount > 0) {
      console.log('🌱 Database already seeded. Skipping.');
      return;
    }

    console.log('🌱 Seeding database...');

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('password123', salt);

    // Create Admin
    const admin = await User.create({
      name: 'System Admin',
      email: 'admin@delivery.com',
      password: passwordHash,
      phone: '1234567890',
      address: '100 Admin HQ Blvd, NY',
      role: 'admin'
    });

    // Create Customers
    const customer1 = await User.create({
      name: 'Ayan Jyoti',
      email: 'customer@delivery.com',
      password: passwordHash,
      phone: '9876543210',
      address: '22 Baker Street, London',
      role: 'customer'
    });

    const customer2 = await User.create({
      name: 'Jane Doe',
      email: 'jane@delivery.com',
      password: passwordHash,
      phone: '5551234567',
      address: '456 Elm St, San Francisco',
      role: 'customer'
    });

    // Create Business Owners
    const businessOwner1 = await User.create({
      name: 'Chef Mario',
      email: 'business@delivery.com',
      password: passwordHash,
      phone: '1112223333',
      address: '88 Little Italy Lane, NY',
      role: 'business'
    });

    const businessOwner2 = await User.create({
      name: 'Sarah Green',
      email: 'business2@delivery.com',
      password: passwordHash,
      phone: '4445556666',
      address: '15 Organic Oasis Way, NY',
      role: 'business'
    });

    // Create Delivery Partners
    const driver1 = await User.create({
      name: 'John Express',
      email: 'driver@delivery.com',
      password: passwordHash,
      phone: '7778889999',
      address: 'Central Garage, NY',
      role: 'delivery'
    });

    const driver2 = await User.create({
      name: 'Speedy Sam',
      email: 'driver2@delivery.com',
      password: passwordHash,
      phone: '8889990000',
      address: 'Downtown Hub, NY',
      role: 'delivery'
    });

    // Create Businesses (linked to owners)
    const biz1 = await Business.create({
      businessName: 'Gourmet Pizza Kitchen',
      owner: businessOwner1._id,
      logo: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&q=80',
      address: '88 Little Italy Lane, NY',
      contactNumber: '1112223333',
      description: 'Handcrafted wood-fired pizzas made with local organic ingredients.',
      isApproved: true
    });

    const biz2 = await Business.create({
      businessName: 'Green Garden Salads & Juice',
      owner: businessOwner2._id,
      logo: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&q=80',
      address: '15 Organic Oasis Way, NY',
      contactNumber: '4445556666',
      description: 'Superfood bowls, dynamic organic salads, and fresh cold-press juices.',
      isApproved: true
    });

    // Create Products for Business 1 (Pizza)
    await Product.create({
      business: biz1._id,
      name: 'Margherita Pizza',
      category: 'Pizza',
      description: 'San Marzano tomatoes, fresh buffalo mozzarella, fresh basil, and extra virgin olive oil.',
      price: 14.99,
      stock: 50,
      images: ['https://images.unsplash.com/photo-1604068549290-dea0e4a305ca?w=600&q=80']
    });

    await Product.create({
      business: biz1._id,
      name: 'Spicy Pepperoni Pizza',
      category: 'Pizza',
      description: 'Classic cheese pizza topped with premium cups pepperoni and dry chili flakes.',
      price: 16.99,
      stock: 40,
      images: ['https://images.unsplash.com/photo-1628840042765-356cda07504e?w=600&q=80']
    });

    await Product.create({
      business: biz1._id,
      name: 'Truffle Mushroom Pizza',
      category: 'Pizza',
      description: 'White base with wild mushrooms, baby arugula, mozzarella, and a drizzle of truffle oil.',
      price: 18.99,
      stock: 25,
      images: ['https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?w=600&q=80']
    });

    await Product.create({
      business: biz1._id,
      name: 'Garlic Parmesan Breadsticks',
      category: 'Sides',
      description: 'Oven-fresh breadsticks brushed with herb garlic butter and sprinkled with parmesan.',
      price: 6.99,
      stock: 100,
      images: ['https://images.unsplash.com/photo-1544982503-9f984c14501a?w=600&q=80']
    });

    await Product.create({
      business: biz1._id,
      name: 'Classic Tiramisu',
      category: 'Desserts',
      description: 'Layers of espresso-soaked ladyfingers, creamy mascarpone custard, and cocoa powder.',
      price: 7.99,
      stock: 30,
      images: ['https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=600&q=80']
    });

    // Create Products for Business 2 (Salads)
    await Product.create({
      business: biz2._id,
      name: 'Avocado Caesar Bowl',
      category: 'Salad',
      description: 'Crisp romaine, shaved parmesan, cherry tomatoes, croutons, fresh avocado, and Caesar dressing.',
      price: 12.99,
      stock: 60,
      images: ['https://images.unsplash.com/photo-1550304943-4f24f54ddde9?w=600&q=80']
    });

    await Product.create({
      business: biz2._id,
      name: 'Harvest Quinoa Bowl',
      category: 'Bowls',
      description: 'Warm quinoa, roasted sweet potatoes, sliced apples, baby spinach, pumpkin seeds, and tahini.',
      price: 13.99,
      stock: 45,
      images: ['https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=80']
    });

    await Product.create({
      business: biz2._id,
      name: 'Citrus Ginger Cold Press',
      category: 'Juice',
      description: 'Fresh organic carrots, apples, ginger, lemon, and a touch of cayenne pepper.',
      price: 5.99,
      stock: 80,
      images: ['https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=600&q=80']
    });

    console.log('🌱 Seeding completed successfully!');
    console.log('Default accounts created (Password for all: "password123"):');
    console.log('- Admin: admin@delivery.com');
    console.log('- Customer: customer@delivery.com');
    console.log('- Business Owner: business@delivery.com (Gourmet Pizza Kitchen)');
    console.log('- Business Owner 2: business2@delivery.com (Green Garden Salads)');
    console.log('- Delivery Partner: driver@delivery.com');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
  }
};

module.exports = seedData;
