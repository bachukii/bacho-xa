exports.handler = async (event) => {
  const SUPA_URL = process.env.SUPABASE_URL;
  const SUPA_KEY = process.env.SUPABASE_SERVICE_KEY;
  const supaHeaders = {
    "apikey": SUPA_KEY,
    "Authorization": `Bearer ${SUPA_KEY}`,
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "GET") {
    const res = await fetch(`${SUPA_URL}/rest/v1/listings?status=eq.approved&order=created_at.desc`, {
      headers: supaHeaders
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
        headers: { ...supaHeaders, "Prefer": "return=representation" },
        body: JSON.stringify(body.data),
      });
      const data = await res.json();
      const ok = res.status >= 200 && res.status < 300;
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ success: ok, id: ok ? data[0]?.id : null, error: ok ? null : JSON.stringify(data) }),
      };
    }

    if (body.action === "update_listing") {
      const { id, status } = body;
      const res = await fetch(`${SUPA_URL}/rest/v1/listings?id=eq.${id}`, {
        method: "PATCH",
        headers: { ...supaHeaders, "Prefer": "return=minimal" },
        body: JSON.stringify({ status }),
      });
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ success: res.status >= 200 && res.status < 300 }),
      };
    }

    if (body.action === "get_pending") {
      const adminPass = body.password;
      if (adminPass !== process.env.ADMIN_PASSWORD) {
        return { statusCode: 401, body: JSON.stringify({ error: "არასწორი პაროლი" }) };
      }
      const res = await fetch(`${SUPA_URL}/rest/v1/listings?status=eq.pending&order=created_at.desc`, {
        headers: supaHeaders
      });
      const data = await res.json();
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Array.isArray(data) ? data : []),
      };
    }

    if (body.action === "admin_update") {
      const adminPass = body.password;
      if (adminPass !== process.env.ADMIN_PASSWORD) {
        return { statusCode: 401, body: JSON.stringify({ error: "არასწორი პაროლი" }) };
      }
      const { id, status } = body;
      const res = await fetch(`${SUPA_URL}/rest/v1/listings?id=eq.${id}`, {
        method: "PATCH",
        headers: { ...supaHeaders, "Prefer": "return=minimal" },
        body: JSON.stringify({ status }),
      });
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ success: res.status >= 200 && res.status < 300 }),
      };
    }

    if (body.action === "upload_photo") {
      const { fileName, fileData, contentType } = body;
      const res = await fetch(`${SUPA_URL}/storage/v1/object/listings/${fileName}`, {
        method: "POST",
        headers: {
          "apikey": SUPA_KEY,
          "Authorization": `Bearer ${SUPA_KEY}`,
          "Content-Type": contentType,
          "x-upsert": "true",
        },
        body: Buffer.from(fileData, "base64"),
      });
      const ok = res.status >= 200 && res.status < 300;
      const url = `${SUPA_URL}/storage/v1/object/public/listings/${fileName}`;
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ success: ok, url }),
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
