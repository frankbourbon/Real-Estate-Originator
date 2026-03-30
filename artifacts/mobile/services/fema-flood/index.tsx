import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useRef, useState } from "react";

import type { PropertyLocation } from "@/services/core";

// ─── Types ────────────────────────────────────────────────────────────────────

export type FloodZone = {
  fldZone:   string;
  zoneSubty: string | null;
  sfhaTf:    string | null;
  staticBfe: number | null;
  depth:     number | null;
  vDatum:    string | null;
};

export type FloodZoneData = {
  locationId: string;
  fetchedAt:  string;
  lat:        string;
  lng:        string;
  zones:      FloodZone[];
};

export type FloodRisk = "high" | "moderate" | "low" | "undetermined";

export function floodRisk(zone: FloodZone): FloodRisk {
  const z = (zone.fldZone ?? "").toUpperCase();
  if (zone.sfhaTf === "T") return "high";
  if (z === "D")            return "undetermined";
  const sub = (zone.zoneSubty ?? "").toUpperCase();
  if (sub.includes("0.2 PCT") || sub.includes("500-YEAR")) return "moderate";
  return "low";
}

export const FLOOD_RISK_LABEL: Record<FloodRisk, string> = {
  high:         "High Risk",
  moderate:     "Moderate Risk",
  low:          "Minimal Risk",
  undetermined: "Undetermined",
};

export const FLOOD_RISK_COLOR: Record<FloodRisk, string> = {
  high:         "#DC2626",
  moderate:     "#C75300",
  low:          "#005C3C",
  undetermined: "#72777D",
};

export const FLOOD_RISK_BG: Record<FloodRisk, string> = {
  high:         "#FEE2E2",
  moderate:     "#FFECDC",
  low:          "#D0F0E5",
  undetermined: "#E6E9EB",
};

// ─── Storage ──────────────────────────────────────────────────────────────────

const STORAGE_PREFIX = "svc_fema_flood_v1_";

async function loadCached(locationId: string): Promise<FloodZoneData | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_PREFIX + locationId);
    return raw ? (JSON.parse(raw) as FloodZoneData) : null;
  } catch {
    return null;
  }
}

async function saveCache(data: FloodZoneData): Promise<void> {
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

function floodProxyBase(): string {
  const domain = process.env.EXPO_PUBLIC_DOMAIN ?? "";
  if (!domain) throw new Error("EXPO_PUBLIC_DOMAIN not set — cannot reach API server.");
  return `https://${domain}/api/flood/zones`;
}

export async function fetchFloodZonesForLocation(loc: PropertyLocation): Promise<FloodZoneData> {
  const lat = loc.latitude;
  const lng = loc.longitude;
  if (!lat || !lng) throw new Error("Latitude and longitude are required for flood zone lookup.");

  const url = `${floodProxyBase()}?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Flood zone lookup failed: ${resp.status}`);

  const json = await resp.json();
  if (json.error) throw new Error(json.error);

  return {
    locationId: loc.id,
    fetchedAt:  new Date().toISOString(),
    lat,
    lng,
    zones: json.zones ?? [],
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export type FloodZoneState = {
  data:    FloodZoneData | null;
  loading: boolean;
  error:   string | null;
  lookup:  () => Promise<void>;
  clear:   () => Promise<void>;
};

/**
 * Per-location FEMA flood zone hook.
 * Loads from AsyncStorage cache on mount; `lookup()` fetches live from NFHL.
 */
export function useFemaFloodData(loc: PropertyLocation | null): FloodZoneState {
  const [data, setData]       = useState<FloodZoneData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const locId   = loc?.id ?? "";
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
      const result = await fetchFloodZonesForLocation(loc);
      await saveCache(result);
      if (mounted.current) setData(result);
    } catch (e: any) {
      if (mounted.current) setError(e?.message ?? "Flood zone lookup failed.");
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
