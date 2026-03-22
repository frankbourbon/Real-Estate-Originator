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
      contentInsetAdjustmentBehavior="automatic"
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>LOA Origination</Text>
          <Text style={styles.subGreeting}>Commercial Real Estate</Text>
        </View>
        <TouchableOpacity style={styles.newBtn} onPress={handleCreate} activeOpacity={0.8}>
          <Feather name="plus" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Pipeline Volume */}
      <View style={styles.volumeCard}>
        <Text style={styles.volumeLabel}>Total Pipeline Volume</Text>
        <Text style={styles.volumeValue}>
          {stats.totalVolumeUsd > 0 ? formatCurrency(stats.totalVolumeUsd) : "$0"}
        </Text>
        <Text style={styles.volumeSub}>
          {stats.total} active application{stats.total !== 1 ? "s" : ""}
        </Text>
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <View style={styles.statsRow}>
          <StatCard
            label="Submitted"
            value={stats.submitted}
            color={Colors.light.statusSubmitted}
            bg={Colors.light.statusSubmittedBg}
          />
          <View style={styles.statGap} />
          <StatCard
            label="Under Review"
            value={stats.underReview}
            color={Colors.light.statusReview}
            bg={Colors.light.statusReviewBg}
          />
        </View>
        <View style={[styles.statsRow, { marginTop: 8 }]}>
          <StatCard
            label="Approved"
            value={stats.approved}
            color={Colors.light.statusApproved}
            bg={Colors.light.statusApprovedBg}
          />
          <View style={styles.statGap} />
          <StatCard
            label="Declined"
            value={stats.declined}
            color={Colors.light.statusDeclined}
            bg={Colors.light.statusDeclinedBg}
          />
        </View>
      </View>

      {/* Recent Applications */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Applications</Text>
          {applications.length > 3 && (
            <TouchableOpacity onPress={() => router.push("/(tabs)/applications")}>
              <Text style={styles.seeAll}>See all</Text>
            </TouchableOpacity>
          )}
        </View>

        {loading ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Loading...</Text>
          </View>
        ) : recentApps.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="file-text" size={40} color={Colors.light.textTertiary} />
            <Text style={styles.emptyTitle}>No applications yet</Text>
            <Text style={styles.emptyText}>Tap + to create your first LOA</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={handleCreate} activeOpacity={0.8}>
              <Text style={styles.emptyBtnText}>Create Application</Text>
            </TouchableOpacity>
          </View>
        ) : (
          recentApps.map((app) => <ApplicationCard key={app.id} application={app} />)
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  content: {
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  greeting: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    color: Colors.light.text,
    letterSpacing: -0.5,
  },
  subGreeting: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.light.textSecondary,
    marginTop: 1,
  },
  newBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: Colors.light.tint,
    alignItems: "center",
    justifyContent: "center",
  },
  volumeCard: {
    backgroundColor: Colors.light.tint,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
  },
  volumeLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: "rgba(255,255,255,0.7)",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  volumeValue: {
    fontSize: 36,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    marginTop: 4,
    letterSpacing: -1,
  },
  volumeSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.65)",
    marginTop: 4,
  },
  statsGrid: {
    marginBottom: 24,
  },
  statsRow: {
    flexDirection: "row",
  },
  statGap: {
    width: 8,
  },
  section: {},
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: Colors.light.text,
  },
  seeAll: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.light.tint,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: Colors.light.text,
    marginTop: 8,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.light.textSecondary,
  },
  emptyBtn: {
    marginTop: 12,
    backgroundColor: Colors.light.tint,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  emptyBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
});
