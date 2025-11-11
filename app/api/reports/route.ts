import { NextRequest, NextResponse } from 'next/server';
import pool from '../../../lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    const result = await pool.query(`
      SELECT 
        dr.id,
        dr.message,
        dr.created_at,
        u.name as user_name,
        u.id as user_id
      FROM daily_report.daily_report dr
      JOIN daily_report.users u ON dr.user_id = u.id
      ORDER BY dr.created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);
    
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error fetching reports:', error);
    return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user_id, message } = await request.json();
    
    if (!user_id || !message) {
      return NextResponse.json({ error: 'User ID and message are required' }, { status: 400 });
    }

    const result = await pool.query(`
      INSERT INTO daily_report.daily_report (user_id, message) 
      VALUES ($1, $2) 
      RETURNING id, user_id, message, created_at
    `, [user_id, message]);
    
    // Get user name for response
    const userResult = await pool.query('SELECT name FROM daily_report.users WHERE id = $1', [user_id]);
    const report = result.rows[0];
    report.user_name = userResult.rows[0]?.name;
    
    return NextResponse.json(report, { status: 201 });
  } catch (error) {
    console.error('Error creating report:', error);
    return NextResponse.json({ error: 'Failed to create report' }, { status: 500 });
  }
}