const request = require('supertest');
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const authRoutes = require('../routes/authRoutes');

// Mock the database
jest.mock('../db', () => ({
  query: jest.fn(),
}));

jest.mock('../models/userModel', () => ({
  createUser: jest.fn(),
  findByEmail: jest.fn(),
  findById: jest.fn(),
  updateProfile: jest.fn(),
}));

const { createUser, findByEmail, findById, updateProfile } = require('../models/userModel');

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

// Mock JWT secret
process.env.JWT_SECRET = 'test-secret';

describe('Auth Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123'
      };

      const mockUser = {
        id: '123',
        name: userData.name,
        email: userData.email,
        role: 'customer',
        created_at: new Date()
      };

      findByEmail.mockResolvedValue(null);
      createUser.mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.user).toBeDefined();
      expect(response.body.token).toBeDefined();
      expect(findByEmail).toHaveBeenCalledWith(userData.email);
      expect(createUser).toHaveBeenCalledWith(userData.name, userData.email, userData.password);
    });

    it('should return 400 for invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test User',
          email: 'invalid-email',
          password: 'password123'
        })
        .expect(400);

      expect(response.body.error).toBe('Invalid email format');
    });

    it('should return 400 for short password', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test User',
          email: 'test@example.com',
          password: '123'
        })
        .expect(400);

      expect(response.body.error).toBe('Password must be at least 6 characters long');
    });

    it('should return 409 for existing email', async () => {
      findByEmail.mockResolvedValue({ id: '123', email: 'test@example.com' });

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test User',
          email: 'test@example.com',
          password: 'password123'
        })
        .expect(409);

      expect(response.body.error).toBe('Email already exists');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login successfully', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'password123'
      };

      const mockUser = {
        id: '123',
        name: 'Test User',
        email: loginData.email,
        password_hash: await bcrypt.hash(loginData.password, 10),
        role: 'customer'
      };

      findByEmail.mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body.user).toBeDefined();
      expect(response.body.token).toBeDefined();
      expect(response.body.user.password_hash).toBeUndefined();
    });

    it('should return 401 for invalid credentials', async () => {
      findByEmail.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword'
        })
        .expect(401);

      expect(response.body.error).toBe('Invalid credentials');
    });
  });
});