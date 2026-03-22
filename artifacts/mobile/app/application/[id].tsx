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

import { AttachmentList } from "@/components/AttachmentList";
import { CommentThread } from "@/components/CommentThread";
import { DetailRow } from "@/components/DetailRow";
import { SectionHeader } from "@/components/SectionHeader";
import { StatusBadge } from "@/components/StatusBadge";
import Colors from "@/constants/colors";
import type { ApplicationStatus } from "@/context/ApplicationContext";
import { useApplications } from "@/context/ApplicationContext";
import {
  formatCurrencyFull,
  formatFullDate,
  formatPct,
  formatSqFt,
  getBorrowerDisplayName,
  getPropertyCityState,
  getPropertyShortAddress,
} from "@/utils/formatting";

const STATUS_OPTIONS: ApplicationStatus[] = [
  "Draft", "Submitted", "Under Review", "Approved", "Declined",
];

type Tab = "Property" | "Loan" | "Borrower" | "Comments" | "Docs";
const TABS: Tab[] = ["Property", "Loan", "Borrower", "Comments", "Docs"];

export default function ApplicationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    getApplication, getBorrower, getProperty,
    updateApplication, deleteApplication,
    addComment, addAttachment, deleteAttachment,
  } = useApplications();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<Tab>("Property");
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
      { text: "Delete", style: "destructive", onPress: async () => { await deleteApplication(id); router.back(); } },
    ]);
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <>
      {/* ── Header (dark surface) ── */}
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Feather name="arrow-left" size={18} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>

        <View style={styles.headerMeta}>
          <Text style={styles.headerAddress} numberOfLines={1}>
            {getPropertyShortAddress(property)}
          </Text>
          <Text style={styles.headerCity} numberOfLines={1}>
            {getPropertyCityState(property) || property?.propertyType || "CRE"}
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

      {/* ── Tab bar ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabBar}
        contentContainerStyle={styles.tabBarContent}
      >
        {TABS.map((tab) => {
          const badge =
            tab === "Comments" ? app.comments.length :
            tab === "Docs" ? app.attachments.length : 0;
          return (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab}
              </Text>
              {badge > 0 && (
                <View style={styles.tabBadge}>
                  <Text style={styles.tabBadgeText}>{badge}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* ── Tab Content ── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPad + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === "Property" && (
          <View style={styles.card}>
            <SectionHeader title="Location" />
            <DetailRow label="Street Address" value={property?.streetAddress} />
            <DetailRow label="City" value={property?.city} />
            <DetailRow label="State" value={property?.state} />
            <DetailRow label="ZIP Code" value={property?.zipCode} last />

            <SectionHeader title="Physical Attributes" />
            <DetailRow label="Property Type" value={property?.propertyType} />
            <DetailRow label="Gross Sq Ft" value={property?.grossSqFt ? formatSqFt(property.grossSqFt) : undefined} />
            <DetailRow label="Rentable Units" value={property?.numberOfUnits} />
            <DetailRow label="Year Built" value={property?.yearBuilt} last />

            <SectionHeader title="Occupancy" subtitle="Unit-based vs rent-based — two distinct measures" />
            <DetailRow
              label="Physical Occupancy"
              value={property?.physicalOccupancyPct ? `${formatPct(property.physicalOccupancyPct)} (unit-based)` : undefined}
            />
            <DetailRow
              label="Economic Occupancy"
              value={property?.economicOccupancyPct ? `${formatPct(property.economicOccupancyPct)} (rent-based)` : undefined}
              last
            />
          </View>
        )}

        {activeTab === "Loan" && (
          <View style={styles.card}>
            <SectionHeader title="Loan Structure" />
            <DetailRow label="Loan Type" value={app.loanType} />
            <DetailRow label="Loan Amount (USD)" value={app.loanAmountUsd ? formatCurrencyFull(app.loanAmountUsd) : undefined} />
            <DetailRow label="LTV (%)" value={app.ltvPct ? `${app.ltvPct}%` : undefined} />
            <DetailRow label="DSCR (×)" value={app.dscrRatio ? `${app.dscrRatio}×` : undefined} />
            <DetailRow label="Interest Type" value={app.interestType} />
            <DetailRow label="Interest Rate (% p.a.)" value={app.interestRatePct ? `${app.interestRatePct}%` : undefined} />
            <DetailRow label="Loan Term" value={app.loanTermYears ? `${app.loanTermYears} years` : undefined} />
            <DetailRow label="Amortization" value={app.amortizationType} />
            <DetailRow label="Target Closing Date" value={app.targetClosingDate} last />
          </View>
        )}

        {activeTab === "Borrower" && (
          <View style={styles.card}>
            <SectionHeader title="Identity" />
            <DetailRow label="First Name" value={borrower?.firstName} />
            <DetailRow label="Last Name" value={borrower?.lastName} />
            <DetailRow label="Entity / Company" value={borrower?.entityName} last />

            <SectionHeader title="Contact" />
            <DetailRow label="Email" value={borrower?.email} />
            <DetailRow label="Phone" value={borrower?.phone} last />

            <SectionHeader title="Financial Profile" />
            <DetailRow label="CRE Experience" value={borrower?.creExperienceYears ? `${borrower.creExperienceYears} years` : undefined} />
            <DetailRow label="Net Worth (USD)" value={borrower?.netWorthUsd ? formatCurrencyFull(borrower.netWorthUsd) : undefined} />
            <DetailRow label="Liquid Assets (USD)" value={borrower?.liquidityUsd ? formatCurrencyFull(borrower.liquidityUsd) : undefined} />
            <DetailRow label="FICO Credit Score" value={borrower?.creditScore} last />
          </View>
        )}

        {activeTab === "Comments" && (
          <View style={styles.card}>
            <SectionHeader
              title={`Comments (${app.comments.length})`}
              subtitle="Threaded discussion on this application"
            />
            <CommentThread
              application={app}
              onAddComment={(text, parentId) => addComment(app.id, text, parentId)}
            />
          </View>
        )}

        {activeTab === "Docs" && (
          <View style={styles.card}>
            <SectionHeader
              title={`Documents (${app.attachments.length})`}
              subtitle="Attached files for this application"
            />
            <AttachmentList
              attachments={app.attachments}
              onAdd={(att) => addAttachment(app.id, att)}
              onDelete={(attId) => deleteAttachment(app.id, attId)}
            />
          </View>
        )}
      </ScrollView>

      {/* ── Status Modal ── */}
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
            <Text style={styles.sheetSub}>Current: <Text style={{ color: Colors.light.tint }}>{app.status}</Text></Text>
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
  backBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
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
  metricDivider: {
    width: 1,
    height: 28,
    backgroundColor: Colors.light.border,
  },
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
  metaDot: {
    fontSize: 11,
    color: Colors.light.textTertiary,
  },

  tabBar: {
    maxHeight: 40,
    backgroundColor: Colors.light.backgroundCard,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  tabBarContent: {
    paddingHorizontal: 12,
    alignItems: "center",
    gap: 2,
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 5,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: {
    borderBottomColor: Colors.light.tint,
  },
  tabText: {
    fontSize: 13,
    fontFamily: "OpenSans_600SemiBold",
    color: Colors.light.textSecondary,
  },
  tabTextActive: {
    color: Colors.light.tint,
    fontFamily: "OpenSans_700Bold",
  },
  tabBadge: {
    backgroundColor: Colors.light.tint,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  tabBadgeText: {
    fontSize: 10,
    fontFamily: "OpenSans_700Bold",
    color: "#fff",
  },

  scroll: { flex: 1, backgroundColor: Colors.light.background },
  scrollContent: { padding: 16 },
  card: {
    backgroundColor: Colors.light.backgroundCard,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 4,
    padding: 16,
  },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
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
  sheetTitle: {
    fontSize: 15,
    fontFamily: "OpenSans_700Bold",
    color: Colors.light.text,
  },
  sheetSub: {
    fontSize: 12,
    fontFamily: "OpenSans_400Regular",
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  sheetDivider: {
    height: 1,
    backgroundColor: Colors.light.border,
    marginBottom: 8,
  },
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
