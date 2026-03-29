import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ApplicationCard } from "@/components/ApplicationCard";
import Colors from "@/constants/colors";
import { useCoreService } from "@/services/core";
import { useSeedCoordinator } from "@/services/seed-coordinator";
import { formatCurrency } from "@/utils/formatting";
import { PHASE_INFO } from "@/utils/phases";

type PhaseStats = Record<string, number>;

const STAGE_GROUPS: { label: string; icon: string; color: string; bg: string; phases: string[] }[] = [
  { label: "Inquiry",     icon: "search",       color: "#1B7F9E", bg: "#DBF5F7",
    phases: ["Inquiry"] },
  { label: "LOI",         icon: "file-text",    color: "#0078CF", bg: "#EAF6FF",
    phases: ["Letter of Interest"] },
  { label: "Application", icon: "clipboard",    color: "#C75300", bg: "#FFECDC",
    phases: ["Application Start", "Application Processing"] },
  { label: "Final",       icon: "shield",       color: "#6B4FBB", bg: "#F0EEFF",
    phases: ["Final Credit Review", "Pre-close"] },
  { label: "Closing",     icon: "check-circle", color: "#005C3C", bg: "#D0F0E5",
    phases: ["Ready for Docs", "Docs Drawn", "Docs Back", "Closing"] },
];

