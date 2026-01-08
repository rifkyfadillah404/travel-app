-- =====================================================
-- UPDATE LOKASI USER KE INDONESIA (Jakarta Area)
-- Jalankan query ini di phpMyAdmin/MySQL
-- =====================================================

-- Hapus semua lokasi lama
DELETE FROM `user_locations`;

-- Insert lokasi baru di sekitar Jakarta (Monas area)
INSERT INTO `user_locations` (`user_id`, `latitude`, `longitude`) VALUES
(2, -6.1754, 106.8272),   -- Ahmad Fadli - Monas
(3, -6.1780, 106.8290),   -- Siti Aminah - Gambir
(4, -6.1730, 106.8250),   -- Muhammad Rizki - Lapangan Banteng
(5, -6.1760, 106.8310),   -- Fatimah Zahra - Masjid Istiqlal
(6, -6.1800, 106.8230),   -- Abdul Rahman - Tanah Abang
(7, -6.1720, 106.8280),   -- Khadijah Nur - Medan Merdeka
(9, -6.1850, 106.8350);   -- Aisyah Putri - Menteng

-- Verifikasi hasil
SELECT u.name, ul.latitude, ul.longitude 
FROM user_locations ul 
JOIN users u ON u.id = ul.user_id 
ORDER BY ul.recorded_at DESC;
