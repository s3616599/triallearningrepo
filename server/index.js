
// ====== ENVIRONMENT SETUP ======
require('dotenv').config();

// ====== IMPORTS & APP INIT ======
const express = require('express');
const fs = require('fs/promises');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;
const REVIEWS_PATH = path.join(__dirname, '../data/reviews.json');
const BLOGS_PATH = path.join(__dirname, '../data/blogs.json');

// LOAD PRODUCTS
const products = require('../data/products.json');
// IN-MEMORY CART (Temporary Database)
let cartItems = []; 
let nextCartId = 1;

// ====== MIDDLEWARE ======
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ====== VIEW ENGINE ======
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

// ====== STATIC FILES ======
app.use('/img', express.static(path.join(__dirname, '../img')));
app.use('/css', express.static(path.join(__dirname, '../css')));

// ====== UTILITY FUNCTIONS ======
async function readReviews() {
  const raw = await fs.readFile(REVIEWS_PATH, 'utf8');
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed : [];
}

async function readBlogs() {
  const raw = await fs.readFile(BLOGS_PATH, 'utf8');
  return JSON.parse(raw);
}

async function writeBlogs(blogs) {
  await fs.writeFile(BLOGS_PATH, JSON.stringify(blogs, null, 2));
}

async function writeReviews(nextReviews) {
  const dir = path.dirname(REVIEWS_PATH);
  const tmpPath = path.join(dir, `reviews.tmp.${Date.now()}.json`);
  await fs.writeFile(tmpPath, JSON.stringify(nextReviews, null, 2), 'utf8');
  await fs.rename(tmpPath, REVIEWS_PATH);
}

function normalizeRating(value) {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string') return NaN;
  const match = value.trim().match(/^(\d)/);
  return match ? Number(match[1]) : Number(value);
}

