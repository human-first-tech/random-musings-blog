import { NextRequest, NextResponse } from 'next/server';

const CLIENT_ID = process.env.GITHUB_CLIENT_ID!;
const CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET!;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.d-island-girl.com';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug?: string[] }> }
) {
  const { slug } = await params;
  const action = slug?.[0];

  if (action === 'callback') {
    const code = request.nextUrl.searchParams.get('code');
    if (!code) return new NextResponse('Missing code', { status: 400 });

    const res = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, code }),
    });
    const { access_token: token, error } = await res.json() as { access_token?: string; error?: string };
    if (!token) return new NextResponse(`Auth error: ${error ?? 'no token'}`, { status: 400 });

    const payload = Buffer.from(JSON.stringify({ token, provider: 'github' })).toString('base64');
    const html = `<!DOCTYPE html><html><body><script>
(function() {
  var data = JSON.parse(atob(${JSON.stringify(payload)}));
  var msg = 'authorization:github:success:' + JSON.stringify(data);
  function send(e) { window.opener.postMessage(msg, e.origin); window.removeEventListener('message', send); }
  window.addEventListener('message', send, false);
  window.opener.postMessage('authorizing:github', '*');
})();
</script></body></html>`;
    return new NextResponse(html, { headers: { 'Content-Type': 'text/html' } });
  }

  const callback = `${SITE_URL}/api/auth/callback`;
  const url = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(callback)}&scope=repo`;
  return NextResponse.redirect(url);
}
