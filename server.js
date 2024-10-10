// const express = require('express');
// const bcrypt = require('bcrypt');
// const mysql = require('mysql');
// const cors = require('cors');
// const jwt = require('jsonwebtoken');
// const multer = require('multer');
// const fs = require('fs');
// const path = require('path');
// const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
// const { Upload } = require('@aws-sdk/lib-storage');
// require('dotenv').config();

// const JWT_SECRET = process.env.JWT_SECRET;
// const app = express();

// app.use(cors({ origin: '*' }));

// // app.use(cors({
// //   origin: 'http://thedemoapp.online'
// // }));

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

// // Create an S3 client
// const s3Client = new S3Client({
//   region: process.env.AWS_REGION,
//   credentials: {
//     accessKeyId: process.env.AWS_ACCESS_KEY_ID,
//     secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
//   },
// });

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
// app.post('/upload-image', authenticate, upload.single('image'), async (req, res) => {
//   if (!req.file) {
//     return res.status(400).json({ message: 'No image uploaded' });
//   }

//   // Read the file buffer
//   const fileContent = fs.readFileSync(req.file.path);
  
//   // Configure the upload parameters
//   const uploadParams = {
//     Bucket: process.env.AWS_BUCKET_NAME,
//     Key: `uploads/${req.file.filename}`, // The path you want to save the file to
//     Body: fileContent,
//     ContentType: req.file.mimetype, // Ensure you set the correct content type
//   };

//   try {
//     // Use the Upload class to upload the file
//     const upload = new Upload({
//       client: s3Client,
//       params: uploadParams,
//     });
    
//     await upload.done();

//     // Once uploaded, you can construct the image path
//     const imagePath = `https://${process.env.AWS_BUCKET_NAME}.s3.amazonaws.com/${uploadParams.Key}`;
    
//     // Save the image path to the database
//     const sql = 'INSERT INTO user_images (user_id, image_path) VALUES (?, ?)';
//     db.query(sql, [req.userId, imagePath], (err) => {
//       if (err) {
//         return res.status(500).json({ message: 'Database error' });
//       }
//       res.status(200).json({ message: 'Image uploaded successfully', image: imagePath });
//     });
//   } catch (error) {
//     console.error('Error uploading image:', error); // Log the error
//     res.status(500).json({ message: 'Internal server error' });
//   }
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

//     // Delete the image record from the database
//     const deleteImageQuery = 'DELETE FROM user_images WHERE id = ?';
//     db.query(deleteImageQuery, [imageId], (err) => {
//       if (err) {
//         return res.status(500).json({ message: 'Database error' });
//       }
//       res.status(200).json({ message: 'Image deleted successfully' });
//     });
//   });
// });

// // Serve static files from the uploads directory
// app.use('/uploads', express.static(UPLOADS_DIR));

// // Start the server
// app.listen(8083, () => {
//   console.log(`Server is running on port 8083`);
// });

const express = require('express');
const bcrypt = require('bcrypt');
const mysql = require('mysql');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');
const gm = require('gm').subClass({ imageMagick: true }); // GraphicsMagick with ImageMagick
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;
const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json());

const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const filename = `${Date.now()}_${file.originalname}`;
    cb(null, filename);
  },
});
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

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

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

// Helper function to upload to S3
const uploadToS3 = async (fileContent, fileName, mimeType) => {
  const uploadParams = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: `uploads/${fileName}`, 
    Body: fileContent,
    ContentType: mimeType,
  };

  const upload = new Upload({
    client: s3Client,
    params: uploadParams,
  });

  await upload.done();
  return `https://${process.env.AWS_BUCKET_NAME}.s3.amazonaws.com/${uploadParams.Key}`;
};

// Image Upload Endpoint with Thumbnail Generation Using ImageMagick
app.post('/upload-image', authenticate, upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No image uploaded' });
  }

  const originalFilePath = req.file.path;
  const originalFileName = req.file.filename;
  const mimeType = req.file.mimetype;

  try {
    // 1. Upload the original image to S3
    const originalImageContent = fs.readFileSync(originalFilePath);
    const originalImagePath = await uploadToS3(originalImageContent, originalFileName, mimeType);

    // 2. Generate a thumbnail using ImageMagick (gm)
    const thumbnailFileName = `thumbnail_${originalFileName}`;
    const thumbnailFilePath = path.join(UPLOADS_DIR, thumbnailFileName);

    gm(originalFilePath)
      .resize(200, 200)
      .write(thumbnailFilePath, async (err) => {
        if (err) {
          console.error('Error generating thumbnail:', err);
          return res.status(500).json({ message: 'Error generating thumbnail' });
        }

        // 3. Upload the thumbnail to S3
        const thumbnailImageContent = fs.readFileSync(thumbnailFilePath);
        const thumbnailImagePath = await uploadToS3(thumbnailImageContent, thumbnailFileName, mimeType);

        // 4. Save both image paths to the database
        const sql = 'INSERT INTO user_images (user_id, image_path, thumbnail_path) VALUES (?, ?, ?)';
        db.query(sql, [req.userId, originalImagePath, thumbnailImagePath], (err) => {
          if (err) {
            return res.status(500).json({ message: 'Database error' });
          }
          res.status(200).json({
            message: 'Image uploaded successfully',
            image: originalImagePath,
            thumbnail: thumbnailImagePath,
          });
        });

        // Clean up: delete local files after uploading to S3
        fs.unlinkSync(originalFilePath);
        fs.unlinkSync(thumbnailFilePath);
      });
  } catch (error) {
    console.error('Error uploading image:', error); 
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get User Images with Thumbnail Endpoint
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
      thumbnail: image.thumbnail_path,
    }));

    res.json(formattedImages);
  });
});

app.delete('/delete-image/:id', authenticate, (req, res) => {
  const imageId = req.params.id;

  const findImageQuery = 'SELECT * FROM user_images WHERE id = ? AND user_id = ?';
  db.query(findImageQuery, [imageId, req.userId], (err, results) => {
    if (err || results.length === 0) {
      return res.status(404).json({ message: 'Image not found' });
    }

    const deleteImageQuery = 'DELETE FROM user_images WHERE id = ?';
    db.query(deleteImageQuery, [imageId], (err) => {
      if (err) {
        return res.status(500).json({ message: 'Database error' });
      }
      res.status(200).json({ message: 'Image deleted successfully' });
    });
  });
});

app.listen(8083, () => {
  console.log(`Server is running on port 8083`);
});


