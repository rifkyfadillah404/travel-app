'use strict';
const bcrypt = require('bcryptjs');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const hashedPassword = await bcrypt.hash('password123', 10);

    // Seed Groups
    await queryInterface.bulkInsert('groups', [
      {
        name: 'Rombongan Umroh Jakarta 2026',
        destination: 'Mecca & Medina, Saudi Arabia',
        join_code: 'UMR-JKT26',
        departure_date: '2026-01-10',
        return_date: '2026-01-20',
        departure_airport: 'Soekarno-Hatta International Airport',
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Wisata Halal Jepang Winter',
        destination: 'Tokyo, Japan',
        join_code: 'JPN-WIN26',
        departure_date: '2026-02-15',
        return_date: '2026-02-22',
        departure_airport: 'Soekarno-Hatta International Airport',
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);

    const groups = await queryInterface.sequelize.query(`SELECT id from \`groups\` WHERE join_code = 'UMR-JKT26'`);
    const groupId = groups[0][0].id;

    // Seed Users
    await queryInterface.bulkInsert('users', [
      {
        name: 'Admin ITJ',
        phone: '081200000000',
        password: hashedPassword,
        qr_token: 'ADM001-a1b2c3d4e5f6',
        group_id: groupId,
        role: 'admin',
        is_online: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        name: 'Ahmad Fadli',
        phone: '081234567890',
        password: hashedPassword,
        qr_token: 'USR001-x1y2z3w4v5u6',
        group_id: groupId,
        role: 'pembimbing',
        is_online: true,
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('users', null, {});
    await queryInterface.bulkDelete('groups', null, {});
  }
};
