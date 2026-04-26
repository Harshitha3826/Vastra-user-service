const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const authRoutes = require('../routes/authRoutes');

jest.mock('../db', () => ({ query: jest.fn() }));
jest.mock('../models/userModel', () => ({
  createUser: jest.fn(),
  findByEmail: jest.fn(),
  findById: jest.fn(),
  updateProfile: jest.fn(),
}));

const { createUser, findByEmail, findById, updateProfile } = require('../models/userModel');

process.env.JWT_SECRET = 'test-secret';

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

const makeToken = (payload = { id: '123', email: 'test@example.com', role: 'customer' }) =>
  jwt.sign(payload, process.env.JWT_SECRET);

describe('Register - extended validation', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should return 400 if name is missing', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@example.com', password: 'Password1!' })
      .expect(400);
    expect(res.body.error).toBe('Name, email, and password are required');
  });

  it('should return 400 if name is too short', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'A', email: 'test@example.com', password: 'Password1!' })
      .expect(400);
    expect(res.body.error).toBe('Name must be between 2 and 100 characters');
  });

  it('should return 400 for weak password (no special char)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test User', email: 'test@example.com', password: 'Password1' })
      .expect(400);
    expect(res.body.error).toContain('Password must contain');
  });

  it('should return 500 on unexpected error', async () => {
    findByEmail.mockRejectedValue(new Error('DB error'));
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test User', email: 'test@example.com', password: 'Password1!' })
      .expect(500);
    expect(res.body.error).toBe('Internal server error');
  });
});

describe('Login - extended', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should return 400 if email is missing', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ password: 'Password1!' })
      .expect(400);
    expect(res.body.error).toBe('Email and password are required');
  });

  it('should return 500 on unexpected error', async () => {
    findByEmail.mockRejectedValue(new Error('DB error'));
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'Password1!' })
      .expect(500);
    expect(res.body.error).toBe('Internal server error');
  });
});

describe('GET /api/auth/me', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should return 401 without token', async () => {
    await request(app).get('/api/auth/me').expect(401);
  });

  it('should return user when authenticated', async () => {
    const mockUser = { id: '123', name: 'Test', email: 'test@example.com', role: 'customer' };
    findById.mockResolvedValue(mockUser);
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${makeToken()}`)
      .expect(200);
    expect(res.body.user).toBeDefined();
  });

  it('should return 404 when user not found', async () => {
    findById.mockResolvedValue(null);
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${makeToken()}`)
      .expect(404);
    expect(res.body.error).toBe('User not found');
  });

  it('should return 500 on error', async () => {
    findById.mockRejectedValue(new Error('DB error'));
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${makeToken()}`)
      .expect(500);
    expect(res.body.error).toBe('Internal server error');
  });
});

describe('PUT /api/auth/profile', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should return 401 without token', async () => {
    await request(app).put('/api/auth/profile').send({ name: 'New Name' }).expect(401);
  });

  it('should return 400 if name is missing', async () => {
    const res = await request(app)
      .put('/api/auth/profile')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({})
      .expect(400);
    expect(res.body.error).toBe('Name is required');
  });

  it('should return 400 if name is too short', async () => {
    const res = await request(app)
      .put('/api/auth/profile')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ name: 'A' })
      .expect(400);
    expect(res.body.error).toBe('Name must be between 2 and 100 characters');
  });

  it('should update profile successfully', async () => {
    const mockUser = { id: '123', name: 'Updated Name', email: 'test@example.com' };
    updateProfile.mockResolvedValue(mockUser);
    const res = await request(app)
      .put('/api/auth/profile')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ name: 'Updated Name' })
      .expect(200);
    expect(res.body.user.name).toBe('Updated Name');
  });

  it('should return 500 on error', async () => {
    updateProfile.mockRejectedValue(new Error('DB error'));
    const res = await request(app)
      .put('/api/auth/profile')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ name: 'Updated Name' })
      .expect(500);
    expect(res.body.error).toBe('Internal server error');
  });
});
