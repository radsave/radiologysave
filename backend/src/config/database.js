const knex = require('knex');
require('dotenv').config();

const env = process.env.NODE_ENV || 'development';
const configs = require('./knexfile');

const db = knex(configs[env]);

db.raw('SELECT 1')
  .then(() => console.log('✅ PostgreSQL connected'))
  .catch((err) => {
    console.error('❌ Database connection failed:', err.message);
    process.exit(1);
  });

module.exports = db;
