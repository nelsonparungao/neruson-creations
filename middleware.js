// Vercel Edge Middleware — password-protects /admin.html
// Place this file at the ROOT of your project (same level as index.html).
// Vercel auto-detects a root-level middleware.js file for any project type.

export const config = {
  matcher: '/admin.html',
};

export default function middleware(request) {
  const authHeader = request.headers.get('authorization');

  const expectedUser = process.env.ADMIN_USER;
  const expectedPass = process.env.ADMIN_PASS;

  if (authHeader && authHeader.startsWith('Basic ')) {
    const base64Credentials = authHeader.split(' ')[1];
    const decoded = atob(base64Credentials);
    const [providedUser, providedPass] = decoded.split(':');

    if (providedUser === expectedUser && providedPass === expectedPass) {
      return; // credentials match — let the request through
    }
  }

  return new Response('Authentication required', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Neruson Admin"',
    },
  });
}
