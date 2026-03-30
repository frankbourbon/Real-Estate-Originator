import { Router, type IRouter } from "express";

const router: IRouter = Router();

const NFHL_URL =
  "https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer/28/query";

/**
 * GET /flood/zones?lat=&lng=
 *
 * Server-side proxy for the FEMA National Flood Hazard Layer (NFHL) ArcGIS
 * REST service. FEMA's endpoint does not support CORS, so all client requests
 * must route through here.
 *
 * Returns all flood hazard zone polygons that intersect the supplied point.
 * A single parcel can straddle multiple zones.
 */
router.get("/flood/zones", async (req, res) => {
  const { lat, lng } = req.query as Record<string, string | undefined>;

  if (!lat || !lng) {
    res.status(400).json({ error: "lat and lng parameters are required" });
    return;
  }

  const latNum = parseFloat(lat);
  const lngNum = parseFloat(lng);

  if (isNaN(latNum) || isNaN(lngNum)) {
    res.status(400).json({ error: "lat and lng must be valid numbers" });
    return;
  }

  const geometry = JSON.stringify({
    x: lngNum,
    y: latNum,
    spatialReference: { wkid: 4326 },
  });

  const body = new URLSearchParams({
    geometry,
    geometryType: "esriGeometryPoint",
    spatialRel: "esriSpatialRelIntersects",
    outFields: "FLD_ZONE,ZONE_SUBTY,SFHA_TF,STATIC_BFE,DEPTH,V_DATUM",
    returnGeometry: "false",
    f: "json",
  });

  try {
    const upstream = await fetch(NFHL_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    if (!upstream.ok) {
      res.status(502).json({ error: `FEMA NFHL returned ${upstream.status}` });
      return;
    }

    const json = await upstream.json() as any;

    if (json?.error) {
      res.status(502).json({ error: json.error.message ?? "FEMA NFHL query failed" });
      return;
    }

    const zones = (json?.features ?? []).map((f: any) => ({
      fldZone:   f.attributes?.FLD_ZONE   ?? null,
      zoneSubty: f.attributes?.ZONE_SUBTY ?? null,
      sfhaTf:    f.attributes?.SFHA_TF    ?? null,
      staticBfe: f.attributes?.STATIC_BFE ?? null,
      depth:     f.attributes?.DEPTH      ?? null,
      vDatum:    f.attributes?.V_DATUM    ?? null,
    }));

    res.json({ zones });
  } catch (err) {
    res.status(502).json({ error: "FEMA NFHL request failed" });
  }
});

export default router;
