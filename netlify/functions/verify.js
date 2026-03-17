exports.handler = async (event) => {
  const SUPA_URL = process.env.SUPABASE_URL;
  const SUPA_KEY = process.env.SUPABASE_SERVICE_KEY;

  if (event.httpMethod === "GET") {
    const res = await fetch(`${SUPA_URL}/rest/v1/listings?status=eq.approved&order=created_at.desc`, {
      headers: {
        "apikey": SUPA_KEY,
        "Authorization": `Bearer ${SUPA_KEY}`,
      }
    });
    const data = await res.json();
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Array.isArray(data) ? data : []),
    };
  }

  if (event.httpMethod === "POST") {
    const body = JSON.parse(event.body);

    if (body.action === "save_listing") {
      const res = await fetch(`${SUPA_URL}/rest/v1/listings`, {
        method: "POST",
        headers: {
          "apikey": SUPA_KEY,
          "Authorization": `Bearer ${SUPA_KEY}`,
          "Content-Type": "application/json",
          "Prefer": "return=minimal",
        },
        body: JSON.stringify(body.data),
      });
      const ok = res.status >= 200 && res.status < 300;
      const text = ok ? "" : await res.text();
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ success: ok, error: text }),
      };
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: event.body,
    });
    const text = await response.text();
    return {
      statusCode: response.status,
      headers: { "Content-Type": "application/json" },
      body: text,
    };
  }

  return { statusCode: 405, body: "Method not allowed" };
};
