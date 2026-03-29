import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ApplicationCard } from "@/components/ApplicationCard";
import Colors from "@/constants/colors";
import type { ApplicationStatus } from "@/services/core";
import { useCoreService } from "@/services/core";
import { getBorrowerDisplayName, getPropertyShortAddress } from "@/utils/formatting";

// ─── Filter definitions ────────────────────────────────────────────────────────

const PHASE_FILTERS: (ApplicationStatus | "All")[] = [
  "All",
  "Inquiry",
  "Letter of Interest",
  "Application Start",
  "Application Processing",
  "Final Credit Review",
  "Pre-close",
  "Ready for Docs",
  "Docs Drawn",
  "Docs Back",
  "Closing",
];

type GroupKey = "Sales" | "Processing" | "Credit" | "Closing";

const GROUP_PHASES: Record<GroupKey, ApplicationStatus[]> = {
  Sales:      ["Inquiry", "Application Start"],
  Processing: ["Letter of Interest", "Application Processing"],
  Credit:     ["Final Credit Review", "Pre-close"],
  Closing:    ["Ready for Docs", "Docs Drawn", "Docs Back", "Closing"],
};

const GROUP_COLOR: Record<GroupKey, string> = {
  Sales:      "#1B7F9E",
  Processing: "#C75300",
  Credit:     "#6B4FBB",
  Closing:    "#005C3C",
};

const CHIP_LABEL: Partial<Record<ApplicationStatus | "All", string>> = {
  "All":                    "All",
  "Letter of Interest":     "LOI",
  "Application Start":      "App Start",
  "Application Processing": "Processing",
  "Final Credit Review":    "Credit Review",
  "Ready for Docs":         "Ready for Docs",
};

// ─── Filter state ──────────────────────────────────────────────────────────────

type FilterState =
  | { kind: "all" }
  | { kind: "phase"; phase: ApplicationStatus }
  | { kind: "group"; group: GroupKey };

const FILTER_ALL: FilterState = { kind: "all" };

const GROUP_KEYS = new Set<string>(["Sales", "Processing", "Credit", "Closing"]);

