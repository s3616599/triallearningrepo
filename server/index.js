
// ====== ENVIRONMENT SETUP ======
require('dotenv').config();

// ====== IMPORTS & APP INIT ======
const express = require('express');
const fs = require('fs/promises');
const path = require('path');
const bcrypt = require('bcrypt');
const app = express();
const PORT = process.env.PORT || 3000;
const REVIEWS_PATH = path.join(__dirname, '../data/reviews.json');
const BLOGS_PATH = path.join(__dirname, '../data/blogs.json');
const USERS_PATH = path.join(__dirname, '../data/users.json');
const FORUM_PATH = path.join(__dirname, '../data/forum.json');

// LOAD PRODUCTS
const products = require('../data/products.json');

const session = require('express-session');

app.use(session({
  secret: 'cosc3060-secret',
  resave: false,
  saveUninitialized: false
}));
app.use((req, res, next) => {
  res.locals.user = req.session.user;
  next();
});
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

// Forum module functions
async function readForum() {
  try {
    const raw = await fs.readFile(FORUM_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Error reading forum data:', err);
    return [];
  }
}

async function writeForum(threads) {
  const dir = path.dirname(FORUM_PATH);
  const tmpPath = path.join(dir, `forum.tmp.${Date.now()}.json`);
  await fs.writeFile(tmpPath, JSON.stringify(threads, null, 2), 'utf8');
  await fs.rename(tmpPath, FORUM_PATH);
}

// ====== USER MANAGEMENT FUNCTIONS ======
async function readUsers() {
  try {
    const raw = await fs.readFile(USERS_PATH, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading users data:', err);
    return [];
  }
}

async function writeUsers(users) {
  const dir = path.dirname(USERS_PATH);
  const tmpPath = path.join(dir, `users.tmp.${Date.now()}.json`);
  await fs.writeFile(tmpPath, JSON.stringify(users, null, 2), 'utf8');
  await fs.rename(tmpPath, USERS_PATH);
}

async function hashPassword(password) {
  return await bcrypt.hash(password, 10);
}

async function comparePassword(password, hash) {
  return await bcrypt.compare(password, hash);
}

function generateResetToken() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
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

// ====== AUTHENTICATION MIDDLEWARE ======
function requireLogin(req, res, next) {
  if (!req.session.user) {
    req.session.returnTo = req.originalUrl;
    return res.redirect('/login');
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session.user) {
    req.session.returnTo = req.originalUrl;
    return res.redirect('/login');
  }
  if (req.session.user.role !== 'admin') {
    return res.status(403).render('error', { 
      message: 'Access Denied', 
      error: 'You do not have permission to access this page.' 
    });
  }
  next();
}

// ====== LOCKED USER MIDDLEWARE ======
// Middleware to check if user account is locked - BLOCKS ALL OPERATIONS
async function checkUserLocked(req, res, next) {
  if (!req.session.user) {
    return next(); // Not logged in, let other middleware handle it
  }
  
  try {
    const users = await readUsers();
    const user = users.find(u => u.id === req.session.user.id);
    
    if (user && user.locked) {
      // User is locked - destroy session and show error
      req.session.destroy((err) => {
        if (err) console.error('Session destroy error:', err);
      });
      return res.status(403).render('error', {
        message: 'Account Locked',
        error: 'Your account has been locked by an administrator. You cannot perform any operations. Please contact support for assistance.'
      });
    }
    next();
  } catch (err) {
    console.error('Error checking user lock status:', err);
    next();
  }
}

// Apply the locked user check to all routes after session is established
app.use(checkUserLocked);


// ====== PAGE ROUTES ======

app.get('/test', (req, res) => {
  res.render('test');
}); 

app.get('/product', async (req, res) => {
  const reviews = await readReviews();
  res.render('product_page', { reviews });
});

app.get('/blogs', async (req, res) => {
  const blogs = await readBlogs();
  res.render('blogs', {
    blogs,
    user: req.session.user
  });
});

app.get('/blogs/add', requireLogin, (req, res) => {
  res.render('blog_add');
});

app.post('/blogs/add', requireLogin, async (req, res) => {
  const blogs = await readBlogs();

  const newBlog = {
    id: blogs.length ? blogs[blogs.length - 1].id + 1 : 1,
    title: req.body.title,
    heroImage: req.body.heroImage,
    authorName: req.body.authorName,
    authorRole: req.body.authorRole,
    tags: req.body.tags ? req.body.tags.split(',').map(t => t.trim()) : [],
    content: req.body.content,
    createdAt: new Date().toISOString().split('T')[0],
    userId: req.session.user.id
  };

  blogs.push(newBlog);
  await writeBlogs(blogs);

  res.redirect('/blogs');
});

app.get('/blogs/edit/:id', requireLogin, async (req, res) => {
  const blogs = await readBlogs();
  const blog = blogs.find(b => b.id == req.params.id);

  if (!blog) {
    return res.status(404).send('Blog not found');
  }

  if (blog.userId !== req.session.user.id) {
    return res.status(403).send('Forbidden');
  }

  res.render('blog_edit', { blog });
});

app.post('/blogs/edit/:id', requireLogin, async (req, res) => {
  const blogs = await readBlogs();
  const index = blogs.findIndex(b => b.id == req.params.id);

  if (blogs[index].userId !== req.session.user.id) {
    return res.status(403).send('Forbidden');
  }

  blogs[index].title = req.body.title;
  blogs[index].content = req.body.content;
  blogs[index].authorName = req.body.authorName;
  blogs[index].authorRole = req.body.authorRole;

  await writeBlogs(blogs);
  res.redirect('/blogs/' + req.params.id);
});


app.get('/blogs/:id', async (req, res) => {
  const blogs = await readBlogs();
  const blog = blogs.find(b => b.id == req.params.id);

  if (!blog) {
    return res.status(404).send('Blog not found');
  }

  res.render('blog_detail', {
    blog,
    user: req.session.user
  });
});



app.post('/blogs/delete/:id', requireLogin, async (req, res) => {
  let blogs = await readBlogs();
  const blog = blogs.find(b => b.id == req.params.id);

  if (blog.userId !== req.session.user.id) {
    return res.status(403).send('Forbidden');
  }

  blogs = blogs.filter(b => b.id != req.params.id);
  await writeBlogs(blogs);
  res.redirect('/blogs');
});


// Register page
app.get('/register', (req, res) => {
  res.render('register');
});

// Register POST - Create new user
app.post('/register', async (req, res) => {
  try {
    const { username, email, password, confirmPassword, fullname, description } = req.body;
    const errors = [];

    // Validation
    if (!username || username.trim().length < 3) {
      errors.push('Username must be at least 3 characters long');
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push('Please enter a valid email address');
    }
    if (!password || password.length < 6) {
      errors.push('Password must be at least 6 characters long');
    }
    if (password !== confirmPassword) {
      errors.push('Passwords do not match');
    }
    if (!fullname || fullname.trim().length < 2) {
      errors.push('Please enter your full name');
    }
    if (description && description.length > 200) {
      errors.push('Description must be less than 200 characters');
    }

    // Check if user already exists
    const users = await readUsers();
    if (users.some(u => u.username === username || u.email === email)) {
      errors.push('Username or email already exists');
    }

    if (errors.length > 0) {
      return res.render('register', { errors, formData: { username, email, fullname, description } });
    }

    // Create new user
    const hashedPassword = await hashPassword(password);
    const newUser = {
      id: users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1,
      username: username.trim(),
      email: email.trim(),
      password: hashedPassword,
      fullname: fullname.trim(),
      description: description ? description.trim() : '',
      profilePicture: 'https://via.placeholder.com/150',
      role: 'user',
      locked: false,
      createdAt: new Date().toISOString(),
      resetToken: null,
      resetTokenExpiry: null
    };

    users.push(newUser);
    await writeUsers(users);

    // Set session and redirect
    req.session.user = {
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      fullname: newUser.fullname,
      role: newUser.role
    };

    res.redirect('/blogs');
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).render('register', { errors: ['An error occurred during registration'] });
  }
});

// Login page
app.get('/login', (req, res) => {
  res.render('login');
});

// Login POST - Authenticate user
app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const errors = [];

    if (!username) errors.push('Username is required');
    if (!password) errors.push('Password is required');

    if (errors.length > 0) {
      return res.render('login', { errors });
    }

    // Find user
    const users = await readUsers();
    const user = users.find(u => u.username === username);

    if (!user) {
      return res.render('login', { errors: ['Invalid username or password'] });
    }

    // Check if user is locked
    if (user.locked) {
      return res.render('login', { errors: ['Your account has been locked. Please contact support for assistance.'] });
    }

    // Check password
    const passwordMatch = await comparePassword(password, user.password);
    if (!passwordMatch) {
      return res.render('login', { errors: ['Invalid username or password'] });
    }

    // Set session
    req.session.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      fullname: user.fullname,
      role: user.role
    };

    const redirectTo = req.session.returnTo || '/blogs';
    delete req.session.returnTo;

    res.redirect(redirectTo);
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).render('login', { errors: ['An error occurred during login'] });
  }
});

// Logout
app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).send('Error logging out');
    }
    res.redirect('/shop');
  });
});

// Forgot Password - Show form
app.get('/forgot_password', (req, res) => {
  res.render('forgot_password');
});

// Forgot Password - Send reset email/token
app.post('/forgot_password', async (req, res) => {
  try {
    const { email } = req.body;
    const errors = [];

    if (!email) {
      errors.push('Email is required');
    }

    if (errors.length > 0) {
      return res.render('forgot_password', { errors });
    }

    const users = await readUsers();
    const user = users.find(u => u.email === email);

    if (!user) {
      // Don't reveal if email exists for security
      return res.render('forgot_password', { 
        message: 'If an account exists with that email, a reset link has been sent.'
      });
    }

    // Generate reset token
    const resetToken = generateResetToken();
    const resetTokenExpiry = Date.now() + 3600000; // 1 hour

    // Update user with reset token
    user.resetToken = resetToken;
    user.resetTokenExpiry = resetTokenExpiry;
    await writeUsers(users);

    // In production, send email here. For now, just show success message.
    // The token is stored in the database and would be sent via email
    res.render('forgot_password', {
      message: 'If an account exists with that email, a password reset link has been sent. Please check your email.'
    });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).render('forgot_password', { errors: ['An error occurred'] });
  }
});

