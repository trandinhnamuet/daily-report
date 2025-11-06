import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

export interface Migration {
  id: string;
  name: string;
  sql: string;
}

export class MigrationRunner {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async init() {
    // Tạo bảng migrations nếu chưa có
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  async getMigrations(): Promise<Migration[]> {
    const migrationsDir = path.join(process.cwd(), 'migrations');
    
    if (!fs.existsSync(migrationsDir)) {
      return [];
    }

    const files = fs.readdirSync(migrationsDir);
    const migrations: Migration[] = [];

    for (const file of files) {
      if (file.endsWith('.sql')) {
        const id = file.replace('.sql', '');
        const name = id.replace(/^\d+_/, '');
        const sqlContent = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
        migrations.push({ id, name, sql: sqlContent });
      }
    }

    return migrations.sort((a, b) => a.id.localeCompare(b.id));
  }

  async getExecutedMigrations(): Promise<string[]> {
    const result = await this.pool.query('SELECT id FROM migrations ORDER BY id');
    return result.rows.map(row => row.id);
  }

  async executeMigration(migration: Migration) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(migration.sql);
      await client.query(
        'INSERT INTO migrations (id, name) VALUES ($1, $2)',
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