function resolveParams(
  phase: string | undefined,
  group: string | undefined
): FilterState {
  if (group && GROUP_KEYS.has(group)) {
    return { kind: "group", group: group as GroupKey };
  }
  if (phase && PHASE_FILTERS.includes(phase as ApplicationStatus)) {
    return { kind: "phase", phase: phase as ApplicationStatus };
  }
  return FILTER_ALL;
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ApplicationsScreen() {
  const {
    applications, loading,
    createBorrower, createProperty, createApplication,
    getBorrower, getProperty,
  } = useCoreService();
  const insets = useSafeAreaInsets();
  const { phase, group } = useLocalSearchParams<{ phase?: string; group?: string }>();

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterState>(() => resolveParams(phase, group));

  useEffect(() => {
    setFilter(resolveParams(phase, group));
  }, [phase, group]);

  const filtered = applications.filter((app) => {
    let matchFilter: boolean;
    if (filter.kind === "all") {
      matchFilter = true;
    } else if (filter.kind === "phase") {
      matchFilter = app.status === filter.phase;
    } else {
      matchFilter = GROUP_PHASES[filter.group].includes(app.status as ApplicationStatus);
    }
    const q = search.toLowerCase();
    if (!q) return matchFilter;
    const borrower = getBorrower(app.borrowerId);
    const property = getProperty(app.propertyId);
    const matchSearch =
      getBorrowerDisplayName(borrower).toLowerCase().includes(q) ||
      (borrower?.entityName ?? "").toLowerCase().includes(q) ||
      getPropertyShortAddress(property).toLowerCase().includes(q) ||
      (property?.city ?? "").toLowerCase().includes(q) ||
      (property?.propertyType ?? "").toLowerCase().includes(q);
    return matchFilter && matchSearch;
  });

  const handleCreate = async () => {
    const borrower = await createBorrower({ firstName: "", lastName: "", entityName: "", email: "", phone: "", creExperienceYears: "", netWorthUsd: "", liquidityUsd: "", creditScore: "" });
    const property = await createProperty({ streetAddress: "", city: "", state: "", zipCode: "", propertyType: "Office", grossSqFt: "", numberOfUnits: "", yearBuilt: "", physicalOccupancyPct: "", economicOccupancyPct: "" });
    const application = await createApplication(borrower.id, property.id);
    router.push({ pathname: "/new-application", params: { id: application.id } });
  };

  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  // ── chip helpers ──
  const groupCount = (g: GroupKey) =>
    applications.filter((a) => GROUP_PHASES[g].includes(a.status as ApplicationStatus)).length;
  const phaseCount = (p: ApplicationStatus | "All") =>
    p === "All" ? applications.length : applications.filter((a) => a.status === p).length;

  const isGroupActive = (g: GroupKey) => filter.kind === "group" && filter.group === g;
  const isPhaseActive = (p: ApplicationStatus | "All") => {
    if (p === "All") return filter.kind === "all";
    return filter.kind === "phase" && filter.phase === p;
  };

  return (
    <View style={styles.container}>
      {/* ── Header bar ── */}
      <View style={[styles.header, { paddingTop: topPadding + 12 }]}>
        <View>
          <Text style={styles.headerEyebrow}>Commercial Banking</Text>
          <Text style={styles.headerTitle}>Applications</Text>
        </View>
        <TouchableOpacity style={styles.newBtn} onPress={handleCreate} activeOpacity={0.8}>
          <Feather name="plus" size={16} color="#fff" />
          <Text style={styles.newBtnText}>New</Text>
        </TouchableOpacity>
      </View>

      {/* ── Search bar ── */}
      <View style={styles.searchBar}>
        <Feather name="search" size={15} color={Colors.light.textTertiary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search address, borrower, entity..."
          placeholderTextColor={Colors.light.textTertiary}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
        />
        {search ? (
          <Pressable onPress={() => setSearch("")}>
            <Feather name="x" size={15} color={Colors.light.textTertiary} />
          </Pressable>
        ) : null}
      </View>

      {/* ── Filter chips ── */}
      <FlatList
        horizontal
        style={styles.filterBar}
        contentContainerStyle={styles.filterBarContent}
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        data={[
          // Group chips first
          ...Object.keys(GROUP_PHASES).map((g) => ({ id: `group:${g}`, kind: "group" as const, value: g as GroupKey })),
          // Divider sentinel
          { id: "divider", kind: "divider" as const, value: "" as any },
          // Phase chips
          ...PHASE_FILTERS.map((p) => ({ id: `phase:${p}`, kind: "phase" as const, value: p })),
        ]}
        renderItem={({ item }) => {
          if (item.kind === "divider") {
            return <View style={styles.chipDivider} />;
          }
          if (item.kind === "group") {
            const g = item.value as GroupKey;
            const active = isGroupActive(g);
            const count = groupCount(g);
            const color = GROUP_COLOR[g];
            return (
              <TouchableOpacity
                style={[
                  styles.chip,
                  styles.chipGroup,
                  active && { backgroundColor: color, borderColor: color },
                ]}
                onPress={() => setFilter({ kind: "group", group: g })}
                activeOpacity={0.7}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {g}
                </Text>
                <Text style={[styles.chipCount, active && styles.chipCountActive]}>
                  {count}
                </Text>
              </TouchableOpacity>
            );
          }
          // phase chip
          const p = item.value as ApplicationStatus | "All";
          const active = isPhaseActive(p);
          const count = phaseCount(p);
          return (
            <TouchableOpacity
              style={[styles.chip, active && styles.chipActive]}
              onPress={() =>
                setFilter(p === "All" ? FILTER_ALL : { kind: "phase", phase: p as ApplicationStatus })
              }
              activeOpacity={0.7}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {CHIP_LABEL[p] ?? p}
              </Text>
              <Text style={[styles.chipCount, active && styles.chipCountActive]}>
                {count}
              </Text>
            </TouchableOpacity>
          );
        }}
      />

      {/* ── Active group banner ── */}
      {filter.kind === "group" && (
        <View style={[styles.groupBanner, { borderLeftColor: GROUP_COLOR[filter.group] }]}>
          <Text style={styles.groupBannerText}>
            Showing{" "}
            <Text style={styles.groupBannerBold}>{filter.group}</Text>
            {" "}phases: {GROUP_PHASES[filter.group].join(", ")}
          </Text>
          <TouchableOpacity onPress={() => setFilter(FILTER_ALL)} hitSlop={8}>
            <Feather name="x" size={13} color={Colors.light.textTertiary} />
          </TouchableOpacity>
        </View>
      )}

      {/* ── Results ── */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: 100 }]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          filtered.length > 0 ? (
            <Text style={styles.resultsCount}>
              {filtered.length} result{filtered.length !== 1 ? "s" : ""}
            </Text>
          ) : null
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>Loading...</Text>
            </View>
          ) : (
            <View style={styles.emptyBox}>
              <Feather name="inbox" size={32} color={Colors.light.textTertiary} />
              <Text style={styles.emptyTitle}>
                {search || filter.kind !== "all" ? "No matching applications" : "No applications yet"}
              </Text>
              <Text style={styles.emptyText}>
                {search || filter.kind !== "all"
                  ? "Try adjusting your search or filter."
                  : "Tap New Loan to create your first application."}
              </Text>
              {!search && filter.kind === "all" && (
                <TouchableOpacity style={styles.createBtn} onPress={handleCreate}>
                  <Feather name="plus" size={15} color="#fff" />
                  <Text style={styles.createBtnText}>Create Application</Text>
                </TouchableOpacity>
              )}
            </View>
          )
        }
        renderItem={({ item }) => <ApplicationCard application={item} />}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  header: {
    backgroundColor: Colors.light.surface,
    paddingHorizontal: 16,
    paddingBottom: 16,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  headerEyebrow: {
    fontSize: 10,
    fontFamily: "OpenSans_600SemiBold",
    color: "rgba(255,255,255,0.5)",
    letterSpacing: 1.0,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: "OpenSans_700Bold",
    color: "#fff",
    letterSpacing: -0.3,
  },
  newBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: Colors.light.tint,
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  newBtnText: {
    fontSize: 13,
    fontFamily: "OpenSans_700Bold",
    color: "#fff",
  },

  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.backgroundCard,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "OpenSans_400Regular",
    color: Colors.light.text,
  },

  filterBar: {
    height: 46,
    backgroundColor: Colors.light.backgroundCard,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
    overflow: "hidden",
  },
  filterBarContent: {
    paddingHorizontal: 12,
    gap: 6,
    alignItems: "center",
    paddingVertical: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: Colors.light.background,
    borderRadius: 2,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  chipGroup: {
    borderStyle: "dashed",
  },
  chipActive: {
    backgroundColor: Colors.light.tint,
    borderColor: Colors.light.tint,
  },
  chipText: {
    fontSize: 12,
    fontFamily: "OpenSans_600SemiBold",
    color: Colors.light.textSecondary,
  },
  chipTextActive: {
    color: "#fff",
  },
  chipCount: {
    fontSize: 11,
    fontFamily: "OpenSans_700Bold",
    color: Colors.light.textTertiary,
    minWidth: 14,
    textAlign: "center",
  },
  chipCountActive: {
    color: "rgba(255,255,255,0.75)",
  },
  chipDivider: {
    width: 1,
    height: 20,
    backgroundColor: Colors.light.border,
    marginHorizontal: 2,
  },

  groupBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Colors.light.backgroundCard,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.borderLight,
    borderLeftWidth: 3,
  },
  groupBannerText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "OpenSans_400Regular",
    color: Colors.light.textSecondary,
  },
  groupBannerBold: {
    fontFamily: "OpenSans_700Bold",
    color: Colors.light.text,
  },

  list: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  resultsCount: {
    fontSize: 11,
    fontFamily: "OpenSans_600SemiBold",
    color: Colors.light.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },

  emptyBox: {
    alignItems: "center",
    paddingVertical: 48,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: "OpenSans_700Bold",
    color: Colors.light.text,
    marginTop: 8,
  },
  emptyText: {
    fontSize: 13,
    fontFamily: "OpenSans_400Regular",
    color: Colors.light.textSecondary,
    textAlign: "center",
  },
  createBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
    backgroundColor: Colors.light.tint,
    borderRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  createBtnText: {
    fontSize: 14,
    fontFamily: "OpenSans_700Bold",
    color: "#fff",
  },
});