// Reset Password - Show form
app.get('/reset_password', (req, res) => {
  const { token } = req.query;
  res.render('reset_password', { token: token || '' });
});

// Reset Password - Update password
app.post('/reset_password', async (req, res) => {
  try {
    const { token, password, confirmPassword } = req.body;
    const errors = [];

    if (!token) errors.push('Reset token is required');
    if (!password) errors.push('Password is required');
    if (password && password.length < 6) errors.push('Password must be at least 6 characters');
    if (password !== confirmPassword) errors.push('Passwords do not match');

    if (errors.length > 0) {
      return res.render('reset_password', { errors, token });
    }

    // Find user with valid token
    const users = await readUsers();
    const user = users.find(u => u.resetToken === token && u.resetTokenExpiry > Date.now());

    if (!user) {
      return res.render('reset_password', { errors: ['Invalid or expired reset token'], token });
    }

    // Update password
    user.password = await hashPassword(password);
    user.resetToken = null;
    user.resetTokenExpiry = null;
    await writeUsers(users);

    res.render('reset_password', { 
      message: 'Password has been reset successfully. Please login with your new password.',
      redirectUrl: '/login'
    });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).render('reset_password', { errors: ['An error occurred'], token: req.body.token });
  }
});

// Legacy URL support
app.get('/reset_password.html', (req, res) => {
  res.redirect(301, '/reset_password');
});

// ====== USER PROFILE ROUTES ======

// Account alias (redirect to profile)
app.get('/account', requireLogin, (req, res) => {
  res.redirect('/profile');
});

// View user profile
app.get('/profile', requireLogin, async (req, res) => {
  try {
    const users = await readUsers();
    const user = users.find(u => u.id === req.session.user.id);
    
    if (!user) {
      return res.status(404).send('User not found');
    }

    res.render('profile', { user });
  } catch (err) {
    console.error('Profile view error:', err);
    res.status(500).send('Error loading profile');
  }
});

// Edit profile page
app.get('/profile/edit', requireLogin, async (req, res) => {
  try {
    const users = await readUsers();
    const user = users.find(u => u.id === req.session.user.id);
    
    if (!user) {
      return res.status(404).send('User not found');
    }

    res.render('profile_edit', { user });
  } catch (err) {
    console.error('Profile edit page error:', err);
    res.status(500).send('Error loading profile edit page');
  }
});

