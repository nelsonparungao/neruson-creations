// Vercel serverless function — /api/comments
// Public visitors post and read comments by talking to Supabase directly
// with the anon key (see js/data.js) — Row Level Security lets that key
// INSERT and SELECT on the comments table, but never UPDATE or DELETE.
//
// Deleting a comment (moderation) is the one write that needs the
// service-role key, so it comes through here instead — same pattern as
// /api/content. This route is covered by middleware.js's existing
// `/api/:path*` matcher, so only you (logged into admin.html) can hit it.

module.exports = async (req, res) => {
  if (req.method !== "DELETE") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { id } = req.query;
  if (!id) {
    res.status(400).json({ error: "Missing 'id' query parameter." });
    return;
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    res.status(500).json({ error: "Supabase environment variables are not configured on Vercel." });
    return;
  }

  try {
    const upstream = await fetch(
      `${SUPABASE_URL}/rest/v1/comments?id=eq.${encodeURIComponent(id)}`,
      {
        method: "DELETE",
        headers: {
          apikey: SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`
        }
      }
    );

    if (!upstream.ok) {
      const detail = await upstream.text();
      res.status(502).json({ error: "Supabase rejected the delete.", detail });
      return;
    }

    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: "Unexpected error deleting comment.", detail: String(e) });
  }
};
