import pool from '../lib/db';
import { MigrationRunner } from '../lib/migrations';

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