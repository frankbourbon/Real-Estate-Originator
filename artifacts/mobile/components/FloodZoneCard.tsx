import { Feather } from "@expo/vector-icons";
import React from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import Colors from "@/constants/colors";
import type { PropertyLocation } from "@/services/core";
import {
  FLOOD_RISK_BG,
  FLOOD_RISK_COLOR,
  FLOOD_RISK_LABEL,
  floodRisk,
  useFemaFloodData,
  type FloodZone,
} from "@/services/fema-flood";

// ─── Zone row ─────────────────────────────────────────────────────────────────

function ZoneRow({ zone, last }: { zone: FloodZone; last?: boolean }) {
  const risk    = floodRisk(zone);
  const color   = FLOOD_RISK_COLOR[risk];
  const bg      = FLOOD_RISK_BG[risk];
  const label   = FLOOD_RISK_LABEL[risk];
  const subty   = zone.zoneSubty
    ? zone.zoneSubty.charAt(0).toUpperCase() + zone.zoneSubty.slice(1).toLowerCase()
    : null;

  return (
    <View style={[s.zoneRow, !last && s.zoneRowBorder]}>
      <View style={s.zoneLeft}>
        <View style={[s.zoneBadge, { backgroundColor: bg }]}>
          <Text style={[s.zoneBadgeText, { color }]}>{zone.fldZone ?? "—"}</Text>
        </View>
        <View style={s.zoneInfo}>
          <Text style={[s.riskLabel, { color }]}>{label}</Text>
          {subty ? <Text style={s.subty} numberOfLines={2}>{subty}</Text> : null}
          {zone.staticBfe != null && zone.staticBfe > 0 && zone.staticBfe !== -9999 ? (
            <Text style={s.bfe}>BFE: {zone.staticBfe} ft{zone.vDatum ? ` (${zone.vDatum})` : ""}</Text>
          ) : zone.depth != null && zone.depth > 0 && zone.depth !== -9999 ? (
            <Text style={s.bfe}>Depth: {zone.depth} ft</Text>
          ) : null}
        </View>
      </View>
      <View style={[s.sfhaChip, { backgroundColor: zone.sfhaTf === "T" ? "#FEE2E2" : "#E6E9EB" }]}>
        <Text style={[s.sfhaText, { color: zone.sfhaTf === "T" ? "#DC2626" : "#72777D" }]}>
          {zone.sfhaTf === "T" ? "SFHA" : "Non-SFHA"}
        </Text>
      </View>
    </View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  loc: PropertyLocation;
}

export function FloodZoneCard({ loc }: Props) {
  const { data, loading, error, lookup, clear } = useFemaFloodData(loc);
  const hasCoords = !!(loc.latitude && loc.longitude);

  return (
    <View style={s.card}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          <Feather name="alert-triangle" size={13} color="#C75300" />
          <Text style={s.headerTitle}>FEMA Flood Zones</Text>
        </View>
        <View style={s.headerRight}>
          {data ? (
            <TouchableOpacity
              style={s.refreshBtn}
              onPress={lookup}
              activeOpacity={0.7}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size={11} color={Colors.light.tint} />
              ) : (
                <Feather name="refresh-cw" size={11} color={Colors.light.tint} />
              )}
              <Text style={s.refreshBtnText}>Refresh</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Fetched timestamp */}
      {data ? (
        <Text style={s.timestamp}>
          Fetched {new Date(data.fetchedAt).toLocaleString()} · {data.lat}, {data.lng}
        </Text>
      ) : null}

      {/* Error */}
      {error ? (
        <View style={s.errorBox}>
          <Feather name="alert-circle" size={13} color="#B91C1C" />
          <Text style={s.errorText}>{error}</Text>
        </View>
      ) : null}

      {/* Zone rows */}
      {data ? (
        <View style={s.dataBlock}>
          {data.zones.length === 0 ? (
            <Text style={s.noZones}>No flood zone data returned for this location.</Text>
          ) : (
            data.zones.map((zone, i) => (
              <ZoneRow
                key={`${zone.fldZone}-${i}`}
                zone={zone}
                last={i === data.zones.length - 1}
              />
            ))
          )}
          <TouchableOpacity style={s.clearBtn} onPress={clear} activeOpacity={0.7}>
            <Feather name="trash-2" size={11} color={Colors.light.textTertiary} />
            <Text style={s.clearBtnText}>Clear cached data</Text>
          </TouchableOpacity>
        </View>
      ) : !loading ? (
        <View style={s.emptyState}>
          {!hasCoords ? (
            <Text style={s.emptyText}>
              Add latitude and longitude coordinates to this location to look up FEMA flood zones.
            </Text>
          ) : (
            <>
              <Text style={s.emptyText}>
                Query the FEMA National Flood Hazard Layer (NFHL) to identify flood zones at this location.
                A parcel may intersect more than one zone.
              </Text>
              <TouchableOpacity
                style={s.lookupBtn}
                onPress={lookup}
                activeOpacity={0.8}
              >
                <Feather name="search" size={13} color="#fff" />
                <Text style={s.lookupBtnText}>Look Up Flood Zones</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      ) : (
        <View style={s.loadingState}>
          <ActivityIndicator size="small" color={Colors.light.tint} />
          <Text style={s.loadingText}>Querying FEMA NFHL…</Text>
        </View>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  card: {
    marginTop: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.light.border,
    backgroundColor: Colors.light.background,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
    backgroundColor: Colors.light.backgroundCard,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  headerTitle: {
    fontSize: 12,
    fontFamily: "OpenSans_700Bold",
    color: Colors.light.text,
    letterSpacing: 0.2,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  refreshBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: Colors.light.tint + "14",
    borderWidth: 1,
    borderColor: Colors.light.tint + "30",
  },
  refreshBtnText: {
    fontSize: 11,
    fontFamily: "OpenSans_600SemiBold",
    color: Colors.light.tint,
  },
  timestamp: {
    fontSize: 10,
    fontFamily: "OpenSans_400Regular",
    color: Colors.light.textTertiary,
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 2,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    margin: 12,
    padding: 10,
    borderRadius: 4,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "OpenSans_400Regular",
    color: "#B91C1C",
  },
  dataBlock: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 4,
  },
  zoneRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
  },
  zoneRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border + "80",
  },
  zoneLeft: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    flex: 1,
  },
  zoneBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    minWidth: 44,
    alignItems: "center",
  },
  zoneBadgeText: {
    fontSize: 13,
    fontFamily: "OpenSans_700Bold",
    letterSpacing: 0.4,
  },
  zoneInfo: {
    flex: 1,
    gap: 2,
  },
  riskLabel: {
    fontSize: 12,
    fontFamily: "OpenSans_700Bold",
  },
  subty: {
    fontSize: 11,
    fontFamily: "OpenSans_400Regular",
    color: Colors.light.textSecondary,
    lineHeight: 15,
  },
  bfe: {
    fontSize: 11,
    fontFamily: "OpenSans_600SemiBold",
    color: Colors.light.textSecondary,
  },
  sfhaChip: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 4,
    marginLeft: 8,
  },
  sfhaText: {
    fontSize: 10,
    fontFamily: "OpenSans_700Bold",
    letterSpacing: 0.3,
  },
  noZones: {
    fontSize: 12,
    fontFamily: "OpenSans_400Regular",
    color: Colors.light.textSecondary,
    paddingVertical: 10,
  },
  clearBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 8,
    marginBottom: 6,
    alignSelf: "flex-end",
  },
  clearBtnText: {
    fontSize: 11,
    fontFamily: "OpenSans_400Regular",
    color: Colors.light.textTertiary,
  },
  emptyState: {
    padding: 14,
    gap: 10,
    alignItems: "flex-start",
  },
  emptyText: {
    fontSize: 12,
    fontFamily: "OpenSans_400Regular",
    color: Colors.light.textSecondary,
    lineHeight: 18,
  },
  lookupBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.light.tint,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 4,
  },
  lookupBtnText: {
    fontSize: 13,
    fontFamily: "OpenSans_700Bold",
    color: "#fff",
  },
  loadingState: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
  },
  loadingText: {
    fontSize: 12,
    fontFamily: "OpenSans_400Regular",
    color: Colors.light.textSecondary,
  },
});
