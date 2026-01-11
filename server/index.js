// ====== ENVIRONMENT SETUP ======
require('dotenv').config();

// ====== IMPORTS & APP INIT ======
const express = require('express');
const path = require('path');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const app = express();
const PORT = process.env.PORT || 3000;

// ====== MONGOOSE SETUP ======
const mongoose = require('mongoose');

mongoose.connect('mongodb+srv://s3616599_db_user:sxkBZC4PTrDkjSUI@clusterwebg7.boellnf.mongodb.net/EcommerceStore?appName=ClusterWebG7')
  .then(() => console.log('✅ Connected to MongoDB Atlas'))
  .catch((error) => console.log('❌ MongoDB connection error:', error.message));

// ====== IMPORT MODELS ======
const User = require('./models/User');
const Review = require('./models/Reviews');
const Thread = require('./models/Thread');
const Product = require('./models/Product');
const Cart = require('./models/Cart');
const Order = require('./models/Order');

// ====== SESSION SETUP ======
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

// ====== EMAIL CONFIGURATION ======
const createEmailTransporter = () => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('⚠️  Email configuration not found. Password reset emails will not be sent.');
    return null;
  }

  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

let emailTransporter = createEmailTransporter();

async function sendPasswordResetEmail(userEmail, userName, resetToken) {
  if (!emailTransporter) {
    console.log('📧 Email transporter not configured. Reset token:', resetToken);
    return { success: false, error: 'Email service not configured' };
  }

  const appUrl = process.env.APP_URL || `http://localhost:${PORT}`;
  const resetLink = `${appUrl}/reset_password?token=${resetToken}`;

  const mailOptions = {
    from: `"Ecommerce Store" <${process.env.EMAIL_USER}>`,
    to: userEmail,
    subject: 'Password Reset Request - Ecommerce Store',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
        <table role="presentation" style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 40px 0; text-align: center; background-color: #f4f4f4;">
              <table role="presentation" style="width: 100%; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                <tr>
                  <td style="padding: 40px 40px 20px; text-align: center; background-color: #212529;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px;">🛒 Ecommerce Store</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 40px;">
                    <h2 style="margin: 0 0 20px; color: #333333; font-size: 24px;">Password Reset Request</h2>
                    <p style="margin: 0 0 15px; color: #666666; font-size: 16px; line-height: 1.6;">
                      Hello <strong>${userName || 'there'}</strong>,
                    </p>
                    <p style="margin: 0 0 25px; color: #666666; font-size: 16px; line-height: 1.6;">
                      We received a request to reset your password. Click the button below to create a new password:
                    </p>
                    <table role="presentation" style="margin: 30px auto;">
                      <tr>
                        <td style="border-radius: 4px; background-color: #212529;">
                          <a href="${resetLink}" target="_blank" style="display: inline-block; padding: 16px 36px; font-size: 16px; color: #ffffff; text-decoration: none; font-weight: bold;">
                            Reset My Password
                          </a>
                        </td>
                      </tr>
                    </table>
                    <p style="margin: 25px 0 15px; color: #666666; font-size: 14px; line-height: 1.6;">
                      Or copy and paste this link into your browser:
                    </p>
                    <p style="margin: 0 0 25px; padding: 15px; background-color: #f8f9fa; border-radius: 4px; word-break: break-all;">
                      <a href="${resetLink}" style="color: #007bff; text-decoration: none; font-size: 14px;">${resetLink}</a>
                    </p>
                    <p style="margin: 0 0 15px; color: #666666; font-size: 14px; line-height: 1.6;">
                      <strong>This link will expire in 1 hour.</strong>
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 30px 40px; text-align: center; background-color: #f8f9fa; border-top: 1px solid #eeeeee;">
                    <p style="margin: 0; color: #999999; font-size: 12px;">
                      © 2025 Ecommerce Store. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
    text: `Password Reset Request\n\nHello ${userName || 'there'},\n\nClick the link below to reset your password:\n${resetLink}\n\nThis link will expire in 1 hour.`
  };

  try {
    const info = await emailTransporter.sendMail(mailOptions);
    console.log('✅ Password reset email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending password reset email:', error);
    return { success: false, error: error.message };
  }
}

async function verifyEmailConfiguration() {
  if (!emailTransporter) return false;
  try {
    await emailTransporter.verify();
    console.log('✅ Email server is ready to send messages');
    return true;
  } catch (error) {
    console.error('❌ Email configuration error:', error.message);
    return false;
  }
}

verifyEmailConfiguration();

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
async function hashPassword(password) {
  return await bcrypt.hash(password, 10);
}

async function comparePassword(password, hash) {
  return await bcrypt.compare(password, hash);
}

function generateResetToken() {
  return crypto.randomBytes(32).toString('hex');
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
  const size = typeof body.size === 'string' ? body.size.trim() : '';
  const thumbnail = typeof body.thumbnail === 'string' ? body.thumbnail.trim() : '';
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
  if (!partial || 'size' in body) {
    if (!size) errors.push('Please pick a size');
  }

  const normalized = {
    title,
    content: mergedContent,
    summary: (mergedContent || '').slice(0, 140),
    name,
    date,
    rating: Number.isFinite(rating) ? rating : undefined,
    size
  };

  if (thumbnail) normalized.thumbnail = thumbnail;

  return { ok: errors.length === 0, errors, normalized };
}

