require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

class MigrationRunner {
  constructor(pool) {
    this.pool = pool;
  }

  async init() {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  async getMigrations() {
    const migrationsDir = path.join(process.cwd(), 'migrations');
    
    if (!fs.existsSync(migrationsDir)) {
      return [];
    }

    const files = fs.readdirSync(migrationsDir);
    const migrations = [];

    for (const file of files) {
      if (file.endsWith('.sql')) {
        const id = file.replace('.sql', '');
        const name = id;
        const sqlContent = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
        migrations.push({ id, name, sql: sqlContent });
      }
    }

    return migrations.sort((a, b) => a.id.localeCompare(b.id));
  }

  async getExecutedMigrations() {
    const result = await this.pool.query('SELECT id FROM migrations ORDER BY id');
    return result.rows.map(row => row.id);
  }

  async executeMigration(migration) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(migration.sql);
      await client.query(
        'INSERT INTO migrations (id, name, executed_at) VALUES ($1, $2, CURRENT_TIMESTAMP)',
        [migration.id, migration.name]
      );
      await client.query('COMMIT');
      console.log(`Migration executed: ${migration.id}`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async runMigrations() {
    await this.init();
    
    const allMigrations = await this.getMigrations();
    const executedMigrations = await this.getExecutedMigrations();
    
    const pendingMigrations = allMigrations.filter(
      migration => !executedMigrations.includes(migration.id)
    );

    if (pendingMigrations.length === 0) {
      console.log('No pending migrations');
      return;
    }

    console.log(`Running ${pendingMigrations.length} migrations...`);
    
    for (const migration of pendingMigrations) {
      await this.executeMigration(migration);
    }
  }
}

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl:
    process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: false }
      : false,
});


async function runMigrations() {
  const migrationRunner = new MigrationRunner(pool);
  
  try {
    await migrationRunner.runMigrations();
    console.log('All migrations completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigrations();