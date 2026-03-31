import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
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
import { statusToPhase, usePhaseDataService } from "@/services/phase-data";
import { useCommentsService } from "@/services/comments";
import { useLoanTeamService } from "@/services/loan-team";
import { useDocumentsService } from "@/services/documents";
import { useConditionsService } from "@/services/conditions";
import { useTasksService } from "@/services/tasks";
import {
  formatCurrencyFull,
  formatFullDate,
  getBorrowerDisplayName,
  getPropertyCityState,
  getPropertyShortAddress,
} from "@/utils/formatting";
import { confirmDestructive } from "@/utils/confirm";
import { DISPOSITION_STATUSES, PHASE_INFO, PHASE_ORDER } from "@/utils/phases";
import { AccessDenied } from "@/components/AccessDenied";
import { usePermission } from "@/hooks/usePermission";

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

/** Maps each loan phase to the domain-specific screens accessible from it.
 *  Tasks, conditions, comments, and documents are globally accessible via the
 *  Activity section below the phase timeline — they do not appear here. */
function buildPhaseSections(
  id: string,
): Record<ApplicationStatus, SectionItem[]> {
  // ── Core4 factory: each phase MS gets its own isolated snapshot via ?phase= ─
  function core4(phase: string): SectionItem[] {
    return [
      {
        key: "borrower", route: `/application/${id}/borrower?phase=${phase}`,
        label: "Borrower Profile", description: "Identity, contact information, and financial profile",
        icon: "user", iconColor: Colors.light.tint, iconBg: Colors.light.tintLight,
      },
      {
        key: "property", route: `/application/${id}/property?phase=${phase}`,
        label: "Property Details", description: "Location, attributes, occupancy, rent roll, and operating history",
        icon: "map-pin", iconColor: "#00875D", iconBg: "#EAF5F2",
      },
      {
        key: "loan", route: `/application/${id}/loan?phase=${phase}`,
        label: "Loan Terms", description: "Structure, rate, LTV, DSCR, amortization type",
        icon: "dollar-sign", iconColor: "#0078CF", iconBg: "#EAF6FF",
      },
      {
        key: "amortization", route: `/application/${id}/amortization?phase=${phase}`,
        label: "Amortization Calculator", description: "Rate build-up, day count convention, payment schedule",
        icon: "bar-chart-2", iconColor: "#0078CF", iconBg: "#EAF6FF",
      },
    ];
  }
  const creditEval: SectionItem = {
    key: "credit-evaluation", route: `/application/${id}/credit-evaluation`,
    label: "Initial Credit Review", description: "Credit box assessment and LOI recommendation",
    icon: "shield", iconColor: "#0078CF", iconBg: "#EAF6FF",
  };
  const commitmentLetter: SectionItem = {
    key: "commitment-letter", route: `/application/${id}/commitment-letter`,
    label: "Final Credit Review", description: "Final Credit Review recommendation and issued date",
    icon: "shield", iconColor: "#6B46C1", iconBg: "#F3F0FF",
  };
  const processing: SectionItem = {
    key: "processing", route: `/application/${id}/processing`,
    label: "Processing & Compliance", description: "Appraisal, environmental, borrower forms, HMDA",
    icon: "clipboard", iconColor: "#C75300", iconBg: "#FFECDC",
  };
  const closingDetails: SectionItem = {
    key: "closing-details", route: `/application/${id}/closing-details`,
    label: "Closing Details", description: "Third-party items, legal docs, wire instructions, booking",
    icon: "check-circle", iconColor: "#005C3C", iconBg: "#D0F0E5",
  };

  const inquiryDisposition: SectionItem = {
    key: "inquiry-disposition", route: `/application/${id}/inquiry-disposition`,
    label: "Inquiry Disposition", description: "Cancellation, withdrawal, or denial at the inquiry stage",
    icon: "alert-octagon", iconColor: "#B91C1C", iconBg: "#FEE2E2",
  };
  const applicationDisposition: SectionItem = {
    key: "application-disposition", route: `/application/${id}/application-disposition`,
    label: "Application Disposition", description: "Withdrawal or cancellation after LOI issuance",
    icon: "alert-octagon", iconColor: "#B91C1C", iconBg: "#FEE2E2",
  };
  const finalCreditDenial: SectionItem = {
    key: "commitment-letter", route: `/application/${id}/commitment-letter`,
    label: "Credit Denial", description: "Final Credit Review decline and adverse action",
    icon: "shield", iconColor: "#B91C1C", iconBg: "#FEE2E2",
  };

  return {
    // ── Inquiry MS ────────────────────────────────────────────────────────────
    "Inquiry":               [...core4("inquiry")],
    "Inquiry Canceled":      [inquiryDisposition, ...core4("inquiry")],
    "Inquiry Withdrawn":     [inquiryDisposition, ...core4("inquiry")],

    // ── Initial Review MS ─────────────────────────────────────────────────────
    "Initial Credit Review": [creditEval, ...core4("initial-review")],
    "Inquiry Denied":        [inquiryDisposition, creditEval, ...core4("initial-review")],

    // ── Application MS (Start + Processing unified) ───────────────────────────
    "Application Start":     [processing, ...core4("application")],
    "Application Processing":[processing, ...core4("application")],
    "Application Withdrawn": [applicationDisposition, ...core4("application")],
    "Application Canceled":  [applicationDisposition, ...core4("application")],

    // ── Final Review MS ───────────────────────────────────────────────────────
    "Final Credit Review":   [commitmentLetter, ...core4("final-review")],
    "Application Denied":    [finalCreditDenial, ...core4("final-review")],

    // ── Closing MS (Pre-close → Closing unified) ──────────────────────────────
    "Pre-close":             [closingDetails, ...core4("closing")],
    "Ready for Docs":        [closingDetails, ...core4("closing")],
    "Docs Drawn":            [closingDetails, ...core4("closing")],
    "Docs Back":             [closingDetails, ...core4("closing")],
    "Closing":               [closingDetails, ...core4("closing")],
  };
}