// Update profile
app.post('/profile/edit', requireLogin, async (req, res) => {
  try {
    const { fullname, email, description, profilePicture } = req.body;
    const errors = [];

    // Validation
    if (!fullname || fullname.trim().length < 2) {
      errors.push('Full name must be at least 2 characters');
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push('Please enter a valid email address');
    }
    if (description && description.length > 200) {
      errors.push('Description must be less than 200 characters');
    }

    // Check if email is already used by another user
    const users = await readUsers();
    const emailExists = users.find(u => u.email === email && u.id !== req.session.user.id);
    if (emailExists) {
      errors.push('This email is already in use');
    }

    if (errors.length > 0) {
      const user = users.find(u => u.id === req.session.user.id);
      return res.render('profile_edit', { user, errors });
    }

    // Update user
    const userIndex = users.findIndex(u => u.id === req.session.user.id);
    users[userIndex].fullname = fullname.trim();
    users[userIndex].email = email.trim();
    users[userIndex].description = description ? description.trim() : '';
    users[userIndex].profilePicture = profilePicture ? profilePicture.trim() : 'https://via.placeholder.com/150';

    await writeUsers(users);

    // Update session
    req.session.user.fullname = users[userIndex].fullname;
    req.session.user.email = users[userIndex].email;

    res.render('profile_edit', { user: users[userIndex], message: 'Profile updated successfully!' });
  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).send('Error updating profile');
  }
});

// Change password page
app.get('/profile/change-password', requireLogin, (req, res) => {
  res.render('change_password', { user: req.session.user });
});

// Update password
app.post('/profile/change-password', requireLogin, async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const errors = [];

    // Validation
    if (!currentPassword) errors.push('Current password is required');
    if (!newPassword) errors.push('New password is required');
    if (newPassword && newPassword.length < 6) errors.push('New password must be at least 6 characters');
    if (newPassword !== confirmPassword) errors.push('Passwords do not match');

    if (errors.length > 0) {
      return res.render('change_password', { user: req.session.user, errors });
    }

    // Verify current password
    const users = await readUsers();
    const user = users.find(u => u.id === req.session.user.id);

    const passwordMatch = await comparePassword(currentPassword, user.password);
    if (!passwordMatch) {
      return res.render('change_password', { user: req.session.user, errors: ['Current password is incorrect'] });
    }

    // Update password
    const hashedPassword = await hashPassword(newPassword);
    user.password = hashedPassword;
    await writeUsers(users);

    res.render('change_password', { user: req.session.user, message: 'Password changed successfully!' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).render('change_password', { user: req.session.user, errors: ['An error occurred'] });
  }
});

// Delete account page
app.get('/profile/delete-account', requireLogin, (req, res) => {
  res.render('delete_account', { user: req.session.user });
});

// Delete account
app.post('/profile/delete-account', requireLogin, async (req, res) => {
  try {
    const { password, confirm } = req.body;
    const errors = [];

    if (!password) {
      errors.push('Password is required');
    }
    if (!confirm) {
      errors.push('You must confirm the deletion');
    }

    if (errors.length > 0) {
      return res.render('delete_account', { user: req.session.user, errors });
    }

    // Verify password
    const users = await readUsers();
    const user = users.find(u => u.id === req.session.user.id);

    const passwordMatch = await comparePassword(password, user.password);
    if (!passwordMatch) {
      return res.render('delete_account', { user: req.session.user, errors: ['Invalid password'] });
    }

    // Delete user
    const updatedUsers = users.filter(u => u.id !== req.session.user.id);
    await writeUsers(updatedUsers);

    // Destroy session
    req.session.destroy((err) => {
      if (err) {
        console.error('Session destroy error:', err);
      }
      res.redirect('/shop');
    });
  } catch (err) {
    console.error('Delete account error:', err);
    res.status(500).render('delete_account', { user: req.session.user, errors: ['An error occurred'] });
  }
});

// ====== ADMIN ROUTES ======

// Admin Dashboard
app.get('/admin', requireAdmin, async (req, res) => {
  try {
    const users = await readUsers();
    const blogs = await readBlogs();
    const threads = await readForum();
    
    res.render('admin', { 
      users: users.map(u => ({ ...u, password: undefined })), // Don't expose passwords
      blogs,
      threads,
      user: req.session.user
    });
  } catch (err) {
    console.error('Admin dashboard error:', err);
    res.status(500).send('Error loading admin dashboard');
  }
});