// ====== REVIEW TRANSFORMATION HELPER ======
// Maps MongoDB schema fields to frontend expected fields
function transformReviewForFrontend(r) {
  return {
    id: r._id.toString(),
    title: r.title,
    rating: r.rating,
    size: r.size,
    name: r.name || 'Anonymous',
    date: r.createdAt || new Date(),
    content: r.body,
    summary: (r.body || '').slice(0, 140),
    thumbnail: r.images?.[0] || '',
    userId: r.userId?.toString()
  };
}

// ====== AUTHENTICATION MIDDLEWARE ======
function requireLogin(req, res, next) {
  if (!req.session.user) {
    req.session.returnTo = req.originalUrl;
    return res.redirect('/login');
  }
  next();
}

function requireLoginApi(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Authentication required.' });
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
async function checkUserLocked(req, res, next) {
  if (!req.session.user) {
    return next();
  }

  try {
    const user = await User.findById(req.session.user.id);

    if (user && user.locked) {
      req.session.destroy((err) => {
        if (err) console.error('Session destroy error:', err);
      });
      return res.status(403).render('error', {
        message: 'Account Locked',
        error: 'Your account has been locked by an administrator. Please contact support for assistance.'
      });
    }
    next();
  } catch (err) {
    console.error('Error checking user lock status:', err);
    next();
  }
}

app.use(checkUserLocked);

// ====== PAGE ROUTES ======

app.get('/test', (req, res) => {
  res.render('test');
});

async function renderProductPage(req, res) {
  try {
    const requestedId = req.params.id || req.query.id;

    let productDoc = null;
    if (requestedId && mongoose.Types.ObjectId.isValid(requestedId)) {
      productDoc = await Product.findById(requestedId).lean();
    }
    if (!productDoc) {
      productDoc = await Product.findOne({}).lean();
    }
    if (!productDoc) {
      return res.status(404).render('error', {
        message: 'Product Not Found',
        error: 'No products exist in the database.'
      });
    }

    const productId = productDoc._id.toString();
    const reviews = await Review.find({ productId: productDoc._id }).sort({ createdAt: -1 }).lean();
    const transformedReviews = reviews.map(transformReviewForFrontend);

    const reviewCount = reviews.length;
    const avgRating = reviewCount
      ? Math.round((reviews.reduce((sum, r) => sum + (Number(r.rating) || 0), 0) / reviewCount) * 10) / 10
      : 0;

    const related = await Product.find({ _id: { $ne: productDoc._id } }).limit(3).lean();
    const relatedProducts = related.map(p => ({
      id: p._id.toString(),
      name: p.name,
      price: p.pricing?.price || 0,
      oldPrice: p.pricing?.oldPrice,
      image: p.images?.[0] || '/img/placeholder.png'
    }));

    res.render('product_page', {
      product: {
        id: productId,
        name: productDoc.name,
        description: productDoc.description || '',
        price: productDoc.pricing?.price || 0,
        oldPrice: productDoc.pricing?.oldPrice,
        images: productDoc.images || [],
        sizes: productDoc.sizes || [39, 40, 41, 42]
      },
      reviews: transformedReviews,
      avgRating,
      reviewCount,
      relatedProducts,
      user: req.session.user
    });
  } catch (err) {
    console.error('Error rendering product page:', err);
    return res.status(500).render('error', {
      message: 'Server Error',
      error: 'Unable to load product page.'
    });
  }
}

app.get('/product', renderProductPage);
app.get('/product/:id', renderProductPage);

// ====== REGISTER ROUTES ======
app.get('/register', (req, res) => {
  res.render('register', { user: req.session.user });
});

app.post('/register', async (req, res) => {
  try {
    const { username, email, password, confirmPassword, fullname, description } = req.body;
    const errors = [];

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
    const existingUser = await User.findOne({
      $or: [{ username }, { email }]
    });

    if (existingUser) {
      errors.push('Username or email already exists');
    }

    if (errors.length > 0) {
      return res.render('register', { errors, formData: { username, email, fullname, description } });
    }

    const hashedPassword = await hashPassword(password);
    const newUser = new User({
      username: username.trim(),
      email: email.trim(),
      password: hashedPassword,
      fullname: fullname.trim(),
      description: description ? description.trim() : '',
      profilePicture: 'https://via.placeholder.com/150',
      role: 'user',
      locked: false
    });

    await newUser.save();

    req.session.user = {
      id: newUser._id.toString(),
      username: newUser.username,
      email: newUser.email,
      fullname: newUser.fullname,
      role: newUser.role
    };

    res.redirect('/shop');
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).render('register', { errors: ['An error occurred during registration'] });
  }
});

// ====== LOGIN ROUTES ======
app.get('/login', (req, res) => {
  res.render('login');
});

