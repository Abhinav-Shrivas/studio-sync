require('dotenv').config();

// Override NODE_ENV for tests
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_jwt_secret';