// Admin - Lock/Unlock User
app.post('/admin/users/:id/toggle-lock', requireAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const users = await readUsers();
    const userIndex = users.findIndex(u => u.id === userId);
    
    if (userIndex === -1) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Don't allow locking yourself
    if (userId === req.session.user.id) {
      return res.status(400).json({ error: 'Cannot lock your own account' });
    }
    
    // Toggle locked status
    users[userIndex].locked = !users[userIndex].locked;
    await writeUsers(users);
    
    res.json({ success: true, locked: users[userIndex].locked });
  } catch (err) {
    console.error('Toggle lock error:', err);
    res.status(500).json({ error: 'An error occurred' });
  }
});

// Admin - Delete User
app.post('/admin/users/:id/delete', requireAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const users = await readUsers();
    
    // Don't allow deleting yourself
    if (userId === req.session.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }
    
    const updatedUsers = users.filter(u => u.id !== userId);
    
    if (updatedUsers.length === users.length) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    await writeUsers(updatedUsers);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ error: 'An error occurred' });
  }
});

// Admin - Change User Role
app.post('/admin/users/:id/role', requireAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { role } = req.body;
    
    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    
    const users = await readUsers();
    const userIndex = users.findIndex(u => u.id === userId);
    
    if (userIndex === -1) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Don't allow changing your own role
    if (userId === req.session.user.id) {
      return res.status(400).json({ error: 'Cannot change your own role' });
    }
    
    users[userIndex].role = role;
    await writeUsers(users);
    
    res.json({ success: true, role: users[userIndex].role });
  } catch (err) {
    console.error('Change role error:', err);
    res.status(500).json({ error: 'An error occurred' });
  }
});

// Admin - Delete Blog
app.post('/admin/blogs/:id/delete', requireAdmin, async (req, res) => {
  try {
    const blogId = parseInt(req.params.id);
    let blogs = await readBlogs();
    
    const originalLength = blogs.length;
    blogs = blogs.filter(b => b.id !== blogId);
    
    if (blogs.length === originalLength) {
      return res.status(404).json({ error: 'Blog not found' });
    }
    
    await writeBlogs(blogs);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete blog error:', err);
    res.status(500).json({ error: 'An error occurred' });
  }
});

// Admin - Delete Forum Thread
app.post('/admin/forum/:id/delete', requireAdmin, async (req, res) => {
  try {
    const threadId = parseInt(req.params.id);
    let threads = await readForum();
    
    const originalLength = threads.length;
    threads = threads.filter(t => t.id !== threadId);
    
    if (threads.length === originalLength) {
      return res.status(404).json({ error: 'Thread not found' });
    }
    
    await writeForum(threads);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete thread error:', err);
    res.status(500).json({ error: 'An error occurred' });
  }
});

// ====== ARCHIVE FUNCTIONALITY FOR ADMIN ======

// Admin - Archive/Unarchive Thread
app.post('/admin/forum/:id/archive', requireAdmin, async (req, res) => {
  try {
    const threadId = parseInt(req.params.id);
    let threads = await readForum();
    
    const threadIndex = threads.findIndex(t => t.id === threadId);
    
    if (threadIndex === -1) {
      return res.status(404).json({ error: 'Thread not found' });
    }
    
    // Toggle archived status
    threads[threadIndex].archived = !threads[threadIndex].archived;
    threads[threadIndex].archivedAt = threads[threadIndex].archived ? new Date().toISOString() : null;
    threads[threadIndex].archivedBy = threads[threadIndex].archived ? req.session.user.id : null;
    
    await writeForum(threads);
    res.json({ 
      success: true, 
      archived: threads[threadIndex].archived,
      message: threads[threadIndex].archived ? 'Thread archived successfully' : 'Thread unarchived successfully'
    });
  } catch (err) {
    console.error('Archive thread error:', err);
    res.status(500).json({ error: 'An error occurred' });
  }
});

