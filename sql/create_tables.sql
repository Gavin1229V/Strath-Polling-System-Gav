-- New logins table: only essential fields for login authentication
CREATE TABLE logins (
  login_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role INT DEFAULT 1,
  is_verified TINYINT(1) DEFAULT 0,
  verification_key VARCHAR(64),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- New accounts table: stores user profile details
CREATE TABLE users (
  user_id INT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  classes VARCHAR(255),
  profile_picture LONGBLOB,  -- changed from TEXT to LONGBLOB for binary storage
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
