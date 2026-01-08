-- ITJ Travel Tools Database Schema
-- Run this in MySQL/phpMyAdmin

USE db_travel;

-- Groups table
CREATE TABLE IF NOT EXISTS `groups` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `destination` VARCHAR(100),
  `join_code` VARCHAR(10) UNIQUE,
  `departure_date` DATE NOT NULL,
  `return_date` DATE NOT NULL,
  `departure_airport` VARCHAR(255) NOT NULL,
  `is_active` BOOLEAN DEFAULT TRUE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Users table
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `phone` VARCHAR(20) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `qr_token` VARCHAR(64) UNIQUE,
  `avatar` VARCHAR(255),
  `group_id` INT,
  `role` ENUM('jamaah', 'pembimbing', 'admin') DEFAULT 'jamaah',
  `is_online` BOOLEAN DEFAULT FALSE,
  `is_panic` BOOLEAN DEFAULT FALSE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON DELETE SET NULL
);

-- User locations table (for GPS tracking)
CREATE TABLE IF NOT EXISTS `user_locations` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `latitude` DECIMAL(10, 8) NOT NULL,
  `longitude` DECIMAL(11, 8) NOT NULL,
  `recorded_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);

-- Panic alerts table
CREATE TABLE IF NOT EXISTS `panic_alerts` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `message` TEXT,
  `latitude` DECIMAL(10, 8),
  `longitude` DECIMAL(11, 8),
  `is_resolved` BOOLEAN DEFAULT FALSE,
  `resolved_by` INT,
  `resolved_at` TIMESTAMP NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`resolved_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
);

-- App settings table
CREATE TABLE IF NOT EXISTS `app_settings` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `group_id` INT NOT NULL,
  `is_gps_active` BOOLEAN DEFAULT TRUE,
  `tracking_interval` INT DEFAULT 30,
  `radius_limit` INT DEFAULT 500,
  `is_app_active` BOOLEAN DEFAULT TRUE,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON DELETE CASCADE
);

-- Itinerary table
CREATE TABLE IF NOT EXISTS `itinerary` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `group_id` INT NOT NULL,
  `day` INT NOT NULL,
  `date` DATE NOT NULL,
  `time` TIME NOT NULL,
  `activity` VARCHAR(255) NOT NULL,
  `location` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `icon` VARCHAR(50) DEFAULT 'calendar',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON DELETE CASCADE
);

-- Notifications table
CREATE TABLE IF NOT EXISTS `notifications` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `group_id` INT NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `content` TEXT NOT NULL,
  `type` ENUM('info', 'warning', 'success', 'announcement') DEFAULT 'info',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON DELETE CASCADE
);

-- =====================================================
-- MIGRATION: Run these if you already have the tables
-- =====================================================
-- ALTER TABLE `groups` ADD COLUMN `destination` VARCHAR(100) AFTER `name`;
-- ALTER TABLE `groups` ADD COLUMN `join_code` VARCHAR(10) UNIQUE AFTER `destination`;
-- ALTER TABLE `users` ADD COLUMN `qr_token` VARCHAR(64) UNIQUE AFTER `password`;
-- ALTER TABLE `users` ADD COLUMN `avatar` VARCHAR(255) AFTER `qr_token`;

-- =====================================================
-- SAMPLE DATA
-- =====================================================

-- Insert sample group
INSERT INTO `groups` (`name`, `destination`, `join_code`, `departure_date`, `return_date`, `departure_airport`) VALUES
('Rombongan Umroh Jakarta 2026', 'Mecca & Medina, Saudi Arabia', 'UMR-JKT26', '2026-01-10', '2026-01-20', 'Soekarno-Hatta International Airport'),
('Wisata Halal Jepang Winter', 'Tokyo, Japan', 'JPN-WIN26', '2026-02-15', '2026-02-22', 'Soekarno-Hatta International Airport');

-- Insert sample users with QR tokens
-- Password: password123 (properly hashed)
INSERT INTO `users` (`name`, `phone`, `password`, `qr_token`, `group_id`, `role`, `is_online`) VALUES
('Admin ITJ', '081200000000', '$2a$10$sF1LasBV./72wPzUrfLaBeW05obG.5850TNUBbtl5txrVx.eINhI.', 'ADM001-a1b2c3d4e5f6', 1, 'admin', TRUE),
('Ahmad Fadli', '081234567890', '$2a$10$sF1LasBV./72wPzUrfLaBeW05obG.5850TNUBbtl5txrVx.eINhI.', 'USR001-x1y2z3w4v5u6', 1, 'pembimbing', TRUE),
('Siti Aminah', '081234567891', '$2a$10$sF1LasBV./72wPzUrfLaBeW05obG.5850TNUBbtl5txrVx.eINhI.', 'USR002-a2b3c4d5e6f7', 1, 'jamaah', TRUE),
('Muhammad Rizki', '081234567892', '$2a$10$sF1LasBV./72wPzUrfLaBeW05obG.5850TNUBbtl5txrVx.eINhI.', 'USR003-g3h4i5j6k7l8', 1, 'jamaah', FALSE),
('Fatimah Zahra', '081234567893', '$2a$10$sF1LasBV./72wPzUrfLaBeW05obG.5850TNUBbtl5txrVx.eINhI.', 'USR004-m4n5o6p7q8r9', 1, 'jamaah', TRUE),
('Abdul Rahman', '081234567894', '$2a$10$sF1LasBV./72wPzUrfLaBeW05obG.5850TNUBbtl5txrVx.eINhI.', 'USR005-s5t6u7v8w9x0', 1, 'jamaah', TRUE),
('Khadijah Nur', '081234567895', '$2a$10$sF1LasBV./72wPzUrfLaBeW05obG.5850TNUBbtl5txrVx.eINhI.', 'USR006-y6z7a8b9c0d1', 1, 'jamaah', TRUE),
('Umar Said', '081234567896', '$2a$10$sF1LasBV./72wPzUrfLaBeW05obG.5850TNUBbtl5txrVx.eINhI.', 'USR007-e7f8g9h0i1j2', 1, 'jamaah', FALSE),
('Aisyah Putri', '081234567897', '$2a$10$sF1LasBV./72wPzUrfLaBeW05obG.5850TNUBbtl5txrVx.eINhI.', 'USR008-k8l9m0n1o2p3', 1, 'jamaah', TRUE);

-- Insert sample locations (Jakarta area - for testing in Indonesia)
-- Lokasi sekitar Monas, Jakarta Pusat
INSERT INTO `user_locations` (`user_id`, `latitude`, `longitude`) VALUES
(2, -6.1754, 106.8272),   -- Monas
(3, -6.1780, 106.8290),   -- Gambir
(4, -6.1730, 106.8250),   -- Lapangan Banteng
(5, -6.1760, 106.8310),   -- Masjid Istiqlal
(6, -6.1800, 106.8230),   -- Tanah Abang
(7, -6.1720, 106.8280),   -- Medan Merdeka
(9, -6.1850, 106.8350);   -- Menteng

-- Insert app settings
INSERT INTO `app_settings` (`group_id`, `is_gps_active`, `tracking_interval`, `radius_limit`, `is_app_active`) VALUES
(1, TRUE, 30, 500, TRUE);
