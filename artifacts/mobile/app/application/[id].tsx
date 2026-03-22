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
  "Draft",
  "Submitted",
  "Under Review",
  "Approved",
  "Declined",
];

type Tab = "Property" | "Loan" | "Borrower" | "Comments" | "Docs";
const TABS: Tab[] = ["Property", "Loan", "Borrower", "Comments", "Docs"];

export default function ApplicationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    getApplication,
    getBorrower,
    getProperty,
    updateApplication,
    deleteApplication,
    addComment,
    addAttachment,
    deleteAttachment,
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
          <Text style={styles.backLink}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleDelete = () => {
    Alert.alert(
      "Delete Application",
      "This cannot be undone. Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteApplication(id);
            router.back();
          },
        },
      ]
    );
  };

  const handleStatusChange = async (status: ApplicationStatus) => {
    await updateApplication(id, { status });
    setStatusModal(false);
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <>
      {/* ── Fixed header ── */}
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Feather name="arrow-left" size={20} color={Colors.light.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Application Detail
        </Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() =>
              router.push({ pathname: "/new-application", params: { id: app.id } })
            }
            activeOpacity={0.7}
          >
            <Feather name="edit-2" size={17} color={Colors.light.tint} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete} activeOpacity={0.7}>
            <Feather name="trash-2" size={17} color={Colors.light.error} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Hero card ── */}
      <View style={styles.heroCard}>
        <View style={styles.heroTop}>
          <View>
            <View style={styles.typeTag}>
              <Text style={styles.typeTagText}>{property?.propertyType ?? "CRE"}</Text>
            </View>
            <Text style={styles.heroAddress}>
              {getPropertyShortAddress(property)}
            </Text>
            <Text style={styles.heroCity}>{getPropertyCityState(property)}</Text>
          </View>
        </View>

        {/* Key metrics row */}
        <View style={styles.metricsRow}>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>
              {app.loanAmountUsd ? formatCurrencyFull(app.loanAmountUsd) : "—"}
            </Text>
            <Text style={styles.metricLabel}>Loan Amount</Text>
          </View>
          <View style={styles.metricDiv} />
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{app.ltvPct ? `${app.ltvPct}%` : "—"}</Text>
            <Text style={styles.metricLabel}>LTV</Text>
          </View>
          <View style={styles.metricDiv} />
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{app.dscrRatio ? `${app.dscrRatio}×` : "—"}</Text>
            <Text style={styles.metricLabel}>DSCR</Text>
          </View>
        </View>

        {/* Status + change */}
        <View style={styles.heroFooter}>
          <StatusBadge status={app.status} />
          <TouchableOpacity
            style={styles.changeStatusBtn}
            onPress={() => setStatusModal(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.changeStatusText}>Change Status</Text>
            <Feather name="chevron-right" size={14} color={Colors.light.tint} />
          </TouchableOpacity>
        </View>

        {/* Meta */}
        <Text style={styles.metaText}>
          Created {formatFullDate(app.createdAt)} · Updated {formatFullDate(app.updatedAt)}
        </Text>
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
            tab === "Comments"
              ? app.comments.length
              : tab === "Docs"
              ? app.attachments.length
              : 0;
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

      {/* ── Tab content ── */}
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 40 }]}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
      >
        {/* Property tab */}
        {activeTab === "Property" && (
          <View style={styles.card}>
            <SectionHeader title="Location" />
            <DetailRow label="Street Address" value={property?.streetAddress} />
            <DetailRow label="City" value={property?.city} />
            <DetailRow label="State" value={property?.state} />
            <DetailRow label="ZIP Code" value={property?.zipCode} last />

            <SectionHeader title="Physical Attributes" />
            <DetailRow label="Property Type" value={property?.propertyType} />
            <DetailRow
              label="Gross Sq Ft"
              value={property?.grossSqFt ? formatSqFt(property.grossSqFt) : undefined}
            />
            <DetailRow label="Rentable Units" value={property?.numberOfUnits} />
            <DetailRow label="Year Built" value={property?.yearBuilt} last />

            <SectionHeader title="Occupancy" subtitle="Two distinct performance measures" />
            <DetailRow
              label="Physical Occupancy"
              value={
                property?.physicalOccupancyPct
                  ? `${formatPct(property.physicalOccupancyPct)} (unit-based)`
                  : undefined
              }
            />
            <DetailRow
              label="Economic Occupancy"
              value={
                property?.economicOccupancyPct
                  ? `${formatPct(property.economicOccupancyPct)} (rent-based)`
                  : undefined
              }
              last
            />
          </View>
        )}

        {/* Loan tab */}
        {activeTab === "Loan" && (
          <View style={styles.card}>
            <SectionHeader title="Loan Structure" />
            <DetailRow label="Loan Type" value={app.loanType} />
            <DetailRow
              label="Loan Amount (USD)"
              value={app.loanAmountUsd ? formatCurrencyFull(app.loanAmountUsd) : undefined}
            />
            <DetailRow
              label="LTV (%)"
              value={app.ltvPct ? `${app.ltvPct}%` : undefined}
            />
            <DetailRow
              label="DSCR (×)"
              value={app.dscrRatio ? `${app.dscrRatio}×` : undefined}
            />
            <DetailRow label="Interest Type" value={app.interestType} />
            <DetailRow
              label="Interest Rate (%)"
              value={app.interestRatePct ? `${app.interestRatePct}% per annum` : undefined}
            />
            <DetailRow
              label="Loan Term"
              value={app.loanTermYears ? `${app.loanTermYears} years` : undefined}
            />
            <DetailRow label="Amortization" value={app.amortizationType} />
            <DetailRow label="Target Closing" value={app.targetClosingDate} last />
          </View>
        )}

        {/* Borrower tab */}
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
            <DetailRow
              label="CRE Experience"
              value={
                borrower?.creExperienceYears
                  ? `${borrower.creExperienceYears} years`
                  : undefined
              }
            />
            <DetailRow
              label="Net Worth (USD)"
              value={
                borrower?.netWorthUsd
                  ? formatCurrencyFull(borrower.netWorthUsd)
                  : undefined
              }
            />
            <DetailRow
              label="Liquid Assets (USD)"
              value={
                borrower?.liquidityUsd
                  ? formatCurrencyFull(borrower.liquidityUsd)
                  : undefined
              }
            />
            <DetailRow
              label="FICO Credit Score"
              value={borrower?.creditScore}
              last
            />
          </View>
        )}

        {/* Comments tab */}
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

        {/* Docs tab */}
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
          <Text style={styles.sheetTitle}>Change Status</Text>
          {STATUS_OPTIONS.map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.statusOption, s === app.status && styles.statusOptionActive]}
              onPress={() => handleStatusChange(s)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.statusOptionText,
                  s === app.status && styles.statusOptionTextActive,
                ]}
              >
                {s}
              </Text>
              {s === app.status && (
                <Feather name="check" size={16} color={Colors.light.tint} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  notFound: {
    fontSize: 16,
    fontFamily: "Inter_500Medium",
    color: Colors.light.text,
  },
  backLink: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.light.tint,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 10,
    backgroundColor: Colors.light.background,
    gap: 10,
  },
  backBtn: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: Colors.light.backgroundCard,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.light.text,
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
  },
  editBtn: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: Colors.light.tint + "12",
  },
  deleteBtn: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: Colors.light.errorBg,
  },
  heroCard: {
    backgroundColor: Colors.light.backgroundCard,
    marginHorizontal: 16,
    borderRadius: 18,
    padding: 16,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  heroTop: {
    marginBottom: 12,
  },
  typeTag: {
    backgroundColor: Colors.light.tint + "15",
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
    alignSelf: "flex-start",
    marginBottom: 6,
  },
  typeTagText: {
    color: Colors.light.tint,
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  heroAddress: {
    fontSize: 19,
    fontFamily: "Inter_700Bold",
    color: Colors.light.text,
    letterSpacing: -0.3,
  },
  heroCity: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.light.textSecondary,
    marginTop: 1,
  },
  metricsRow: {
    flexDirection: "row",
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  metric: {
    flex: 1,
    alignItems: "center",
  },
  metricValue: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: Colors.light.text,
    marginBottom: 2,
  },
  metricLabel: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    color: Colors.light.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  metricDiv: {
    width: 1,
    backgroundColor: Colors.light.border,
    marginVertical: 4,
  },
  heroFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  changeStatusBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  changeStatusText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.light.tint,
  },
  metaText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.light.textTertiary,
  },
  tabBar: {
    backgroundColor: Colors.light.background,
    maxHeight: 44,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  tabBarContent: {
    paddingHorizontal: 16,
    gap: 4,
    alignItems: "center",
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 5,
  },
  tabActive: {
    backgroundColor: Colors.light.tint + "12",
  },
  tabText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.light.textSecondary,
  },
  tabTextActive: {
    fontFamily: "Inter_600SemiBold",
    color: Colors.light.tint,
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
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  card: {
    backgroundColor: Colors.light.backgroundCard,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.light.backgroundCard,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    paddingHorizontal: 16,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    backgroundColor: Colors.light.border,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: Colors.light.text,
    marginBottom: 12,
  },
  statusOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.borderLight,
  },
  statusOptionActive: {
    backgroundColor: Colors.light.tint + "08",
    borderRadius: 8,
    paddingHorizontal: 8,
  },
  statusOptionText: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: Colors.light.text,
  },
  statusOptionTextActive: {
    fontFamily: "Inter_600SemiBold",
    color: Colors.light.tint,
  },
});
