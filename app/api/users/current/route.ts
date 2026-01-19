import { cookies } from 'next/headers';

export async function GET() {
  const cookieStore = await cookies();
  const userId = cookieStore.get('current_user_id')?.value;

  if (!userId) {
    return new Response(null, { status: 204 });
  }

  return Response.json({
    id: Number(userId),
    name: `User ${userId}`,
  });
}
