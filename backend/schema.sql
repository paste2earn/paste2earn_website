-- Paste2Earn Database Schema
-- Run this file against your PostgreSQL database:
--   psql -U postgres -d paste2earn -f schema.sql

-- Create database (run separately if needed)
-- CREATE DATABASE paste2earn;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  reddit_profile_url VARCHAR(500) UNIQUE,
  role VARCHAR(10) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  status VARCHAR(10) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'banned')),
  tier VARCHAR(10) DEFAULT 'silver' CHECK (tier IN ('gold', 'silver')),
  wallet_balance DECIMAL(10, 2) DEFAULT 0.00,
  discord_username VARCHAR(100),
  discord_verified BOOLEAN DEFAULT FALSE,
  discord_verify_code VARCHAR(10),
  discord_verify_expires TIMESTAMPTZ,
  approved_by INT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL PRIMARY KEY,
  type VARCHAR(10) NOT NULL CHECK (type IN ('comment', 'post', 'reply')),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  target_url VARCHAR(500),
  comment_text TEXT,
  subreddit_url VARCHAR(500),
  post_title VARCHAR(255),
  post_body TEXT,
  reward DECIMAL(5, 2) NOT NULL,
  status VARCHAR(10) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_by INT REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Task IDs start from 1001
ALTER SEQUENCE tasks_id_seq RESTART WITH 1001;

-- Claimed / submitted tasks
CREATE TABLE IF NOT EXISTS claimed_tasks (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  task_id INT REFERENCES tasks(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'claimed' CHECK (status IN ('claimed', 'submitted', 'approved', 'rejected', 'revision_needed', 'reported')),
  submitted_url VARCHAR(500),
  comment1 TEXT,
  comment2 TEXT,
  comment3 TEXT,
  admin_note TEXT,
  rejection_reason VARCHAR(50),
  reviewed_by INT REFERENCES users(id) ON DELETE SET NULL,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(task_id)
);

-- Wallet transactions
CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  type VARCHAR(30) DEFAULT 'earning' CHECK (type IN ('earning', 'withdrawal', 'withdrawal_pending', 'refund', 'bonus')),
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Withdrawal requests
CREATE TABLE IF NOT EXISTS withdrawal_requests (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  wallet_address VARCHAR(200) NOT NULL,
  wallet_type VARCHAR(20) NOT NULL CHECK (wallet_type IN ('usdt_bep20', 'usdt_polygon', 'binance_id')),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'rejected')),
  admin_note TEXT,
  reviewed_by INT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Task reports
CREATE TABLE IF NOT EXISTS task_reports (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  task_id INT REFERENCES tasks(id) ON DELETE CASCADE,
  reason VARCHAR(100) NOT NULL,
  details TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Banned subreddits for users
CREATE TABLE IF NOT EXISTS user_banned_subreddits (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  subreddit VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, subreddit)
);

-- Seed: default admin account
INSERT INTO users (username, email, password_hash, role, status, tier)
VALUES (
  'admin',
  'paste2earn.owner@gmail.com',
  '$2a$10$iXDcRmrD/BMFyXoa2Vqj8ekG.fhz87AXI5ipYtbFPBUCFqigY3GIi',
  'admin',
  'approved',
  'gold'
) ON CONFLICT (email) DO NOTHING;