// Admin - Archive/Unarchive Post (Comment)
app.post('/admin/forum/:threadId/posts/:postId/archive', requireAdmin, async (req, res) => {
  try {
    const threadId = parseInt(req.params.threadId);
    const postId = parseInt(req.params.postId);
    let threads = await readForum();
    
    const threadIndex = threads.findIndex(t => t.id === threadId);
    
    if (threadIndex === -1) {
      return res.status(404).json({ error: 'Thread not found' });
    }
    
    if (!threads[threadIndex].comments) {
      return res.status(404).json({ error: 'No comments in this thread' });
    }
    
    const postIndex = threads[threadIndex].comments.findIndex(c => c.id === postId);
    
    if (postIndex === -1) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    // Toggle archived status for the post
    threads[threadIndex].comments[postIndex].archived = !threads[threadIndex].comments[postIndex].archived;
    threads[threadIndex].comments[postIndex].archivedAt = threads[threadIndex].comments[postIndex].archived ? new Date().toISOString() : null;
    threads[threadIndex].comments[postIndex].archivedBy = threads[threadIndex].comments[postIndex].archived ? req.session.user.id : null;
    
    await writeForum(threads);
    res.json({ 
      success: true, 
      archived: threads[threadIndex].comments[postIndex].archived,
      message: threads[threadIndex].comments[postIndex].archived ? 'Post archived successfully' : 'Post unarchived successfully'
    });
  } catch (err) {
    console.error('Archive post error:', err);
    res.status(500).json({ error: 'An error occurred' });
  }
});

// Admin - Get archived threads
app.get('/admin/forum/archived', requireAdmin, async (req, res) => {
  try {
    const threads = await readForum();
    const archivedThreads = threads.filter(t => t.archived === true);
    res.json({ success: true, threads: archivedThreads });
  } catch (err) {
    console.error('Get archived threads error:', err);
    res.status(500).json({ error: 'An error occurred' });
  }
});

// Forum routes

// forum main page to list all threads (excluding archived for regular users)
app.get('/forum', requireLogin, async (req, res) => {
  try {
    let threads = await readForum();
    
    // Filter out archived threads for non-admin users
    if (req.session.user.role !== 'admin') {
      threads = threads.filter(t => !t.archived);
    }
    
    // Sort by created date (newest first)
    threads.sort((a, b) => new Date(b.created) - new Date(a.created));
    res.render('forum', { threads, user: req.session.user });
  } catch (err) {
    console.error('Error loading forum:', err);
    res.status(500).send('Error loading forum');
  }
});

// Create new thread (AJAX)
app.post('/forum/threads', requireLogin, async (req, res) => {
  try {
    const threads = await readForum();

    // tags from comma separated string
    let tags = [];
    if (req.body.tags) {
      tags = req.body.tags.split(',').map(t => t.trim()).filter(t => t.length > 0);
    }

    // Validate inputs
    if (!req.body.title || req.body.title.trim().length < 10) {
      return res.status(400).json({ error: 'Title must be at least 10 characters' });
    }
    if (!req.body.body || req.body.body.trim().length < 20) {
      return res.status(400).json({ error: 'Message must be at least 20 characters' });
    }

    // Generate new ID
    const maxId = threads.reduce((max, t) => Math.max(max, t.id || 0), 0);

    const newThread = {
      id: maxId + 1,
      title: req.body.title,
      author: req.session.user.fullname || req.session.user.username,
      meta: `By ${req.session.user.fullname || req.session.user.username} • Community`,
      tags: tags,
      excerpt: req.body.body.substring(0, 100),
      body: req.body.body,
      image: req.body.image || 'img/placeholder.png',
      created: new Date().toISOString(),
      userId: req.session.user.id,
      archived: false,
      comments: []
    };

    threads.unshift(newThread);
    await writeForum(threads);

    res.json({ thread: newThread });
  } catch (err) {
    console.error('Error creating thread:', err);
    res.status(500).json({ error: 'Error creating thread' });
  }
});

// View single thread
app.get('/forum/threads/:id', requireLogin, async (req, res) => {
  try {
    const threads = await readForum();
    const thread = threads.find(t => t.id == req.params.id);

    if (!thread) {
      return res.status(404).send('Thread not found');
    }

    // Hide archived threads from non-admin users
    if (thread.archived && req.session.user.role !== 'admin') {
      return res.status(404).send('Thread not found');
    }

    res.render('forum_thread', { thread, user: req.session.user });
  } catch (err) {
    console.error('Error loading thread:', err);
    res.status(500).send('Error loading thread');
  }
});

