import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import Colors from "@/constants/colors";
import type { LoanApplication } from "@/services/core";
import {
  buildAmortSchedule,
  computeNoteRate,
  type AmortRow,
  type AmortSummary,
  type DayCountConvention,
  type RateBuildUp,
  type RateDiscount,
} from "@/utils/amortization";
import { formatCurrencyFull } from "@/utils/formatting";

// ─── Small helpers ────────────────────────────────────────────────────────────

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function fmt(n: number, decimals = 2): string {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function fmtPct(n: number): string {
  return `${fmt(n, 4)}%`;
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SegmentControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: T[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={seg.row}>
      {options.map((opt, i) => (
        <TouchableOpacity
          key={opt}
          style={[
            seg.btn,
            i === 0 && seg.btnFirst,
            i === options.length - 1 && seg.btnLast,
            opt === value && seg.btnActive,
          ]}
          onPress={() => onChange(opt)}
          activeOpacity={0.7}
        >
          <Text style={[seg.text, opt === value && seg.textActive]}>{opt}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const seg = StyleSheet.create({
  row: { flexDirection: "row" },
  btn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderLeftWidth: 0,
    backgroundColor: Colors.light.backgroundCard,
  },
  btnFirst: { borderLeftWidth: 1, borderRadius: 0 },
  btnLast: { borderRadius: 0 },
  btnActive: { backgroundColor: Colors.light.tint, borderColor: Colors.light.tint },
  text: {
    fontSize: 12,
    fontFamily: "OpenSans_600SemiBold",
    color: Colors.light.textSecondary,
  },
  textActive: { color: "#fff" },
});

// ─── Rate Build-Up Row ────────────────────────────────────────────────────────

function RateLine({
  label,
  value,
  sign,
  isTotal,
  bold,
  color,
}: {
  label: string;
  value: number;
  sign?: "+" | "−" | "=";
  isTotal?: boolean;
  bold?: boolean;
  color?: string;
}) {
  return (
    <View style={[rl.row, isTotal && rl.totalRow]}>
      {sign ? (
        <Text style={[rl.sign, { color: sign === "−" ? Colors.light.error : Colors.light.tint }]}>
          {sign}
        </Text>
      ) : (
        <View style={{ width: 16 }} />
      )}
      <Text style={[rl.label, bold && rl.bold]}>{label}</Text>
      <Text style={[rl.value, bold && rl.bold, color ? { color } : null]}>
        {fmtPct(value)}
      </Text>
    </View>
  );
}

const rl = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.borderLight,
  },
  totalRow: {
    borderBottomWidth: 0,
    borderTopWidth: 2,
    borderTopColor: Colors.light.tint,
    marginTop: 4,
    paddingTop: 8,
  },
  sign: { fontSize: 14, fontFamily: "OpenSans_700Bold", width: 16, textAlign: "center" },
  label: {
    flex: 1,
    fontSize: 13,
    fontFamily: "OpenSans_400Regular",
    color: Colors.light.textSecondary,
  },
  value: {
    fontSize: 13,
    fontFamily: "OpenSans_600SemiBold",
    color: Colors.light.text,
    textAlign: "right",
    minWidth: 80,
  },
  bold: { fontFamily: "OpenSans_700Bold", color: Colors.light.text },
});

// ─── Summary Card ─────────────────────────────────────────────────────────────

function SummaryCard({ summary, dayCount }: { summary: AmortSummary; dayCount: DayCountConvention }) {
  return (
    <View style={sc.card}>
      <View style={sc.header}>
        <Text style={sc.headerTitle}>Schedule Summary</Text>
        <View style={sc.badge}>
          <Text style={sc.badgeText}>{dayCount}</Text>
        </View>
      </View>
      <View style={sc.grid}>
        <View style={sc.cell}>
          <Text style={sc.cellValue}>{fmtPct(summary.noteRatePct)}</Text>
          <Text style={sc.cellLabel}>Note Rate</Text>
        </View>
        <View style={sc.divider} />
        <View style={sc.cell}>
          <Text style={sc.cellValue}>${fmt(summary.monthlyPayment, 0)}</Text>
          <Text style={sc.cellLabel}>Mo. Payment¹</Text>
        </View>
        <View style={sc.divider} />
        <View style={sc.cell}>
          <Text style={sc.cellValue}>${fmt(summary.totalInterest, 0)}</Text>
          <Text style={sc.cellLabel}>Total Interest</Text>
        </View>
      </View>
      {summary.balloon > 1 && (
        <View style={sc.balloon}>
          <Feather name="alert-circle" size={13} color={Colors.light.warning} />
          <Text style={sc.balloonText}>
            Balloon payment at maturity: {formatCurrencyFull(summary.balloon)}
          </Text>
        </View>
      )}
      <Text style={sc.footnote}>¹ First-period payment. Actual/360 payments vary by month.</Text>
    </View>
  );
}

const sc = StyleSheet.create({
  card: {
    backgroundColor: Colors.light.surface,
    borderRadius: 4,
    padding: 16,
    marginBottom: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  headerTitle: {
    fontSize: 12,
    fontFamily: "OpenSans_700Bold",
    color: "rgba(255,255,255,0.6)",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  badge: {
    backgroundColor: Colors.light.tint,
    borderRadius: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: { fontSize: 10, fontFamily: "OpenSans_700Bold", color: "#fff", letterSpacing: 0.4 },
  grid: { flexDirection: "row", alignItems: "center" },
  cell: { flex: 1, alignItems: "center" },
  cellValue: {
    fontSize: 16,
    fontFamily: "OpenSans_700Bold",
    color: "#fff",
    marginBottom: 2,
  },
  cellLabel: {
    fontSize: 9,
    fontFamily: "OpenSans_600SemiBold",
    color: "rgba(255,255,255,0.5)",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  divider: { width: 1, height: 32, backgroundColor: "rgba(255,255,255,0.15)" },
  balloon: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
    backgroundColor: Colors.light.warningBg,
    borderRadius: 4,
    padding: 8,
  },
  balloonText: {
    fontSize: 12,
    fontFamily: "OpenSans_600SemiBold",
    color: Colors.light.warning,
    flex: 1,
  },
  footnote: {
    fontSize: 10,
    fontFamily: "OpenSans_400Regular",
    color: "rgba(255,255,255,0.35)",
    marginTop: 10,
  },
});

// ─── Schedule Table ───────────────────────────────────────────────────────────

function ScheduleTable({ rows }: { rows: AmortRow[] }) {
  const [expanded, setExpanded] = useState(false);
  const displayRows = expanded ? rows : rows.slice(0, 12);

  return (
    <View style={st.container}>
      {/* Header */}
      <View style={st.headerRow}>
        <Text style={[st.th, st.period]}>#</Text>
        <Text style={[st.th, st.date]}>Date</Text>
        <Text style={[st.th, st.num]}>Beg Bal</Text>
        <Text style={[st.th, st.num]}>Payment</Text>
        <Text style={[st.th, st.num]}>Interest</Text>
        <Text style={[st.th, st.num]}>Principal</Text>
        <Text style={[st.th, st.num]}>End Bal</Text>
      </View>

      {/* Rows */}
      {displayRows.map((row, idx) => (
        <View key={row.period} style={[st.row, idx % 2 === 1 && st.rowAlt]}>
          <Text style={[st.td, st.period]}>{row.period}</Text>
          <Text style={[st.td, st.date]}>{fmtDate(row.date)}</Text>
          <Text style={[st.td, st.num]}>${fmt(row.beginBalance, 0)}</Text>
          <Text style={[st.td, st.num]}>${fmt(row.payment, 0)}</Text>
          <Text style={[st.td, st.num, st.interestCell]}>${fmt(row.interest, 0)}</Text>
          <Text style={[st.td, st.num, st.principalCell]}>${fmt(row.principal, 0)}</Text>
          <Text style={[st.td, st.num]}>${fmt(row.endBalance, 0)}</Text>
        </View>
      ))}

      {/* Expand / collapse */}
      {rows.length > 12 && (
        <TouchableOpacity
          style={st.expandBtn}
          onPress={() => setExpanded(!expanded)}
          activeOpacity={0.7}
        >
          <Text style={st.expandText}>
            {expanded ? "Show first 12 periods ↑" : `Show all ${rows.length} periods ↓`}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 4,
    overflow: "hidden",
  },
  headerRow: {
    flexDirection: "row",
    backgroundColor: Colors.light.surface,
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  row: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 6,
    backgroundColor: Colors.light.backgroundCard,
  },
  rowAlt: { backgroundColor: Colors.light.background },
  th: {
    fontSize: 9,
    fontFamily: "OpenSans_700Bold",
    color: "rgba(255,255,255,0.6)",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  td: {
    fontSize: 10,
    fontFamily: "OpenSans_400Regular",
    color: Colors.light.text,
  },
  period: { width: 20, textAlign: "center" },
  date: { width: 44 },
  num: { flex: 1, textAlign: "right" },
  interestCell: { color: Colors.light.statusReview },
  principalCell: { color: Colors.light.success },
  expandBtn: {
    padding: 10,
    alignItems: "center",
    backgroundColor: Colors.light.backgroundSecondary,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  expandText: {
    fontSize: 12,
    fontFamily: "OpenSans_600SemiBold",
    color: Colors.light.tint,
  },
});

// ─── Main Component ───────────────────────────────────────────────────────────

type Props = {
  application: LoanApplication;
};

export function AmortizationCalculator({ application }: Props) {
  // Pre-fill from loan terms
  const [buildUp, setBuildUp] = useState<RateBuildUp>({
    indexName: "SOFR",
    indexRatePct: 0,
    spreadPct: parseFloat(application.interestRatePct || "0") || 0,
    discounts: [],
  });

  const [dayCount, setDayCount] = useState<DayCountConvention>("30/360");
  const [result, setResult] = useState<{
    rows: AmortRow[];
    summary: AmortSummary;
  } | null>(null);

  const noteRate = computeNoteRate(buildUp);

  // ── Discount management ──────────────────────────────────────────────────

  const addDiscount = () => {
    setBuildUp((prev) => ({
      ...prev,
      discounts: [...prev.discounts, { id: uid(), label: "", ratePct: 0 }],
    }));
  };

  const updateDiscount = (id: string, field: "label" | "ratePct", value: string) => {
    setBuildUp((prev) => ({
      ...prev,
      discounts: prev.discounts.map((d) =>
        d.id === id
          ? { ...d, [field]: field === "ratePct" ? parseFloat(value) || 0 : value }
          : d
      ),
    }));
  };

  const removeDiscount = (id: string) => {
    setBuildUp((prev) => ({
      ...prev,
      discounts: prev.discounts.filter((d) => d.id !== id),
    }));
  };

  // ── Calculate ────────────────────────────────────────────────────────────

  const calculate = () => {
    const loanAmt = parseFloat(
      (application.loanAmountUsd || "0").replace(/[^0-9.]/g, "")
    );
    const termYrs = parseFloat(application.loanTermYears || "0");

    if (!loanAmt || !termYrs) {
      Alert.alert(
        "Missing Loan Terms",
        "Please enter a Loan Amount and Loan Term in the Loan Terms section before running the calculator."
      );
      return;
    }

    if (noteRate <= 0) {
      Alert.alert("Invalid Rate", "Note rate must be greater than 0%.");
      return;
    }

    const amortType = application.amortizationType as
      | "Full Amortizing"
      | "Interest Only"
      | "Partial IO";

    setResult(
      buildAmortSchedule({
        loanAmountUsd: loanAmt,
        noteRatePct: noteRate,
        loanTermYears: termYrs,
        dayCountConvention: dayCount,
        amortizationType: amortType,
        startDate: new Date(),
      })
    );
  };

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>

      {/* ── Rate Build-Up ── */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionAccent} />
          <Text style={styles.sectionTitle}>Rate Build-Up</Text>
        </View>
        <Text style={styles.sectionSub}>
          Note Rate = Index + Spread − Discounts
        </Text>

        {/* Index */}
        <View style={styles.fieldRow}>
          <View style={styles.fieldLabelBox}>
            <Text style={styles.fieldLabel}>Index Rate</Text>
          </View>
          <TextInput
            style={[styles.input, styles.inputName]}
            value={buildUp.indexName}
            onChangeText={(v) => setBuildUp((p) => ({ ...p, indexName: v }))}
            placeholder="SOFR"
            placeholderTextColor={Colors.light.textTertiary}
          />
          <TextInput
            style={[styles.input, styles.inputRate]}
            value={buildUp.indexRatePct ? String(buildUp.indexRatePct) : ""}
            onChangeText={(v) =>
              setBuildUp((p) => ({ ...p, indexRatePct: parseFloat(v) || 0 }))
            }
            keyboardType="decimal-pad"
            placeholder="5.30"
            placeholderTextColor={Colors.light.textTertiary}
          />
          <Text style={styles.pctSuffix}>%</Text>
        </View>

        {/* Spread */}
        <View style={styles.fieldRow}>
          <View style={styles.fieldLabelBox}>
            <Text style={[styles.fieldLabel, { color: Colors.light.tint }]}>+ Spread</Text>
          </View>
          <View style={styles.inputName} />
          <TextInput
            style={[styles.input, styles.inputRate]}
            value={buildUp.spreadPct ? String(buildUp.spreadPct) : ""}
            onChangeText={(v) =>
              setBuildUp((p) => ({ ...p, spreadPct: parseFloat(v) || 0 }))
            }
            keyboardType="decimal-pad"
            placeholder="1.75"
            placeholderTextColor={Colors.light.textTertiary}
          />
          <Text style={styles.pctSuffix}>%</Text>
        </View>

        {/* Discounts */}
        {buildUp.discounts.map((d) => (
          <View key={d.id} style={styles.fieldRow}>
            <View style={styles.fieldLabelBox}>
              <Text style={[styles.fieldLabel, { color: Colors.light.error }]}>− Discount</Text>
            </View>
            <TextInput
              style={[styles.input, styles.inputName]}
              value={d.label}
              onChangeText={(v) => updateDiscount(d.id, "label", v)}
              placeholder="e.g. Relationship"
              placeholderTextColor={Colors.light.textTertiary}
            />
            <TextInput
              style={[styles.input, styles.inputRate]}
              value={d.ratePct ? String(d.ratePct) : ""}
              onChangeText={(v) => updateDiscount(d.id, "ratePct", v)}
              keyboardType="decimal-pad"
              placeholder="0.25"
              placeholderTextColor={Colors.light.textTertiary}
            />
            <Text style={styles.pctSuffix}>%</Text>
            <TouchableOpacity onPress={() => removeDiscount(d.id)} style={styles.removeBtn}>
              <Feather name="x" size={14} color={Colors.light.error} />
            </TouchableOpacity>
          </View>
        ))}

        <TouchableOpacity style={styles.addDiscountBtn} onPress={addDiscount} activeOpacity={0.7}>
          <Feather name="plus" size={13} color={Colors.light.tint} />
          <Text style={styles.addDiscountText}>Add Rate Discount</Text>
        </TouchableOpacity>

        {/* Rate visual stack */}
        <View style={styles.rateStack}>
          <RateLine label={buildUp.indexName || "Index"} value={buildUp.indexRatePct} />
          <RateLine label="Spread" value={buildUp.spreadPct} sign="+" />
          {buildUp.discounts.map((d) => (
            <RateLine key={d.id} label={d.label || "Discount"} value={d.ratePct} sign="−" />
          ))}
          <RateLine
            label="Note Rate"
            value={noteRate}
            sign="="
            isTotal
            bold
            color={noteRate > 0 ? Colors.light.tint : Colors.light.error}
          />
        </View>
      </View>

      {/* ── Day Count Convention ── */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionAccent} />
          <Text style={styles.sectionTitle}>Day Count Convention</Text>
        </View>

        <SegmentControl<DayCountConvention>
          options={["30/360", "Actual/360"]}
          value={dayCount}
          onChange={setDayCount}
        />

        <View style={styles.conventionNote}>
          {dayCount === "30/360" ? (
            <>
              <Text style={styles.conventionTitle}>30/360</Text>
              <Text style={styles.conventionText}>
                Each month treated as 30 days, year as 360. Produces a constant monthly payment. Most common for fixed-rate CRE loans.
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.conventionTitle}>Actual/360</Text>
              <Text style={styles.conventionText}>
                Interest accrues on actual calendar days divided by 360. February produces less interest than March. Payments vary slightly month to month. Common for floating-rate and construction loans.
              </Text>
            </>
          )}
        </View>
      </View>

      {/* ── Loan Terms (read-only summary) ── */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionAccent} />
          <Text style={styles.sectionTitle}>Loan Parameters</Text>
        </View>
        <View style={styles.paramGrid}>
          <Param label="Loan Amount" value={application.loanAmountUsd ? `$${application.loanAmountUsd}` : "—"} />
          <Param label="Term" value={application.loanTermYears ? `${application.loanTermYears} yrs` : "—"} />
          <Param label="Amortization" value={application.amortizationType || "—"} />
          <Param label="LTV" value={application.ltvPct ? `${application.ltvPct}%` : "—"} />
        </View>
        <Text style={styles.editHint}>
          Edit loan terms in the Loan Terms section to update these values.
        </Text>
      </View>

      {/* ── Calculate Button ── */}
      <TouchableOpacity style={styles.calcBtn} onPress={calculate} activeOpacity={0.8}>
        <Feather name="bar-chart-2" size={16} color="#fff" />
        <Text style={styles.calcBtnText}>Generate Amortization Schedule</Text>
      </TouchableOpacity>

      {/* ── Results ── */}
      {result && (
        <View style={styles.results}>
          <SummaryCard summary={result.summary} dayCount={dayCount} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <ScheduleTable rows={result.rows} />
          </ScrollView>
        </View>
      )}
    </View>
  );
}

// ── Param cell ────────────────────────────────────────────────────────────────

function Param({ label, value }: { label: string; value: string }) {
  return (
    <View style={pm.cell}>
      <Text style={pm.label}>{label}</Text>
      <Text style={pm.value}>{value}</Text>
    </View>
  );
}

const pm = StyleSheet.create({
  cell: {
    width: "48%",
    backgroundColor: Colors.light.backgroundCard,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 4,
    padding: 10,
    marginBottom: 8,
  },
  label: {
    fontSize: 9,
    fontFamily: "OpenSans_600SemiBold",
    color: Colors.light.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 3,
  },
  value: {
    fontSize: 13,
    fontFamily: "OpenSans_700Bold",
    color: Colors.light.text,
  },
});

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { gap: 0 },

  section: {
    backgroundColor: Colors.light.backgroundCard,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 4,
    padding: 16,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  sectionAccent: {
    width: 3,
    height: 14,
    backgroundColor: Colors.light.tint,
    borderRadius: 2,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "OpenSans_700Bold",
    color: Colors.light.text,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  sectionSub: {
    fontSize: 12,
    fontFamily: "OpenSans_400Regular",
    color: Colors.light.textTertiary,
    marginBottom: 14,
    fontStyle: "italic",
  },

  // Field rows
  fieldRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 6,
  },
  fieldLabelBox: { width: 80 },
  fieldLabel: {
    fontSize: 11,
    fontFamily: "OpenSans_600SemiBold",
    color: Colors.light.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 13,
    fontFamily: "OpenSans_400Regular",
    color: Colors.light.text,
    backgroundColor: Colors.light.background,
  },
  inputName: { flex: 1 },
  inputRate: { width: 64, textAlign: "right" },
  pctSuffix: {
    fontSize: 12,
    fontFamily: "OpenSans_600SemiBold",
    color: Colors.light.textSecondary,
    width: 12,
  },
  removeBtn: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },

  addDiscountBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: Colors.light.tint,
    borderStyle: "dashed",
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 4,
    marginBottom: 16,
  },
  addDiscountText: {
    fontSize: 12,
    fontFamily: "OpenSans_600SemiBold",
    color: Colors.light.tint,
  },

  rateStack: {
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 8,
    backgroundColor: Colors.light.background,
  },

  // Convention note
  conventionNote: {
    backgroundColor: Colors.light.tintLight,
    borderRadius: 4,
    padding: 12,
    marginTop: 10,
  },
  conventionTitle: {
    fontSize: 12,
    fontFamily: "OpenSans_700Bold",
    color: Colors.light.tintDark,
    marginBottom: 4,
  },
  conventionText: {
    fontSize: 12,
    fontFamily: "OpenSans_400Regular",
    color: Colors.light.tintMid,
    lineHeight: 18,
  },

  // Params
  paramGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  editHint: {
    fontSize: 11,
    fontFamily: "OpenSans_400Regular",
    color: Colors.light.textTertiary,
    fontStyle: "italic",
    marginTop: 4,
  },

  // Calculate button
  calcBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.light.tint,
    borderRadius: 4,
    paddingVertical: 14,
    marginBottom: 16,
  },
  calcBtnText: {
    fontSize: 14,
    fontFamily: "OpenSans_700Bold",
    color: "#fff",
  },

  // Results
  results: { gap: 12 },
});
