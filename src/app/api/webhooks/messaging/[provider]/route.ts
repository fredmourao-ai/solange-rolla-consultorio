export async function POST(request: Request, context: { params: Promise<{ provider: string }> }) {
  void context
  return Response.json({ error: 'provider not configured' }, { status: 501 })
}