// Update thread (AJAX)
app.post('/forum/threads/:id', requireLogin, async (req, res) => {
  try {
    const threads = await readForum();
    const threadIndex = threads.findIndex(t => t.id == req.params.id);

    if (threadIndex === -1) {
      return res.status(404).json({ error: 'Thread not found' });
    }

    // Check if thread is archived
    if (threads[threadIndex].archived) {
      return res.status(403).json({ error: 'Cannot edit archived thread' });
    }

    // Check if user is thread author
    if (threads[threadIndex].userId !== req.session.user.id) {
      return res.status(403).json({ error: 'You can only edit your own threads' });
    }

    // Validate inputs
    if (!req.body.title || req.body.title.trim().length < 10) {
      return res.status(400).json({ error: 'Title must be at least 10 characters' });
    }
    if (!req.body.body || req.body.body.trim().length < 20) {
      return res.status(400).json({ error: 'Message must be at least 20 characters' });
    }

    // Update thread
    let tags = [];
    if (req.body.tags) {
      tags = req.body.tags.split(',').map(t => t.trim()).filter(t => t.length > 0);
    }

    threads[threadIndex].title = req.body.title;
    threads[threadIndex].body = req.body.body;
    threads[threadIndex].excerpt = req.body.body.substring(0, 100);
    threads[threadIndex].tags = tags;
    if (req.body.image && req.body.image !== 'img/placeholder.png') {
      threads[threadIndex].image = req.body.image;
    }

    await writeForum(threads);
    res.json({ thread: threads[threadIndex] });
  } catch (err) {
    console.error('Error updating thread:', err);
    res.status(500).json({ error: 'Error updating thread' });
  }
});

// Add comment to thread (AJAX)
app.post('/forum/threads/:id/comments', requireLogin, async (req, res) => {
  try {
    const threads = await readForum();
    const threadIndex = threads.findIndex(t => t.id == req.params.id);

    if (threadIndex === -1) {
      return res.status(404).json({ error: 'Thread not found' });
    }

    // Check if thread is archived
    if (threads[threadIndex].archived) {
      return res.status(403).json({ error: 'Cannot comment on archived thread' });
    }

    if (!req.body.text || req.body.text.trim().length === 0) {
      return res.status(400).json({ error: 'Comment cannot be empty' });
    }

    // Initialize comments array if it doesn't exist
    if (!threads[threadIndex].comments) {
      threads[threadIndex].comments = [];
    }

    // Generate comment ID
    const maxCommentId = threads[threadIndex].comments.reduce(
      (max, c) => Math.max(max, c.id || 0), 0
    );

    const newComment = {
      id: maxCommentId + 1,
      author: req.session.user.fullname || req.session.user.username,
      text: req.body.text,
      created: new Date().toISOString(),
      userId: req.session.user.id,
      archived: false
    };

    threads[threadIndex].comments.push(newComment);
    await writeForum(threads);

    res.json({ comment: newComment });
  } catch (err) {
    console.error('Error adding comment:', err);
    res.status(500).json({ error: 'Error adding comment' });
  }
});

// Delete comment from thread (AJAX)
app.post('/forum/threads/:id/comments/:commentId', requireLogin, async (req, res) => {
  try {
    const threads = await readForum();
    const threadIndex = threads.findIndex(t => t.id == req.params.id);

    if (threadIndex === -1) {
      return res.status(404).json({ error: 'Thread not found' });
    }

    if (!threads[threadIndex].comments) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    const commentIndex = threads[threadIndex].comments.findIndex(c => c.id == req.params.commentId);
    if (commentIndex === -1) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    // Check if user is comment author
    const comment = threads[threadIndex].comments[commentIndex];
    if (comment.userId !== req.session.user.id) {
      return res.status(403).json({ error: 'You can only delete your own comments' });
    }

    threads[threadIndex].comments.splice(commentIndex, 1);
    await writeForum(threads);

    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting comment:', err);
    res.status(500).json({ error: 'Error deleting comment' });
  }
});

// Delete thread (AJAX)
app.post('/forum/threads/:id/delete', requireLogin, async (req, res) => {
  try {
    let threads = await readForum();
    const threadIndex = threads.findIndex(t => t.id == req.params.id);

    if (threadIndex === -1) {
      return res.status(404).json({ error: 'Thread not found' });
    }

    // Check if user is thread author
    if (threads[threadIndex].userId !== req.session.user.id) {
      return res.status(403).json({ error: 'You can only delete your own threads' });
    }

    threads.splice(threadIndex, 1);
    await writeForum(threads);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting thread:', err);
    res.status(500).json({ error: 'Error deleting thread' });
  }
});

// --- SHOP (Home) ---
app.get('/', (req, res) => res.redirect('/shop'));

