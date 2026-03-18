exports.handler = async (event) => {
  const SUPA_URL = process.env.SUPABASE_URL;
  const SUPA_KEY = process.env.SUPABASE_SERVICE_KEY;
  const h = {
    "apikey": SUPA_KEY,
    "Authorization": `Bearer ${SUPA_KEY}`,
    "Content-Type": "application/json",
  };

  const adminPass = process.env.ADMIN_PASSWORD;

  if (event.httpMethod === "GET") {
    const res = await fetch(`${SUPA_URL}/rest/v1/listings?status=eq.approved&order=created_at.desc`, { headers: h });
    const data = await res.json();
    return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify(Array.isArray(data) ? data : []) };
  }

  if (event.httpMethod === "POST") {
    const body = JSON.parse(event.body);

    // ─── AUTH ───────────────────────────────────────────────────
    if (body.action === "register") {
      const { email, password, firstName, lastName, personalNumber, phone } = body;
      const res = await fetch(`${SUPA_URL}/auth/v1/signup`, {
        method: "POST",
        headers: { "apikey": SUPA_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (data.error || !data.user) return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ success: false, error: data.error?.message || "რეგისტრაცია ვერ მოხდა" }) };
      const uid = data.user.id;
      await fetch(`${SUPA_URL}/rest/v1/profiles`, {
        method: "POST",
        headers: { ...h, "Prefer": "return=minimal" },
        body: JSON.stringify({ id: uid, first_name: firstName, last_name: lastName, personal_number: personalNumber, phone, id_verified: false })
      });
      return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ success: true, user: data.user, session: data.session }) };
    }

    if (body.action === "login") {
      const { email, password } = body;
      const res = await fetch(`${SUPA_URL}/auth/v1/token?grant_type=password`, {
        method: "POST",
        headers: { "apikey": SUPA_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (data.error) return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ success: false, error: data.error_description || data.error }) };
      return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ success: true, user: data.user, session: data }) };
    }

    if (body.action === "get_profile") {
      const { token } = body;
      const userRes = await fetch(`${SUPA_URL}/auth/v1/user`, { headers: { "apikey": SUPA_KEY, "Authorization": `Bearer ${token}` } });
      const user = await userRes.json();
      if (!user.id) return { statusCode: 401, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "Unauthorized" }) };
      const profRes = await fetch(`${SUPA_URL}/rest/v1/profiles?id=eq.${user.id}`, { headers: h });
      const profiles = await profRes.json();
      const listRes = await fetch(`${SUPA_URL}/rest/v1/listings?user_id=eq.${user.id}&order=created_at.desc`, { headers: h });
      const listings = await listRes.json();
      return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ user, profile: profiles[0] || null, listings: Array.isArray(listings) ? listings : [] }) };
    }

    if (body.action === "set_id_verified") {
      const { token } = body;
      const userRes = await fetch(`${SUPA_URL}/auth/v1/user`, { headers: { "apikey": SUPA_KEY, "Authorization": `Bearer ${token}` } });
      const user = await userRes.json();
      if (!user.id) return { statusCode: 401, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: "Unauthorized" }) };
      await fetch(`${SUPA_URL}/rest/v1/profiles?id=eq.${user.id}`, {
        method: "PATCH",
        headers: { ...h, "Prefer": "return=minimal" },
        body: JSON.stringify({ id_verified: true, id_verified_at: new Date().toISOString() })
      });
      return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ success: true }) };
    }

    // ─── LISTINGS ───────────────────────────────────────────────
    if (body.action === "save_listing") {
      const res = await fetch(`${SUPA_URL}/rest/v1/listings`, {
        method: "POST",
        headers: { ...h, "Prefer": "return=representation" },
        body: JSON.stringify(body.data),
      });
      const data = await res.json();
      const ok = res.status >= 200 && res.status < 300;
      return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ success: ok, id: ok ? data[0]?.id : null, error: ok ? null : JSON.stringify(data) }) };
    }

    if (body.action === "update_listing") {
      const { id, ...updates } = body;
      delete updates.action;
      const res = await fetch(`${SUPA_URL}/rest/v1/listings?id=eq.${id}`, {
        method: "PATCH",
        headers: { ...h, "Prefer": "return=minimal" },
        body: JSON.stringify(updates),
      });
      return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ success: res.status >= 200 && res.status < 300 }) };
    }

    if (body.action === "upload_photo") {
      const { fileName, fileData, contentType } = body;
      const res = await fetch(`${SUPA_URL}/storage/v1/object/listings/${fileName}`, {
        method: "POST",
        headers: { "apikey": SUPA_KEY, "Authorization": `Bearer ${SUPA_KEY}`, "Content-Type": contentType, "x-upsert": "true" },
        body: Buffer.from(fileData, "base64"),
      });
      const ok = res.status >= 200 && res.status < 300;
      return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ success: ok, url: `${SUPA_URL}/storage/v1/object/public/listings/${fileName}` }) };
    }

    // ─── ADMIN ──────────────────────────────────────────────────
    if (body.action === "get_pending") {
      if (body.password !== adminPass) return { statusCode: 401, body: JSON.stringify({ error: "არასწორი პაროლი" }) };
      const res = await fetch(`${SUPA_URL}/rest/v1/listings?status=eq.pending&order=created_at.desc`, { headers: h });
      const data = await res.json();
      return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify(Array.isArray(data) ? data : []) };
    }

    if (body.action === "admin_update") {
      if (body.password !== adminPass) return { statusCode: 401, body: JSON.stringify({ error: "არასწორი პაროლი" }) };
      const res = await fetch(`${SUPA_URL}/rest/v1/listings?id=eq.${body.id}`, {
        method: "PATCH",
        headers: { ...h, "Prefer": "return=minimal" },
        body: JSON.stringify({ status: body.status }),
      });
      return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ success: res.status >= 200 && res.status < 300 }) };
    }

    // ─── CLAUDE AI ──────────────────────────────────────────────
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      body: event.body,
    });
    const text = await response.text();
    return { statusCode: response.status, headers: { "Content-Type": "application/json" }, body: text };
  }

  return { statusCode: 405, body: "Method not allowed" };
};
