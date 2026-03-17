const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

exports.handler = async (event) => {
  if (event.httpMethod === "GET") {
    const { data, error } = await supabase
      .from("listings")
      .select("*")
      .eq("status", "approved")
      .order("created_at", { ascending: false });
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(error ? [] : data),
    };
  }

  if (event.httpMethod === "POST") {
    const body = JSON.parse(event.body);

    if (body.action === "save_listing") {
      const { error } = await supabase.from("listings").insert([body.data]);
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ success: !error, error: error?.message }),
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