app.get('/shop', (req, res) => {
    let filteredProducts = [...products]; // Create a copy of products to modify

    // 1. Filter by Color
    if (req.query.color) {
        filteredProducts = filteredProducts.filter(p => p.color === req.query.color);
    }

    // 2. Filter by Size
    if (req.query.size) {
        const selectedSize = parseInt(req.query.size);
        // Checks if the product's size array includes the number
        filteredProducts = filteredProducts.filter(p => p.sizes.includes(selectedSize));
    }

    // 3. Handle Sorting (Low-High, High-Low, A-Z)
    if (req.query.sort) {
        if (req.query.sort === 'price_low') {
            filteredProducts.sort((a, b) => a.price - b.price);
        } else if (req.query.sort === 'price_high') {
            filteredProducts.sort((a, b) => b.price - a.price);
        } else if (req.query.sort === 'name_asc') {
            filteredProducts.sort((a, b) => a.name.localeCompare(b.name));
        }
    }

    // 4. Handle Price Filter (Slider)
    if (req.query.maxPrice) {
        const maxPrice = parseInt(req.query.maxPrice);
        filteredProducts = filteredProducts.filter(p => p.price <= maxPrice);
    }

    // 5. Render with the filtered list
    res.render('shop', { 
        products: filteredProducts,
        query: req.query // Pass the query back so the frontend remembers the settings
    });
});

// --- CART PAGE ---
app.get('/cart', requireLogin, (req, res) => {
    const userId = req.session.user.id; 
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
app.get('/checkout', requireLogin, (req, res) => {
    const userId = req.session.user.id;
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
/* app.post('/add-to-cart', (req, res) => {
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
}); */
// Global arrays (Make sure these exist at the top of your file)
// const products = [ ... your product list ... ];
// let cartItems = []; 
// let nextCartId = 1;

app.post('/add-to-cart', requireLogin, (req, res) => {
    // 1. Capture all the data from the HTML form
    const productId = parseInt(req.body.productId);
    const quantity = parseInt(req.body.quantity) || 1; // Default to 1 if empty
    const color = req.body.color || 'Default';
    const size = req.body.size || 'Default';

    if (quantity < 1) {
        return res.status(400).json({ success: false, message: "Quantity must be at least 1" });
    }

    // 2. Find the product details from your hardcoded 'products' array
    const productToAdd = products.find(p => p.id === productId);

    if (productToAdd) {
        // 3. Add to the temporary "cartItems" array
        // We push a new object with the specific size/color selected
        cartItems.push({
            id: nextCartId++,           // unique ID for this cart row
            userId: req.session.user.id, // user's session ID
            product: productToAdd,       // save the full product info
            quantity: quantity,          // save the specific quantity
            color: color,                // save the selected color
            size: size                   // save the selected size
        });

        console.log("Current Cart:", cartItems); // Optional: Check your terminal to see it working

        // 4. Send JSON "Success" signal to trigger the SweetAlert popup
        res.json({ success: true, message: "Item added to cart!" });
    } else {
        // 5. Send JSON "Error" signal if product id is wrong
        res.status(404).json({ success: false, message: "Product not found" });
    }
});

// --- REMOVE FROM CART ---
app.post('/remove-from-cart', requireLogin, (req, res) => {
    const cartIdToDelete = parseInt(req.body.cartId);
    cartItems = cartItems.filter(item => item.id !== cartIdToDelete);
    res.redirect('/cart'); 
});

// --- PLACE ORDER ---
app.post('/place-order', requireLogin, (req, res) => {
    const customerName = req.body.fullname || "Customer";
    cartItems = []; // Clear Cart
    res.render('order', { name: customerName });
});

// --- SITE MAP PAGE ---
app.get('/sitemap', (req, res) => {
    res.render('sitemap');
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

// 2) Dynamic creation of data (requires login)
app.post('/api/reviews', requireLogin, async (req, res) => {
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

// 3) Dynamic editing/updating (requires login)
app.put('/api/reviews/:id', requireLogin, async (req, res) => {
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

// forum API routes
app.get('/api/forum', async (req, res) => {
  const threads = await readForum();
  res.json(threads);
});

app.get('/api/forum/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid thread id.' });
  const threads = await readForum();
  const thread = threads.find(t => Number(t.id) === id);
  if (!thread) return res.status(404).json({ error: 'Thread not found.' });
  res.json(thread);
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
