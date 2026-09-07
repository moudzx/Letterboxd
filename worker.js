// Cloudflare Worker: minimal proxy for letterboxd.com only.
// Deploy this on workers.dev, then point the frontend WORKER_URL at it.

const ALLOWED_HOST = "letterboxd.com";

// After you deploy the frontend, replace "*" with your real origin,
// e.g. "https://yourusername.github.io" — this stops random sites
// from riding on your worker's request quota.
const ALLOWED_ORIGIN = "*";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
}

export default {
  async fetch(request) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders() });
    }

    const requestUrl = new URL(request.url);
    const target = requestUrl.searchParams.get("url");

    if (!target) {
      return new Response("Missing 'url' query parameter", {
        status: 400,
        headers: corsHeaders()
      });
    }

    let targetUrl;
    try {
      targetUrl = new URL(target);
    } catch (err) {
      return new Response("Invalid 'url' parameter", {
        status: 400,
        headers: corsHeaders()
      });
    }

    const host = targetUrl.hostname;
    if (host !== ALLOWED_HOST && !host.endsWith("." + ALLOWED_HOST)) {
      return new Response("This proxy only allows requests to " + ALLOWED_HOST, {
        status: 403,
        headers: corsHeaders()
      });
    }

    try {
      const upstream = await fetch(targetUrl.toString(), {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml"
        }
      });

      const body = await upstream.text();
      return new Response(body, {
        status: upstream.status,
        headers: {
          ...corsHeaders(),
          "Content-Type": upstream.headers.get("Content-Type") || "text/html; charset=utf-8"
        }
      });
    } catch (err) {
      return new Response("Upstream fetch failed: " + (err && err.message ? err.message : String(err)), {
        status: 502,
        headers: corsHeaders()
      });
    }
  }
};
