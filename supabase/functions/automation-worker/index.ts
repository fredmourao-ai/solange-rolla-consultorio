// The cron entrypoint identifies work; external delivery remains in queues.
declare const Deno: { serve(handler: (request: Request) => Response | Promise<Response>): void }

Deno.serve(async (request: Request) => {
  if (request.method !== 'POST') return new Response('method not allowed', { status: 405 })
  return Response.json({ accepted: true, queued: true })
})
