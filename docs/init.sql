-- Tabel sellers
CREATE TABLE IF NOT EXISTS sellers (
                                       id SERIAL PRIMARY KEY,
                                       seller_code VARCHAR(50) UNIQUE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    bank_account_number VARCHAR(50),
    bank_name VARCHAR(100),
    account_holder_name VARCHAR(255),
    status VARCHAR(50) DEFAULT 'active',
    verified BOOLEAN DEFAULT FALSE,
    verification_date TIMESTAMP,
    kyc_document_url TEXT,
    total_balance DECIMAL(19,4) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

-- Tabel transactions
CREATE TABLE IF NOT EXISTS transactions (
                                            id SERIAL PRIMARY KEY,
                                            transaction_id VARCHAR(100) UNIQUE NOT NULL,
    seller_id INTEGER REFERENCES sellers(id),
    amount DECIMAL(19,4) NOT NULL,
    currency VARCHAR(10) DEFAULT 'IDR',
    description VARCHAR(500),
    order_id VARCHAR(100),
    customer_id VARCHAR(100),
    payment_method VARCHAR(50),
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

-- Tabel settlements
CREATE TABLE IF NOT EXISTS settlements (
                                           id SERIAL PRIMARY KEY,
                                           settlement_id VARCHAR(100) UNIQUE NOT NULL,
    seller_id INTEGER REFERENCES sellers(id),
    total_amount DECIMAL(19,4) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    settlement_period_start DATE NOT NULL,
    settlement_period_end DATE NOT NULL,
    idempotency_key VARCHAR(255) UNIQUE NOT NULL,
    phase_1_lock_timestamp TIMESTAMP,
    phase_2_commit_timestamp TIMESTAMP,
    actual_payout_date TIMESTAMP,
    failure_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

-- Tabel settlement_items
CREATE TABLE IF NOT EXISTS settlement_items (
                                                id SERIAL PRIMARY KEY,
                                                settlement_id INTEGER REFERENCES settlements(id),
    transaction_id INTEGER REFERENCES transactions(id),
    amount DECIMAL(19,4) NOT NULL,
    net_amount DECIMAL(19,4) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

-- Tabel audit_logs
CREATE TABLE IF NOT EXISTS audit_logs (
                                          id SERIAL PRIMARY KEY,
                                          table_name VARCHAR(100),
    record_id INTEGER,
    entity_type VARCHAR(100),
    entity_id VARCHAR(100),
    action VARCHAR(100) NOT NULL,
    old_data JSONB,
    new_data JSONB,
    previous_state JSONB,
    new_state JSONB,
    reason TEXT,
    user_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

-- Tabel reconciliation_records
CREATE TABLE IF NOT EXISTS reconciliation_records (
                                                      id SERIAL PRIMARY KEY,
                                                      reconciliation_date DATE NOT NULL,
                                                      settlement_id VARCHAR(100),
    seller_id INTEGER,
    expected_amount DECIMAL(19,4),
    actual_amount DECIMAL(19,4),
    discrepancy_amount DECIMAL(19,4),
    status VARCHAR(50) DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

-- Insert data dummy
INSERT INTO sellers (id, seller_code, name, email, total_balance, status)
VALUES (1, 'SEL001', 'Test Seller', 'mhdsyukronzakka@gmail.com', 10000000, 'active')
    ON CONFLICT (id) DO NOTHING;

INSERT INTO transactions (transaction_id, seller_id, amount, status, created_at)
VALUES
    ('TRX-001', 1, 100000, 'completed', '2024-01-15 10:00:00'),
    ('TRX-002', 1, 200000, 'completed', '2024-01-20 10:00:00'),
    ('TRX-003', 1, 150000, 'completed', '2024-01-25 10:00:00')
    ON CONFLICT (transaction_id) DO NOTHING;