import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ApplicationCard } from "@/components/ApplicationCard";
import { StatCard } from "@/components/StatCard";
import Colors from "@/constants/colors";
import { useApplications } from "@/context/ApplicationContext";
import { formatCurrency } from "@/utils/formatting";

export default function DashboardScreen() {
  const { applications, stats, loading, createApplication } = useApplications();
  const insets = useSafeAreaInsets();

  const recentApps = applications.slice(0, 3);

  const handleCreate = async () => {
    const { application } = await createApplication();
    router.push({ pathname: "/new-application", params: { id: application.id } });
  };

  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingTop: topPadding + 16, paddingBottom: 100 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Masthead (Salt dark surface — blue-900) ── */}
      <View style={styles.masthead}>
        <View>
          <Text style={styles.mastheadEyebrow}>J.P. Morgan Commercial Banking</Text>
          <Text style={styles.mastheadTitle}>LOA Origination</Text>
        </View>
        <TouchableOpacity style={styles.newBtn} onPress={handleCreate} activeOpacity={0.8}>
          <Feather name="plus" size={18} color="#fff" />
          <Text style={styles.newBtnText}>New LOA</Text>
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
            <Text style={styles.pipelineStatNum}>{stats.draft}</Text>
            <Text style={styles.pipelineStatLabel}>Draft</Text>
          </View>
          <View style={styles.pipelineStatDivider} />
          <View style={styles.pipelineStat}>
            <Text style={styles.pipelineStatNum}>{stats.approved}</Text>
            <Text style={styles.pipelineStatLabel}>Approved</Text>
          </View>
        </View>
      </View>

      {/* ── Status Grid ── */}
      <View style={styles.gridRow}>
        <StatCard
          label="Submitted"
          value={stats.submitted}
          color={Colors.light.statusSubmitted}
          bg={Colors.light.statusSubmittedBg}
          border={Colors.light.statusSubmitted + "30"}
        />
        <View style={{ width: 8 }} />
        <StatCard
          label="Under Review"
          value={stats.underReview}
          color={Colors.light.statusReview}
          bg={Colors.light.statusReviewBg}
          border={Colors.light.statusReview + "30"}
        />
      </View>
      <View style={[styles.gridRow, { marginTop: 8 }]}>
        <StatCard
          label="Approved"
          value={stats.approved}
          color={Colors.light.statusApproved}
          bg={Colors.light.statusApprovedBg}
          border={Colors.light.statusApproved + "30"}
        />
        <View style={{ width: 8 }} />
        <StatCard
          label="Declined"
          value={stats.declined}
          color={Colors.light.statusDeclined}
          bg={Colors.light.statusDeclinedBg}
          border={Colors.light.statusDeclined + "30"}
        />
      </View>

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

      {loading ? (
        <Text style={styles.loadingText}>Loading...</Text>
      ) : recentApps.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Feather name="file-text" size={28} color={Colors.light.tint} />
          </View>
          <Text style={styles.emptyTitle}>No applications yet</Text>
          <Text style={styles.emptyBody}>
            Create your first Letter of Authorization to get started.
          </Text>
          <TouchableOpacity style={styles.createBtn} onPress={handleCreate} activeOpacity={0.8}>
            <Feather name="plus" size={16} color="#fff" />
            <Text style={styles.createBtnText}>Create Application</Text>
          </TouchableOpacity>
        </View>
      ) : (
        recentApps.map((app) => <ApplicationCard key={app.id} application={app} />)
      )}
    </ScrollView>
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
  newBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.light.tint,
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 2,
  },
  newBtnText: {
    fontSize: 13,
    fontFamily: "OpenSans_700Bold",
    color: "#fff",
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
});
