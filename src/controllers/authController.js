const argon2 = require('argon2');
const jwt = require('jsonwebtoken');
const UserModel = require('../models/userModel');

const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    const existingUser = await UserModel.findByEmail(email);
    if (existingUser) {
      return res.status(409).json({ error: 'Email already exists' });
    }

    const user = await UserModel.createUser(name, email, password);
    const token = generateToken(user);

    res.status(201).json({ user, token });
  } catch (error) {
    // Register error logged
    res.status(500).json({ error: 'Internal server error' });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await UserModel.findByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isMatch = await argon2.verify(user.password_hash, password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const { password_hash, ...userWithoutPassword } = user;
    const token = generateToken(userWithoutPassword);

    res.status(200).json({ user: userWithoutPassword, token });
  } catch (error) {
    // Login error logged
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getMe = async (req, res) => {
  try {
    const user = await UserModel.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(200).json({ user });
  } catch (error) {
    // GetMe error logged
    res.status(500).json({ error: 'Internal server error' });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const user = await UserModel.updateProfile(req.user.id, name);
    res.status(200).json({ user });
  } catch (error) {
    // UpdateProfile error logged
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  register,
  login,
  getMe,
  updateProfile
};