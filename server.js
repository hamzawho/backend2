const express = require('express');
const bcrypt = require('bcrypt');
const mysql = require('mysql');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const multer = require('multer');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;

const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json());

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const db = mysql.createConnection({
  user: 'root',
  password: 'hamza',
  database: 'rockhairsaloon',
});

db.connect((err) => {
  if (err) {
    console.error('Error connecting to database:', err);
    return;
  }
  console.log('Connected to database!');
});

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: '1h' });
};

const authenticate = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token provided' });

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ message: 'Invalid token' });
    req.userId = decoded.id;
    next();
  });
};

// User Signup Endpoint
app.post('/signup', async (req, res) => {
  const { name, email, password } = req.body;

  const queryEmailExists = 'SELECT * FROM users WHERE email = ?';
  db.query(queryEmailExists, [email], async (err, results) => {
    if (results.length > 0) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const query = 'INSERT INTO users (name, email, password) VALUES (?, ?, ?)';
    db.query(query, [name, email, hashedPassword], (err, result) => {
      if (err) {
        return res.status(500).json({ message: 'Database error' });
      }
      res.status(201).json({ message: 'User created successfully' });
    });
  });
});

// User Login Endpoint
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  const query = 'SELECT * FROM users WHERE email = ?';
  db.query(query, [email], async (err, results) => {
    if (results.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = results[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = generateToken(user.id);
    res.json({ token });
  });
});

// Save User Data Endpoint
app.post('/saveuser', authenticate, (req, res) => {
  const { name, age, Death } = req.body;
  const userId = req.userId;

  const sql = 'INSERT INTO user_data (user_id, name, age, Death) VALUES (?, ?, ?, ?)';
  db.query(sql, [userId, name, age, Death], (err, results) => {
    if (err) {
      return res.status(500).json({ message: 'Database error' });
    }
    res.status(200).json({ message: 'Data saved successfully' });
  });
});

// Get User Image Endpoint
app.get('/get-image', authenticate, (req, res) => {
  const userId = req.userId;

  const sql = 'SELECT image FROM user_images WHERE user_id = ?';
  db.query(sql, [userId], (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ message: 'Database error' });
    }

    if (results.length === 0 || !results[0].image) {
      return res.status(404).json({ message: 'No image found for this user' });
    }

    const imageBuffer = results[0].image;
    const base64Image = Buffer.from(imageBuffer).toString('base64');
    res.status(200).json({ image: base64Image });
  });
});

// Image Upload Endpoint
app.post('/upload-image', authenticate, upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No image uploaded' });
  }

  const userId = req.userId;
  const imageBuffer = req.file.buffer;

  const sql = 'INSERT INTO user_images (user_id, image) VALUES (?, ?) ON DUPLICATE KEY UPDATE image = ?';
  db.query(sql, [userId, imageBuffer, imageBuffer], (err, result) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ message: 'Database error' });
    }
    res.status(200).json({ message: 'Image uploaded successfully' });
  });
});

app.listen(8083, () => {
  console.log(`Server is running on port 8083`);
});
