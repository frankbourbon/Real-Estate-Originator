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
import { useCensusData } from "@/services/census";

// ─── Row helper ───────────────────────────────────────────────────────────────

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.row}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={s.rowValue} selectable numberOfLines={1}>{value || "—"}</Text>
    </View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  loc: PropertyLocation;
}

export function CensusCard({ loc }: Props) {
  const { data, loading, error, lookup, clear } = useCensusData(loc);

  return (
    <View style={s.card}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          <Feather name="database" size={13} color={Colors.light.tint} />
          <Text style={s.headerTitle}>Census Data</Text>
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
          Fetched {new Date(data.fetchedAt).toLocaleString()}
        </Text>
      ) : null}

      {/* Error */}
      {error ? (
        <View style={s.errorBox}>
          <Feather name="alert-circle" size={13} color="#B91C1C" />
          <Text style={s.errorText}>{error}</Text>
        </View>
      ) : null}

      {/* Data rows */}
      {data ? (
        <View style={s.dataBlock}>
          <Text style={s.sectionLabel}>STANDARDIZED ADDRESS</Text>
          <Text style={s.addressText} selectable>{data.matchedAddress || "—"}</Text>

          <Text style={[s.sectionLabel, { marginTop: 10 }]}>GEOGRAPHY IDs</Text>
          <Row label="State FIPS" value={data.stateFips} />
          <Row label="State" value={data.stateName} />
          <Row label="County FIPS" value={data.countyFips} />
          <Row label="County" value={data.countyName} />
          <Row label="County GEOID" value={data.countyGeoid} />
          <Row label="Census Tract" value={data.tract} />
          <Row label="Tract GEOID" value={data.tractGeoid} />
          <Row label="Block Group" value={data.blockGroup} />
          <Row label="Block Group GEOID" value={data.blockGroupGeoid} />

          <Text style={[s.sectionLabel, { marginTop: 10 }]}>POLITICAL & PLACE</Text>
          <Row label="Congressional Dist." value={data.congressionalDistrict} />
          <Row label="Place" value={data.placeName} />

          <Text style={[s.sectionLabel, { marginTop: 10 }]}>CENSUS COORDINATES</Text>
          <Row label="Latitude (Census)" value={data.cenLat ? Number(data.cenLat).toFixed(6) : "—"} />
          <Row label="Longitude (Census)" value={data.cenLng ? Number(data.cenLng).toFixed(6) : "—"} />

          {/* Clear button */}
          <TouchableOpacity style={s.clearBtn} onPress={clear} activeOpacity={0.7}>
            <Feather name="trash-2" size={11} color={Colors.light.textTertiary} />
            <Text style={s.clearBtnText}>Clear cached data</Text>
          </TouchableOpacity>
        </View>
      ) : !loading ? (
        /* Empty state */
        <View style={s.emptyState}>
          <Text style={s.emptyText}>
            Look up Census tract, block group, county FIPS, and congressional district for this address.
          </Text>
          <TouchableOpacity
            style={s.lookupBtn}
            onPress={lookup}
            activeOpacity={0.8}
          >
            <Feather name="search" size={13} color="#fff" />
            <Text style={s.lookupBtnText}>Look Up Census Data</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={s.loadingState}>
          <ActivityIndicator size="small" color={Colors.light.tint} />
          <Text style={s.loadingText}>Querying Census Geocoder…</Text>
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
    padding: 12,
  },
  sectionLabel: {
    fontSize: 10,
    fontFamily: "OpenSans_700Bold",
    color: Colors.light.textTertiary,
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  addressText: {
    fontSize: 13,
    fontFamily: "OpenSans_600SemiBold",
    color: Colors.light.text,
    marginBottom: 2,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border + "80",
  },
  rowLabel: {
    fontSize: 12,
    fontFamily: "OpenSans_400Regular",
    color: Colors.light.textSecondary,
    flex: 1,
  },
  rowValue: {
    fontSize: 12,
    fontFamily: "OpenSans_600SemiBold",
    color: Colors.light.text,
    textAlign: "right",
    flex: 1,
  },
  clearBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 12,
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
