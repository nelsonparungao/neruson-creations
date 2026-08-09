// Vercel serverless function — /api/content
// This is the ONLY place the Supabase service-role key is used, so it
// never reaches the browser. The public site reads content directly
// from Supabase with the public anon key (see js/data.js) — RLS only
// allows that key to SELECT, never write. All writes (from admin.js)
// come through here instead.
//
// This route is protected by middleware.js (Basic Auth), same as
// admin.html, so only you can actually save changes.

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    res.status(500).json({ error: "Supabase environment variables are not configured on Vercel." });
    return;
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch (e) {
      res.status(400).json({ error: "Invalid JSON body" });
      return;
    }
  }

  if (!body || typeof body.data !== "object") {
    res.status(400).json({ error: "Request must include a 'data' object." });
    return;
  }

  try {
    const upstream = await fetch(`${SUPABASE_URL}/rest/v1/site_content?on_conflict=id`, {
      method: "POST",
      headers: {
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal"
      },
      body: JSON.stringify({
        id: "main",
        data: body.data,
        updated_at: new Date().toISOString()
      })
    });

    if (!upstream.ok) {
      const detail = await upstream.text();
      res.status(502).json({ error: "Supabase rejected the write.", detail });
      return;
    }

    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: "Unexpected error saving content.", detail: String(e) });
  }
};