app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const errors = [];

    if (!username) errors.push('Username is required');
    if (!password) errors.push('Password is required');

    if (errors.length > 0) {
      return res.render('login', { errors });
    }

    const user = await User.findOne({ username });

    if (!user) {
      return res.render('login', { errors: ['Invalid username or password'] });
    }

    if (user.locked) {
      return res.render('login', { errors: ['Your account has been locked. Please contact support for assistance.'] });
    }

    const passwordMatch = await comparePassword(password, user.password);
    if (!passwordMatch) {
      return res.render('login', { errors: ['Invalid username or password'] });
    }

    req.session.user = {
      id: user._id.toString(),
      username: user.username,
      email: user.email,
      fullname: user.fullname,
      role: user.role
    };

    const redirectTo = req.session.returnTo || '/shop';
    delete req.session.returnTo;

    res.redirect(redirectTo);
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).render('login', { errors: ['An error occurred during login'] });
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).send('Error logging out');
    }
    res.redirect('/shop');
  });
});

// ====== FORGOT PASSWORD ROUTES ======
app.get('/forgot_password', (req, res) => {
  res.render('forgot_password', { errors: null, message: null });
});

app.post('/forgot_password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !email.trim()) {
      return res.render('forgot_password', {
        errors: ['Email address is required'],
        message: null
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.render('forgot_password', {
        errors: ['Please enter a valid email address'],
        message: null
      });
    }

    const user = await User.findOne({ email: email.trim() });

    if (!user) {
      return res.render('forgot_password', {
        errors: null,
        message: 'If an account exists with that email address, you will receive a password reset link shortly.'
      });
    }

    if (user.locked) {
      return res.render('forgot_password', {
        errors: ['This account has been locked. Please contact support for assistance.'],
        message: null
      });
    }

    const resetToken = generateResetToken();
    const resetTokenExpiry = Date.now() + 3600000; // 1 hour

    user.resetToken = resetToken;
    user.resetTokenExpiry = resetTokenExpiry;
    await user.save();

    const emailResult = await sendPasswordResetEmail(
      user.email,
      user.fullname || user.username,
      resetToken
    );

    if (emailResult.success) {
      return res.render('forgot_password', {
        errors: null,
        message: 'A password reset link has been sent to your email address.'
      });
    } else {
      if (emailResult.error === 'Email service not configured') {
        return res.render('forgot_password', {
          errors: ['Email service is not configured. Please contact the administrator or use this token manually: ' + resetToken],
          message: null
        });
      }

      return res.render('forgot_password', {
        errors: ['Unable to send reset email. Please try again later.'],
        message: null
      });
    }
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).render('forgot_password', {
      errors: ['An unexpected error occurred. Please try again later.'],
      message: null
    });
  }
});

// ====== RESET PASSWORD ROUTES ======
app.get('/reset_password', (req, res) => {
  const { token } = req.query;
  res.render('reset_password', { token: token || '', errors: null, message: null });
});

app.post('/reset_password', async (req, res) => {
  try {
    const { token, password, confirmPassword } = req.body;
    const errors = [];

    if (!token || !token.trim()) {
      errors.push('Reset token is required');
    }
    if (!password) {
      errors.push('Password is required');
    }
    if (password && password.length < 6) {
      errors.push('Password must be at least 6 characters');
    }
    if (password !== confirmPassword) {
      errors.push('Passwords do not match');
    }

    if (errors.length > 0) {
      return res.render('reset_password', { errors, token, message: null });
    }

    const user = await User.findOne({
      resetToken: token.trim(),
      resetTokenExpiry: { $gt: Date.now() }
    });

    if (!user) {
      return res.render('reset_password', {
        errors: ['Invalid or expired reset token. Please request a new password reset.'],
        token,
        message: null
      });
    }

    if (user.locked) {
      return res.render('reset_password', {
        errors: ['This account has been locked. Please contact support for assistance.'],
        token,
        message: null
      });
    }

    user.password = await hashPassword(password);
    user.resetToken = null;
    user.resetTokenExpiry = null;
    await user.save();

    res.render('reset_password', {
      errors: null,
      token: '',
      message: 'Your password has been reset successfully! You can now login with your new password.',
      redirectUrl: '/login'
    });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).render('reset_password', {
      errors: ['An unexpected error occurred. Please try again.'],
      token: req.body.token || '',
      message: null
    });
  }
});

app.get('/reset_password.html', (req, res) => {
  res.redirect(301, '/reset_password');
});

// ====== USER PROFILE ROUTES ======
app.get('/account', requireLogin, (req, res) => {
  res.redirect('/profile');
});

app.get('/profile', requireLogin, async (req, res) => {
  try {
    const user = await User.findById(req.session.user.id).lean();

    if (!user) {
      return res.status(404).send('User not found');
    }

    res.render('profile', { user: { ...user, id: user._id.toString() } });
  } catch (err) {
    console.error('Profile view error:', err);
    res.status(500).send('Error loading profile');
  }
});

