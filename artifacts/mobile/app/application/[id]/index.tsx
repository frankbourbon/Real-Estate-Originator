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
import type { ApplicationStatus } from "@/services/core";
import { useCoreService } from "@/services/core";
import { useCommentsService } from "@/services/comments";
import { useDocumentsService } from "@/services/documents";
import { useFinalCreditReviewService } from "@/services/final-credit-review";
import { useInquiryService } from "@/services/inquiry";
import { useTasksService } from "@/services/tasks";
import {
  formatCurrencyFull,
  formatFullDate,
  getBorrowerDisplayName,
  getPropertyCityState,
  getPropertyShortAddress,
} from "@/utils/formatting";
import { PHASE_INFO, PHASE_ORDER } from "@/utils/phases";

// ─── Section menu definition ──────────────────────────────────────────────────

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

type SectionGroup = {
  label: string;
  groupColor: string;
  groupIcon: keyof typeof Feather.glyphMap;
  sections: SectionItem[];
};

function buildGroups(
  id: string,
  commentCount: number,
  attachmentCount: number,
  conditionCount: number,
  exceptionCount: number,
  taskCount: number,
  rentRollCount: number,
  opHistCount: number
): SectionGroup[] {
  return [
    {
      label: "Loan",
      groupColor: "#0078CF",
      groupIcon: "dollar-sign",
      sections: [
        {
          key: "loan",
          route: `/application/${id}/loan`,
          label: "Loan Terms",
          description: "Structure, rate, LTV, DSCR, amortization type",
          icon: "dollar-sign",
          iconColor: "#0078CF",
          iconBg: "#EAF6FF",
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
          key: "credit-evaluation",
          route: `/application/${id}/credit-evaluation`,
          label: "Credit Evaluation",
          description: "Credit box, LOI, and commitment letter",
          icon: "shield",
          iconColor: "#6B4FBB",
          iconBg: "#F0EEFF",
        },
        {
          key: "processing",
          route: `/application/${id}/processing`,
          label: "Processing & Compliance",
          description: "Appraisal, environmental, borrower forms, HMDA",
          icon: "clipboard",
          iconColor: "#C75300",
          iconBg: "#FFECDC",
        },
        {
          key: "closing-details",
          route: `/application/${id}/closing-details`,
          label: "Closing Details",
          description: "Third-party items, legal docs, wire instructions, booking",
          icon: "check-circle",
          iconColor: "#005C3C",
          iconBg: "#D0F0E5",
        },
        {
          key: "conditions",
          route: `/application/${id}/conditions`,
          label: "Conditions & Exceptions",
          description: "Loan conditions and policy exceptions",
          icon: "check-square",
          iconColor: "#1B7F9E",
          iconBg: "#DBF5F7",
          badge: conditionCount + exceptionCount,
        },
      ],
    },
    {
      label: "Client",
      groupColor: "#1B7F9E",
      groupIcon: "user",
      sections: [
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
          key: "comments",
          route: `/application/${id}/comments`,
          label: "Comments",
          description: "Threaded discussion on this application",
          icon: "message-circle",
          iconColor: "#6B46C1",
          iconBg: "#F3F0FF",
          badge: commentCount,
        },
        {
          key: "documents",
          route: `/application/${id}/documents`,
          label: "Documents",
          description: "Attached files and supporting materials",
          icon: "paperclip",
          iconColor: "#5F646A",
          iconBg: "#E6E9EB",
          badge: attachmentCount,
        },
      ],
    },
    {
      label: "Property",
      groupColor: "#00875D",
      groupIcon: "map-pin",
      sections: [
        {
          key: "property",
          route: `/application/${id}/property`,
          label: "Property Details",
          description: "Location, property type, size, and occupancy",
          icon: "map-pin",
          iconColor: "#00875D",
          iconBg: "#EAF5F2",
        },
        {
          key: "rent-roll",
          route: `/application/${id}/rent-roll`,
          label: "Rent Roll",
          description: "MISMO rent roll — unit-level lease data",
          icon: "list",
          iconColor: "#00875D",
          iconBg: "#EAF5F2",
          badge: rentRollCount,
        },
        {
          key: "operating-history",
          route: `/application/${id}/operating-history`,
          label: "Operating History",
          description: "Income & expense statements by period",
          icon: "trending-up",
          iconColor: "#00875D",
          iconBg: "#EAF5F2",
          badge: opHistCount,
        },
      ],
    },
    {
      label: "Tasks",
      groupColor: "#C75300",
      groupIcon: "check-square",
      sections: [
        {
          key: "tasks",
          route: `/application/${id}/tasks`,
          label: "Phase Task Checklist",
          description: "Phase-by-phase task tracking for this loan",
          icon: "check-square",
          iconColor: "#C75300",
          iconBg: "#FFECDC",
          badge: taskCount,
        },
      ],
    },
  ];
}

