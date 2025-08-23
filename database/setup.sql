-- Lorodex Production Database Schema (PostgreSQL)

-- Users table
CREATE TABLE users (
    id VARCHAR(255) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-update `updated_at`
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Business cards table
CREATE TABLE business_cards (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    company VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(255),
    website TEXT,
    address TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Add triggers for updated_at
CREATE TRIGGER set_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER set_business_cards_updated_at
BEFORE UPDATE ON business_cards
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE INDEX idx_business_cards_user_id ON business_cards(user_id);
CREATE INDEX idx_business_cards_created_at ON business_cards(created_at);

-- User profiles
CREATE TABLE user_profiles (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL UNIQUE,
    avatar_url TEXT,
    bio TEXT,
    phone VARCHAR(50),
    website_url TEXT,
    linkedin_url TEXT,
    twitter_url TEXT,
    company VARCHAR(255),
    job_title VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TRIGGER set_user_profiles_updated_at
BEFORE UPDATE ON user_profiles
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- User sessions
CREATE TABLE user_sessions (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    device_info JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_accessed TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Business card social links
CREATE TABLE business_card_social_links (
    id VARCHAR(255) PRIMARY KEY,
    business_card_id VARCHAR(255) NOT NULL,
    platform VARCHAR(50) NOT NULL,
    url TEXT NOT NULL,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (business_card_id) REFERENCES business_cards(id) ON DELETE CASCADE
);

-- Contacts
CREATE TABLE contacts (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    business_card_id VARCHAR(255) NOT NULL,
    contact_name VARCHAR(255),
    company VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(255),
    notes TEXT,
    is_favorite BOOLEAN DEFAULT FALSE,
    last_contacted TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (business_card_id) REFERENCES business_cards(id) ON DELETE CASCADE,
    CONSTRAINT unique_user_card UNIQUE (user_id, business_card_id)
);

CREATE TRIGGER set_contacts_updated_at
BEFORE UPDATE ON contacts
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- Card exchanges
CREATE TABLE card_exchanges (
    id VARCHAR(255) PRIMARY KEY,
    sender_id VARCHAR(255) NOT NULL,
    receiver_id VARCHAR(255),
    business_card_id VARCHAR(255) NOT NULL,
    exchange_method VARCHAR(50),
    receiver_email VARCHAR(255),
    receiver_phone VARCHAR(255),
    location_name VARCHAR(255),
    notes TEXT,
    exchanged_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (business_card_id) REFERENCES business_cards(id) ON DELETE CASCADE
);

-- Indexes for extended tables
CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX idx_user_sessions_active ON user_sessions(is_active, expires_at);
CREATE INDEX idx_business_card_social_links_card_id ON business_card_social_links(business_card_id);
CREATE INDEX idx_contacts_user_id ON contacts(user_id);
CREATE INDEX idx_contacts_favorite ON contacts(user_id, is_favorite);
CREATE INDEX idx_card_exchanges_sender ON card_exchanges(sender_id);
CREATE INDEX idx_card_exchanges_receiver ON card_exchanges(receiver_id);
CREATE INDEX idx_card_exchanges_date ON card_exchanges(exchanged_at);

-- Sample data
INSERT INTO users (id, email, first_name, last_name, password_hash) VALUES
('user_1703123456789_abc123', 'john.doe@example.com', 'John', 'Doe', 'hashed_password123'),
('user_1703123456790_def456', 'jane.smith@example.com', 'Jane', 'Smith', 'hashed_password456');

INSERT INTO business_cards (id, user_id, title, company, email, phone, website) VALUES
('card_1703123456789_xyz123', 'user_1703123456789_abc123', 'John Doe - Developer', 'Tech Corp', 'john.doe@techcorp.com', '+1-555-0123', 'https://johndoe.dev'),
('card_1703123456790_xyz456', 'user_1703123456790_def456', 'Jane Smith - Designer', 'Design Studio', 'jane@designstudio.com', '+1-555-0124', 'https://janesmith.design');


------- waddding thissss --------------------



-- Add to your existing schema
ALTER TABLE users ADD COLUMN last_login TIMESTAMP;
ALTER TABLE users ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- User sessions table (already in the schema I provided earlier)
CREATE TABLE user_sessions (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    device_info TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);



ALTER TABLE business_cards ADD COLUMN deleted_at TIMESTAMP NULL;
