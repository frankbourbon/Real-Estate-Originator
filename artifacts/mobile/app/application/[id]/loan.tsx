import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { DetailRow } from "@/components/DetailRow";
import { FormField } from "@/components/FormField";
import { SectionHeader } from "@/components/SectionHeader";
import { SectionScreenLayout } from "@/components/SectionScreenLayout";
import { SelectField } from "@/components/SelectField";
import Colors from "@/constants/colors";
import type {
  AmortizationType,
  InterestType,
  LoanType,
  RateType,
} from "@/services/core";
import { useCoreService } from "@/services/core";
import type { PhaseKey } from "@/services/phase-data";
import { usePhaseDataService } from "@/services/phase-data";
import { formatCurrencyFull } from "@/utils/formatting";
import { calcAllInFixed, calcProformaAdjustable, fmt3 } from "@/utils/rate-calc";
import { AccessDenied } from "@/components/AccessDenied";
import { usePermission } from "@/hooks/usePermission";

// ─── Constants ────────────────────────────────────────────────────────────────

const LOAN_TYPES: LoanType[] = ["Acquisition", "Refinance", "Construction", "Bridge", "Permanent"];
const RATE_TYPES: RateType[] = ["Fixed Rate", "Adjustable Rate", "Hybrid"];
const AMORT_TYPES: AmortizationType[] = ["Full Amortizing", "Interest Only", "Partial IO"];

// ─── Header buttons ───────────────────────────────────────────────────────────

function EditBtn({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity style={hdr.btn} onPress={onPress} activeOpacity={0.7}>
      <Feather name="edit-2" size={15} color="rgba(255,255,255,0.8)" />
      <Text style={hdr.btnText}>Edit</Text>
    </TouchableOpacity>
  );
}

function SaveCancelBtns({ onSave, onCancel }: { onSave: () => void; onCancel: () => void }) {
  return (
    <View style={hdr.row}>
      <TouchableOpacity style={hdr.cancelBtn} onPress={onCancel} activeOpacity={0.7}>
        <Text style={hdr.cancelText}>Cancel</Text>
      </TouchableOpacity>
      <TouchableOpacity style={hdr.saveBtn} onPress={onSave} activeOpacity={0.8}>
        <Text style={hdr.saveText}>Save</Text>
      </TouchableOpacity>
    </View>
  );
}

const hdr = StyleSheet.create({
  row: { flexDirection: "row", gap: 6 },
  btn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  btnText: { fontSize: 12, fontFamily: "OpenSans_600SemiBold", color: "rgba(255,255,255,0.85)" },
  cancelBtn: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  cancelText: { fontSize: 12, fontFamily: "OpenSans_600SemiBold", color: "rgba(255,255,255,0.6)" },
  saveBtn: {
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 4,
    backgroundColor: Colors.light.tint,
  },
  saveText: { fontSize: 12, fontFamily: "OpenSans_700Bold", color: "#fff" },
});

// ─── Calc badge (read-only label for computed fields) ─────────────────────────

