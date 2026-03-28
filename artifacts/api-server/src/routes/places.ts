import { Router, type IRouter } from "express";

const router: IRouter = Router();

const PLACES_BASE = "https://places.googleapis.com/v1";

function apiKey(): string {
  return process.env.GOOGLE_API_KEY ?? "";
}

router.post("/places/autocomplete", async (req, res) => {
  const key = apiKey();
  if (!key) { res.status(503).json({ error: "Places API not configured" }); return; }

  const { input } = req.body as { input?: string };
  if (!input || input.length < 2) { res.json({ suggestions: [] }); return; }

  try {
    const upstream = await fetch(`${PLACES_BASE}/places:autocomplete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
      },
      body: JSON.stringify({
        input,
        includedPrimaryTypes: ["street_address", "premise", "subpremise"],
        languageCode: "en",
      }),
    });
    const data = await upstream.json();
    res.status(upstream.ok ? 200 : upstream.status).json(data);
  } catch (err) {
    res.status(502).json({ error: "Places API request failed" });
  }
});

router.get("/places/:placeId", async (req, res) => {
  const key = apiKey();
  if (!key) { res.status(503).json({ error: "Places API not configured" }); return; }

  const { placeId } = req.params;
  try {
    const upstream = await fetch(
      `${PLACES_BASE}/places/${placeId}?fields=location,addressComponents,formattedAddress`,
      { headers: { "X-Goog-Api-Key": key } }
    );
    const data = await upstream.json();
    res.status(upstream.ok ? 200 : upstream.status).json(data);
  } catch (err) {
    res.status(502).json({ error: "Places API request failed" });
  }
});

export default router;
