const express = require('express');
const bcrypt = require('bcrypt');
const mysql = require('mysql');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const multer = require('multer'); // Import multer
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;

const app = express();

app.use(cors({ origin: '*' }));


// app.use(cors({
//   origin: 'http://thedemoapp.online'
// }));

app.use(express.json());

// Set up multer for file uploads
const storage = multer.memoryStorage(); // Store files in memory
const upload = multer({ storage: storage });

const db = mysql.createConnection({
  // host: 'localhost', 
  user: 'root',
  password: 'hamza', 
  database: 'rockhairsaloon' 
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

  // if email already exists
  const queryEmailExists = 'SELECT * FROM users WHERE email = ?';
  db.query(queryEmailExists, [email], async (err, results) => {
    if (results.length > 0) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert new user into the database
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

// Get User Data Endpoint
app.get('/getusers', authenticate, (req, res) => {
  const userId = req.userId;

  const sql = 'SELECT * FROM user_data WHERE user_id = ? ORDER BY id DESC';
  db.query(sql, [userId], (err, data) => {
    if (err) {
      return res.status(500).json({ message: 'Database error' });
    }

    const formattedData = data.map(user => ({
      id: user.id,
      name: user.name,
      age: user.age,
      Death: new Date(user.Death).toISOString().split('T')[0]
    }));

    res.json(formattedData);
  });
});

// Update User Data Endpoint
app.put('/update', authenticate, (req, res) => {
  const id = req.query.id;
  const { name, age, Death } = req.body;

  const sql = 'UPDATE user_data SET name=?, age=?, Death=? WHERE id=? AND user_id=?';
  const values = [name, age, Death, id, req.userId];

  db.query(sql, values, (err, result) => {
    if (err) {
      return res.status(500).json({ message: 'Database error' });
    }
    if (result.affectedRows > 0) {
      res.status(200).json({ message: 'Data updated successfully' });
    } else {
      res.status(404).json({ message: 'Data not found' });
    }
  });
});

// Delete User Data Endpoint
app.delete('/delete', authenticate, (req, res) => {
  const id = req.query.id;

  const sql = 'DELETE FROM user_data WHERE id = ? AND user_id = ?';
  db.query(sql, [id, req.userId], (err, result) => {
    if (err) {
      return res.status(500).json({ message: 'Database error' });
    }
    if (result.affectedRows > 0) {
      res.status(200).json({ message: 'Data deleted successfully' });
    } else {
      res.status(404).json({ message: 'Data not found' });
    }
  });
});

// Image Upload Endpoint
app.post('/upload-image', authenticate, upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No image uploaded' });
  }

  // Here you can save the image to the filesystem or database
  const imageBuffer = req.file.buffer; // Get the image buffer
  // For example, you can save it as a file (optional)
  // const imagePath = `uploads/${req.file.originalname}`;
  // fs.writeFileSync(imagePath, imageBuffer);

  res.status(200).json({ message: 'Image uploaded successfully', image: req.file.originalname });
});

// Start the server
app.listen(8083, () => {
  console.log(`Server is running on port 8083`);
});