app.get('/profile/edit', requireLogin, async (req, res) => {
  try {
    const user = await User.findById(req.session.user.id).lean();

    if (!user) {
      return res.status(404).send('User not found');
    }

    res.render('profile_edit', { user: { ...user, id: user._id.toString() } });
  } catch (err) {
    console.error('Profile edit page error:', err);
    res.status(500).send('Error loading profile edit page');
  }
});

app.post('/profile/edit', requireLogin, async (req, res) => {
  try {
    const { fullname, email, description, profilePicture } = req.body;
    const errors = [];

    if (!fullname || fullname.trim().length < 2) {
      errors.push('Full name must be at least 2 characters');
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push('Please enter a valid email address');
    }
    if (description && description.length > 200) {
      errors.push('Description must be less than 200 characters');
    }

    const emailExists = await User.findOne({
      email,
      _id: { $ne: req.session.user.id }
    });

    if (emailExists) {
      errors.push('This email is already in use');
    }

    const user = await User.findById(req.session.user.id);

    if (errors.length > 0) {
      return res.render('profile_edit', { user: { ...user.toObject(), id: user._id.toString() }, errors });
    }

    user.fullname = fullname.trim();
    user.email = email.trim();
    user.description = description ? description.trim() : '';
    user.profilePicture = profilePicture ? profilePicture.trim() : 'https://via.placeholder.com/150';
    await user.save();

    req.session.user.fullname = user.fullname;
    req.session.user.email = user.email;

    res.render('profile_edit', { user: { ...user.toObject(), id: user._id.toString() }, message: 'Profile updated successfully!' });
  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).send('Error updating profile');
  }
});

app.get('/profile/change-password', requireLogin, (req, res) => {
  res.render('change_password', { user: req.session.user });
});

app.post('/profile/change-password', requireLogin, async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    const errors = [];

    if (!currentPassword) errors.push('Current password is required');
    if (!newPassword) errors.push('New password is required');
    if (newPassword && newPassword.length < 6) errors.push('New password must be at least 6 characters');
    if (newPassword !== confirmPassword) errors.push('Passwords do not match');

    if (errors.length > 0) {
      return res.render('change_password', { user: req.session.user, errors });
    }

    const user = await User.findById(req.session.user.id);

    const passwordMatch = await comparePassword(currentPassword, user.password);
    if (!passwordMatch) {
      return res.render('change_password', { user: req.session.user, errors: ['Current password is incorrect'] });
    }

    user.password = await hashPassword(newPassword);
    await user.save();

    res.render('change_password', { user: req.session.user, message: 'Password changed successfully!' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).render('change_password', { user: req.session.user, errors: ['An error occurred'] });
  }
});

app.get('/profile/delete-account', requireLogin, (req, res) => {
  res.render('delete_account', { user: req.session.user });
});

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

    const user = await User.findById(req.session.user.id);

    const passwordMatch = await comparePassword(password, user.password);
    if (!passwordMatch) {
      return res.render('delete_account', { user: req.session.user, errors: ['Invalid password'] });
    }

    await User.findByIdAndDelete(req.session.user.id);

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
app.get('/admin', requireAdmin, async (req, res) => {
  try {
    const users = await User.find().select('-password').lean();
    const threads = await Thread.find().lean();

    // Transform MongoDB _id to id
    const transformedUsers = users.map(u => ({ ...u, id: u._id.toString() }));
    const transformedThreads = threads.map(t => ({ ...t, id: t._id.toString() }));

    res.render('admin', {
      users: transformedUsers,
      blogs: [], // Blogs not implemented with MongoDB
      threads: transformedThreads,
      user: req.session.user
    });
  } catch (err) {
    console.error('Admin dashboard error:', err);
    res.status(500).send('Error loading admin dashboard');
  }
});

app.post('/admin/users/:id/toggle-lock', requireAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (userId === req.session.user.id) {
      return res.status(400).json({ error: 'Cannot lock your own account' });
    }

    user.locked = !user.locked;
    await user.save();

    res.json({ success: true, locked: user.locked });
  } catch (err) {
    console.error('Toggle lock error:', err);
    res.status(500).json({ error: 'An error occurred' });
  }
});

app.post('/admin/users/:id/delete', requireAdmin, async (req, res) => {
  try {
    const userId = req.params.id;

    if (userId === req.session.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const result = await User.findByIdAndDelete(userId);

    if (!result) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ error: 'An error occurred' });
  }
});

app.post('/admin/users/:id/role', requireAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    const { role } = req.body;

    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    if (userId === req.session.user.id) {
      return res.status(400).json({ error: 'Cannot change your own role' });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.role = role;
    await user.save();

    res.json({ success: true, role: user.role });
  } catch (err) {
    console.error('Change role error:', err);
    res.status(500).json({ error: 'An error occurred' });
  }
});

