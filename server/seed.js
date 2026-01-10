/**
 * Database Seeding Script
 * Migrates data from JSON files to MongoDB
 * 
 * Usage: node seed.js [--clear]
 * Options:
 *   --clear   Clear existing data before seeding
 */

require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');

// Import models
const User = require('./models/User');
const Review = require('./models/Reviews');
const Thread = require('./models/Thread');
const Product = require('./models/Product');
const Cart = require('./models/Cart');
const Order = require('./models/Order');

// MongoDB connection string
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://s3616599_db_user:sxkBZC4PTrDkjSUI@clusterwebg7.boellnf.mongodb.net/EcommerceStore?appName=ClusterWebG7';

// JSON file paths - adjust these to match your project structure
const DATA_DIR = path.join(__dirname, '../data');
const JSON_FILES = {
  users: path.join(DATA_DIR, 'users.json'),
  reviews: path.join(DATA_DIR, 'reviews.json'),
  forum: path.join(DATA_DIR, 'forum.json'),
  products: path.join(DATA_DIR, 'products.json')
};

// Helper function to read JSON file safely
function readJsonFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  File not found: ${filePath}`);
      return null;
    }
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error(`❌ Error reading ${filePath}:`, err.message);
    return null;
  }
}

// Hash password helper
async function hashPassword(password) {
  return await bcrypt.hash(password, 10);
}

// Seed Users
async function seedUsers() {
  console.log('\n📦 Seeding Users...');
  
  const usersData = readJsonFile(JSON_FILES.users);
  
  if (!usersData || !Array.isArray(usersData) || usersData.length === 0) {
    console.log('   No users data found. Creating default admin user...');
    
    // Create default admin user
    const defaultAdmin = new User({
      username: 'admin',
      email: 'admin@example.com',
      password: await hashPassword('admin123'),
      fullname: 'Administrator',
      description: 'Site Administrator',
      profilePicture: 'https://via.placeholder.com/150',
      role: 'admin',
      locked: false
    });
    
    await defaultAdmin.save();
    console.log('   ✅ Created default admin user (username: admin, password: admin123)');
    return { count: 1, mapping: {} };
  }

  const idMapping = {}; // Map old IDs to new MongoDB IDs
  let count = 0;

  for (const userData of usersData) {
    try {
      // Check if user already exists
      const existingUser = await User.findOne({
        $or: [
          { username: userData.username },
          { email: userData.email }
        ]
      });

      if (existingUser) {
        console.log(`   ⏭️  Skipping existing user: ${userData.username}`);
        idMapping[userData.id] = existingUser._id.toString();
        continue;
      }

      // Hash password if it's not already hashed (bcrypt hashes start with $2)
      let password = userData.password;
      if (!password.startsWith('$2')) {
        password = await hashPassword(password);
      }

      const user = new User({
        username: userData.username,
        email: userData.email,
        password: password,
        fullname: userData.fullname || userData.fullName || userData.username,
        description: userData.description || '',
        profilePicture: userData.profilePicture || userData.avatar || 'https://via.placeholder.com/150',
        role: userData.role || 'user',
        locked: userData.locked || false,
        resetToken: null,
        resetTokenExpiry: null
      });

      await user.save();
      idMapping[userData.id] = user._id.toString();
      count++;
      console.log(`   ✅ Created user: ${userData.username}`);
    } catch (err) {
      console.error(`   ❌ Error creating user ${userData.username}:`, err.message);
    }
  }

  console.log(`   📊 Seeded ${count} users`);
  return { count, mapping: idMapping };
}

// Seed Products
async function seedProducts() {
  console.log('\n📦 Seeding Products...');
  
  const productsData = readJsonFile(JSON_FILES.products);
  
  if (!productsData || !Array.isArray(productsData) || productsData.length === 0) {
    console.log('   No products data found. Creating sample products...');
    
    const sampleProducts = [
      {
        name: 'Classic Running Shoe',
        description: 'Comfortable everyday running shoe',
        brand: 'SportBrand',
        category: 'Running',
        color: 'Black',
        sizes: [39, 40, 41, 42, 43, 44],
        images: ['/img/shoe1.jpg'],
        pricing: { price: 99.99, originalPrice: 129.99, discount: 23 },
        inventory: { quantity: 100, sku: 'RUN-001' }
      },
      {
        name: 'Trail Hiking Boot',
        description: 'Durable boot for outdoor adventures',
        brand: 'OutdoorGear',
        category: 'Hiking',
        color: 'Brown',
        sizes: [40, 41, 42, 43, 44, 45],
        images: ['/img/shoe2.jpg'],
        pricing: { price: 149.99, originalPrice: 179.99, discount: 17 },
        inventory: { quantity: 50, sku: 'HIK-001' }
      },
      {
        name: 'Casual Sneaker',
        description: 'Stylish sneaker for everyday wear',
        brand: 'UrbanStyle',
        category: 'Casual',
        color: 'White',
        sizes: [38, 39, 40, 41, 42, 43],
        images: ['/img/shoe3.jpg'],
        pricing: { price: 79.99, originalPrice: 99.99, discount: 20 },
        inventory: { quantity: 75, sku: 'CAS-001' }
      }
    ];

    for (const productData of sampleProducts) {
      const product = new Product(productData);
      await product.save();
    }
    
    console.log('   ✅ Created 3 sample products');
    return { count: 3, mapping: {} };
  }

  const idMapping = {};
  let count = 0;

  for (const productData of productsData) {
    try {
      const product = new Product({
        name: productData.name || productData.title,
        description: productData.description || '',
        brand: productData.brand || 'Unknown',
        category: productData.category || 'General',
        color: productData.color || 'Black',
        sizes: productData.sizes || [39, 40, 41, 42, 43],
        images: productData.images || (productData.image ? [productData.image] : ['/img/placeholder.png']),
        pricing: {
          price: productData.price || productData.pricing?.price || 0,
          originalPrice: productData.originalPrice || productData.pricing?.originalPrice || productData.price || 0,
          discount: productData.discount || productData.pricing?.discount || 0
        },
        inventory: {
          quantity: productData.stock || productData.inventory?.quantity || 100,
          sku: productData.sku || productData.inventory?.sku || `SKU-${Date.now()}`
        }
      });

      await product.save();
      idMapping[productData.id] = product._id.toString();
      count++;
      console.log(`   ✅ Created product: ${product.name}`);
    } catch (err) {
      console.error(`   ❌ Error creating product ${productData.name}:`, err.message);
    }
  }

  console.log(`   📊 Seeded ${count} products`);
  return { count, mapping: idMapping };
}

// Seed Reviews
async function seedReviews(userMapping, productMapping) {
  console.log('\n📦 Seeding Reviews...');
  
  const reviewsData = readJsonFile(JSON_FILES.reviews);
  
  if (!reviewsData || !Array.isArray(reviewsData) || reviewsData.length === 0) {
    console.log('   No reviews data found. Skipping...');
    return { count: 0 };
  }

  // Get a default product ID if we don't have mappings
  let defaultProductId = Object.values(productMapping)[0];
  if (!defaultProductId) {
    const anyProduct = await Product.findOne();
    defaultProductId = anyProduct?._id?.toString();
  }

  let count = 0;

  for (const reviewData of reviewsData) {
    try {
      // Map old user ID to new one, or use null
      let userId = null;
      if (reviewData.userId && userMapping[reviewData.userId]) {
        userId = userMapping[reviewData.userId];
      }

      // Map old product ID to new one, or use default
      let productId = defaultProductId;
      if (reviewData.productId && productMapping[reviewData.productId]) {
        productId = productMapping[reviewData.productId];
      }

      // Skip if no product ID available
      if (!productId) {
        console.log(`   ⚠️  Skipping review - no product ID available`);
        continue;
      }

      const review = new Review({
        productId: productId,
        userId: userId,
        rating: reviewData.rating || 5,
        title: reviewData.title || 'Great Product',
        body: reviewData.content || reviewData.description || reviewData.body || '',
        size: reviewData.size || '42',
        images: reviewData.thumbnail ? [reviewData.thumbnail] : (reviewData.images || []),
        helpful: reviewData.helpful || { yes: 0, no: 0 },
        verified: reviewData.verified || false
      });

      await review.save();
      count++;
      console.log(`   ✅ Created review: ${review.title}`);
    } catch (err) {
      console.error(`   ❌ Error creating review:`, err.message);
    }
  }

  console.log(`   📊 Seeded ${count} reviews`);
  return { count };
}

// Seed Forum Threads
async function seedForum(userMapping) {
  console.log('\n📦 Seeding Forum Threads...');
  
  const forumData = readJsonFile(JSON_FILES.forum);
  
  if (!forumData || !Array.isArray(forumData) || forumData.length === 0) {
    console.log('   No forum data found. Creating sample thread...');
    
    const sampleThread = new Thread({
      title: 'Welcome to the Community Forum!',
      author: 'Administrator',
      meta: 'By Administrator • Community',
      tags: ['welcome', 'announcement'],
      excerpt: 'Welcome to our community forum! Feel free to share your thoughts and connect with others.',
      body: 'Welcome to our community forum! This is a place where you can share your experiences, ask questions, and connect with other members of our community. Please be respectful and follow our community guidelines.',
      image: 'img/placeholder.png',
      archived: false,
      comments: []
    });

    await sampleThread.save();
    console.log('   ✅ Created sample welcome thread');
    return { count: 1 };
  }

  let count = 0;

  for (const threadData of forumData) {
    try {
      // Map old user ID to new one
      let userId = null;
      if (threadData.userId && userMapping[threadData.userId]) {
        userId = userMapping[threadData.userId];
      }

      // Transform comments
      const comments = (threadData.comments || []).map(comment => {
        let commentUserId = null;
        if (comment.userId && userMapping[comment.userId]) {
          commentUserId = userMapping[comment.userId];
        }

        return {
          author: comment.author || 'Anonymous',
          text: comment.text || comment.content || '',
          userId: commentUserId,
          archived: comment.archived || false
        };
      });

      const thread = new Thread({
        title: threadData.title,
        author: threadData.author || 'Anonymous',
        meta: threadData.meta || `By ${threadData.author || 'Anonymous'} • Community`,
        tags: threadData.tags || [],
        excerpt: threadData.excerpt || (threadData.body ? threadData.body.substring(0, 100) : ''),
        body: threadData.body || threadData.content || '',
        image: threadData.image || 'img/placeholder.png',
        userId: userId,
        archived: threadData.archived || false,
        archivedAt: threadData.archivedAt || null,
        archivedBy: threadData.archivedBy || null,
        comments: comments
      });

      await thread.save();
      count++;
      console.log(`   ✅ Created thread: ${thread.title}`);
    } catch (err) {
      console.error(`   ❌ Error creating thread ${threadData.title}:`, err.message);
    }
  }

  console.log(`   📊 Seeded ${count} threads`);
  return { count };
}

// Clear all collections
async function clearDatabase() {
  console.log('\n🗑️  Clearing existing data...');
  
  await User.deleteMany({});
  console.log('   ✅ Cleared Users');
  
  await Product.deleteMany({});
  console.log('   ✅ Cleared Products');
  
  await Review.deleteMany({});
  console.log('   ✅ Cleared Reviews');
  
  await Thread.deleteMany({});
  console.log('   ✅ Cleared Threads');
  
  await Cart.deleteMany({});
  console.log('   ✅ Cleared Carts');
  
  await Order.deleteMany({});
  console.log('   ✅ Cleared Orders');
}

// Main seeding function
async function seed() {
  console.log('🌱 Starting Database Seeding Script');
  console.log('=====================================');

  try {
    // Connect to MongoDB
    console.log('\n🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('   ✅ Connected to MongoDB Atlas');

    // Check for --clear flag
    const shouldClear = process.argv.includes('--clear');
    if (shouldClear) {
      await clearDatabase();
    }

    // Seed in order (users first, then products, then reviews and forum)
    const userResult = await seedUsers();
    const productResult = await seedProducts();
    await seedReviews(userResult.mapping, productResult.mapping);
    await seedForum(userResult.mapping);

    // Summary
    console.log('\n=====================================');
    console.log('🎉 Seeding Complete!');
    console.log('=====================================');
    console.log('\n📊 Summary:');
    
    const userCount = await User.countDocuments();
    const productCount = await Product.countDocuments();
    const reviewCount = await Review.countDocuments();
    const threadCount = await Thread.countDocuments();
    
    console.log(`   Users:    ${userCount}`);
    console.log(`   Products: ${productCount}`);
    console.log(`   Reviews:  ${reviewCount}`);
    console.log(`   Threads:  ${threadCount}`);

    if (userResult.count === 1 && !readJsonFile(JSON_FILES.users)) {
      console.log('\n📝 Default Admin Credentials:');
      console.log('   Username: admin');
      console.log('   Password: admin123');
    }

  } catch (err) {
    console.error('\n❌ Seeding failed:', err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run the seeder
seed();
