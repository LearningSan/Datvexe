create database quanlidatvexe;

use quanlidatvexe;

CREATE TABLE
    roles (
        role_id BIGINT PRIMARY KEY AUTO_INCREMENT,
        role_name VARCHAR(50) NOT NULL UNIQUE,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE
    users (
        user_id BIGINT PRIMARY KEY AUTO_INCREMENT,
        role_id BIGINT NOT NULL,
        full_name VARCHAR(100) NOT NULL,
        email VARCHAR(100) NULL,
        phone VARCHAR(20) NULL,
        password_hash VARCHAR(255) NULL,
        avatar_url VARCHAR(500) NULL,
        avatar_public_id VARCHAR(255) NULL,
        email_verified_at DATETIME NULL,
        status ENUM ('ACTIVE', 'BLOCKED') NOT NULL DEFAULT 'ACTIVE',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles (role_id),
        CONSTRAINT uq_users_email UNIQUE (email),
        CONSTRAINT uq_users_phone UNIQUE (phone)
    ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE
    user_oauth_accounts (
        oauth_account_id BIGINT PRIMARY KEY AUTO_INCREMENT,
        user_id BIGINT NOT NULL,
        provider ENUM ('GOOGLE', 'FACEBOOK') NOT NULL,
        provider_id VARCHAR(255) NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_oauth_user FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE,
        CONSTRAINT uq_oauth_provider_account UNIQUE (provider, provider_id),
        CONSTRAINT uq_user_provider UNIQUE (user_id, provider)
    );

CREATE TABLE
    email_verification_tokens (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        user_id BIGINT NOT NULL,
        token_hash VARCHAR(255) NOT NULL,
        expired_at DATETIME NOT NULL,
        used_at DATETIME NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_evt_user FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE
    );

CREATE TABLE
    routes (
        route_id BIGINT PRIMARY KEY AUTO_INCREMENT,
        origin_city_id BIGINT NOT NULL,
        destination_city_id BIGINT NOT NULL,
        origin_hub_id BIGINT NULL,
        destination_hub_id BIGINT NULL,
        distance_km DECIMAL(6, 2) NULL,
        estimated_duration INT NULL COMMENT 'minutes',
        base_price DECIMAL(10, 2) NULL,
        status ENUM ('ACTIVE', 'SUSPENDED') NOT NULL DEFAULT 'ACTIVE',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_route_origin_city FOREIGN KEY (origin_city_id) REFERENCES cities (city_id),
        CONSTRAINT fk_route_destination_city FOREIGN KEY (destination_city_id) REFERENCES cities (city_id),
        CONSTRAINT fk_route_origin_hub FOREIGN KEY (origin_hub_id) REFERENCES zones (zone_id),
        CONSTRAINT fk_route_destination_hub FOREIGN KEY (destination_hub_id) REFERENCES zones (zone_id),
        CONSTRAINT uq_route UNIQUE (origin_hub_id, destination_hub_id)
    ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE
    route_change_logs (
        log_id BIGINT PRIMARY KEY AUTO_INCREMENT,
        route_id BIGINT NOT NULL,
        changed_by BIGINT NULL,
        action_type ENUM (
            'CREATE',
            'UPDATE',
            'SUSPEND',
            'ACTIVATE',
            'REVERSE_CREATE'
        ) NOT NULL,
        reason VARCHAR(255) NULL,
        old_data JSON NULL,
        new_data JSON NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_route_log_route FOREIGN KEY (route_id) REFERENCES routes (route_id),
        CONSTRAINT fk_route_log_user FOREIGN KEY (changed_by) REFERENCES users (user_id)
    );

CREATE TABLE
    pickup_points (
        pickup_point_id BIGINT PRIMARY KEY AUTO_INCREMENT,
        city_id BIGINT NOT NULL,
        zone_id BIGINT NOT NULL,
        point_category ENUM ('MAIN_HUB', 'OFFICE', 'SHUTTLE_AREA', 'REST_STOP') NOT NULL DEFAULT 'OFFICE',
        point_name VARCHAR(150) NOT NULL,
        address VARCHAR(255) NULL,
        latitude DECIMAL(10, 7) NULL,
        longitude DECIMAL(10, 7) NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_pickup_city FOREIGN KEY (city_id) REFERENCES cities (city_id),
        CONSTRAINT fk_pickup_zone FOREIGN KEY (zone_id) REFERENCES zones (zone_id)
    ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE
    vehicle_types (
        vehicle_type_id BIGINT PRIMARY KEY AUTO_INCREMENT,
        type_name VARCHAR(50) NOT NULL UNIQUE,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE
    seat_layouts (
        seat_layout_id BIGINT PRIMARY KEY AUTO_INCREMENT,
        vehicle_type_id BIGINT NOT NULL,
        layout_code VARCHAR(50) NOT NULL UNIQUE,
        layout_name VARCHAR(100) NOT NULL,
        total_seats INT NOT NULL,
        floor_count INT NOT NULL DEFAULT 1,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_layout_vehicle_type FOREIGN KEY (vehicle_type_id) REFERENCES vehicle_types (vehicle_type_id)
    ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE
    seat_layout_details (
        seat_layout_detail_id BIGINT PRIMARY KEY AUTO_INCREMENT,
        seat_layout_id BIGINT NOT NULL,
        seat_number VARCHAR(10) NOT NULL,
        seat_type ENUM ('NORMAL', 'VIP') NOT NULL DEFAULT 'NORMAL',
        floor_no INT NOT NULL DEFAULT 1,
        row_no INT NOT NULL,
        column_no INT NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_seat_layout FOREIGN KEY (seat_layout_id) REFERENCES seat_layouts (seat_layout_id),
        CONSTRAINT uq_layout_seat UNIQUE (seat_layout_id, seat_number)
    ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE
    vehicles (
        vehicle_id BIGINT PRIMARY KEY AUTO_INCREMENT,
        internal_code VARCHAR(50) NULL,
        vehicle_type_id BIGINT NOT NULL,
        seat_layout_id BIGINT NOT NULL,
        license_plate VARCHAR(20) NOT NULL,
        vehicle_name VARCHAR(100) NULL,
        manufacture_year YEAR NULL,
        status ENUM (
            'AVAILABLE',
            'ASSIGNED',
            'MAINTENANCE',
            'INACTIVE'
        ) NOT NULL DEFAULT 'AVAILABLE',
        note VARCHAR(255) NULL,
        image_url VARCHAR(500) NULL,
        image_public_id VARCHAR(255) NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_vehicle_type FOREIGN KEY (vehicle_type_id) REFERENCES vehicle_types (vehicle_type_id),
        CONSTRAINT fk_vehicle_layout FOREIGN KEY (seat_layout_id) REFERENCES seat_layouts (seat_layout_id),
        CONSTRAINT uq_vehicle_plate UNIQUE (license_plate),
        CONSTRAINT uq_vehicle_internal_code UNIQUE (internal_code)
    ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE
    drivers (
        driver_id BIGINT PRIMARY KEY AUTO_INCREMENT,
        user_id BIGINT NOT NULL,
        driver_type ENUM ('BUS', 'SHUTTLE', 'BOTH') NOT NULL DEFAULT 'BUS',
        license_number VARCHAR(50) NOT NULL,
        status ENUM ('AVAILABLE', 'ASSIGNED', 'OFF') NOT NULL DEFAULT 'AVAILABLE',
        hired_date DATE NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_driver_user FOREIGN KEY (user_id) REFERENCES users (user_id),
        CONSTRAINT uq_driver_license UNIQUE (license_number),
        CONSTRAINT uq_driver_user UNIQUE (user_id)
    ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE
    schedule_templates (
        schedule_template_id BIGINT PRIMARY KEY AUTO_INCREMENT,
        route_id BIGINT NOT NULL,
        departure_time TIME NOT NULL,
        estimated_duration INT NOT NULL COMMENT 'minutes',
        base_price DECIMAL(10, 2) NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_schedule_route FOREIGN KEY (route_id) REFERENCES routes (route_id)
    ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE
    trips (
        trip_id BIGINT PRIMARY KEY AUTO_INCREMENT,
        schedule_template_id BIGINT NOT NULL,
        route_id BIGINT NOT NULL,
        vehicle_id BIGINT NULL,
        departure_datetime DATETIME NOT NULL,
        arrival_datetime DATETIME NOT NULL,
        available_seats INT NOT NULL,
        ticket_price DECIMAL(10, 2) NULL,
        status ENUM (
            'OPEN',
            'FULL',
            'RUNNING',
            'COMPLETED',
            'CANCELLED'
        ) NOT NULL DEFAULT 'OPEN',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_trip_schedule FOREIGN KEY (schedule_template_id) REFERENCES schedule_templates (schedule_template_id),
        CONSTRAINT fk_trip_route FOREIGN KEY (route_id) REFERENCES routes (route_id),
        CONSTRAINT fk_trip_vehicle FOREIGN KEY (vehicle_id) REFERENCES vehicles (vehicle_id),
        CONSTRAINT uq_vehicle_departure UNIQUE (vehicle_id, departure_datetime)
    ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE
    trip_drivers (
        trip_driver_id BIGINT PRIMARY KEY AUTO_INCREMENT,
        trip_id BIGINT NOT NULL,
        driver_id BIGINT NOT NULL,
        assigned_role ENUM ('MAIN', 'ASSISTANT', 'SHUTTLE') NOT NULL DEFAULT 'MAIN',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_trip_driver_trip FOREIGN KEY (trip_id) REFERENCES trips (trip_id),
        CONSTRAINT fk_trip_driver_driver FOREIGN KEY (driver_id) REFERENCES drivers (driver_id),
        CONSTRAINT uq_trip_driver UNIQUE (trip_id, driver_id)
    ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE
    bookings (
        booking_id BIGINT PRIMARY KEY AUTO_INCREMENT,
        booking_code VARCHAR(20) NOT NULL UNIQUE,
        user_id BIGINT NULL,
        trip_id BIGINT NOT NULL,
        pickup_point_id BIGINT NULL,
        dropoff_point_id BIGINT NULL,
        pickup_method ENUM ('OFFICE', 'SHUTTLE') NOT NULL DEFAULT 'OFFICE',
        dropoff_method ENUM ('OFFICE', 'SHUTTLE') NOT NULL DEFAULT 'OFFICE',
        booking_type ENUM ('ONLINE', 'OFFLINE') NOT NULL DEFAULT 'ONLINE',
        status ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'REFUNDED') NOT NULL DEFAULT 'PENDING',
        total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
        contact_name VARCHAR(100) NOT NULL,
        contact_phone VARCHAR(20) NOT NULL,
        contact_email varchar(100) NULL,
        seat_price DECIMAL(10, 2) NOT NULL,
        hold_expired_at DATETIME NULL,
        cancel_reason VARCHAR(255) NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        created_by BIGINT NULL,
        CONSTRAINT fk_booking_user FOREIGN KEY (user_id) REFERENCES users (user_id),
        CONSTRAINT fk_booking_trip FOREIGN KEY (trip_id) REFERENCES trips (trip_id),
        CONSTRAINT fk_booking_pickup FOREIGN KEY (pickup_point_id) REFERENCES pickup_points (pickup_point_id),
        CONSTRAINT fk_booking_dropoff FOREIGN KEY (dropoff_point_id) REFERENCES pickup_points (pickup_point_id),
        CONSTRAINT uq_booking_code UNIQUE (booking_code)
    ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE
    booking_seats (
        booking_seat_id BIGINT PRIMARY KEY AUTO_INCREMENT,
        booking_id BIGINT NOT NULL,
        trip_id BIGINT NOT NULL,
        seat_layout_detail_id BIGINT NOT NULL,
        seat_price DECIMAL(10, 2) NOT NULL,
        checkin_status ENUM ('NOT_CHECKED_IN', 'CHECKED_IN') NOT NULL DEFAULT 'NOT_CHECKED_IN',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_booking_seat_booking FOREIGN KEY (booking_id) REFERENCES bookings (booking_id),
        CONSTRAINT fk_booking_seat_trip FOREIGN KEY (trip_id) REFERENCES trips (trip_id),
        CONSTRAINT fk_booking_seat_layout FOREIGN KEY (seat_layout_detail_id) REFERENCES seat_layout_details (seat_layout_detail_id),
        CONSTRAINT uq_trip_seat UNIQUE (trip_id, seat_layout_detail_id)
    ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE
    seat_holds (
        seat_hold_id BIGINT PRIMARY KEY AUTO_INCREMENT,
        trip_id BIGINT NOT NULL,
        seat_layout_detail_id BIGINT NOT NULL,
        booking_id BIGINT NOT NULL,
        session_id VARCHAR(100) NOT NULL,
        user_id BIGINT NULL,
        expired_at DATETIME NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_hold_trip FOREIGN KEY (trip_id) REFERENCES trips (trip_id),
        CONSTRAINT fk_hold_seat FOREIGN KEY (seat_layout_detail_id) REFERENCES seat_layout_details (seat_layout_detail_id),
        CONSTRAINT fk_hold_user FOREIGN KEY (user_id) REFERENCES users (user_id),
        CONSTRAINT fk_hold_booking FOREIGN KEY (booking_id) REFERENCES bookings (booking_id) ON DELETE CASCADE,
        CONSTRAINT uq_hold_seat UNIQUE (trip_id, seat_layout_detail_id)
    ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE
    payments (
        payment_id BIGINT PRIMARY KEY AUTO_INCREMENT,
        booking_id BIGINT NOT NULL,
        payment_method ENUM (
            'PAYOS',
            'VIETQR',
            'INTERNAL_WALLET',
            'ZALOPAY',
            'VNPAY',
            'MOMO',
            'CASH'
        ) NOT NULL,
        flow_type ENUM ('REDIRECT', 'QR', 'MANUAL', 'CASH', 'INTERNAL') NULL,
        provider VARCHAR(50) NULL,
        amount DECIMAL(10, 2) NOT NULL,
        status ENUM (
            'PENDING',
            'PROCESSING',
            'WAITING_CONFIRM',
            'PAID',
            'FAILED',
            'REJECTED',
            'EXPIRED',
            'REFUNDED'
        ) NOT NULL DEFAULT 'PENDING',
        transaction_code VARCHAR(100) NULL,
        provider_order_code VARCHAR(100) NULL,
        gateway_transaction_id VARCHAR(255) NULL,
        gateway_response JSON NULL,
        payment_url TEXT NULL,
        qr_code_url TEXT NULL,
        deeplink TEXT NULL,
        return_url TEXT NULL,
        cancel_url TEXT NULL,
        manual_note VARCHAR(255) NULL,
        confirmed_by BIGINT NULL,
        paid_at DATETIME NULL,
        confirmed_at DATETIME NULL,
        failed_reason VARCHAR(255) NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_payment_booking FOREIGN KEY (booking_id) REFERENCES bookings (booking_id),
        CONSTRAINT fk_payments_confirmed_by FOREIGN KEY (confirmed_by) REFERENCES users (user_id),
        CONSTRAINT uq_payment_transaction_code UNIQUE (transaction_code)
    ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE
    wallets (
        wallet_id BIGINT PRIMARY KEY AUTO_INCREMENT,
        user_id BIGINT NOT NULL UNIQUE,
        balance DECIMAL(10, 2) NOT NULL DEFAULT 0,
        status ENUM ('ACTIVE', 'LOCKED') NOT NULL DEFAULT 'ACTIVE',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_wallet_user FOREIGN KEY (user_id) REFERENCES users (user_id)
    );

CREATE TABLE
    wallet_transactions (
        wallet_transaction_id BIGINT PRIMARY KEY AUTO_INCREMENT,
        wallet_id BIGINT NOT NULL,
        payment_id BIGINT NULL,
        booking_id BIGINT NULL,
        transaction_type ENUM ('DEPOSIT', 'PAYMENT', 'REFUND', 'ADJUSTMENT') NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        balance_before DECIMAL(10, 2) NOT NULL,
        balance_after DECIMAL(10, 2) NOT NULL,
        description VARCHAR(255) NULL,
        created_by BIGINT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_wallet_tx_wallet FOREIGN KEY (wallet_id) REFERENCES wallets (wallet_id),
        CONSTRAINT fk_wallet_tx_payment FOREIGN KEY (payment_id) REFERENCES payments (payment_id),
        CONSTRAINT fk_wallet_tx_booking FOREIGN KEY (booking_id) REFERENCES bookings (booking_id),
        CONSTRAINT fk_wallet_tx_created_by FOREIGN KEY (created_by) REFERENCES users (user_id)
    );

CREATE TABLE
    promotions (
        promotion_id BIGINT PRIMARY KEY AUTO_INCREMENT,
        promo_code VARCHAR(50) NOT NULL,
        promotion_name VARCHAR(100) NOT NULL,
        discount_type ENUM ('PERCENT', 'FIXED') NOT NULL,
        discount_value DECIMAL(10, 2) NOT NULL,
        min_order_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
        start_date DATETIME NOT NULL,
        end_date DATETIME NOT NULL,
        usage_limit INT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        banner_url VARCHAR(500) NULL,
        banner_public_id VARCHAR(255) NULL,
        CONSTRAINT uq_promo_code UNIQUE (promo_code)
    ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE
    booking_promotions (
        booking_promotion_id BIGINT PRIMARY KEY AUTO_INCREMENT,
        booking_id BIGINT NOT NULL,
        promotion_id BIGINT NOT NULL,
        discount_amount DECIMAL(10, 2) NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_bp_booking FOREIGN KEY (booking_id) REFERENCES bookings (booking_id),
        CONSTRAINT fk_bp_promotion FOREIGN KEY (promotion_id) REFERENCES promotions (promotion_id),
        CONSTRAINT uq_booking_promotion UNIQUE (booking_id, promotion_id)
    ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE
    reviews (
        review_id BIGINT PRIMARY KEY AUTO_INCREMENT,
        booking_id BIGINT NOT NULL,
        user_id BIGINT NOT NULL,
        rating TINYINT NOT NULL,
        comment TEXT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_review_booking FOREIGN KEY (booking_id) REFERENCES bookings (booking_id),
        CONSTRAINT fk_review_user FOREIGN KEY (user_id) REFERENCES users (user_id),
        CONSTRAINT uq_review_booking UNIQUE (booking_id)
    ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE
    notifications (
        notification_id BIGINT PRIMARY KEY AUTO_INCREMENT,
        user_id BIGINT NOT NULL,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        notification_type ENUM ('BOOKING', 'PAYMENT', 'TRIP') NOT NULL,
        is_read BOOLEAN NOT NULL DEFAULT FALSE,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_notification_user FOREIGN KEY (user_id) REFERENCES users (user_id)
    ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE
    auth_sessions (
        session_id BIGINT PRIMARY KEY AUTO_INCREMENT,
        user_id BIGINT NOT NULL,
        refresh_token VARCHAR(255) NOT NULL,
        user_agent VARCHAR(255) NULL,
        ip_address VARCHAR(50) NULL,
        is_valid BOOLEAN NOT NULL DEFAULT TRUE,
        expired_at DATETIME NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_session_user FOREIGN KEY (user_id) REFERENCES users (user_id)
    );

CREATE TABLE
    cities (
        city_id BIGINT PRIMARY KEY AUTO_INCREMENT,
        city_name VARCHAR(100) NOT NULL UNIQUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        image_url VARCHAR(500) NULL,
        image_public_id VARCHAR(255) NULL
    );

CREATE TABLE
    zones (
        zone_id BIGINT PRIMARY KEY AUTO_INCREMENT,
        city_id BIGINT NOT NULL,
        zone_name VARCHAR(100) NOT NULL,
        zone_type ENUM ('DISTRICT', 'AREA', 'HUB') DEFAULT 'AREA',
        FOREIGN KEY (city_id) REFERENCES cities (city_id)
    );

CREATE TABLE
    booking_shuttle_requests (
        id BIGINT PRIMARY KEY AUTO_INCREMENT,
        booking_id BIGINT NOT NULL,
        type ENUM ('PICKUP', 'DROPOFF') NOT NULL,
        address VARCHAR(255) NOT NULL,
        latitude DECIMAL(10, 7) NULL,
        longitude DECIMAL(10, 7) NULL,
        status ENUM (
            'PENDING',
            'ASSIGNED',
            'IN_PROGRESS',
            'DONE',
            'FAILED',
            'CANCELLED'
        ) NOT NULL DEFAULT 'PENDING',
        driver_id BIGINT NULL,
        scheduled_time DATETIME NULL,
        completed_time DATETIME NULL,
        note VARCHAR(255) NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT fk_shuttle_booking FOREIGN KEY (booking_id) REFERENCES bookings (booking_id) ON DELETE CASCADE,
        CONSTRAINT fk_shuttle_driver FOREIGN KEY (driver_id) REFERENCES drivers (driver_id)
    ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4;

CREATE TABLE
    trip_pickup_points (
        trip_pickup_point_id BIGINT PRIMARY KEY AUTO_INCREMENT,
        trip_id BIGINT NOT NULL,
        pickup_point_id BIGINT NOT NULL,
        stop_order INT NOT NULL,
        stop_type ENUM ('PICKUP', 'DROP_OFF', 'BOTH') NOT NULL DEFAULT 'BOTH',
        arrival_time DATETIME NULL,
        departure_time DATETIME NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_tpp_trip FOREIGN KEY (trip_id) REFERENCES trips (trip_id),
        CONSTRAINT fk_tpp_point FOREIGN KEY (pickup_point_id) REFERENCES pickup_points (pickup_point_id),
        CONSTRAINT uq_trip_stop_order UNIQUE (trip_id, stop_order),
        CONSTRAINT uq_trip_point UNIQUE (trip_id, pickup_point_id)
    );

CREATE INDEX idx_users_role ON users (role_id);

CREATE INDEX idx_trip_route_departure ON trips (route_id, departure_datetime);

CREATE INDEX idx_trip_status ON trips (status);

CREATE INDEX idx_booking_user ON bookings (user_id);

CREATE INDEX idx_booking_trip ON bookings (trip_id);

CREATE INDEX idx_booking_status ON bookings (status);

CREATE INDEX idx_payment_status ON payments (status);

CREATE INDEX idx_hold_expired ON seat_holds (expired_at);

CREATE INDEX idx_notification_user ON notifications (user_id);

CREATE INDEX idx_review_user ON reviews (user_id);

CREATE INDEX idx_route_search ON routes (origin_city_id, destination_city_id);

CREATE INDEX idx_trip_search ON trips (route_id, departure_datetime, status);

CREATE INDEX idx_vehicle_type ON vehicles (vehicle_type_id);

CREATE INDEX idx_seat_layout_floor ON seat_layout_details (seat_layout_id, floor_no, row_no);

CREATE INDEX idx_booking_trip_seat ON booking_seats (trip_id, seat_layout_detail_id);

CREATE INDEX idx_hold_trip_seat ON seat_holds (trip_id, seat_layout_detail_id, expired_at);

CREATE INDEX idx_zones_city ON zones (city_id);

CREATE INDEX idx_pickup_filter ON pickup_points (city_id, zone_id, point_category, is_active);

CREATE INDEX idx_payment_transaction_code ON payments (transaction_code);

CREATE INDEX idx_booking_hold_expired ON bookings (hold_expired_at);

CREATE INDEX idx_booking_status_hold ON bookings (status, hold_expired_at);

CREATE INDEX idx_hold_trip_user ON seat_holds (trip_id, user_id);

CREATE INDEX idx_hold_booking ON seat_holds (booking_id);

CREATE INDEX idx_payment_provider_order_code ON payments (provider_order_code);

CREATE INDEX idx_payment_method_status ON payments (payment_method, status);

CREATE INDEX idx_payment_flow_status ON payments (flow_type, status);

CREATE INDEX idx_wallet_user ON wallets (user_id);

CREATE INDEX idx_wallet_tx_wallet ON wallet_transactions (wallet_id);

CREATE INDEX idx_wallet_tx_payment ON wallet_transactions (payment_id);

CREATE INDEX idx_wallet_tx_booking ON wallet_transactions (booking_id);

CREATE INDEX idx_wallet_tx_type ON wallet_transactions (transaction_type);