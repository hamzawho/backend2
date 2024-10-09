// const express = require('express');
// const bcrypt = require('bcrypt');
// const mysql = require('mysql');
// const cors = require('cors');
// const jwt = require('jsonwebtoken');
// const multer = require('multer');
// const fs = require('fs');
// const path = require('path');
// require('dotenv').config();

// const JWT_SECRET = process.env.JWT_SECRET;
// const app = express();

// // app.use(cors({ origin: '*' }));
// app.use(cors({
//   origin: 'http://thedemoapp.online'
// }));

// app.use(express.json());

// // Set up the uploads directory
// const UPLOADS_DIR = path.join(__dirname, 'uploads');
// if (!fs.existsSync(UPLOADS_DIR)) {
//   fs.mkdirSync(UPLOADS_DIR);
// }

// // Set up multer for file uploads
// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, UPLOADS_DIR);
//   },
//   filename: (req, file, cb) => {
//     const filename = `${Date.now()}_${file.originalname}`;
//     cb(null, filename);
//   },
// });
// const upload = multer({ storage: storage });

// // MySQL database connection
// const db = mysql.createConnection({
//   user: 'root',
//   password: 'hamza',
//   database: 'rockhairsaloon',
// });

// // Connect to the database
// db.connect((err) => {
//   if (err) {
//     console.error('Error connecting to database:', err);
//     return;
//   }
//   console.log('Connected to database!');
// });

// // Function to generate JWT token
// const generateToken = (userId) => {
//   return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: '1h' });
// };

// // Middleware to authenticate JWT token
// const authenticate = (req, res, next) => {
//   const token = req.headers['authorization']?.split(' ')[1];
//   if (!token) return res.status(401).json({ message: 'No token provided' });

//   jwt.verify(token, JWT_SECRET, (err, decoded) => {
//     if (err) return res.status(401).json({ message: 'Invalid token' });
//     req.userId = decoded.id;
//     next();
//   });
// };

// // User Signup Endpoint
// app.post('/signup', async (req, res) => {
//   const { name, email, password } = req.body;

//   // Check if email already exists
//   const queryEmailExists = 'SELECT * FROM users WHERE email = ?';
//   db.query(queryEmailExists, [email], async (err, results) => {
//     if (results.length > 0) {
//       return res.status(400).json({ message: 'Email already exists' });
//     }

//     const hashedPassword = await bcrypt.hash(password, 10);
//     const query = 'INSERT INTO users (name, email, password) VALUES (?, ?, ?)';
//     db.query(query, [name, email, hashedPassword], (err, result) => {
//       if (err) {
//         return res.status(500).json({ message: 'Database error' });
//       }
//       res.status(201).json({ message: 'User created successfully' });
//     });
//   });
// });

// // User Login Endpoint
// app.post('/login', async (req, res) => {
//   const { email, password } = req.body;

//   const query = 'SELECT * FROM users WHERE email = ?';
//   db.query(query, [email], async (err, results) => {
//     if (results.length === 0) {
//       return res.status(401).json({ message: 'Invalid credentials' });
//     }

//     const user = results[0];
//     const match = await bcrypt.compare(password, user.password);
//     if (!match) {
//       return res.status(401).json({ message: 'Invalid credentials' });
//     }

//     const token = generateToken(user.id);
//     res.json({ token });
//   });
// });

// // Image Upload Endpoint
// app.post('/upload-image', authenticate, upload.single('image'), (req, res) => {
//   if (!req.file) {
//     return res.status(400).json({ message: 'No image uploaded' });
//   }

//   const imagePath = `uploads/${req.file.filename}`;

//   const sql = 'INSERT INTO user_images (user_id, image_path) VALUES (?, ?)';
//   db.query(sql, [req.userId, imagePath], (err) => {
//     if (err) {
//       return res.status(500).json({ message: 'Database error' });
//     }
//     res.status(200).json({ message: 'Image uploaded successfully', image: imagePath });
//   });
// });

// // Get User Images Endpoint
// app.get('/get-images', authenticate, (req, res) => {
//   const userId = req.userId;
//   const sql = 'SELECT * FROM user_images WHERE user_id = ? ORDER BY id DESC';
//   db.query(sql, [userId], (err, data) => {
//     if (err) {
//       return res.status(500).json({ message: 'Database error' });
//     }

//     const formattedImages = data.map(image => ({
//       id: image.id,
//       path: image.image_path,
//     }));

//     res.json(formattedImages);
//   });
// });

// // Delete Image Endpoint
// app.delete('/delete-image/:id', authenticate, (req, res) => {
//   const imageId = req.params.id;