// ====== FORUM ROUTES ======
app.get('/forum', requireLogin, async (req, res) => {
  try {
    let query = {};
    if (req.session.user.role !== 'admin') {
      query.archived = { $ne: true };
    }

    const threads = await Thread.find(query).sort({ createdAt: -1 }).lean();

    const transformedThreads = threads.map(t => ({
      ...t,
      id: t._id.toString(),
      created: t.createdAt,
      userId: t.userId?.toString(),
      comments: t.comments?.map(c => ({
        ...c,
        id: c._id.toString(),
        userId: c.userId?.toString(),
        created: c.createdAt
      }))
    }));

    res.render('forum', { threads: transformedThreads, user: req.session.user });
  } catch (err) {
    console.error('Error loading forum:', err);
    res.status(500).send('Error loading forum');
  }
});

app.post('/forum/threads', requireLogin, async (req, res) => {
  try {
    let tags = [];
    if (req.body.tags) {
      tags = req.body.tags.split(',').map(t => t.trim()).filter(t => t.length > 0);
    }

    if (!req.body.title || req.body.title.trim().length < 10) {
      return res.status(400).json({ error: 'Title must be at least 10 characters' });
    }
    if (!req.body.body || req.body.body.trim().length < 20) {
      return res.status(400).json({ error: 'Message must be at least 20 characters' });
    }

    const newThread = new Thread({
      title: req.body.title,
      author: req.session.user.fullname || req.session.user.username,
      meta: `By ${req.session.user.fullname || req.session.user.username} • Community`,
      tags: tags,
      excerpt: req.body.body.substring(0, 100),
      body: req.body.body,
      image: req.body.image || 'img/placeholder.png',
      userId: new mongoose.Types.ObjectId(req.session.user.id),
      archived: false,
      comments: []
    });

    await newThread.save();

    res.json({
      thread: {
        ...newThread.toObject(),
        id: newThread._id.toString(),
        created: newThread.createdAt
      }
    });
  } catch (err) {
    console.error('Error creating thread:', err);
    res.status(500).json({ error: 'Error creating thread' });
  }
});

app.get('/forum/threads/:id', requireLogin, async (req, res) => {
  try {
    const thread = await Thread.findById(req.params.id).lean();

    if (!thread) {
      return res.status(404).send('Thread not found');
    }

    if (thread.archived && req.session.user.role !== 'admin') {
      return res.status(404).send('Thread not found');
    }

    const transformedThread = {
      ...thread,
      id: thread._id.toString(),
      created: thread.createdAt,
      userId: thread.userId?.toString(),
      comments: thread.comments?.map(c => ({
        ...c,
        id: c._id.toString(),
        userId: c.userId?.toString(),
        created: c.createdAt
      }))
    };

    res.render('forum_thread', { thread: transformedThread, user: req.session.user });
  } catch (err) {
    console.error('Error loading thread:', err);
    res.status(500).send('Error loading thread');
  }
});

app.post('/forum/threads/:id', requireLogin, async (req, res) => {
  try {
    const thread = await Thread.findById(req.params.id);

    if (!thread) {
      return res.status(404).json({ error: 'Thread not found' });
    }

    if (thread.archived) {
      return res.status(403).json({ error: 'Cannot edit archived thread' });
    }

    // Allow admin to edit any thread, or user to edit their own
    const isAdmin = req.session.user.role === 'admin';
    const isOwner = thread.userId && thread.userId.toString() === req.session.user.id;
    
    if (!isAdmin && !isOwner) {
      return res.status(403).json({ error: 'You can only edit your own threads' });
    }

    if (!req.body.title || req.body.title.trim().length < 10) {
      return res.status(400).json({ error: 'Title must be at least 10 characters' });
    }
    if (!req.body.body || req.body.body.trim().length < 20) {
      return res.status(400).json({ error: 'Message must be at least 20 characters' });
    }

    let tags = [];
    if (req.body.tags) {
      tags = req.body.tags.split(',').map(t => t.trim()).filter(t => t.length > 0);
    }

    thread.title = req.body.title;
    thread.body = req.body.body;
    thread.excerpt = req.body.body.substring(0, 100);
    thread.tags = tags;
    if (req.body.image && req.body.image !== 'img/placeholder.png') {
      thread.image = req.body.image;
    }

    await thread.save();

    res.json({
      thread: {
        ...thread.toObject(),
        id: thread._id.toString(),
        created: thread.createdAt
      }
    });
  } catch (err) {
    console.error('Error updating thread:', err);
    res.status(500).json({ error: 'Error updating thread' });
  }
});

app.post('/forum/threads/:id/comments', requireLogin, async (req, res) => {
  try {
    const thread = await Thread.findById(req.params.id);

    if (!thread) {
      return res.status(404).json({ error: 'Thread not found' });
    }

    if (thread.archived) {
      return res.status(403).json({ error: 'Cannot comment on archived thread' });
    }

    if (!req.body.text || req.body.text.trim().length === 0) {
      return res.status(400).json({ error: 'Comment cannot be empty' });
    }

    const newComment = {
      author: req.session.user.fullname || req.session.user.username,
      text: req.body.text,
      userId: new mongoose.Types.ObjectId(req.session.user.id),
      archived: false
    };

    thread.comments.push(newComment);
    await thread.save();

    const addedComment = thread.comments[thread.comments.length - 1];

    res.json({
      comment: {
        ...addedComment.toObject(),
        id: addedComment._id.toString(),
        created: addedComment.createdAt
      }
    });
  } catch (err) {
    console.error('Error adding comment:', err);
    res.status(500).json({ error: 'Error adding comment' });
  }
});

