import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
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

import { StatusBadge } from "@/components/StatusBadge";
import Colors from "@/constants/colors";
import type { ApplicationStatus } from "@/context/ApplicationContext";
import { useApplications } from "@/context/ApplicationContext";
import {
  formatCurrencyFull,
  formatFullDate,
  getBorrowerDisplayName,
  getPropertyCityState,
  getPropertyShortAddress,
} from "@/utils/formatting";

const STATUS_OPTIONS: ApplicationStatus[] = [
  "Draft", "Submitted", "Under Review", "Approved", "Declined",
];

type SectionItem = {
  key: string;
  route: string;
  label: string;
  description: string;
  icon: keyof typeof Feather.glyphMap;
  iconColor: string;
  iconBg: string;
  badge?: number;
};

export default function ApplicationOverviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    getApplication, getBorrower, getProperty,
    updateApplication, deleteApplication,
  } = useApplications();
  const insets = useSafeAreaInsets();
  const [statusModal, setStatusModal] = useState(false);

  const app = getApplication(id);
  const borrower = getBorrower(app?.borrowerId ?? "");
  const property = getProperty(app?.propertyId ?? "");

  if (!app) {
    return (
      <View style={styles.center}>
        <Text style={styles.notFound}>Application not found</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backLink}>← Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleDelete = () => {
    Alert.alert("Delete Application", "This action cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => { await deleteApplication(id); router.back(); },
      },
    ]);
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const SECTIONS: SectionItem[] = [
    {
      key: "property",
      route: `/application/${id}/property`,
      label: "Property Details",
      description: "Location, type, size, and occupancy",
      icon: "map-pin",
      iconColor: "#00875D",
      iconBg: "#EAF5F2",
    },
    {
      key: "loan",
      route: `/application/${id}/loan`,
      label: "Loan Terms",
      description: "Structure, rate, LTV, DSCR, amortization",
      icon: "dollar-sign",
      iconColor: "#0078CF",
      iconBg: "#EAF6FF",
    },
    {
      key: "borrower",
      route: `/application/${id}/borrower`,
      label: "Borrower Profile",
      description: "Identity, contact, and financial profile",
      icon: "user",
      iconColor: Colors.light.tint,
      iconBg: Colors.light.tintLight,
    },
    {
      key: "amortization",
      route: `/application/${id}/amortization`,
      label: "Amortization Calculator",
      description: "Rate build-up, day count convention, schedule",
      icon: "bar-chart-2",
      iconColor: "#C75300",
      iconBg: "#FFECDC",
    },
    {
      key: "comments",
      route: `/application/${id}/comments`,
      label: "Comments",
      description: "Threaded discussion on this application",
      icon: "message-circle",
      iconColor: "#6B46C1",
      iconBg: "#F3F0FF",
      badge: app.comments.length,
    },
    {
      key: "documents",
      route: `/application/${id}/documents`,
      label: "Documents",
      description: "Attached files and supporting materials",
      icon: "paperclip",
      iconColor: "#5F646A",
      iconBg: "#E6E9EB",
      badge: app.attachments.length,
    },
  ];

  return (
    <>
      {/* ── Masthead ── */}
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Feather name="arrow-left" size={18} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>

        <View style={styles.headerMeta}>
          <Text style={styles.headerAddress} numberOfLines={1}>
            {getPropertyShortAddress(property)}
          </Text>
          <Text style={styles.headerCity} numberOfLines={1}>
            {getPropertyCityState(property) || property?.propertyType || "Commercial Real Estate"}
          </Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => router.push({ pathname: "/new-application", params: { id: app.id } })}
            activeOpacity={0.7}
          >
            <Feather name="edit-2" size={16} color="rgba(255,255,255,0.8)" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={handleDelete} activeOpacity={0.7}>
            <Feather name="trash-2" size={16} color={Colors.light.statusDeclined} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Metrics strip ── */}
      <View style={styles.metricsStrip}>
        <View style={styles.metric}>
          <Text style={styles.metricValue}>
            {app.loanAmountUsd ? formatCurrencyFull(app.loanAmountUsd) : "—"}
          </Text>
          <Text style={styles.metricLabel}>Loan Amount</Text>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.metric}>
          <Text style={styles.metricValue}>{app.ltvPct ? `${app.ltvPct}%` : "—"}</Text>
          <Text style={styles.metricLabel}>LTV</Text>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.metric}>
          <Text style={styles.metricValue}>{app.dscrRatio ? `${app.dscrRatio}×` : "—"}</Text>
          <Text style={styles.metricLabel}>DSCR</Text>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.metric}>
          <StatusBadge status={app.status} size="sm" />
          <TouchableOpacity onPress={() => setStatusModal(true)} activeOpacity={0.7}>
            <Text style={styles.changeStatus}>Change ↓</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Meta bar ── */}
      <View style={styles.metaBar}>
        <Feather name="user" size={11} color={Colors.light.textTertiary} />
        <Text style={styles.metaText}>
          {getBorrowerDisplayName(borrower)}
          {borrower?.entityName ? `  ·  ${borrower.entityName}` : ""}
        </Text>
        <Text style={styles.metaDot}>·</Text>
        <Text style={styles.metaText}>Updated {formatFullDate(app.updatedAt)}</Text>
      </View>

      {/* ── Section menu ── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPad + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.menuLabel}>Sections</Text>

        <View style={styles.menuCard}>
          {SECTIONS.map((section, idx) => (
            <TouchableOpacity
              key={section.key}
              style={[
                styles.menuRow,
                idx < SECTIONS.length - 1 && styles.menuRowBorder,
              ]}
              onPress={() => router.push(section.route as any)}
              activeOpacity={0.7}
            >
              {/* Icon */}
              <View style={[styles.menuIcon, { backgroundColor: section.iconBg }]}>
                <Feather name={section.icon} size={16} color={section.iconColor} />
              </View>

              {/* Labels */}
              <View style={styles.menuText}>
                <Text style={styles.menuRowLabel}>{section.label}</Text>
                <Text style={styles.menuRowDesc}>{section.description}</Text>
              </View>

              {/* Right side */}
              <View style={styles.menuRight}>
                {section.badge != null && section.badge > 0 ? (
                  <View style={styles.menuBadge}>
                    <Text style={styles.menuBadgeText}>{section.badge}</Text>
                  </View>
                ) : null}
                <Feather name="chevron-right" size={16} color={Colors.light.textTertiary} />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* ── Status modal ── */}
      <Modal
        visible={statusModal}
        transparent
        animationType="slide"
        onRequestClose={() => setStatusModal(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setStatusModal(false)} />
        <View style={[styles.sheet, { paddingBottom: bottomPad + 16 }]}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Change Application Status</Text>
            <Text style={styles.sheetSub}>
              Current: <Text style={{ color: Colors.light.tint }}>{app.status}</Text>
            </Text>
          </View>
          <View style={styles.sheetDivider} />
          {STATUS_OPTIONS.map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.statusOpt, s === app.status && styles.statusOptActive]}
              onPress={async () => { await updateApplication(id, { status: s }); setStatusModal(false); }}
              activeOpacity={0.7}
            >
              <StatusBadge status={s} />
              {s === app.status && <Feather name="check" size={16} color={Colors.light.tint} />}
            </TouchableOpacity>
          ))}
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  notFound: { fontSize: 16, fontFamily: "OpenSans_600SemiBold", color: Colors.light.text },
  backLink: { fontSize: 14, fontFamily: "OpenSans_600SemiBold", color: Colors.light.tint },

  header: {
    backgroundColor: Colors.light.surface,
    paddingHorizontal: 16,
    paddingBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  headerMeta: { flex: 1 },
  headerAddress: {
    fontSize: 16,
    fontFamily: "OpenSans_700Bold",
    color: "#fff",
    letterSpacing: -0.2,
  },
  headerCity: {
    fontSize: 12,
    fontFamily: "OpenSans_400Regular",
    color: "rgba(255,255,255,0.55)",
    marginTop: 1,
  },
  headerActions: { flexDirection: "row", gap: 4 },
  iconBtn: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.08)",
  },

  metricsStrip: {
    flexDirection: "row",
    backgroundColor: Colors.light.backgroundCard,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
    paddingHorizontal: 4,
    paddingVertical: 12,
    alignItems: "center",
  },
  metric: { flex: 1, alignItems: "center", gap: 3 },
  metricValue: {
    fontSize: 13,
    fontFamily: "OpenSans_700Bold",
    color: Colors.light.text,
    textAlign: "center",
  },
  metricLabel: {
    fontSize: 9,
    fontFamily: "OpenSans_600SemiBold",
    color: Colors.light.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    textAlign: "center",
  },
  metricDivider: { width: 1, height: 28, backgroundColor: Colors.light.border },
  changeStatus: {
    fontSize: 10,
    fontFamily: "OpenSans_600SemiBold",
    color: Colors.light.tint,
    marginTop: 2,
  },

  metaBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Colors.light.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  metaText: {
    fontSize: 11,
    fontFamily: "OpenSans_400Regular",
    color: Colors.light.textTertiary,
  },
  metaDot: { fontSize: 11, color: Colors.light.textTertiary },

  scroll: { flex: 1, backgroundColor: Colors.light.background },
  scrollContent: { padding: 16 },

  menuLabel: {
    fontSize: 10,
    fontFamily: "OpenSans_700Bold",
    color: Colors.light.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 2,
  },
  menuCard: {
    backgroundColor: Colors.light.backgroundCard,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 4,
    overflow: "hidden",
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 14,
  },
  menuRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.borderLight,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  menuText: { flex: 1, gap: 2 },
  menuRowLabel: {
    fontSize: 14,
    fontFamily: "OpenSans_600SemiBold",
    color: Colors.light.text,
  },
  menuRowDesc: {
    fontSize: 11,
    fontFamily: "OpenSans_400Regular",
    color: Colors.light.textTertiary,
  },
  menuRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  menuBadge: {
    backgroundColor: Colors.light.tint,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  menuBadgeText: {
    fontSize: 11,
    fontFamily: "OpenSans_700Bold",
    color: "#fff",
  },

  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.5)" },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.light.backgroundCard,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    paddingTop: 12,
    paddingHorizontal: 20,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    backgroundColor: Colors.light.border,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  sheetHeader: { marginBottom: 8 },
  sheetTitle: { fontSize: 15, fontFamily: "OpenSans_700Bold", color: Colors.light.text },
  sheetSub: {
    fontSize: 12,
    fontFamily: "OpenSans_400Regular",
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  sheetDivider: { height: 1, backgroundColor: Colors.light.border, marginBottom: 8 },
  statusOpt: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.borderLight,
  },
  statusOptActive: {
    backgroundColor: Colors.light.tintLight + "40",
    borderRadius: 4,
    paddingHorizontal: 8,
  },
});
