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
      CREATE TABLE IF NOT EXISTS election_votes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        election_id INT NOT NULL,
        candidate_id INT NOT NULL,
        voter_id INT NOT NULL,
        voted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (election_id) REFERENCES elections(id) ON DELETE CASCADE,
        FOREIGN KEY (candidate_id) REFERENCES election_candidates(id) ON DELETE CASCADE,
        FOREIGN KEY (voter_id) REFERENCES users(user_id),
        UNIQUE KEY (election_id, voter_id)
      )


            CREATE TABLE IF NOT EXISTS election_candidates (
        id INT AUTO_INCREMENT PRIMARY KEY,
        election_id INT NOT NULL,
        user_id INT NOT NULL,
        statement TEXT,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (election_id) REFERENCES elections(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(user_id),
        UNIQUE KEY (election_id, user_id)



            )


                  CREATE TABLE IF NOT EXISTS elections (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(100) NOT NULL,
        description TEXT,
        class_code VARCHAR(10) NOT NULL,
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        end_date DATETIME NOT NULL,
        year_group INT NOT NULL,
        FOREIGN KEY (created_by) REFERENCES users(user_id)
      )