function PipelineByStage({ stats }: { stats: PhaseStats }) {
  return (
    <View style={pb.card}>
      {STAGE_GROUPS.map((group, gi) => (
        <View key={group.label} style={[pb.group, gi < STAGE_GROUPS.length - 1 && pb.groupBorder]}>
          <View style={pb.groupHeader}>
            <View style={[pb.personaIcon, { backgroundColor: group.bg }]}>
              <Feather name={group.icon as any} size={13} color={group.color} />
            </View>
            <Text style={[pb.personaLabel, { color: group.color }]}>{group.label}</Text>
          </View>
          {group.phases.map((phase, pi) => {
            const info = PHASE_INFO[phase as any];
            const count = stats[phase] ?? 0;
            return (
              <TouchableOpacity
                key={phase}
                style={[pb.phaseRow, pi < group.phases.length - 1 && pb.phaseRowBorder]}
                onPress={() => router.push({ pathname: "/(tabs)/applications", params: { phase } })}
                activeOpacity={0.6}
              >
                <Text style={pb.phaseNum}>{info.phase}</Text>
                <Text style={pb.phaseName}>{phase}</Text>
                <View style={[pb.phaseBadge, count > 0 && { backgroundColor: info.bg }]}>
                  <Text style={[pb.phaseBadgeText, count > 0 && { color: info.color }]}>{count}</Text>
                </View>
                <Feather name="chevron-right" size={14} color={Colors.light.textTertiary} style={{ marginLeft: 4 }} />
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const pb = StyleSheet.create({
  card: {
    backgroundColor: Colors.light.backgroundCard,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 0,
  },
  group: { paddingBottom: 4 },
  groupBorder: { borderBottomWidth: 1, borderBottomColor: Colors.light.border, marginBottom: 0 },
  groupHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 6,
  },
  personaIcon: {
    width: 24,
    height: 24,
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  personaLabel: {
    fontSize: 11,
    fontFamily: "OpenSans_700Bold",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  phaseRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 7,
    paddingLeft: 46,
  },
  phaseRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.light.borderLight },
  phaseNum: {
    fontSize: 10,
    fontFamily: "OpenSans_700Bold",
    color: Colors.light.textTertiary,
    width: 20,
  },
  phaseName: {
    flex: 1,
    fontSize: 13,
    fontFamily: "OpenSans_400Regular",
    color: Colors.light.text,
  },
  phaseBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.light.background,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  phaseBadgeText: {
    fontSize: 12,
    fontFamily: "OpenSans_700Bold",
    color: Colors.light.textTertiary,
  },
});

export default function DashboardScreen() {
  const { applications, loading, createBorrower, createProperty, createApplication, getPipelineStats } = useCoreService();
  const { loadAllSeedData, clearAllData } = useSeedCoordinator();
  const insets = useSafeAreaInsets();
  const [menuOpen, setMenuOpen] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const stats = getPipelineStats();
  const recentApps = applications.slice(0, 3);
  const hasSeedData = applications.some((a) => a.id.startsWith("seed_"));

  const handleCreate = async () => {
    const borrower = await createBorrower({ firstName: "", lastName: "", entityName: "", email: "", phone: "", creExperienceYears: "", netWorthUsd: "", liquidityUsd: "", creditScore: "" });
    const property = await createProperty({ streetAddress: "", city: "", state: "", zipCode: "", propertyType: "Office", grossSqFt: "", numberOfUnits: "", yearBuilt: "", physicalOccupancyPct: "", economicOccupancyPct: "" });
    const application = await createApplication(borrower.id, property.id);
    router.push({ pathname: "/new-application", params: { id: application.id } });
  };

  const handleLoadSample = async () => {
    setMenuOpen(false);
    setSeeding(true);
    await loadAllSeedData();
    setSeeding(false);
  };

  const handleClearSample = () => {
    setMenuOpen(false);
    Alert.alert(
      "Clear Sample Data",
      "This will remove all sample loan applications. Real applications you created will not be affected.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear Sample Data", style: "destructive",
          onPress: async () => {
            setSeeding(true);
            await clearAllData();
            setSeeding(false);
          },
        },
      ]
    );
  };

  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.content,
          { paddingTop: topPadding + 16, paddingBottom: bottomPad + 60 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Masthead (Salt dark surface — blue-900) ── */}
        <View style={styles.masthead}>
          <View>
            <Text style={styles.mastheadEyebrow}>J.P. Morgan Commercial Banking</Text>
            <Text style={styles.mastheadTitle}>Loan Origination</Text>
          </View>
          <TouchableOpacity style={styles.menuBtn} onPress={() => setMenuOpen(true)} activeOpacity={0.7}>
            <Feather name="more-vertical" size={18} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
        </View>

        {/* ── Pipeline Volume Card ── */}
        <View style={styles.pipelineCard}>
          <View style={styles.pipelineLeft}>
            <Text style={styles.pipelineLabel}>Total Pipeline Volume</Text>
            <Text style={styles.pipelineValue}>
              {stats.totalVolumeUsd > 0 ? formatCurrency(stats.totalVolumeUsd) : "$0"}
            </Text>
            <Text style={styles.pipelineSub}>
              {stats.total} application{stats.total !== 1 ? "s" : ""} in pipeline
            </Text>
          </View>
          <View style={styles.pipelineRight}>
            <View style={styles.pipelineStat}>
              <Text style={styles.pipelineStatNum}>
                {(stats.byPhase["Inquiry"] ?? 0) + (stats.byPhase["Application Start"] ?? 0)}
              </Text>
              <Text style={styles.pipelineStatLabel}>Sales</Text>
            </View>
            <View style={styles.pipelineStatDivider} />
            <View style={styles.pipelineStat}>
              <Text style={styles.pipelineStatNum}>
                {(stats.byPhase["Ready for Docs"] ?? 0) + (stats.byPhase["Docs Drawn"] ?? 0) +
                 (stats.byPhase["Docs Back"] ?? 0) + (stats.byPhase["Closing"] ?? 0)}
              </Text>
              <Text style={styles.pipelineStatLabel}>Closing</Text>
            </View>
          </View>
        </View>

        {/* ── Pipeline by Phase ── */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.sectionAccent} />
            <Text style={styles.sectionTitle}>Pipeline by Phase</Text>
          </View>
        </View>
        <PipelineByStage stats={stats.byPhase} />

        {/* ── Recent Applications ── */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.sectionAccent} />
            <Text style={styles.sectionTitle}>Recent Applications</Text>
          </View>
          {applications.length > 3 && (
            <TouchableOpacity onPress={() => router.push("/(tabs)/applications")}>
              <Text style={styles.seeAll}>View all →</Text>
            </TouchableOpacity>
          )}
        </View>

        {loading || seeding ? (
          <Text style={styles.loadingText}>{seeding ? "Loading sample data…" : "Loading..."}</Text>
        ) : recentApps.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Feather name="file-text" size={28} color={Colors.light.tint} />
            </View>
            <Text style={styles.emptyTitle}>No applications yet</Text>
            <Text style={styles.emptyBody}>
              Create your first loan application, or load sample data to explore the full 10-stage workflow.
            </Text>
            <TouchableOpacity style={styles.createBtn} onPress={handleCreate} activeOpacity={0.8}>
              <Feather name="plus" size={16} color="#fff" />
              <Text style={styles.createBtnText}>Create Application</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.seedBtn} onPress={handleLoadSample} activeOpacity={0.8}>
              <Feather name="database" size={16} color={Colors.light.tint} />
              <Text style={styles.seedBtnText}>Load 12 Sample Loans</Text>
            </TouchableOpacity>
          </View>
        ) : (
          recentApps.map((app) => <ApplicationCard key={app.id} application={app} />)
        )}
      </ScrollView>

      {/* ── Settings / seed menu ── */}
      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={styles.menuOverlay} onPress={() => setMenuOpen(false)} />
        <View style={[styles.menuSheet, { top: topPadding + 56 }]}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => { setMenuOpen(false); handleCreate(); }}
            activeOpacity={0.7}
          >
            <Feather name="plus-circle" size={16} color={Colors.light.tint} />
            <View style={styles.menuItemText}>
              <Text style={styles.menuItemLabel}>New Loan Application</Text>
              <Text style={styles.menuItemSub}>Start a blank 5-step origination wizard</Text>
            </View>
          </TouchableOpacity>
          <View style={styles.menuDivider} />
          {!hasSeedData ? (
            <TouchableOpacity style={styles.menuItem} onPress={handleLoadSample} activeOpacity={0.7}>
              <Feather name="database" size={16} color={Colors.light.textSecondary} />
              <View style={styles.menuItemText}>
                <Text style={styles.menuItemLabel}>Load Sample Data</Text>
                <Text style={styles.menuItemSub}>Add 12 demo CRE loans across all 10 workflow stages</Text>
              </View>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.menuItem} onPress={handleClearSample} activeOpacity={0.7}>
              <Feather name="trash-2" size={16} color="#CC0000" />
              <View style={styles.menuItemText}>
                <Text style={[styles.menuItemLabel, { color: "#CC0000" }]}>Clear Sample Data</Text>
                <Text style={styles.menuItemSub}>Remove all demo loans from the pipeline</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  content: {
    paddingHorizontal: 16,
  },

  // Masthead — Salt blue-900 dark surface
  masthead: {
    backgroundColor: Colors.light.surface,
    borderRadius: 4,
    padding: 20,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  mastheadEyebrow: {
    fontSize: 10,
    fontFamily: "OpenSans_600SemiBold",
    color: "rgba(255,255,255,0.55)",
    letterSpacing: 1.0,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  mastheadTitle: {
    fontSize: 22,
    fontFamily: "OpenSans_700Bold",
    color: "#fff",
    letterSpacing: -0.3,
  },
  // Pipeline card
  pipelineCard: {
    backgroundColor: Colors.light.backgroundCard,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 4,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pipelineLeft: { flex: 1 },
  pipelineLabel: {
    fontSize: 10,
    fontFamily: "OpenSans_600SemiBold",
    color: Colors.light.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  pipelineValue: {
    fontSize: 30,
    fontFamily: "OpenSans_700Bold",
    color: Colors.light.text,
    letterSpacing: -1,
    marginBottom: 4,
  },
  pipelineSub: {
    fontSize: 12,
    fontFamily: "OpenSans_400Regular",
    color: Colors.light.textSecondary,
  },
  pipelineRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    borderLeftWidth: 1,
    borderLeftColor: Colors.light.border,
    paddingLeft: 20,
    marginLeft: 16,
  },
  pipelineStat: { alignItems: "center" },
  pipelineStatNum: {
    fontSize: 22,
    fontFamily: "OpenSans_700Bold",
    color: Colors.light.tint,
    lineHeight: 26,
  },
  pipelineStatLabel: {
    fontSize: 10,
    fontFamily: "OpenSans_600SemiBold",
    color: Colors.light.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  pipelineStatDivider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.light.border,
  },

  // Stats grid
  gridRow: {
    flexDirection: "row",
    marginBottom: 0,
  },

  // Section header
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 24,
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionAccent: {
    width: 3,
    height: 16,
    backgroundColor: Colors.light.tint,
    borderRadius: 2,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: "OpenSans_700Bold",
    color: Colors.light.text,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  seeAll: {
    fontSize: 12,
    fontFamily: "OpenSans_600SemiBold",
    color: Colors.light.tint,
  },

  // Empty state
  emptyState: {
    backgroundColor: Colors.light.backgroundCard,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 4,
    padding: 32,
    alignItems: "center",
    gap: 8,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 4,
    backgroundColor: Colors.light.tintLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: "OpenSans_700Bold",
    color: Colors.light.text,
  },
  emptyBody: {
    fontSize: 13,
    fontFamily: "OpenSans_400Regular",
    color: Colors.light.textSecondary,
    textAlign: "center",
    lineHeight: 20,
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
  loadingText: {
    fontSize: 14,
    fontFamily: "OpenSans_400Regular",
    color: Colors.light.textSecondary,
    textAlign: "center",
    paddingVertical: 24,
  },

  // Masthead right cluster
  mastheadRight: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2 },
  menuBtn: {
    width: 34, height: 34,
    alignItems: "center", justifyContent: "center",
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.10)",
  },

  // Seed button in empty state
  seedBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    marginTop: 4,
    borderWidth: 1, borderColor: Colors.light.tint,
    borderRadius: 4,
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: Colors.light.tintLight,
  },
  seedBtnText: { fontSize: 14, fontFamily: "OpenSans_600SemiBold", color: Colors.light.tint },

  // Dropdown menu
  menuOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.25)" },
  menuSheet: {
    position: "absolute",
    right: 16,
    backgroundColor: Colors.light.backgroundCard,
    borderWidth: 1, borderColor: Colors.light.border,
    borderRadius: 6,
    minWidth: 260,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  menuItem: {
    flexDirection: "row", alignItems: "flex-start",
    gap: 12, paddingHorizontal: 16, paddingVertical: 14,
  },
  menuItemText: { flex: 1, gap: 2 },
  menuItemLabel: { fontSize: 14, fontFamily: "OpenSans_600SemiBold", color: Colors.light.text },
  menuItemSub: { fontSize: 11, fontFamily: "OpenSans_400Regular", color: Colors.light.textTertiary, lineHeight: 16 },
  menuDivider: { height: 1, backgroundColor: Colors.light.border },
});