app.post('/forum/threads/:id/comments/:commentId', requireLogin, async (req, res) => {
  try {
    const thread = await Thread.findById(req.params.id);

    if (!thread) {
      return res.status(404).json({ error: 'Thread not found' });
    }

    const comment = thread.comments.id(req.params.commentId);

    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    // Allow admin to delete any comment, or user to delete their own
    const isAdmin = req.session.user.role === 'admin';
    const isOwner = comment.userId && comment.userId.toString() === req.session.user.id;
    
    if (!isAdmin && !isOwner) {
      return res.status(403).json({ error: 'You can only delete your own comments' });
    }

    comment.deleteOne();
    await thread.save();

    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting comment:', err);
    res.status(500).json({ error: 'Error deleting comment' });
  }
});

app.post('/forum/threads/:id/delete', requireLogin, async (req, res) => {
  try {
    console.log('Delete request for thread:', req.params.id);
    console.log('Session user:', req.session.user);
    
    const thread = await Thread.findById(req.params.id);

    if (!thread) {
      console.log('Thread not found');
      return res.status(404).json({ error: 'Thread not found' });
    }

    console.log('Thread userId:', thread.userId);
    console.log('Thread author:', thread.author);

    // Allow admin to delete any thread
    const isAdmin = req.session.user.role === 'admin';
    
    // Check ownership - compare as strings
    const threadUserId = thread.userId ? thread.userId.toString() : null;
    const sessionUserId = req.session.user.id;
    const isOwner = threadUserId === sessionUserId;
    
    // Also allow if author name matches (fallback for old data)
    const authorMatches = thread.author === req.session.user.fullname || 
                          thread.author === req.session.user.username;
    
    console.log('isAdmin:', isAdmin, 'isOwner:', isOwner, 'authorMatches:', authorMatches);
    
    if (!isAdmin && !isOwner && !authorMatches) {
      return res.status(403).json({ error: 'You can only delete your own threads' });
    }

    await Thread.findByIdAndDelete(req.params.id);
    console.log('Thread deleted successfully');

    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting thread:', err);
    res.status(500).json({ error: 'Error deleting thread' });
  }
});

// Admin forum routes
app.post('/admin/forum/:id/archive', requireAdmin, async (req, res) => {
  try {
    const thread = await Thread.findById(req.params.id);

    if (!thread) {
      return res.status(404).json({ error: 'Thread not found' });
    }

    thread.archived = !thread.archived;
    thread.archivedAt = thread.archived ? new Date() : null;
    thread.archivedBy = thread.archived ? req.session.user.id : null;

    await thread.save();

    res.json({
      success: true,
      archived: thread.archived,
      message: thread.archived ? 'Thread archived successfully' : 'Thread unarchived successfully'
    });
  } catch (err) {
    console.error('Archive thread error:', err);
    res.status(500).json({ error: 'An error occurred' });
  }
});

app.post('/admin/forum/:threadId/posts/:postId/archive', requireAdmin, async (req, res) => {
  try {
    const thread = await Thread.findById(req.params.threadId);

    if (!thread) {
      return res.status(404).json({ error: 'Thread not found' });
    }

    const comment = thread.comments.id(req.params.postId);

    if (!comment) {
      return res.status(404).json({ error: 'Post not found' });
    }

    comment.archived = !comment.archived;
    comment.archivedAt = comment.archived ? new Date() : null;
    comment.archivedBy = comment.archived ? req.session.user.id : null;

    await thread.save();

    res.json({
      success: true,
      archived: comment.archived,
      message: comment.archived ? 'Post archived successfully' : 'Post unarchived successfully'
    });
  } catch (err) {
    console.error('Archive post error:', err);
    res.status(500).json({ error: 'An error occurred' });
  }
});

