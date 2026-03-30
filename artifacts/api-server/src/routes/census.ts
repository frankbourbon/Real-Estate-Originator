import { Router, type IRouter } from "express";

const router: IRouter = Router();

const CENSUS_BASE = "https://geocoding.geo.census.gov/geocoder/geographies/address";

/**
 * GET /census/geocode?street=...&city=...&state=...&zip=...
 *
 * Server-side proxy for the U.S. Census Bureau Geocoding API.
 * The Census API does not support CORS, so mobile clients must route
 * all requests through this endpoint.
 */
router.get("/census/geocode", async (req, res) => {
  const { street, city, state, zip } = req.query as Record<string, string | undefined>;

  if (!street) {
    res.status(400).json({ error: "street parameter is required" });
    return;
  }

  const params = new URLSearchParams({
    street,
    ...(city  ? { city }  : {}),
    ...(state ? { state } : {}),
    ...(zip   ? { zip }   : {}),
    benchmark: "Public_AR_Current",
    vintage:   "Current_Current",
    format:    "json",
  });

  try {
    const upstream = await fetch(`${CENSUS_BASE}?${params.toString()}`, {
      headers: { Accept: "application/json" },
    });

    if (!upstream.ok) {
      res.status(502).json({ error: `Census API returned ${upstream.status}` });
      return;
    }

    const data = await upstream.json();
    res.json(data);
  } catch (err) {
    res.status(502).json({ error: "Census API request failed" });
  }
});

export default router;