// ─── Phase info card ──────────────────────────────────────────────────────────

function PhaseCard({
  status,
  onAdvance,
  onRetreat,
  onSeeAllTasks,
}: {
  status: ApplicationStatus;
  onAdvance: () => void;
  onRetreat: () => void;
  onSeeAllTasks: () => void;
}) {
  const info = PHASE_INFO[status];
  const currentIdx = PHASE_ORDER.indexOf(status);
  const hasPrev = currentIdx > 0;
  const hasNext = currentIdx < PHASE_ORDER.length - 1;
  const nextStatus = hasNext ? PHASE_ORDER[currentIdx + 1] : null;

  return (
    <View style={[pc.card, { borderLeftColor: info.color }]}>
      {/* Phase number / progress */}
      <View style={pc.topRow}>
        <View style={pc.phaseNumBadge}>
          <Text style={[pc.phaseNumText, { color: info.color }]}>
            Phase {info.phase} of {PHASE_ORDER.length}
          </Text>
        </View>
        <View style={[pc.personaBadge, { backgroundColor: info.bg }]}>
          <Feather name={info.personaIcon as any} size={11} color={info.color} />
          <Text style={[pc.personaText, { color: info.color }]}>{info.persona}</Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={pc.progressTrack}>
        <View
          style={[
            pc.progressFill,
            { backgroundColor: info.color, width: `${(info.phase / PHASE_ORDER.length) * 100}%` },
          ]}
        />
      </View>

      {/* Description */}
      <Text style={pc.desc}>{info.description}</Text>

      {/* Checklist preview — first 3 items */}
      <View style={pc.checklist}>
        {info.checklist.slice(0, 3).map((item, i) => (
          <View key={i} style={pc.checkItem}>
            <View style={[pc.checkDot, { backgroundColor: info.color + "40" }]}>
              <Feather name="check" size={9} color={info.color} />
            </View>
            <Text style={pc.checkText}>{item}</Text>
          </View>
        ))}
        {info.checklist.length > 3 ? (
          <TouchableOpacity onPress={onSeeAllTasks} activeOpacity={0.7}>
            <Text style={[pc.moreItems, { color: info.color }]}>
              +{info.checklist.length - 3} more — view full checklist →
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={onSeeAllTasks} activeOpacity={0.7}>
            <Text style={[pc.moreItems, { color: info.color }]}>View full checklist →</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Regulatory note */}
      {info.notes ? (
        <View style={pc.noteRow}>
          <Feather name="alert-triangle" size={11} color="#D4780A" />
          <Text style={pc.noteText}>{info.notes}</Text>
        </View>
      ) : null}

      {/* Advance / Retreat */}
      <View style={pc.navRow}>
        <TouchableOpacity
          style={[pc.navBtn, !hasPrev && pc.navBtnDisabled]}
          onPress={onRetreat}
          disabled={!hasPrev}
          activeOpacity={0.7}
        >
          <Feather name="chevron-left" size={14} color={hasPrev ? info.color : Colors.light.textTertiary} />
          <Text style={[pc.navBtnText, !hasPrev && pc.navBtnTextDisabled]}>Previous</Text>
        </TouchableOpacity>

        {nextStatus ? (
          <TouchableOpacity style={[pc.advanceBtn, { backgroundColor: info.color }]} onPress={onAdvance} activeOpacity={0.8}>
            <Text style={pc.advanceBtnText}>Advance to {nextStatus}</Text>
            <Feather name="chevron-right" size={14} color="#fff" />
          </TouchableOpacity>
        ) : (
          <View style={[pc.advanceBtn, { backgroundColor: "#005C3C" }]}>
            <Feather name="check" size={14} color="#fff" />
            <Text style={pc.advanceBtnText}>Loan Closed</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const pc = StyleSheet.create({
  card: {
    backgroundColor: Colors.light.backgroundCard,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderLeftWidth: 4,
    borderRadius: 4,
    padding: 16,
    marginBottom: 16,
    gap: 10,
  },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  phaseNumBadge: {},
  phaseNumText: { fontSize: 11, fontFamily: "OpenSans_700Bold", letterSpacing: 0.3 },
  personaBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  personaText: { fontSize: 11, fontFamily: "OpenSans_700Bold" },
  progressTrack: {
    height: 4,
    backgroundColor: Colors.light.border,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: { height: 4, borderRadius: 2 },
  desc: {
    fontSize: 13,
    fontFamily: "OpenSans_400Regular",
    color: Colors.light.textSecondary,
    lineHeight: 19,
  },
  checklist: { gap: 5 },
  checkItem: { flexDirection: "row", alignItems: "center", gap: 7 },
  checkDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  checkText: { fontSize: 12, fontFamily: "OpenSans_400Regular", color: Colors.light.text, flex: 1 },
  moreItems: { fontSize: 11, fontFamily: "OpenSans_600SemiBold", marginLeft: 23 },
  noteRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    backgroundColor: "#FFF4E5",
    padding: 8,
    borderRadius: 4,
  },
  noteText: { fontSize: 11, fontFamily: "OpenSans_400Regular", color: "#7B4400", flex: 1, lineHeight: 16 },
  navRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 },
  navBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  navBtnDisabled: { opacity: 0.4 },
  navBtnText: { fontSize: 12, fontFamily: "OpenSans_600SemiBold", color: Colors.light.text },
  navBtnTextDisabled: { color: Colors.light.textTertiary },
  advanceBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 4,
  },
  advanceBtnText: { fontSize: 12, fontFamily: "OpenSans_700Bold", color: "#fff" },
});

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function ApplicationOverviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getApplication, getBorrower, getProperty, updateApplication, deleteApplication } = useCoreService();
  const { getComments } = useCommentsService();
  const { getDocuments } = useDocumentsService();
  const { getConditions, getExceptions } = useFinalCreditReviewService();
  const { getRentRoll, getOpHistory } = useInquiryService();
  const { getTasksForApplication } = useTasksService();
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

  const handleAdvance = async () => {
    const idx = PHASE_ORDER.indexOf(app.status);
    if (idx < PHASE_ORDER.length - 1) {
      await updateApplication(id, { status: PHASE_ORDER[idx + 1] });
    }
  };

  const handleRetreat = async () => {
    const idx = PHASE_ORDER.indexOf(app.status);
    if (idx > 0) {
      await updateApplication(id, { status: PHASE_ORDER[idx - 1] });
    }
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const conditionCount = getConditions(id).length;
  const exceptionCount = getExceptions(id).length;
  const rentRollCount = getRentRoll(id).length;
  const opHistCount = getOpHistory(id).length;
  const taskCount = getTasksForApplication(id).length;
  const groups = buildGroups(
    id, getComments(id).length, getDocuments(id).length,
    conditionCount, exceptionCount, taskCount, rentRollCount, opHistCount
  );

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

        <TouchableOpacity style={styles.iconBtn} onPress={handleDelete} activeOpacity={0.7}>
          <Feather name="trash-2" size={16} color="#FF6B6B" />
        </TouchableOpacity>
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

      {/* ── Scrollable body ── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPad + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Phase info card */}
        <Text style={styles.groupLabel}>Current Phase</Text>
        <PhaseCard
          status={app.status}
          onAdvance={handleAdvance}
          onRetreat={handleRetreat}
          onSeeAllTasks={() => router.push(`/application/${id}/tasks` as any)}
        />

        {/* Grouped section menu */}
        <Text style={styles.groupLabel}>Sections</Text>
        {groups.map((group) => (
          <View key={group.label} style={styles.groupBlock}>
            <View style={styles.groupHeader}>
              <View style={[styles.groupPersonaIcon, { backgroundColor: group.groupColor + "20" }]}>
                <Feather name={group.groupIcon} size={12} color={group.groupColor} />
              </View>
              <Text style={[styles.groupPersonaLabel, { color: group.groupColor }]}>{group.label}</Text>
            </View>

            {/* Section rows */}
            <View style={styles.menuCard}>
              {group.sections.map((section, idx) => (
                <TouchableOpacity
                  key={section.key}
                  style={[
                    styles.menuRow,
                    idx < group.sections.length - 1 && styles.menuRowBorder,
                  ]}
                  onPress={() => router.push(section.route as any)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.menuIcon, { backgroundColor: section.iconBg }]}>
                    <Feather name={section.icon} size={16} color={section.iconColor} />
                  </View>
                  <View style={styles.menuText}>
                    <Text style={styles.menuRowLabel}>{section.label}</Text>
                    <Text style={styles.menuRowDesc}>{section.description}</Text>
                  </View>
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
          </View>
        ))}
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
            <Text style={styles.sheetTitle}>Move to Phase</Text>
            <Text style={styles.sheetSub}>
              Current: <Text style={{ color: Colors.light.tint }}>{app.status}</Text>
            </Text>
          </View>
          <View style={styles.sheetDivider} />
          <ScrollView showsVerticalScrollIndicator={false}>
            {PHASE_ORDER.map((s, i) => (
              <TouchableOpacity
                key={s}
                style={[styles.statusOpt, s === app.status && styles.statusOptActive]}
                onPress={async () => { await updateApplication(id, { status: s }); setStatusModal(false); }}
                activeOpacity={0.7}
              >
                <View style={styles.statusOptLeft}>
                  <Text style={styles.statusOptNum}>{i + 1}</Text>
                  <StatusBadge status={s} />
                </View>
                {s === app.status && <Feather name="check" size={16} color={Colors.light.tint} />}
              </TouchableOpacity>
            ))}
          </ScrollView>
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
  headerAddress: { fontSize: 16, fontFamily: "OpenSans_700Bold", color: "#fff", letterSpacing: -0.2 },
  headerCity: { fontSize: 12, fontFamily: "OpenSans_400Regular", color: "rgba(255,255,255,0.55)", marginTop: 1 },
  headerActions: { flexDirection: "row", gap: 4 },
  iconBtn: {
    width: 34, height: 34,
    alignItems: "center", justifyContent: "center",
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
  metricValue: { fontSize: 13, fontFamily: "OpenSans_700Bold", color: Colors.light.text, textAlign: "center" },
  metricLabel: {
    fontSize: 9, fontFamily: "OpenSans_600SemiBold",
    color: Colors.light.textTertiary,
    textTransform: "uppercase", letterSpacing: 0.4, textAlign: "center",
  },
  metricDivider: { width: 1, height: 28, backgroundColor: Colors.light.border },
  changeStatus: { fontSize: 10, fontFamily: "OpenSans_600SemiBold", color: Colors.light.tint, marginTop: 2 },

  metaBar: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 16, paddingVertical: 8,
    backgroundColor: Colors.light.background,
    borderBottomWidth: 1, borderBottomColor: Colors.light.border,
  },
  metaText: { fontSize: 11, fontFamily: "OpenSans_400Regular", color: Colors.light.textTertiary },
  metaDot: { fontSize: 11, color: Colors.light.textTertiary },

  scroll: { flex: 1, backgroundColor: Colors.light.background },
  scrollContent: { padding: 16, gap: 0 },

  groupLabel: {
    fontSize: 10, fontFamily: "OpenSans_700Bold",
    color: Colors.light.textTertiary,
    textTransform: "uppercase", letterSpacing: 0.8,
    marginBottom: 8, marginLeft: 2,
  },

  groupBlock: { marginBottom: 16 },
  groupHeader: {
    flexDirection: "row", alignItems: "center",
    gap: 7, marginBottom: 6,
  },
  groupPersonaIcon: {
    width: 22, height: 22,
    borderRadius: 4,
    alignItems: "center", justifyContent: "center",
  },
  groupPersonaLabel: {
    fontSize: 11, fontFamily: "OpenSans_700Bold",
    textTransform: "uppercase", letterSpacing: 0.5,
  },

  menuCard: {
    backgroundColor: Colors.light.backgroundCard,
    borderWidth: 1, borderColor: Colors.light.border,
    borderRadius: 4, overflow: "hidden",
  },
  menuRow: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 14, gap: 14,
  },
  menuRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.light.borderLight },
  menuIcon: {
    width: 36, height: 36,
    borderRadius: 8, alignItems: "center", justifyContent: "center",
  },
  menuText: { flex: 1, gap: 2 },
  menuRowLabel: { fontSize: 14, fontFamily: "OpenSans_600SemiBold", color: Colors.light.text },
  menuRowDesc: { fontSize: 11, fontFamily: "OpenSans_400Regular", color: Colors.light.textTertiary },
  menuRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  menuBadge: {
    backgroundColor: Colors.light.tint,
    borderRadius: 10, minWidth: 20, height: 20,
    alignItems: "center", justifyContent: "center", paddingHorizontal: 5,
  },
  menuBadgeText: { fontSize: 11, fontFamily: "OpenSans_700Bold", color: "#fff" },

  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.5)" },
  sheet: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: Colors.light.backgroundCard,
    borderTopLeftRadius: 8, borderTopRightRadius: 8,
    paddingTop: 12, paddingHorizontal: 20,
    maxHeight: "80%",
  },
  sheetHandle: {
    width: 36, height: 4,
    backgroundColor: Colors.light.border,
    borderRadius: 2, alignSelf: "center", marginBottom: 16,
  },
  sheetHeader: { marginBottom: 8 },
  sheetTitle: { fontSize: 15, fontFamily: "OpenSans_700Bold", color: Colors.light.text },
  sheetSub: { fontSize: 12, fontFamily: "OpenSans_400Regular", color: Colors.light.textSecondary, marginTop: 2 },
  sheetDivider: { height: 1, backgroundColor: Colors.light.border, marginBottom: 8 },
  statusOpt: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingVertical: 10, paddingHorizontal: 4,
    borderBottomWidth: 1, borderBottomColor: Colors.light.borderLight,
  },
  statusOptLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  statusOptNum: {
    fontSize: 11, fontFamily: "OpenSans_700Bold",
    color: Colors.light.textTertiary, width: 18,
  },
  statusOptActive: {
    backgroundColor: Colors.light.tintLight + "40",
    borderRadius: 4, paddingHorizontal: 8,
  },
});