app.post('/admin/forum/:id/delete', requireAdmin, async (req, res) => {
  try {
    const result = await Thread.findByIdAndDelete(req.params.id);

    if (!result) {
      return res.status(404).json({ error: 'Thread not found' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Delete thread error:', err);
    res.status(500).json({ error: 'An error occurred' });
  }
});

// ====== SHOP ROUTES ======
app.get('/', (req, res) => res.redirect('/shop'));

app.get('/shop', async (req, res) => {
  try {
    let query = {};
    let sort = {};

    // Filter by color
    if (req.query.color) {
      query.color = req.query.color;
    }

    // Filter by size
    if (req.query.size) {
      query.sizes = parseInt(req.query.size);
    }

    // Filter by max price
    if (req.query.maxPrice) {
      query['pricing.price'] = { $lte: parseInt(req.query.maxPrice) };
    }

    // Sorting
    if (req.query.sort === 'price_low') {
      sort = { 'pricing.price': 1 };
    } else if (req.query.sort === 'price_high') {
      sort = { 'pricing.price': -1 };
    } else if (req.query.sort === 'name_asc') {
      sort = { name: 1 };
    }

    const products = await Product.find(query).sort(sort).lean();

    // Transform for frontend compatibility
    const transformedProducts = products.map(p => ({
      id: p._id.toString(),
      name: p.name,
      price: p.pricing?.price || 0,
      image: p.images?.[0] || '/img/placeholder.png',
      stock: 'In Stock',
      color: p.color || 'black',
      sizes: p.sizes || [39, 40, 41, 42]
    }));

    res.render('shop', {
      products: transformedProducts,
      query: req.query
    });
  } catch (err) {
    console.error('Error loading shop:', err);
    res.render('shop', { products: [], query: req.query });
  }
});

// ====== CART ROUTES ======
app.get('/cart', requireLogin, async (req, res) => {
  try {
    let cart = await Cart.findOne({ user: req.session.user.id });

    if (!cart) {
      cart = { items: [], pricing: { subtotal: 0, tax: 0, total: 0 } };
    }

    const cartItems = cart.items.map(item => ({
      id: item._id.toString(),
      product: {
        name: item.name,
        price: item.price,
        image: item.image
      },
      quantity: item.quantity,
      size: item.size,
      color: item.color
    }));

    res.render('cart', {
      cartItems,
      subtotal: cart.pricing.subtotal.toFixed(2),
      tax: cart.pricing.tax.toFixed(2),
      total: cart.pricing.total.toFixed(2)
    });
  } catch (err) {
    console.error('Error loading cart:', err);
    res.render('cart', {
      cartItems: [],
      subtotal: '0.00',
      tax: '0.00',
      total: '0.00'
    });
  }
});

app.get('/checkout', requireLogin, async (req, res) => {
  try {
    let cart = await Cart.findOne({ user: req.session.user.id });

    if (!cart) {
      cart = { items: [], pricing: { subtotal: 0, tax: 0, total: 0 } };
    }

    const cartItems = cart.items.map(item => ({
      id: item._id.toString(),
      product: {
        name: item.name,
        price: item.price,
        image: item.image
      },
      quantity: item.quantity,
      size: item.size,
      color: item.color
    }));

    res.render('checkout', {
      cartItems,
      subtotal: cart.pricing.subtotal.toFixed(2),
      tax: cart.pricing.tax.toFixed(2),
      total: cart.pricing.total.toFixed(2)
    });
  } catch (err) {
    console.error('Error loading checkout:', err);
    res.render('checkout', {
      cartItems: [],
      subtotal: '0.00',
      tax: '0.00',
      total: '0.00'
    });
  }
});

app.post('/add-to-cart', requireLogin, async (req, res) => {
  try {
    const productId = req.body.productId;
    const quantity = parseInt(req.body.quantity) || 1;
    const color = req.body.color || 'Default';
    const size = parseInt(req.body.size) || 40;

    if (quantity < 1) {
      return res.status(400).json({ success: false, message: "Quantity must be at least 1" });
    }

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    let cart = await Cart.findOne({ user: req.session.user.id });

    if (!cart) {
      cart = new Cart({
        user: req.session.user.id,
        items: [],
        pricing: { subtotal: 0, tax: 0, total: 0 }
      });
    }

    // Check if item already exists in cart
    const existingItemIndex = cart.items.findIndex(
      item => item.product.toString() === productId && item.size === size && item.color === color
    );

    if (existingItemIndex > -1) {
      cart.items[existingItemIndex].quantity += quantity;
    } else {
      cart.items.push({
        product: productId,
        name: product.name,
        image: product.images?.[0] || '/img/placeholder.png',
        price: product.pricing?.price || 0,
        quantity,
        size,
        color
      });
    }

    // Recalculate pricing
    const subtotal = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const tax = subtotal * 0.10;
    cart.pricing = {
      subtotal,
      tax,
      total: subtotal + tax
    };

    await cart.save();

    res.json({ success: true, message: "Item added to cart!" });
  } catch (err) {
    console.error('Error adding to cart:', err);
    res.status(500).json({ success: false, message: "Error adding to cart" });
  }
});

app.post('/remove-from-cart', requireLogin, async (req, res) => {
  try {
    const cartItemId = req.body.cartId;

    const cart = await Cart.findOne({ user: req.session.user.id });

    if (cart) {
      cart.items = cart.items.filter(item => item._id.toString() !== cartItemId);

      // Recalculate pricing
      const subtotal = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const tax = subtotal * 0.10;
      cart.pricing = {
        subtotal,
        tax,
        total: subtotal + tax
      };

      await cart.save();
    }

    res.redirect('/cart');
  } catch (err) {
    console.error('Error removing from cart:', err);
    res.redirect('/cart');
  }
});

app.post('/place-order', requireLogin, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.session.user.id });

    if (cart && cart.items.length > 0) {
      // Create order
      const order = new Order({
        user: req.session.user.id,
        items: cart.items,
        pricing: cart.pricing,
        shipping: {
          firstName: req.body.firstName || '',
          lastName: req.body.lastName || '',
          email: req.body.email || '',
          phone: req.body.phone || '',
          address: req.body.address || '',
          city: req.body.city || '',
          state: req.body.state || '',
          zipCode: req.body.zip || ''
        },
        payment: {
          status: 'Paid',
          method: 'Credit Card'
        }
      });

      await order.save();

      // Clear cart
      cart.items = [];
      cart.pricing = { subtotal: 0, tax: 0, total: 0 };
      await cart.save();
    }

    const customerName = req.body.fullname || req.body.firstName || "Customer";
    res.render('order', { name: customerName });
  } catch (err) {
    console.error('Error placing order:', err);
    res.render('order', { name: "Customer" });
  }
});

