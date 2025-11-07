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
        id,
        detail,
        created_at
      FROM documents
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);
    
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error fetching documents:', error);
    return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { detail } = await request.json();
    
    if (!detail) {
      return NextResponse.json({ error: 'Detail is required' }, { status: 400 });
    }

    const result = await pool.query(`
      INSERT INTO documents (user_id, detail) 
      VALUES (0, $1) 
      RETURNING id, user_id, detail, created_at
    `, [detail]);
    
    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    console.error('Error creating document:', error);
    return NextResponse.json({ error: 'Failed to create document' }, { status: 500 });
  }
}