// ─── Phase timeline — accordion with per-phase screen navigation ──────────────

function PhaseTimeline({
  status,
  phaseSections,
  onAdvance,
  onRetreat,
  onNavigate,
}: {
  status: ApplicationStatus;
  phaseSections: Record<ApplicationStatus, SectionItem[]>;
  onAdvance: () => void;
  onRetreat: () => void;
  onNavigate: (route: string) => void;
}) {
  const currentIdx = PHASE_ORDER.indexOf(status);
  const [expanded, setExpanded] = useState<ApplicationStatus | null>(status);

  const toggle = (phase: ApplicationStatus) =>
    setExpanded((prev) => (prev === phase ? null : phase));

  return (
    <View style={pt.card}>
      {PHASE_ORDER.map((phase, idx) => {
        const info = PHASE_INFO[phase];
        const isDone = idx < currentIdx;
        const isCurrent = idx === currentIdx;
        const isFuture = idx > currentIdx;
        const isLast = idx === PHASE_ORDER.length - 1;
        const isExpanded = expanded === phase;
        const hasPrev = currentIdx > 0;
        const hasNext = currentIdx < PHASE_ORDER.length - 1;
        const nextStatus = hasNext ? PHASE_ORDER[currentIdx + 1] : null;
        const sections = phaseSections[phase] ?? [];

        return (
          <View key={phase} style={pt.row}>
            {/* ── Left rail ── */}
            <View style={pt.rail}>
              {idx > 0 && (
                <View style={[pt.line, isDone || isCurrent ? { backgroundColor: info.color + "90" } : {}]} />
              )}
              {isDone ? (
                <View style={[pt.circle, { backgroundColor: info.color, borderColor: info.color }]}>
                  <Feather name="check" size={10} color="#fff" />
                </View>
              ) : isCurrent ? (
                <View style={[pt.circle, { borderColor: info.color, backgroundColor: info.bg }]}>
                  <View style={[pt.circleDot, { backgroundColor: info.color }]} />
                </View>
              ) : (
                <View style={[pt.circle, { borderColor: Colors.light.border, backgroundColor: Colors.light.background }]} />
              )}
              {!isLast && (
                <View style={[pt.line, isDone ? { backgroundColor: info.color + "60" } : {}]} />
              )}
            </View>

            {/* ── Content ── */}
            <View style={[pt.content, !isLast && !isExpanded && pt.contentBorder]}>
              {/* Tappable phase header */}
              <TouchableOpacity
                style={pt.phaseHeader}
                onPress={() => toggle(phase)}
                activeOpacity={0.7}
              >
                <Text style={[pt.phaseNum, isFuture && pt.muted]}>
                  {String(info.phase).padStart(2, "0")}
                </Text>
                <Text style={[pt.phaseName, isFuture && pt.muted, isCurrent && { color: info.color, fontFamily: "OpenSans_700Bold" }]}>
                  {phase}
                </Text>
                <View style={[pt.personaBadge, { backgroundColor: isFuture ? Colors.light.border + "30" : info.bg }]}>
                  <Feather name={info.personaIcon as any} size={10} color={isFuture ? Colors.light.textTertiary : info.color} />
                  <Text style={[pt.personaText, { color: isFuture ? Colors.light.textTertiary : info.color }]}>
                    {info.persona}
                  </Text>
                </View>
                <Feather
                  name={isExpanded ? "chevron-up" : "chevron-down"}
                  size={14}
                  color={isFuture ? Colors.light.textTertiary : info.color}
                />
              </TouchableOpacity>

              {/* Accordion body */}
              {isExpanded && (
                <View style={[pt.expanded, !isLast && pt.expandedBorder]}>
                  {/* Description */}
                  <Text style={pt.desc}>{info.description}</Text>

                  {/* Regulatory note */}
                  {info.notes ? (
                    <View style={pt.noteRow}>
                      <Feather name="alert-triangle" size={11} color="#D4780A" />
                      <Text style={pt.noteText}>{info.notes}</Text>
                    </View>
                  ) : null}

                  {/* Section links */}
                  <View style={pt.sectionList}>
                    {sections.map((section, si) => (
                      <TouchableOpacity
                        key={section.key}
                        style={[pt.sectionRow, si < sections.length - 1 && pt.sectionRowBorder]}
                        onPress={() => onNavigate(section.route)}
                        activeOpacity={0.75}
                      >
                        <View style={[pt.sectionIcon, { backgroundColor: section.iconBg }]}>
                          <Feather name={section.icon as any} size={14} color={section.iconColor} />
                        </View>
                        <View style={pt.sectionText}>
                          <Text style={pt.sectionLabel}>{section.label}</Text>
                          <Text style={pt.sectionDesc} numberOfLines={1}>{section.description}</Text>
                        </View>
                        <View style={pt.sectionRight}>
                          {section.badge != null && section.badge > 0 ? (
                            <View style={[pt.sectionBadge, { backgroundColor: section.iconColor + "20" }]}>
                              <Text style={[pt.sectionBadgeText, { color: section.iconColor }]}>{section.badge}</Text>
                            </View>
                          ) : null}
                          <Feather name="chevron-right" size={14} color={Colors.light.textTertiary} />
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Advance / Retreat — only for the current phase */}
                  {isCurrent && (
                    <View style={pt.navRow}>
                      <TouchableOpacity
                        style={[pt.retreatBtn, !hasPrev && pt.btnDisabled]}
                        onPress={onRetreat}
                        disabled={!hasPrev}
                        activeOpacity={0.7}
                      >
                        <Feather name="chevron-left" size={13} color={hasPrev ? info.color : Colors.light.textTertiary} />
                        <Text style={[pt.retreatText, !hasPrev && { color: Colors.light.textTertiary }]}>Previous</Text>
                      </TouchableOpacity>

                      {nextStatus ? (
                        <TouchableOpacity style={[pt.advanceBtn, { backgroundColor: info.color }]} onPress={onAdvance} activeOpacity={0.8}>
                          <Text style={pt.advanceBtnText}>Advance to {nextStatus}</Text>
                          <Feather name="chevron-right" size={13} color="#fff" />
                        </TouchableOpacity>
                      ) : (
                        <View style={[pt.advanceBtn, { backgroundColor: "#005C3C" }]}>
                          <Feather name="check" size={13} color="#fff" />
                          <Text style={pt.advanceBtnText}>Loan Closed</Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const RAIL_W = 36;
const CIRCLE_SIZE = 20;

const pt = StyleSheet.create({
  card: {
    backgroundColor: Colors.light.backgroundCard,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 16,
  },
  row: {
    flexDirection: "row",
  },
  rail: {
    width: RAIL_W,
    alignItems: "center",
    position: "relative",
  },
  line: {
    width: 2,
    flex: 1,
    backgroundColor: Colors.light.border,
  },
  circle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.light.backgroundCard,
    zIndex: 1,
  },
  circleDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  content: {
    flex: 1,
    paddingVertical: 10,
    paddingRight: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.borderLight,
  },
  contentBorder: {},
  phaseHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  phaseNum: {
    fontSize: 10,
    fontFamily: "OpenSans_700Bold",
    color: Colors.light.textTertiary,
    letterSpacing: 0.3,
    width: 18,
  },
  phaseName: {
    flex: 1,
    fontSize: 13,
    fontFamily: "OpenSans_600SemiBold",
    color: Colors.light.text,
  },
  muted: { color: Colors.light.textTertiary, fontFamily: "OpenSans_400Regular" },
  personaBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
  },
  personaText: {
    fontSize: 10,
    fontFamily: "OpenSans_700Bold",
  },
  expanded: {
    marginTop: 8,
    gap: 8,
  },
  desc: {
    fontSize: 12,
    fontFamily: "OpenSans_400Regular",
    color: Colors.light.textSecondary,
    lineHeight: 18,
  },
  expandedBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.borderLight,
    paddingBottom: 10,
  },
  sectionList: {
    backgroundColor: Colors.light.background,
    borderRadius: 4,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 10,
    backgroundColor: Colors.light.backgroundCard,
  },
  sectionRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.light.borderLight },
  sectionIcon: {
    width: 30,
    height: 30,
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  sectionText: { flex: 1 },
  sectionLabel: { fontSize: 13, fontFamily: "OpenSans_600SemiBold", color: Colors.light.text },
  sectionDesc: { fontSize: 11, fontFamily: "OpenSans_400Regular", color: Colors.light.textSecondary, marginTop: 1 },
  sectionRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  sectionBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: "center",
  },
  sectionBadgeText: { fontSize: 11, fontFamily: "OpenSans_700Bold" },
  noteRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 5,
    backgroundColor: "#FFF4E5",
    padding: 8,
    borderRadius: 4,
  },
  noteText: { fontSize: 11, fontFamily: "OpenSans_400Regular", color: "#7B4400", flex: 1, lineHeight: 16 },
  navRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 2 },
  retreatBtn: {
    flexDirection: "row", alignItems: "center", gap: 3,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 4,
    borderWidth: 1, borderColor: Colors.light.border,
  },
  retreatText: { fontSize: 12, fontFamily: "OpenSans_600SemiBold", color: Colors.light.text },
  btnDisabled: { opacity: 0.35 },
  advanceBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 4,
  },
  advanceBtnText: { fontSize: 12, fontFamily: "OpenSans_700Bold", color: "#fff" },
});

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function ApplicationOverviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getApplication, getBorrower, getProperty, updateApplication, deleteApplication, getCollaborators } = useCoreService();
  const { promoteSnapshots, getLoanTermsSnapshot } = usePhaseDataService();
  const { getComments } = useCommentsService();
  const { getDocuments } = useDocumentsService();
  const { getConditions } = useConditionsService();
  const { getTasksForApplication } = useTasksService();
  const { getTeamMembers } = useLoanTeamService();
  const insets = useSafeAreaInsets();
  const { canView, canEdit } = usePermission("core.applications");
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

  if (!canView) return <AccessDenied screenLabel="Application Overview" />;

  const handleDelete = () => {
    confirmDestructive(
      "Delete Application",
      "This action cannot be undone.",
      "Delete",
      async () => { await deleteApplication(id); router.back(); },
    );
  };

  const handleAdvance = async () => {
    const idx = PHASE_ORDER.indexOf(app.status);
    if (idx >= 0 && idx < PHASE_ORDER.length - 1) {
      const nextStatus = PHASE_ORDER[idx + 1];
      const fromPhase = statusToPhase(app.status);
      const toPhase   = statusToPhase(nextStatus);

      // Cross-MS boundary: promote Core4 snapshots before updating status
      if (fromPhase !== toPhase) {
        await promoteSnapshots(id, fromPhase, toPhase, {
          borrower: {
            firstName: borrower?.firstName ?? "", lastName: borrower?.lastName ?? "",
            entityName: borrower?.entityName ?? "",
            emails: borrower?.emails ?? [], phones: borrower?.phones ?? [],
            mailingAddresses: borrower?.mailingAddresses ?? [],
            creExperienceYears: borrower?.creExperienceYears ?? "",
            netWorthUsd: borrower?.netWorthUsd ?? "",
            liquidityUsd: borrower?.liquidityUsd ?? "",
            creditScore: borrower?.creditScore ?? "",
          },
          property: {
            legalAddress: property?.legalAddress ?? "",
            locations: property?.locations ?? [],
            streetAddress: property?.streetAddress ?? "", city: property?.city ?? "",
            state: property?.state ?? "", zipCode: property?.zipCode ?? "",
            latitude: property?.latitude ?? "", longitude: property?.longitude ?? "",
            googlePlaceId: property?.googlePlaceId ?? "",
            propertyType: property?.propertyType ?? "Office",
            grossSqFt: property?.grossSqFt ?? "", numberOfUnits: property?.numberOfUnits ?? "",
            yearBuilt: property?.yearBuilt ?? "",
            physicalOccupancyPct: property?.physicalOccupancyPct ?? "",
            economicOccupancyPct: property?.economicOccupancyPct ?? "",
          },
          loanTerms: (() => {
            const snap = getLoanTermsSnapshot(id, fromPhase);
            return {
              loanType: snap?.loanType ?? app.loanType ?? "Acquisition",
              loanAmountUsd: snap?.loanAmountUsd ?? String(app.loanAmountUsd ?? ""),
              loanTermYears: snap?.loanTermYears ?? String(app.loanTermYears ?? ""),
              interestType: snap?.interestType ?? app.interestType ?? "Fixed",
              interestRatePct: snap?.interestRatePct ?? String(app.interestRatePct ?? ""),
              amortizationType: snap?.amortizationType ?? app.amortizationType ?? "Full Amortizing",
              ltvPct: snap?.ltvPct ?? String(app.ltvPct ?? ""),
              dscrRatio: snap?.dscrRatio ?? String(app.dscrRatio ?? ""),
              targetClosingDate: snap?.targetClosingDate ?? app.targetClosingDate ?? "",
            };
          })(),
        });
      }

      await updateApplication(id, { status: nextStatus });
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
  const taskCount = getTasksForApplication(id).length;
  const teamCount = getTeamMembers(id).length;
  const collabCount = getCollaborators(id).length;
  const phaseSections = buildPhaseSections(id);

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

        {canEdit && (
          <TouchableOpacity style={styles.iconBtn} onPress={handleDelete} activeOpacity={0.7}>
            <Feather name="trash-2" size={16} color="#FF6B6B" />
          </TouchableOpacity>
        )}
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
          {canEdit && (
            <TouchableOpacity onPress={() => setStatusModal(true)} activeOpacity={0.7}>
              <Text style={styles.changeStatus}>Change ↓</Text>
            </TouchableOpacity>
          )}
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
        {/* Phase timeline — or disposition card for adverse terminal statuses */}
        <Text style={styles.groupLabel}>
          {DISPOSITION_STATUSES.has(app.status) ? "Adverse Disposition" : "Loan Phases"}
        </Text>
        {DISPOSITION_STATUSES.has(app.status) ? (
          <View style={styles.dispositionCard}>
            <View style={styles.dispositionRow}>
              <Feather name="alert-octagon" size={18} color="#B91C1C" />
              <View style={{ flex: 1 }}>
                <Text style={styles.dispositionStatus}>{app.status}</Text>
                <Text style={styles.dispositionDesc}>
                  {PHASE_INFO[app.status]?.description ?? ""}
                </Text>
              </View>
            </View>
            {(phaseSections[app.status] ?? []).map((section, si, arr) => (
              <TouchableOpacity
                key={section.key}
                style={[styles.dispositionSection, si < arr.length - 1 && styles.dispositionSectionBorder]}
                onPress={() => router.push(section.route as any)}
                activeOpacity={0.75}
              >
                <View style={[pt.sectionIcon, { backgroundColor: section.iconBg }]}>
                  <Feather name={section.icon as any} size={14} color={section.iconColor} />
                </View>
                <View style={pt.sectionText}>
                  <Text style={pt.sectionLabel}>{section.label}</Text>
                  <Text style={pt.sectionDesc} numberOfLines={1}>{section.description}</Text>
                </View>
                <Feather name="chevron-right" size={14} color={Colors.light.textTertiary} />
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <PhaseTimeline
            status={app.status}
            phaseSections={phaseSections}
            onAdvance={canEdit ? handleAdvance : undefined}
            onRetreat={canEdit ? handleRetreat : undefined}
            onNavigate={(route) => router.push(route as any)}
          />
        )}

        {/* Activity — always accessible regardless of phase */}
        <Text style={styles.groupLabel}>Activity</Text>
        <View style={styles.activityCard}>
          {([
            {
              key: "documents", route: `/application/${id}/documents`,
              label: "Documents", icon: "paperclip" as const,
              iconColor: "#5F646A", iconBg: "#E6E9EB",
              badge: getDocuments(id).length,
              desc: "Attached files",
            },
            {
              key: "comments", route: `/application/${id}/comments`,
              label: "Comments", icon: "message-circle" as const,
              iconColor: "#6B46C1", iconBg: "#F3F0FF",
              badge: getComments(id).length,
              desc: "Threaded discussion",
            },
            {
              key: "conditions", route: `/application/${id}/conditions`,
              label: "Conditions", icon: "shield" as const,
              iconColor: "#1B7F9E", iconBg: "#DBF5F7",
              badge: conditionCount,
              desc: "Conditions that must be satisfied before closing",
            },
            {
              key: "tasks", route: `/application/${id}/tasks`,
              label: "Tasks", icon: "check-square" as const,
              iconColor: "#C75300", iconBg: "#FFECDC",
              badge: taskCount,
              desc: "Phase-by-phase task tracking",
            },
            {
              key: "loan-team", route: `/application/${id}/loan-team`,
              label: "Loan Team", icon: "users" as const,
              iconColor: "#005C3C", iconBg: "#D0F0E5",
              badge: teamCount,
              desc: "Team members assigned to this loan",
            },
            {
              key: "collaboration", route: `/application/${id}/collaboration`,
              label: "Collaboration", icon: "user-check" as const,
              iconColor: "#1B7F9E", iconBg: "#DBF5F7",
              badge: collabCount,
              desc: "Users with read-only access to this loan",
            },
          ] as const).map((item, idx, arr) => (
            <TouchableOpacity
              key={item.key}
              style={[styles.activityRow, idx < arr.length - 1 && styles.activityRowBorder]}
              onPress={() => router.push(item.route as any)}
              activeOpacity={0.7}
            >
              <View style={[styles.activityIcon, { backgroundColor: item.iconBg }]}>
                <Feather name={item.icon} size={16} color={item.iconColor} />
              </View>
              <View style={styles.activityText}>
                <Text style={styles.activityLabel}>{item.label}</Text>
                <Text style={styles.activityDesc}>{item.desc}</Text>
              </View>
              <View style={styles.activityRight}>
                {item.badge > 0 && (
                  <View style={[styles.activityBadge, { backgroundColor: item.iconColor + "20" }]}>
                    <Text style={[styles.activityBadgeText, { color: item.iconColor }]}>{item.badge}</Text>
                  </View>
                )}
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

            {/* ── Adverse Disposition section ── */}
            <View style={styles.sheetSectionHeader}>
              <Feather name="alert-circle" size={13} color="#B91C1C" />
              <Text style={styles.sheetSectionLabel}>Adverse Disposition</Text>
            </View>
            <View style={styles.sheetDivider} />
            {(["Inquiry Canceled","Inquiry Withdrawn","Inquiry Denied",
               "Application Withdrawn","Application Canceled","Application Denied"] as const).map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.statusOpt, s === app.status && styles.statusOptActiveRed]}
                onPress={async () => { await updateApplication(id, { status: s }); setStatusModal(false); }}
                activeOpacity={0.7}
              >
                <View style={styles.statusOptLeft}>
                  <StatusBadge status={s} />
                </View>
                {s === app.status && <Feather name="check" size={16} color="#B91C1C" />}
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
  statusOptActiveRed: {
    backgroundColor: "#FEE2E2",
    borderRadius: 4, paddingHorizontal: 8,
  },
  sheetSectionHeader: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingTop: 20, paddingBottom: 10, paddingHorizontal: 4,
  },
  sheetSectionLabel: {
    fontSize: 11, fontFamily: "OpenSans_700Bold",
    color: "#B91C1C", letterSpacing: 0.6, textTransform: "uppercase",
  },

  dispositionCard: {
    backgroundColor: Colors.light.backgroundCard,
    borderWidth: 1, borderColor: "#FECACA",
    borderRadius: 4, overflow: "hidden",
    marginBottom: 16,
  },
  dispositionRow: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
    padding: 14, borderBottomWidth: 1, borderBottomColor: "#FECACA",
  },
  dispositionStatus: {
    fontSize: 14, fontFamily: "OpenSans_700Bold", color: "#B91C1C", marginBottom: 2,
  },
  dispositionDesc: {
    fontSize: 12, fontFamily: "OpenSans_400Regular",
    color: Colors.light.textSecondary, lineHeight: 18,
  },
  dispositionSection: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 14, paddingVertical: 12, gap: 12,
  },
  dispositionSectionBorder: { borderBottomWidth: 1, borderBottomColor: Colors.light.borderLight },

  activityCard: {
    backgroundColor: Colors.light.backgroundCard,
    borderWidth: 1, borderColor: Colors.light.border,
    borderRadius: 4, overflow: "hidden",
    marginBottom: 16,
  },
  activityRow: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 14, paddingVertical: 13, gap: 12,
    backgroundColor: Colors.light.backgroundCard,
  },
  activityRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.light.borderLight },
  activityIcon: {
    width: 34, height: 34, borderRadius: 6,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  activityText: { flex: 1 },
  activityLabel: { fontSize: 13, fontFamily: "OpenSans_600SemiBold", color: Colors.light.text },
  activityDesc: { fontSize: 11, fontFamily: "OpenSans_400Regular", color: Colors.light.textSecondary, marginTop: 1 },
  activityRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  activityBadge: {
    paddingHorizontal: 7, paddingVertical: 2,
    borderRadius: 10, minWidth: 22, alignItems: "center",
  },
  activityBadgeText: { fontSize: 11, fontFamily: "OpenSans_700Bold" },
});