// ====== SITEMAP ======
app.get('/sitemap', (req, res) => {
  res.render('sitemap');
});

// ====== API ROUTES ======
console.log('[server] Registering /api/reviews routes (GET/POST/PUT/DELETE)');

app.get('/api/reviews', async (req, res) => {
  try {
    const query = {};
    if (req.query.productId && mongoose.Types.ObjectId.isValid(req.query.productId)) {
      query.productId = req.query.productId;
    }

    const reviews = await Review.find(query).lean();
    // Transform MongoDB fields to frontend expected fields
    const transformed = reviews.map(transformReviewForFrontend);
    res.json(transformed);
  } catch (err) {
    console.error('Error fetching reviews:', err);
    res.json([]);
  }
});

app.get('/api/reviews/:id', async (req, res) => {
  try {
    const review = await Review.findById(req.params.id).lean();
    if (!review) return res.status(404).json({ error: 'Review not found.' });
    res.json(transformReviewForFrontend(review));
  } catch (err) {
    res.status(400).json({ error: 'Invalid review id.' });
  }
});

app.post('/api/reviews', requireLoginApi, async (req, res) => {
  const { ok, errors, normalized } = validateReviewPayload(req.body, { partial: false });
  if (!ok) return res.status(400).json({ errors });

  try {
    const productId = req.body.productId;
    if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ error: 'Invalid productId.' });
    }

    const exists = await Product.exists({ _id: productId });
    if (!exists) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    const review = new Review({
      productId: productId,
      userId: new mongoose.Types.ObjectId(req.session.user.id),
      rating: normalized.rating,
      title: normalized.title,
      body: normalized.content,
      name: normalized.name || req.session.user.fullname || req.session.user.username || 'Anonymous',
      size: normalized.size,
      images: normalized.thumbnail ? [normalized.thumbnail] : []
    });

    await review.save();

    res.status(201).json(transformReviewForFrontend(review.toObject()));
  } catch (err) {
    console.error('Error creating review:', err);
    res.status(500).json({ error: 'Error creating review' });
  }
});

app.put('/api/reviews/:id', requireLoginApi, async (req, res) => {
  const { ok, errors, normalized } = validateReviewPayload(req.body, { partial: true });
  if (!ok) return res.status(400).json({ errors });

  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ error: 'Review not found.' });

    const isAdmin = req.session.user?.role === 'admin';
    if (!isAdmin && review.userId?.toString() !== req.session.user.id) {
      return res.status(403).json({ error: 'Not allowed to edit this review.' });
    }

    if (normalized.title) review.title = normalized.title;
    if (normalized.content) review.body = normalized.content;
    if (normalized.rating) review.rating = normalized.rating;
    if (normalized.size) review.size = normalized.size;
    if (normalized.name) review.name = normalized.name;
    if (normalized.thumbnail) review.images = [normalized.thumbnail];

    await review.save();

    res.json(transformReviewForFrontend(review.toObject()));
  } catch (err) {
    console.error('Error updating review:', err);
    res.status(500).json({ error: 'Error updating review' });
  }
});

app.delete('/api/reviews/:id', requireLoginApi, async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ error: 'Review not found.' });

    const isAdmin = req.session.user?.role === 'admin';
    if (!isAdmin && review.userId?.toString() !== req.session.user.id) {
      return res.status(403).json({ error: 'Not allowed to delete this review.' });
    }

    await Review.findByIdAndDelete(req.params.id);

    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting review:', err);
    res.status(500).json({ error: 'Error deleting review' });
  }
});

// Forum API
app.get('/api/forum', async (req, res) => {
  try {
    const threads = await Thread.find().lean();
    const transformed = threads.map(t => ({
      ...t,
      id: t._id.toString(),
      created: t.createdAt
    }));
    res.json(transformed);
  } catch (err) {
    res.json([]);
  }
});

app.get('/api/forum/:id', async (req, res) => {
  try {
    const thread = await Thread.findById(req.params.id).lean();
    if (!thread) return res.status(404).json({ error: 'Thread not found.' });
    res.json({
      ...thread,
      id: thread._id.toString(),
      created: thread.createdAt
    });
  } catch (err) {
    res.status(400).json({ error: 'Invalid thread id.' });
  }
});

// ====== ERROR HANDLER ======
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error.' });
});

// ====== START SERVER ======
app.listen(PORT, () => {
  console.log(`🚀 Server is running at http://localhost:${PORT}`);
});
