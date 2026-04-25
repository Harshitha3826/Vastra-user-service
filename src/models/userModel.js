const db = require('../db');
const argon2 = require('argon2');

const UserModel = {
  async createUser(name, email, password) {
    try {
      const passwordHash = await argon2.hash(password);

      const result = await db.query(
        `INSERT INTO users (name, email, password_hash) 
         VALUES ($1, $2, $3) RETURNING id, name, email, role, created_at`,
        [name, email, passwordHash]
      );
      return result.rows[0];
    } catch (error) {
      throw new Error('Failed to create user');
    }
  },

  async findByEmail(email) {
    try {
      const result = await db.query(
        `SELECT * FROM users WHERE email = $1`,
        [email]
      );
      return result.rows[0];
    } catch (error) {
      throw new Error('Failed to find user by email');
    }
  },

  async findById(id) {
    try {
      const result = await db.query(
        `SELECT id, name, email, role, created_at FROM users WHERE id = $1`,
        [id]
      );
      return result.rows[0];
    } catch (error) {
      throw new Error('Failed to find user by id');
    }
  },

  async updateProfile(id, name) {
    try {
      const result = await db.query(
        `UPDATE users SET name = $1 WHERE id = $2 RETURNING id, name, email, role, created_at`,
        [name, id]
      );
      return result.rows[0];
    } catch (error) {
      throw new Error('Failed to update user profile');
    }
  }
};

module.exports = UserModel;
