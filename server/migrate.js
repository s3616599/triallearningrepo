/**
 * Migration Script - Migrate ALL JSON data to MongoDB
 * 
 * Migrates:
 * - users.json -> Users collection
 * - forum.json -> Threads collection
 * - blogs.json -> Blogs collection
 * - reviews.json -> Reviews collection
 * - products.json -> Products collection
 * 
 * Usage: node migrate.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

// Import models
const User = require('./models/User');
const Thread = require('./models/Thread');
//const Blog = require('./models/Blog');
const Review = require('./models/Reviews');
const Product = require('./models/Product');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://s3616599_db_user:sxkBZC4PTrDkjSUI@clusterwebg7.boellnf.mongodb.net/EcommerceStore?appName=ClusterWebG7';

// ============================================================
// DATA FROM JSON FILES
// ============================================================

const usersData = [
  {
    id: 1,
    username: "nam",
    email: "nam@example.com",
    password: "$2b$10$N9qo8uLOickgx2ZMRZoMye8BhP4vAKZeIJME8Ju6EWz5n0FQDHBnm",
    fullname: "Nam Nguyen",
    description: "Nike enthusiast and shoe collector",
    profilePicture: "https://via.placeholder.com/150",
    role: "user",
    locked: false
  },
  {
    id: 2,
    username: "admin",
    email: "admin@example.com",
    password: "$2b$10$1L3D3Vt3NXjNEdmQto220uToBTuCKYr23zKYSH5HOm7XgmS5WV2lS",
    fullname: "Admin User",
    description: "System administrator",
    profilePicture: "https://via.placeholder.com/150",
    role: "admin",
    locked: false
  },
  {
    id: 3,
    username: "user",
    email: "user@gmail.com",
    password: "$2b$10$1L3D3Vt3NXjNEdmQto220uToBTuCKYr23zKYSH5HOm7XgmS5WV2lS",
    fullname: "irfan",
    description: "Web developer and designer",
    profilePicture: "https://via.placeholder.com/150",
    role: "user",
    locked: false
  },
  {
    id: 4,
    username: "irfanabd",
    email: "irfanabdulla0@gmail.com",
    password: "$2b$10$nVFPFOw8t0Z73d5frwpHcu6GL4wYTyMCEFmzKq4FMBjeB9xmsonPO",
    fullname: "Irfan Abdulla",
    description: "",
    profilePicture: "https://via.placeholder.com/150",
    role: "user",
    locked: false
  }
];

const forumData = [
  {
    id: 1,
    title: "Which football boots (cleats) are best for firm natural grass?",
    author: "Community",
    tags: ["football", "cleats", "boots", "FG"],
    body: "I'm switching from turf to 11-a-side on firm natural grass pitches and need new boots. I prefer lightweight models with good traction and a snug fit. Any recommendations for studs pattern and brands (under $200) that perform well on firmer surfaces?",
    image: "img/1.png",
    created: "2025-12-01T09:15:00Z",
    archived: false,
    comments: [
      { id: 101, author: "SoccerPro23", text: "Nike Mercurial Vapor are excellent for firm ground. Great traction and very lightweight!", created: "2025-12-01T10:30:00Z" },
      { id: 102, author: "FootballFan", text: "I'd recommend Adidas Predator series. They have amazing grip on firm grass.", created: "2025-12-01T14:20:00Z" }
    ]
  },
  {
    id: 2,
    title: "Best long-run shoes for high-mileage training (neutral runner)?",
    author: "Community",
    tags: ["running", "shoes", "training"],
    body: "Training for a marathon (60—80 km/week). Need shoes offering cushioning and durability without being sluggish. Prefer neutral cushioning and something that lasts beyond 800 km if possible. What worked for you?",
    image: "img/2.png",
    created: "2025-11-28T18:02:00Z",
    archived: false,
    comments: [
      { id: 201, author: "MarathonRunner", text: "Brooks Ghost series is fantastic for high mileage. Super comfortable and durable!", created: "2025-11-28T19:15:00Z" },
      { id: 202, author: "RunningCoach", text: "Have you tried Nike Pegasus? They're my go-to for long distance training.", created: "2025-11-29T08:45:00Z" },
      { id: 203, author: "UltraRunner", text: "Hoka Clifton is worth looking at too. Amazing cushioning for those long miles.", created: "2025-11-29T12:30:00Z" }
    ]
  },
  {
    id: 3,
    title: "Basketball shoes for outdoor courts - recommendations?",
    author: "Community",
    tags: ["basketball", "outdoor", "shoes"],
    body: "I play pickup basketball 3-4 times a week on outdoor concrete courts. Looking for shoes with excellent grip, ankle support, and durability. Budget is around $150. What do you recommend?",
    image: "img/3.png",
    created: "2025-11-25T14:30:00Z",
    archived: false,
    comments: [
      { id: 301, author: "HoopDreams", text: "Nike LeBron Witness series is built for outdoor play. Very durable!", created: "2025-11-25T16:45:00Z" }
    ]
  },
  {
    id: 4,
    title: "Yoga mat recommendations for beginners?",
    author: "Community",
    tags: ["yoga", "mat", "beginner"],
    body: "I'm new to yoga and overwhelmed by all the mat options. Should I get a thick or thin mat? What about material - rubber, PVC, or TPE? Looking for something under $50 that provides good grip and cushioning.",
    image: "img/placeholder.png",
    created: "2025-11-20T10:00:00Z",
    archived: false,
    comments: [
      { id: 401, author: "YogaTeacher", text: "For beginners, I recommend a 6mm thick mat. Manduka or Liforme are excellent brands.", created: "2025-11-20T11:20:00Z" },
      { id: 402, author: "ZenMaster", text: "Natural rubber mats are eco-friendly and provide great grip. Worth the investment!", created: "2025-11-20T15:30:00Z" }
    ]
  },
  {
    id: 5,
    title: "Swimming goggles that don't leak - do they exist?",
    author: "Community",
    tags: ["swimming", "goggles", "equipment"],
    body: "I'm training for a triathlon and swim 4-5 times per week. Every pair of goggles I buy starts leaking within a month. Are there any truly leak-proof options? Willing to spend up to $60 for quality.",
    image: "img/placeholder.png",
    created: "2025-11-15T08:45:00Z",
    archived: false,
    comments: []
  },
  {
    id: 6,
    title: "Best gym bag for daily commuters?",
    author: "Community",
    tags: ["gym", "bag", "commute"],
    body: "I cycle to work and hit the gym during lunch. Need a bag that can carry my laptop (15 inch), gym clothes, shoes, and lunch. Waterproof would be a bonus. What do you use?",
    image: "img/placeholder.png",
    created: "2025-11-10T07:30:00Z",
    archived: false,
    comments: [
      { id: 601, author: "CyclingCommuter", text: "Check out North Face Base Camp duffel. Perfect size and completely waterproof!", created: "2025-11-10T09:00:00Z" },
      { id: 602, author: "GymRat", text: "Adidas Defender duffel has separate shoe compartment. Game changer!", created: "2025-11-10T12:15:00Z" },
      { id: 603, author: "BikeToWork", text: "I use a backpack-style gym bag from Under Armour. Much better for cycling than a duffel.", created: "2025-11-11T08:30:00Z" }
    ]
  }
];

const blogsData = [
  {
    id: 1,
    title: "Cindy Ngamba",
    heroImage: "/img/1.png",
    authorName: "Nike",
    authorRole: "Boxing Athlete",
    createdAt: "2023-09-07",
    tags: ["Boxing", "Refugee Team", "Athlete Story"],
    content: "<p><strong>Discipline:</strong> Boxing</p><p><strong>Country of Origin:</strong> Cameroon</p><p><strong>Born:</strong> 09/07/1998</p><blockquote class='blockquote my-4 p-3 border-start border-3 border-dark'><p>\"Boxing is my family, my best friend, my sibling, my partner. In the ring, you're alone, you can't hide. You have to be your own coach.\"</p></blockquote><p>Doubt fuels Cindy's fire. She punches back at skeptics, turning doubt into her power in the ring.</p><h4 class='fw-bold mt-5'>IOC Refugee Olympic Team</h4><p>We're proud to be the official kit supplier to the IOC Refugee Olympic Team.</p><h4 class='fw-bold mt-5'>Terrains d'Avenir</h4><p>The Olympic Refuge Foundation and Nike support the refugee and migrant community in Paris.</p>",
    userId: 1
  },
  {
    id: 2,
    title: "Marcus Rashford",
    heroImage: "/img/2.png",
    authorName: "Nike",
    authorRole: "Footballer",
    createdAt: "2023-10-31",
    tags: ["Football", "Community", "Inspiration"],
    content: "<p><strong>Nationality:</strong> English</p><p><strong>Born:</strong> 31/10/1997</p><p>Born with desire. To score, to win, to sweat, to strive. To get better every single day and lead by example.</p><blockquote class='blockquote my-4 p-3 border-start border-3 border-dark'><p>\"When you believe in yourself, incredible things can happen.\"</p></blockquote><p>The Marcus Rashford Collection is made for a new generation.</p><h4 class='fw-bold mt-5'>Play Forward By Marcus Rashford</h4><p>Play Forward encourages the next generation to dream big on and off the pitch.</p><h4 class='fw-bold mt-5'>The Mission</h4><p>Play Forward leverages the power of football to help young people find their superpowers.</p><blockquote class='blockquote my-4 p-3 border-start border-3 border-dark'><p>\"At first, I thought Play Forward was just another after-school club...\"</p><footer class='blockquote-footer'>Luca, 12</footer></blockquote><blockquote class='blockquote my-4 p-3 border-start border-3 border-dark'><p>\"Before Play Forward, my behavior wasn't very good...\"</p><footer class='blockquote-footer'>Adnaan, 12</footer></blockquote>",
    userId: 2
  },
  {
    id: 3,
    title: "Trained Podcast: Find Authenticity With Fabian Domenech",
    heroImage: "/img/3.png",
    authorName: "Nike",
    authorRole: "Yoga Teacher",
    createdAt: "2023-11-15",
    tags: ["Podcast", "Mindfulness", "Yoga"],
    content: "<p><strong>Discipline:</strong> Coaching</p><p>Nike yoga teacher Fabian Domenech has taught all over the world.</p><p>Over the past decade, yoga participation in the United States has nearly tripled.</p><p>Thanks to yoga, meditation, and travel, Fabian learned self-love and detachment.</p><blockquote class='blockquote my-4 p-3 border-start border-3 border-dark'><p>\"I think we need yoga in our lives somehow, just to be centered, to improve as humans.\"</p><footer class='blockquote-footer'>Fabian Domenech</footer></blockquote>",
    userId: 3
  }
];

const reviewsData = [
  {
    id: 1,
    title: "Great Everyday Shoe",
    summary: "Great product! Really comfortable and fits well.",
    content: "Great product! Really comfortable and fits well. I wear them every day and they still look new. Highly recommend for anyone looking for comfort and style.",
    name: "Irfan",
    userId: 3,
    date: "2022-06-07",
    rating: 4,
    thumbnail: "img/Review-1.jpg",
    size: "41"
  },
  {
    id: 2,
    title: "Super Comfortable",
    summary: "Ridiculously comfortable—like walking on well-trained marshmallows. Easily my new daily pair.",
    content: "Ridiculously comfortable—like walking on well-trained marshmallows. Easily my new daily pair. The fit is perfect and the cushioning is amazing.",
    name: "Nam",
    userId: 1,
    date: "2022-06-05",
    rating: 5,
    thumbnail: "img/Review-2.jpg",
    size: "40"
  },
  {
    id: 3,
    title: "Supportive & Stylish",
    summary: "Great support and looks sharp, just needed a tiny bit of break-in time.",
    content: "Great support and looks sharp, just needed a tiny bit of break-in time. After a week, they felt perfect. Would buy again!",
    name: "Nam",
    userId: 1,
    date: "2023-01-19",
    rating: 4,
    thumbnail: "img/Review-3.jpg",
    size: "42"
  }
];

const productsData = [
  {
    id: 1,
    name: "Nike Air Force 1",
    price: 199.99,
    image: "/img/Nike_Air_Force_High.avif",
    stock: "In Stock",
    color: "black",
    sizes: [39, 40, 41, 42]
  },
  {
    id: 2,
    name: "Nike Air Max 1",
    price: 50.00,
    image: "/img/Nike_Air_Max_1_Black.avif",
    stock: "In Stock",
    color: "gray",
    sizes: [40, 41, 43]
  },
  {
    id: 3,
    name: "Nike Dunk High",
    price: 80.00,
    image: "/img/Nike_Dunk_High_By_You.avif",
    stock: "In Stock",
    color: "blue",
    sizes: [39, 41, 42]
  }
];

// ============================================================
// MIGRATION FUNCTION
// ============================================================

async function migrate() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Create ID mapping for users (old JSON id -> new MongoDB _id)
    const userIdMap = {};

    // ========== MIGRATE USERS ==========
    console.log('📦 Migrating Users...');
    await User.deleteMany({});
    
    for (const user of usersData) {
      const newUser = await User.create({
        username: user.username,
        email: user.email,
        password: user.password,
        fullname: user.fullname,
        description: user.description || '',
        profilePicture: user.profilePicture,
        role: user.role,
        locked: user.locked || false,
        resetToken: null,
        resetTokenExpiry: null
      });
      userIdMap[user.id] = newUser._id;
      console.log(`  ✓ User: ${user.username} (old id: ${user.id} -> new _id: ${newUser._id})`);
    }
    console.log(`  Total: ${usersData.length} users migrated\n`);

    // ========== MIGRATE PRODUCTS ==========
    console.log('📦 Migrating Products...');
    await Product.deleteMany({});
    
    for (const product of productsData) {
      const newProduct = await Product.create({
        name: product.name,
        price: product.price,
        image: product.image,
        stock: product.stock,
        color: product.color,
        sizes: product.sizes
      });
      console.log(`  ✓ Product: ${product.name} ($${product.price})`);
    }
    console.log(`  Total: ${productsData.length} products migrated\n`);

    // ========== MIGRATE BLOGS ==========
    console.log('📦 Migrating Blogs...');
    await Blog.deleteMany({});
    
    for (const blog of blogsData) {
      const newBlog = await Blog.create({
        title: blog.title,
        heroImage: blog.heroImage,
        authorName: blog.authorName,
        authorRole: blog.authorRole,
        tags: blog.tags,
        content: blog.content,
        userId: userIdMap[blog.userId] || null,
        createdAt: new Date(blog.createdAt)
      });
      console.log(`  ✓ Blog: "${blog.title}" by ${blog.authorName}`);
    }
    console.log(`  Total: ${blogsData.length} blogs migrated\n`);

    // ========== MIGRATE REVIEWS ==========
    console.log('📦 Migrating Reviews...');
    await Review.deleteMany({});
    
    for (const review of reviewsData) {
      const newReview = await Review.create({
        title: review.title,
        summary: review.summary,
        content: review.content,
        name: review.name,
        userId: userIdMap[review.userId] || null,
        date: new Date(review.date),
        rating: review.rating,
        thumbnail: review.thumbnail,
        size: review.size
      });
      console.log(`  ✓ Review: "${review.title}" by ${review.name} (${review.rating}★)`);
    }
    console.log(`  Total: ${reviewsData.length} reviews migrated\n`);

    // ========== MIGRATE FORUM THREADS ==========
    console.log('📦 Migrating Forum Threads...');
    await Thread.deleteMany({});
    
    let totalComments = 0;
    for (const thread of forumData) {
      const comments = (thread.comments || []).map(c => ({
        author: c.author,
        text: c.text,
        created: new Date(c.created),
        archived: false
      }));
      totalComments += comments.length;

      const newThread = await Thread.create({
        title: thread.title,
        author: thread.author,
        tags: thread.tags,
        body: thread.body,
        image: thread.image,
        userId: null,
        archived: thread.archived || false,
        comments: comments
      });
      console.log(`  ✓ Thread: "${thread.title.substring(0, 40)}..." (${comments.length} comments)`);
    }
    console.log(`  Total: ${forumData.length} threads, ${totalComments} comments migrated\n`);

    // ========== SUMMARY ==========
    console.log('═══════════════════════════════════════════════════');
    console.log('✅ MIGRATION COMPLETE!');
    console.log('═══════════════════════════════════════════════════');
    console.log(`  Users:    ${usersData.length}`);
    console.log(`  Products: ${productsData.length}`);
    console.log(`  Blogs:    ${blogsData.length}`);
    console.log(`  Reviews:  ${reviewsData.length}`);
    console.log(`  Threads:  ${forumData.length} (${totalComments} comments)`);
    console.log('═══════════════════════════════════════════════════\n');

    console.log('User ID Mapping (for reference):');
    for (const [oldId, newId] of Object.entries(userIdMap)) {
      const user = usersData.find(u => u.id == oldId);
      console.log(`  ${user.username}: ${oldId} -> ${newId}`);
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run migration
migrate();