function CalcBadge() {
  return (
    <View style={styles.calcBadge}>
      <Feather name="zap" size={10} color={Colors.light.tint} />
      <Text style={styles.calcBadgeText}>Calculated</Text>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function LoanSection() {
  const { id, phase: phaseParam } = useLocalSearchParams<{ id: string; phase: string }>();
  const phase = (phaseParam as PhaseKey) ?? "inquiry";

  const { getApplication } = useCoreService();
  const { getLoanTermsSnapshot, saveLoanTermsSnapshot } = usePhaseDataService();
  const { canView, canEdit } = usePermission(`${phase}.loan-terms` as any);

  const app = getApplication(id);
  const snap = getLoanTermsSnapshot(id, phase);

  // Phase snapshot is authoritative; fall back to embedded app loan terms if no snapshot yet
  const loanType          = snap?.loanType          ?? app?.loanType          ?? "Acquisition";
  const loanAmountUsd     = snap?.loanAmountUsd      ?? String(app?.loanAmountUsd   ?? "");
  const ltvPct            = snap?.ltvPct             ?? String(app?.ltvPct           ?? "");
  const dscrRatio         = snap?.dscrRatio          ?? String(app?.dscrRatio        ?? "");
  const interestType      = snap?.interestType       ?? app?.interestType      ?? "Fixed";
  const interestRatePct   = snap?.interestRatePct    ?? String(app?.interestRatePct  ?? "");
  const loanTermYears     = snap?.loanTermYears       ?? String(app?.loanTermYears    ?? "");
  const amortizationType  = snap?.amortizationType   ?? app?.amortizationType  ?? "Full Amortizing";
  const targetClosingDate = snap?.targetClosingDate  ?? app?.targetClosingDate  ?? "";

  // Rate pricing fields
  const rateType                    = snap?.rateType                    ?? app?.rateType                    ?? "Fixed Rate";
  const baseRate                    = snap?.baseRate                    ?? app?.baseRate                    ?? "";
  const fixedRateVariance           = snap?.fixedRateVariance           ?? app?.fixedRateVariance           ?? "";
  const indexName                   = snap?.indexName                   ?? app?.indexName                   ?? "";
  const indexRate                   = snap?.indexRate                   ?? app?.indexRate                   ?? "";
  const spreadOnFixed               = snap?.spreadOnFixed               ?? app?.spreadOnFixed               ?? "";
  const allInFixedRate              = snap?.allInFixedRate              ?? app?.allInFixedRate              ?? "";
  const adjustableRateVariance      = snap?.adjustableRateVariance      ?? app?.adjustableRateVariance      ?? "";
  const adjustableIndexName         = snap?.adjustableIndexName         ?? app?.adjustableIndexName         ?? "";
  const adjustableIndexRate         = snap?.adjustableIndexRate         ?? app?.adjustableIndexRate         ?? "";
  const spreadOnAdjustable          = snap?.spreadOnAdjustable          ?? app?.spreadOnAdjustable          ?? "";
  const proformaAdjustableAllInRate = snap?.proformaAdjustableAllInRate ?? app?.proformaAdjustableAllInRate ?? "";

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    loanType:          loanType         as LoanType,
    loanAmountUsd,
    ltvPct,
    dscrRatio,
    interestType:      interestType     as InterestType,
    interestRatePct,
    loanTermYears,
    amortizationType:  amortizationType as AmortizationType,
    targetClosingDate,
    rateType:          rateType         as RateType,
    baseRate,
    fixedRateVariance,
    indexName,
    indexRate,
    spreadOnFixed,
    adjustableRateVariance,
    adjustableIndexName,
    adjustableIndexRate,
    spreadOnAdjustable,
  });

  const set = (key: string) => (val: string) => setForm((f) => ({ ...f, [key]: val }));

  // ── Live calc (client-side, from current form state) ──────────────────────
  const liveAllInFixed  = calcAllInFixed(form.baseRate, form.fixedRateVariance, form.indexRate, form.spreadOnFixed);
  const liveProformaAdj = calcProformaAdjustable(form.baseRate, form.adjustableRateVariance, form.adjustableIndexRate, form.spreadOnAdjustable);

  // Adjustable fields visible for Adjustable Rate and Hybrid
  const showAdjEditing = form.rateType === "Adjustable Rate" || form.rateType === "Hybrid";
  const showAdjRead    = rateType === "Adjustable Rate" || rateType === "Hybrid";

  const handleEdit = () => {
    setForm({
      loanType:         loanType         as LoanType,
      loanAmountUsd,    ltvPct,           dscrRatio,
      interestType:     interestType     as InterestType,
      interestRatePct,  loanTermYears,
      amortizationType: amortizationType as AmortizationType,
      targetClosingDate,
      rateType:         rateType         as RateType,
      baseRate,         fixedRateVariance, indexName, indexRate,
      spreadOnFixed,    adjustableRateVariance,
      adjustableIndexName, adjustableIndexRate,
      spreadOnAdjustable,
    });
    setEditing(true);
  };

  const handleSave = async () => {
    // Server-side calc: compute and store authoritative values
    const computedAllInFixed  = calcAllInFixed(form.baseRate, form.fixedRateVariance, form.indexRate, form.spreadOnFixed);
    const computedProformaAdj = calcProformaAdjustable(form.baseRate, form.adjustableRateVariance, form.adjustableIndexRate, form.spreadOnAdjustable);

    await saveLoanTermsSnapshot(id, phase, {
      loanType:                    form.loanType,
      loanAmountUsd:               form.loanAmountUsd,
      ltvPct:                      form.ltvPct,
      dscrRatio:                   form.dscrRatio,
      interestType:                form.interestType,
      interestRatePct:             form.interestRatePct,
      loanTermYears:               form.loanTermYears,
      amortizationType:            form.amortizationType,
      targetClosingDate:           form.targetClosingDate,
      rateType:                    form.rateType,
      baseRate:                    form.baseRate,
      fixedRateVariance:           form.fixedRateVariance,
      indexName:                   form.indexName,
      indexRate:                   form.indexRate,
      spreadOnFixed:               form.spreadOnFixed,
      allInFixedRate:              computedAllInFixed,
      adjustableRateVariance:      form.adjustableRateVariance,
      adjustableIndexName:         form.adjustableIndexName,
      adjustableIndexRate:         form.adjustableIndexRate,
      spreadOnAdjustable:          form.spreadOnAdjustable,
      proformaAdjustableAllInRate: computedProformaAdj,
    });
    setEditing(false);
  };

  const handleCancel = () => setEditing(false);

  // ── Edit form ─────────────────────────────────────────────────────────────

  function renderEdit() {
    return (
      <>
        {/* Terms */}
        <View style={styles.card}>
          <SectionHeader title="Terms" />
          <SelectField label="Loan Type" value={form.loanType} options={LOAN_TYPES} onChange={set("loanType")} required />
          <FormField label="Loan Amount (USD)" value={form.loanAmountUsd} onChangeText={set("loanAmountUsd")} placeholder="5,000,000" keyboardType="number-pad" prefix="$" required />
          <View style={styles.row}>
            <View style={styles.flex1}>
              <FormField label="LTV (%)" value={form.ltvPct} onChangeText={set("ltvPct")} placeholder="65.000" keyboardType="decimal-pad" suffix="%" hint="Loan-to-value" />
            </View>
            <View style={styles.gap} />
            <View style={styles.flex1}>
              <FormField label="DSCR (×)" value={form.dscrRatio} onChangeText={set("dscrRatio")} placeholder="1.250" keyboardType="decimal-pad" suffix="×" hint="Debt service coverage" />
            </View>
          </View>
          <View style={styles.row}>
            <View style={styles.flex1}>
              <SelectField label="Rate Type" value={form.rateType} options={RATE_TYPES} onChange={(v) => set("rateType")(v)} />
            </View>
            <View style={styles.gap} />
            <View style={styles.flex1}>
              <FormField label="Loan Term (years)" value={form.loanTermYears} onChangeText={set("loanTermYears")} placeholder="5" keyboardType="number-pad" suffix="yrs" />
            </View>
          </View>
          <SelectField label="Amortization" value={form.amortizationType} options={AMORT_TYPES} onChange={set("amortizationType")} />
          <FormField label="Target Closing Date" value={form.targetClosingDate} onChangeText={set("targetClosingDate")} placeholder="MM/DD/YYYY" />
        </View>

        {/* Fixed Rate Attributes — always visible */}
        <View style={[styles.card, styles.cardSpacing]}>
          <SectionHeader title="Fixed Rate" />
          <FormField
            label="Base Rate (% p.a.)"
            value={form.baseRate}
            onChangeText={set("baseRate")}
            placeholder="0.000"
            keyboardType="decimal-pad"
            suffix="%"
            hint="6 decimal precision stored"
          />
          <FormField
            label="Fixed Rate Variance (%)"
            value={form.fixedRateVariance}
            onChangeText={set("fixedRateVariance")}
            placeholder="-0.125 or 0.250"
            keyboardType="numbers-and-punctuation"
            suffix="%"
            hint="Supports positive and negative values"
          />
          <FormField
            label="Index Name"
            value={form.indexName}
            onChangeText={set("indexName")}
            placeholder="SOFR, LIBOR, Prime…"
          />
          <FormField
            label="Index Rate (% p.a.)"
            value={form.indexRate}
            onChangeText={set("indexRate")}
            placeholder="0.000"
            keyboardType="decimal-pad"
            suffix="%"
          />
          <FormField
            label="Spread on Fixed (%)"
            value={form.spreadOnFixed}
            onChangeText={set("spreadOnFixed")}
            placeholder="0.000"
            keyboardType="decimal-pad"
            suffix="%"
          />
          {/* Calculated — read-only, live */}
          <View style={styles.calcRow}>
            <CalcBadge />
          </View>
          <FormField
            label="All In Fixed Rate (%)"
            value={fmt3(liveAllInFixed)}
            onChangeText={() => {}}
            suffix="%"
            editable={false}
            hint="Base Rate + Fixed Rate Variance + Index Rate + Spread on Fixed"
          />
        </View>

        {/* Adjustable Rate Attributes — Adjustable Rate or Hybrid only */}
        {showAdjEditing && (
          <View style={[styles.card, styles.cardSpacing]}>
            <SectionHeader title="Adjustable Rate" />
            <FormField
              label="Adjustable Rate Variance (%)"
              value={form.adjustableRateVariance}
              onChangeText={set("adjustableRateVariance")}
              placeholder="-0.125 or 0.250"
              keyboardType="numbers-and-punctuation"
              suffix="%"
              hint="Supports positive and negative values"
            />
            <FormField
              label="Adjustable Index Name"
              value={form.adjustableIndexName}
              onChangeText={set("adjustableIndexName")}
              placeholder="SOFR, Prime Rate…"
            />
            <FormField
              label="Adjustable Index Rate (% p.a.)"
              value={form.adjustableIndexRate}
              onChangeText={set("adjustableIndexRate")}
              placeholder="0.000"
              keyboardType="decimal-pad"
              suffix="%"
            />
            <FormField
              label="Spread on Adjustable (%)"
              value={form.spreadOnAdjustable}
              onChangeText={set("spreadOnAdjustable")}
              placeholder="0.000"
              keyboardType="decimal-pad"
              suffix="%"
            />
            {/* Calculated — read-only, live */}
            <View style={styles.calcRow}>
              <CalcBadge />
            </View>
            <FormField
              label="Proforma Adjustable All In Rate (%)"
              value={fmt3(liveProformaAdj)}
              onChangeText={() => {}}
              suffix="%"
              editable={false}
              hint="Base Rate + Adjustable Rate Variance + Adjustable Index Rate + Spread on Adjustable"
            />
          </View>
        )}
      </>
    );
  }

  // ── Read view ─────────────────────────────────────────────────────────────

  function renderRead() {
    return (
      <>
        {/* Terms */}
        <View style={styles.card}>
          <SectionHeader title="Terms" />
          <DetailRow label="Loan Type" value={loanType} />
          <DetailRow label="Loan Amount (USD)" value={loanAmountUsd ? formatCurrencyFull(loanAmountUsd) : undefined} />
          <DetailRow label="LTV (%)" value={ltvPct ? `${fmt3(ltvPct)}%` : undefined} />
          <DetailRow label="DSCR (×)" value={dscrRatio ? `${fmt3(dscrRatio)}×` : undefined} />
          <DetailRow label="Rate Type" value={rateType} />
          <DetailRow label="Loan Term" value={loanTermYears ? `${loanTermYears} years` : undefined} />
          <DetailRow label="Amortization" value={amortizationType} />
          <DetailRow label="Target Closing Date" value={targetClosingDate || undefined} last />
        </View>

        {/* Fixed Rate Attributes — always visible */}
        <View style={[styles.card, styles.cardSpacing]}>
          <SectionHeader title="Fixed Rate" />
          <DetailRow label="Base Rate" value={baseRate ? `${fmt3(baseRate)}%` : undefined} />
          <DetailRow label="Fixed Rate Variance" value={fixedRateVariance ? `${fmt3(fixedRateVariance)}%` : undefined} />
          <DetailRow label="Index Name" value={indexName || undefined} />
          <DetailRow label="Index Rate" value={indexRate ? `${fmt3(indexRate)}%` : undefined} />
          <DetailRow label="Spread on Fixed" value={spreadOnFixed ? `${fmt3(spreadOnFixed)}%` : undefined} />
          <View style={styles.calcDivider} />
          <DetailRow
            label="All In Fixed Rate"
            value={allInFixedRate ? `${fmt3(allInFixedRate)}%` : undefined}
            last={!showAdjRead}
            hint="Calculated"
          />
        </View>

        {/* Adjustable Rate Attributes — Adjustable Rate or Hybrid only */}
        {showAdjRead && (
          <View style={[styles.card, styles.cardSpacing]}>
            <SectionHeader title="Adjustable Rate" />
            <DetailRow label="Adjustable Rate Variance" value={adjustableRateVariance ? `${fmt3(adjustableRateVariance)}%` : undefined} />
            <DetailRow label="Adjustable Index Name" value={adjustableIndexName || undefined} />
            <DetailRow label="Adjustable Index Rate" value={adjustableIndexRate ? `${fmt3(adjustableIndexRate)}%` : undefined} />
            <DetailRow label="Spread on Adjustable" value={spreadOnAdjustable ? `${fmt3(spreadOnAdjustable)}%` : undefined} />
            <View style={styles.calcDivider} />
            <DetailRow
              label="Proforma Adjustable All In Rate"
              value={proformaAdjustableAllInRate ? `${fmt3(proformaAdjustableAllInRate)}%` : undefined}
              last
              hint="Calculated"
            />
          </View>
        )}
      </>
    );
  }

  if (!canView) return <AccessDenied screenLabel="Loan Terms" />;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <SectionScreenLayout
        title="Loan Terms"
        subtitle="Structure, rate, and amortization"
        rightAction={
          editing
            ? <SaveCancelBtns onSave={handleSave} onCancel={handleCancel} />
            : canEdit ? <EditBtn onPress={handleEdit} /> : undefined
        }
      >
        {editing ? renderEdit() : renderRead()}
      </SectionScreenLayout>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.light.backgroundCard,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 4,
    padding: 16,
  },
  cardSpacing: { marginTop: 12 },
  row: { flexDirection: "row", alignItems: "flex-end" },
  flex1: { flex: 1 },
  gap: { width: 8 },
  calcRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    marginTop: -4,
  },
  calcBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.light.background,
    borderWidth: 1,
    borderColor: Colors.light.tint,
    borderRadius: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  calcBadgeText: {
    fontSize: 10,
    fontFamily: "OpenSans_600SemiBold",
    color: Colors.light.tint,
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  calcDivider: {
    height: 1,
    backgroundColor: Colors.light.border,
    marginVertical: 8,
  },
});
