import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useRef, useState } from "react";

import type { PropertyLocation } from "@/services/core";

// ─── Types ────────────────────────────────────────────────────────────────────

export type CensusData = {
  locationId: string;
  fetchedAt: string;

  /** Standardized address as returned by the Census geocoder */
  matchedAddress: string;

  /** Lat/Lng from the Census geocoder (may differ slightly from Google) */
  cenLat: string;
  cenLng: string;

  /** State FIPS code (2-digit, e.g. "42" for PA) */
  stateFips: string;
  stateName: string;

  /** County FIPS code (3-digit, e.g. "101") */
  countyFips: string;
  countyName: string;

  /** Full County GEOID = stateFips + countyFips */
  countyGeoid: string;

  /** Census Tract code (6-digit with leading zeros) */
  tract: string;

  /** Full Tract GEOID = stateFips + countyFips + tract */
  tractGeoid: string;

  /** Block Group number */
  blockGroup: string;

  /** Full Block Group GEOID */
  blockGroupGeoid: string;

  /** Congressional district name/number */
  congressionalDistrict: string;

  /** Incorporated place or census-designated place name */
  placeName: string;
};

// ─── Storage ──────────────────────────────────────────────────────────────────

const STORAGE_PREFIX = "svc_census_v1_";

async function loadCached(locationId: string): Promise<CensusData | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_PREFIX + locationId);
    return raw ? (JSON.parse(raw) as CensusData) : null;
  } catch {
    return null;
  }
}

async function saveCache(data: CensusData): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_PREFIX + data.locationId, JSON.stringify(data));
  } catch {}
}

async function deleteCache(locationId: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_PREFIX + locationId);
  } catch {}
}

// ─── API ──────────────────────────────────────────────────────────────────────

/** Proxy base — routes through our API server to avoid CORS restrictions. */
function censusProxyBase(): string {
  const domain = process.env.EXPO_PUBLIC_DOMAIN ?? "";
  if (!domain) throw new Error("EXPO_PUBLIC_DOMAIN not set — cannot reach API server.");
  return `https://${domain}/api/census/geocode`;
}

function extractFirst(geographies: Record<string, any[]>, key: string): Record<string, any> | null {
  return geographies?.[key]?.[0] ?? null;
}

function firstKey(geo: Record<string, any[]>, keys: string[]): Record<string, any> | null {
  for (const k of keys) {
    const r = extractFirst(geo, k);
    if (r) return r;
  }
  return null;
}

export async function fetchCensusForLocation(loc: PropertyLocation): Promise<CensusData> {
  if (!loc.streetAddress) throw new Error("Street address is required for Census lookup.");

  const params = new URLSearchParams({
    street: loc.streetAddress,
    ...(loc.city ? { city: loc.city } : {}),
    ...(loc.state ? { state: loc.state } : {}),
    ...(loc.zipCode ? { zip: loc.zipCode } : {}),
  });

  const url = `${censusProxyBase()}?${params.toString()}`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Census lookup failed: ${resp.status}`);

  const json = await resp.json();
  const matches: any[] = json?.result?.addressMatches ?? [];
  if (matches.length === 0) throw new Error("No address match found in Census database.");

  const match = matches[0];
  const coords = match.coordinates ?? {};
  const geo: Record<string, any[]> = match.geographies ?? {};

  const tract = extractFirst(geo, "Census Tracts");
  const bg = extractFirst(geo, "Census Block Groups");
  const county = firstKey(geo, ["Counties", "County Subdivisions"]);
  const state = extractFirst(geo, "States");
  const place = firstKey(geo, [
    "Incorporated Places",
    "Census Designated Places",
    "County Subdivisions",
  ]);
  const cd = firstKey(geo, [
    "Congressional Districts",
    "116th Congressional Districts",
    "117th Congressional Districts",
    "118th Congressional Districts",
    "119th Congressional Districts",
  ]);

  const stateFips: string = tract?.STATE ?? state?.STATE ?? state?.GEOID?.slice(0, 2) ?? "";
  const countyFips: string = tract?.COUNTY ?? county?.COUNTY ?? "";
  const tractCode: string = tract?.TRACT ?? tract?.BASENAME ?? "";
  const tractGeoid: string = tract?.GEOID ?? (stateFips + countyFips + tractCode);
  const bgNum: string = bg?.BLKGRP ?? bg?.BASENAME ?? "";
  const bgGeoid: string = bg?.GEOID ?? (tractGeoid + bgNum);

  return {
    locationId: loc.id,
    fetchedAt: new Date().toISOString(),
    matchedAddress: match.matchedAddress ?? "",
    cenLat: String(coords.y ?? ""),
    cenLng: String(coords.x ?? ""),
    stateFips,
    stateName: state?.NAME ?? match.addressComponents?.state ?? "",
    countyFips,
    countyName: county?.NAME ?? county?.BASENAME ?? "",
    countyGeoid: county?.GEOID ?? (stateFips + countyFips),
    tract: tractCode,
    tractGeoid,
    blockGroup: bgNum,
    blockGroupGeoid: bgGeoid,
    congressionalDistrict: cd?.NAME ?? cd?.BASENAME ?? cd?.GEOID ?? "",
    placeName: place?.NAME ?? place?.BASENAME ?? "",
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export type CensusState = {
  data: CensusData | null;
  loading: boolean;
  error: string | null;
  lookup: () => Promise<void>;
  clear: () => Promise<void>;
};

/**
 * Per-location census hook. Loads from cache on mount; `lookup()` fetches live.
 */
export function useCensusData(loc: PropertyLocation | null): CensusState {
  const [data, setData] = useState<CensusData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const locId = loc?.id ?? "";
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    if (!locId) return;
    loadCached(locId).then((cached) => {
      if (mounted.current) setData(cached);
    });
    return () => { mounted.current = false; };
  }, [locId]);

  const lookup = useCallback(async () => {
    if (!loc) return;
    setLoading(true);
    setError(null);
    try {
      const result = await fetchCensusForLocation(loc);
      await saveCache(result);
      if (mounted.current) setData(result);
    } catch (e: any) {
      if (mounted.current) setError(e?.message ?? "Census lookup failed.");
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [loc]);

  const clear = useCallback(async () => {
    if (!locId) return;
    await deleteCache(locId);
    if (mounted.current) { setData(null); setError(null); }
  }, [locId]);

  return { data, loading, error, lookup, clear };
}
