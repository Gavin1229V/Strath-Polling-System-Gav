-- User authentication table: essential fields for login authentication
CREATE TABLE logins (
  login_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role INT DEFAULT 1, -- 1: student, 2: TA, 3: lecturer
  is_verified TINYINT(1) DEFAULT 0,
  verification_key VARCHAR(64),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User profile table: stores user profile details and class associations
CREATE TABLE users (
  user_id INT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  classes VARCHAR(255), -- Comma-separated list of class codes
  profile_picture LONGBLOB, -- Binary storage for profile images
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Polls table: stores poll questions and metadata
CREATE TABLE polls (
  id INT AUTO_INCREMENT PRIMARY KEY,
  question VARCHAR(255) NOT NULL,
  created_by VARCHAR(100) NOT NULL, -- Creator's name
  created_by_id INT, -- Foreign key to users table
  class VARCHAR(50), -- Class/course code this poll belongs to
  expiry DATETIME, -- When this poll expires
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by_id) REFERENCES users(user_id) ON DELETE SET NULL
);

-- Poll options table: stores the options for each poll
CREATE TABLE poll_options (
  id INT AUTO_INCREMENT PRIMARY KEY,
  poll_id INT NOT NULL,
  option_index INT NOT NULL, -- Order of options
  option_text VARCHAR(255) NOT NULL,
  vote_count INT DEFAULT 0,
  FOREIGN KEY (poll_id) REFERENCES polls(id) ON DELETE CASCADE
);
