import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const { Pool } = pg;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false,
});

pool.query('SELECT NOW()')
    .then(res => {
        console.log('✅ Connection successful:', res.rows[0]);
        process.exit(0);
    })
    .catch(err => {
        console.error('❌ Connection failed:');
        console.error(err.message);
        if (err.code === '28P01') console.error('   Hint: Password authentication failed. Check your password in .env.local');
        if (err.code === '28000') console.error('   Hint: IP restriction (pg_hba.conf). Check if your IP is allowed.');
        if (err.code === 'ECONNREFUSED') console.error('   Hint: Database server is not running or port is wrong.');
        process.exit(1);
    });
