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
} from "@/services/core";
import { useCoreService } from "@/services/core";
import type { PhaseKey } from "@/services/phase-data";
import { usePhaseDataService } from "@/services/phase-data";
import { formatCurrencyFull } from "@/utils/formatting";

const LOAN_TYPES: LoanType[] = ["Acquisition", "Refinance", "Construction", "Bridge", "Permanent"];
const INTEREST_TYPES: InterestType[] = ["Fixed", "Floating", "Hybrid"];
const AMORT_TYPES: AmortizationType[] = ["Full Amortizing", "Interest Only", "Partial IO"];


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

export default function LoanSection() {
  const { id, phase: phaseParam } = useLocalSearchParams<{ id: string; phase: string }>();
  const phase = (phaseParam as PhaseKey) ?? "inquiry";

  const { getApplication } = useCoreService();
  const { getLoanTermsSnapshot, saveLoanTermsSnapshot } = usePhaseDataService();

  const app = getApplication(id);
  const snap = getLoanTermsSnapshot(id, phase);

  // Phase snapshot is authoritative; fall back to embedded app loan terms if no snapshot yet
  const loanType        = snap?.loanType        ?? app?.loanType        ?? "Acquisition";
  const loanAmountUsd   = snap?.loanAmountUsd   ?? String(app?.loanAmountUsd   ?? "");
  const ltvPct          = snap?.ltvPct          ?? String(app?.ltvPct          ?? "");
  const dscrRatio       = snap?.dscrRatio       ?? String(app?.dscrRatio       ?? "");
  const interestType    = snap?.interestType    ?? app?.interestType    ?? "Fixed";
  const interestRatePct = snap?.interestRatePct ?? String(app?.interestRatePct ?? "");
  const loanTermYears   = snap?.loanTermYears   ?? String(app?.loanTermYears   ?? "");
  const amortizationType= snap?.amortizationType?? app?.amortizationType?? "Full Amortizing";
  const targetClosingDate = snap?.targetClosingDate ?? app?.targetClosingDate ?? "";

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    loanType:          loanType        as LoanType,
    loanAmountUsd,
    ltvPct,
    dscrRatio,
    interestType:      interestType    as InterestType,
    interestRatePct,
    loanTermYears,
    amortizationType:  amortizationType as AmortizationType,
    targetClosingDate,
  });

  const set = (key: string) => (val: string) => setForm((f) => ({ ...f, [key]: val }));

  const handleEdit = () => {
    setForm({
      loanType:          loanType         as LoanType,
      loanAmountUsd,
      ltvPct,
      dscrRatio,
      interestType:      interestType     as InterestType,
      interestRatePct,
      loanTermYears,
      amortizationType:  amortizationType as AmortizationType,
      targetClosingDate,
    });
    setEditing(true);
  };

  const handleSave = async () => {
    // Writes to this phase's isolated snapshot — does not cascade to other phases
    await saveLoanTermsSnapshot(id, phase, {
      loanType:         form.loanType,
      loanAmountUsd:    form.loanAmountUsd,
      ltvPct:           form.ltvPct,
      dscrRatio:        form.dscrRatio,
      interestType:     form.interestType,
      interestRatePct:  form.interestRatePct,
      loanTermYears:    form.loanTermYears,
      amortizationType: form.amortizationType,
      targetClosingDate: form.targetClosingDate,
    });
    setEditing(false);
  };

  const handleCancel = () => setEditing(false);

  function renderContent() {
    if (editing) {
      return (
        <View style={styles.card}>
          <SectionHeader title="Terms" />
          <SelectField label="Loan Type" value={form.loanType} options={LOAN_TYPES} onChange={set("loanType")} required />
          <FormField label="Loan Amount (USD)" value={form.loanAmountUsd} onChangeText={set("loanAmountUsd")} placeholder="5,000,000" keyboardType="number-pad" prefix="$" required />
          <View style={styles.row}>
            <View style={styles.flex1}>
              <FormField label="LTV (%)" value={form.ltvPct} onChangeText={set("ltvPct")} placeholder="65.0" keyboardType="decimal-pad" suffix="%" hint="Loan-to-value" />
            </View>
            <View style={styles.gap} />
            <View style={styles.flex1}>
              <FormField label="DSCR (×)" value={form.dscrRatio} onChangeText={set("dscrRatio")} placeholder="1.25" keyboardType="decimal-pad" suffix="×" hint="Debt service coverage" />
            </View>
          </View>
          <SelectField label="Interest Type" value={form.interestType} options={INTEREST_TYPES} onChange={set("interestType")} />
          <View style={styles.row}>
            <View style={styles.flex1}>
              <FormField label="Interest Rate (% p.a.)" value={form.interestRatePct} onChangeText={set("interestRatePct")} placeholder="6.50" keyboardType="decimal-pad" suffix="%" />
            </View>
            <View style={styles.gap} />
            <View style={styles.flex1}>
              <FormField label="Loan Term (years)" value={form.loanTermYears} onChangeText={set("loanTermYears")} placeholder="5" keyboardType="number-pad" suffix="yrs" />
            </View>
          </View>
          <SelectField label="Amortization" value={form.amortizationType} options={AMORT_TYPES} onChange={set("amortizationType")} />
          <FormField label="Target Closing Date" value={form.targetClosingDate} onChangeText={set("targetClosingDate")} placeholder="MM/DD/YYYY" />
        </View>
      );
    }
    return (
      <View style={styles.card}>
        <SectionHeader title="Terms" />
        <DetailRow label="Loan Type" value={loanType} />
        <DetailRow label="Loan Amount (USD)" value={loanAmountUsd ? formatCurrencyFull(loanAmountUsd) : undefined} />
        <DetailRow label="LTV (%)" value={ltvPct ? `${ltvPct}%` : undefined} />
        <DetailRow label="DSCR (×)" value={dscrRatio ? `${dscrRatio}×` : undefined} />
        <DetailRow label="Interest Type" value={interestType} />
        <DetailRow label="Interest Rate (% p.a.)" value={interestRatePct ? `${interestRatePct}%` : undefined} />
        <DetailRow label="Loan Term" value={loanTermYears ? `${loanTermYears} years` : undefined} />
        <DetailRow label="Amortization" value={amortizationType} />
        <DetailRow label="Target Closing Date" value={targetClosingDate || undefined} last />
      </View>
    );
  }

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
            : <EditBtn onPress={handleEdit} />
        }
      >
        {renderContent()}
      </SectionScreenLayout>
    </KeyboardAvoidingView>
  );
}

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
});