//   // Find the image to delete first to get the file path
//   const findImageQuery = 'SELECT * FROM user_images WHERE id = ? AND user_id = ?';
//   db.query(findImageQuery, [imageId, req.userId], (err, results) => {
//     if (err || results.length === 0) {
//       return res.status(404).json({ message: 'Image not found' });
//     }

//     const imagePath = path.join(__dirname, results[0].image_path);
    
//     // Delete the image file from the server
//     fs.unlink(imagePath, (err) => {
//       if (err) {
//         return res.status(500).json({ message: 'Error deleting image file' });
//       }

//       // Delete 
//       const deleteImageQuery = 'DELETE FROM user_images WHERE id = ?';
//       db.query(deleteImageQuery, [imageId], (err) => {
//         if (err) {
//           return res.status(500).json({ message: 'Database error' });
//         }
//         res.status(200).json({ message: 'Image deleted successfully' });
//       });
//     });
//   });
// });

// // Serve static files from the uploads directory
// app.use('/uploads', express.static(UPLOADS_DIR));

// app.listen(8083, () => {
//   console.log(`Server is running on port 8083`);
// });



const express = require('express');
const bcrypt = require('bcrypt');
const mysql = require('mysql');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const multerS3 = require('multer-s3');
const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;
const app = express();

app.use(cors({
  origin: 'http://thedemoapp.online'
}));
app.use(express.json());

// Configure AWS S3
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

const s3 = new AWS.S3();

// MySQL database connection
const db = mysql.createConnection({
  user: 'root',
  password: 'hamza',
  database: 'rockhairsaloon',
});

// Connect to the database
db.connect((err) => {
  if (err) {
    console.error('Error connecting to database:', err);
    return;
  }
  console.log('Connected to database!');
});

// Function to generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: '1h' });
};

// Middleware to authenticate JWT token
const authenticate = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token provided' });

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ message: 'Invalid token' });
    req.userId = decoded.id;
    next();
  });
};

// Set up multer for S3 storage
const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.AWS_BUCKET_NAME,
    acl: 'public-read', // Set permissions for the uploaded files
    key: (req, file, cb) => {
      cb(null, `${Date.now()}_${file.originalname}`);
    },
  }),
});

// User Signup Endpoint
app.post('/signup', async (req, res) => {
  const { name, email, password } = req.body;

  // Check if email already exists
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

// Image Upload Endpoint
app.post('/upload-image', authenticate, upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No image uploaded' });
  }

  const imagePath = req.file.location; // S3 URL of the uploaded image

  const sql = 'INSERT INTO user_images (user_id, image_path) VALUES (?, ?)';
  db.query(sql, [req.userId, imagePath], (err) => {
    if (err) {
      return res.status(500).json({ message: 'Database error' });
    }
    res.status(200).json({ message: 'Image uploaded successfully', image: imagePath });
  });
});

// Get User Images Endpoint
app.get('/get-images', authenticate, (req, res) => {
  const userId = req.userId;
  const sql = 'SELECT * FROM user_images WHERE user_id = ? ORDER BY id DESC';
  db.query(sql, [userId], (err, data) => {
    if (err) {
      return res.status(500).json({ message: 'Database error' });
    }

    const formattedImages = data.map(image => ({
      id: image.id,
      path: image.image_path,
    }));

    res.json(formattedImages);
  });
});

// Delete Image Endpoint
app.delete('/delete-image/:id', authenticate, (req, res) => {
  const imageId = req.params.id;

  // Find the image to delete first to get the file path
  const findImageQuery = 'SELECT * FROM user_images WHERE id = ? AND user_id = ?';
  db.query(findImageQuery, [imageId, req.userId], (err, results) => {
    if (err || results.length === 0) {
      return res.status(404).json({ message: 'Image not found' });
    }

    const imagePath = results[0].image_path.split('/').pop(); // Get the filename for deletion
    const deleteParams = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: imagePath,
    };

    // Delete the image file from S3
    s3.deleteObject(deleteParams, (err) => {
      if (err) {
        return res.status(500).json({ message: 'Error deleting image file from S3' });
      }

      // Delete the image record from the database
      const deleteImageQuery = 'DELETE FROM user_images WHERE id = ?';
      db.query(deleteImageQuery, [imageId], (err) => {
        if (err) {
          return res.status(500).json({ message: 'Database error' });
        }
        res.status(200).json({ message: 'Image deleted successfully' });
      });
    });
  });
});

// Start the server
app.listen(8083, () => {
  console.log(`Server is running on port 8083`);
});