function validateReviewPayload(body, { partial = false } = {}) {
  const errors = [];
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const description = typeof body.description === 'string' ? body.description.trim() : '';
  const content = typeof body.content === 'string' ? body.content.trim() : '';
  const name = typeof body.name === 'string' ? body.name.trim() : (typeof body.username === 'string' ? body.username.trim() : '');
  const date = typeof body.date === 'string' ? body.date.trim() : '';
  const rating = normalizeRating(body.rating);
  const mergedContent = content || description;
  if (!partial || 'title' in body) {
    if (!title) errors.push('Title is required.');
    else if (title.length < 5) errors.push('Title must be at least 5 characters.');
  }
  if (!partial || 'description' in body || 'content' in body) {
    if (!mergedContent) errors.push('Description is required.');
    else if (mergedContent.length < 10) errors.push('Description must be at least 10 characters.');
  }
  if (!partial || 'rating' in body) {
    if (!Number.isFinite(rating)) errors.push('Rating is required.');
    else if (rating < 1 || rating > 5) errors.push('Rating must be between 1 and 5.');
  }
  if (!partial || 'name' in body || 'username' in body) {
    if (!name) errors.push('Name is required.');
    else if (!/^[a-zA-Z\s']+$/.test(name)) errors.push("Name must contain letters/spaces only.");
  }
  if (!partial || 'date' in body) {
    if (!date) {
      errors.push('Date is required.');
    } else {
      const parsed = new Date(date);
      if (Number.isNaN(parsed.getTime())) {
        errors.push('Date must be a valid date.');
      } else {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        parsed.setHours(0, 0, 0, 0);
        if (parsed > today) errors.push('Date cannot be in the future.');
      }
    }
  }
  const normalized = {
    title,
    content: mergedContent,
    summary: (mergedContent || '').slice(0, 140),
    name,
    date,
    rating: Number.isFinite(rating) ? rating : undefined,
    verified: Boolean(body.verified),
    thumbnail: typeof body.thumbnail === 'string' ? body.thumbnail.trim() : '',
    color: typeof body.color === 'string' ? body.color.trim() : '',
    size: typeof body.size === 'string' ? body.size.trim() : ''
  };
  return { ok: errors.length === 0, errors, normalized };
}

// ====== PAGE ROUTES ======
app.get('/', (req, res) => {
  res.send('Express server is running!');
});

app.get('/test', (req, res) => {
  res.render('test');
}); 

app.get('/product', async (req, res) => {
  const reviews = await readReviews();
  res.render('product_page', { reviews });
});

app.get('/blogs', async (req, res) => {
  const blogs = await readBlogs();
  res.render('blogs', { blogs });
});

app.get('/blogs/:id', async (req, res) => {
  const blogs = await readBlogs();
  const blog = blogs.find(b => b.id == req.params.id);

  if (!blog) {
    return res.status(404).send('Blog not found');
  }

  res.render('blog_detail', { blog });
});

app.get('/blogs/add', (req, res) => {
  res.render('blog_add');
});

app.post('/blogs/add', async (req, res) => {
  const blogs = await readBlogs();

  const newBlog = {
    id: blogs.length ? blogs[blogs.length - 1].id + 1 : 1,
    title: req.body.title,
    heroImage: req.body.heroImage,
    authorName: req.body.authorName,
    authorRole: req.body.authorRole,
    tags: req.body.tags.split(',').map(t => t.trim()),
    content: req.body.content,
    createdAt: new Date().toISOString().split('T')[0]
  };

  blogs.push(newBlog);
  await writeBlogs(blogs);

  res.redirect('/blogs');
});


app.get('/blogs/edit/:id', async (req, res) => {
  const blogs = await readBlogs();
  const blog = blogs.find(b => b.id == req.params.id);

  res.render('blog_edit', { blog });
});

app.post('/blogs/edit/:id', async (req, res) => {
  const blogs = await readBlogs();
  const index = blogs.findIndex(b => b.id == req.params.id);

  blogs[index].title = req.body.title;
  blogs[index].authorName = req.body.authorName;
  blogs[index].content = req.body.content;

  await writeBlogs(blogs);
  res.redirect('/blogs/' + req.params.id);
});

app.post('/blogs/delete/:id', async (req, res) => {
  let blogs = await readBlogs();
  blogs = blogs.filter(b => b.id != req.params.id);

  await writeBlogs(blogs);
  res.redirect('/blogs');
});


// Register page
app.get('/register', (req, res) => {
  res.render('register');
});

// Login page
app.get('/login', (req, res) => {
  res.render('login');
});

// Forgot Password
app.get('/forgot_password', (req, res) => {
  res.render('forgot_password');
});

// Reset Password
app.get('/reset_password', (req, res) => {
  res.render('reset_password');
});

// Legacy URL support
app.get('/reset_password.html', (req, res) => {
  res.redirect(301, '/reset_password');
});

// --- SHOP (Home) ---
app.get('/', (req, res) => res.redirect('/shop'));

app.get('/shop', (req, res) => {
    res.render('shop', { products: products });
});

// --- CART PAGE ---
app.get('/cart', (req, res) => {
    const userId = 1; 
    const userCart = cartItems.filter(item => item.userId === userId);

    let subtotal = 0;
    userCart.forEach(item => {
        subtotal += (item.product.price * item.quantity);
    });

    const tax = subtotal * 0.10;
    const finalTotal = subtotal + tax;

    res.render('cart', { 
        cartItems: userCart, 
        subtotal: subtotal.toFixed(2),
        tax: tax.toFixed(2),
        total: finalTotal.toFixed(2) 
    });
});

// --- CHECKOUT PAGE ---
app.get('/checkout', (req, res) => {
    const userId = 1;
    const userCart = cartItems.filter(item => item.userId === userId);

    let subtotal = 0;
    userCart.forEach(item => {
        subtotal += (item.product.price * item.quantity);
    });
    
    const tax = subtotal * 0.10;
    const finalTotal = subtotal + tax;

    res.render('checkout', { 
        cartItems: userCart, 
        subtotal: subtotal.toFixed(2), 
        tax: tax.toFixed(2), 
        total: finalTotal.toFixed(2) 
    });
});

// --- ADD TO CART ---
app.post('/add-to-cart', (req, res) => {
    const productId = parseInt(req.body.productId);
    // This works now because 'products' is an Array, not a string path
    const productToAdd = products.find(p => p.id === productId);

    if (productToAdd) {
        cartItems.push({
            id: nextCartId++,
            userId: 1, 
            product: productToAdd,
            quantity: 1
        });
        res.json({ success: true, message: "Item added to cart!" });
    } else {
        res.status(404).json({ success: false, message: "Product not found" });
    }
});

// --- REMOVE FROM CART ---
app.post('/remove-from-cart', (req, res) => {
    const cartIdToDelete = parseInt(req.body.cartId);
    cartItems = cartItems.filter(item => item.id !== cartIdToDelete);
    res.redirect('/cart'); 
});

// --- PLACE ORDER ---
app.post('/place-order', (req, res) => {
    const customerName = req.body.fullname || "Customer";
    cartItems = []; // Clear Cart
    res.render('order', { name: customerName });
});

// ====== API ROUTES ======
// 1) Dynamic retrieval of all review data
app.get('/api/reviews', async (req, res) => {
  const reviews = await readReviews();
  res.json(reviews);
});

app.get('/api/reviews/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid review id.' });
  const reviews = await readReviews();
  const review = reviews.find(r => Number(r.id) === id);
  if (!review) return res.status(404).json({ error: 'Review not found.' });
  res.json(review);
});

// 2) Dynamic creation of data (no logged-in user yet)
app.post('/api/reviews', async (req, res) => {
  const { ok, errors, normalized } = validateReviewPayload(req.body, { partial: false });
  if (!ok) return res.status(400).json({ errors });
  const reviews = await readReviews();
  const maxId = reviews.reduce((m, r) => Math.max(m, Number(r.id) || 0), 0);
  const created = {
    id: maxId + 1,
    ...normalized,
    verified: false,
    thumbnail: normalized.thumbnail || 'img/Nike_Air_Force_High.avif'
  };
  const next = [created, ...reviews];
  await writeReviews(next);
  res.status(201).json(created);
});

// 3) Dynamic editing/updating (no ownership checks yet)
app.put('/api/reviews/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid review id.' });
  const { ok, errors, normalized } = validateReviewPayload(req.body, { partial: true });
  if (!ok) return res.status(400).json({ errors });
  const reviews = await readReviews();
  const idx = reviews.findIndex(r => Number(r.id) === id);
  if (idx === -1) return res.status(404).json({ error: 'Review not found.' });
  const updated = { ...reviews[idx] };
  Object.entries(normalized).forEach(([key, value]) => {
    if (value !== undefined && value !== '') updated[key] = value;
  });
  const next = [...reviews];
  next[idx] = updated;
  await writeReviews(next);
  res.json(updated);
});

// ====== ERROR HANDLER ======
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error.' });
});

// ====== START SERVER ======
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});