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
} from "@/context/ApplicationContext";
import { useApplications } from "@/context/ApplicationContext";
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
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getApplication, updateApplication } = useApplications();
  const app = getApplication(id);

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    loanType: app?.loanType ?? ("Acquisition" as LoanType),
    loanAmountUsd: app?.loanAmountUsd != null ? String(app.loanAmountUsd) : "",
    ltvPct: app?.ltvPct != null ? String(app.ltvPct) : "",
    dscrRatio: app?.dscrRatio != null ? String(app.dscrRatio) : "",
    interestType: app?.interestType ?? ("Fixed" as InterestType),
    interestRatePct: app?.interestRatePct != null ? String(app.interestRatePct) : "",
    loanTermYears: app?.loanTermYears != null ? String(app.loanTermYears) : "",
    amortizationType: app?.amortizationType ?? ("Full Amortizing" as AmortizationType),
    targetClosingDate: app?.targetClosingDate ?? "",
  });

  const set = (key: string) => (val: string) => setForm((f) => ({ ...f, [key]: val }));

  const handleEdit = () => {
    setForm({
      loanType: app?.loanType ?? "Acquisition",
      loanAmountUsd: app?.loanAmountUsd != null ? String(app.loanAmountUsd) : "",
      ltvPct: app?.ltvPct != null ? String(app.ltvPct) : "",
      dscrRatio: app?.dscrRatio != null ? String(app.dscrRatio) : "",
      interestType: app?.interestType ?? "Fixed",
      interestRatePct: app?.interestRatePct != null ? String(app.interestRatePct) : "",
      loanTermYears: app?.loanTermYears != null ? String(app.loanTermYears) : "",
      amortizationType: app?.amortizationType ?? "Full Amortizing",
      targetClosingDate: app?.targetClosingDate ?? "",
    });
    setEditing(true);
  };

  const handleSave = async () => {
    await updateApplication(id, {
      loanType: form.loanType,
      loanAmountUsd: form.loanAmountUsd ? Number(form.loanAmountUsd) : undefined,
      ltvPct: form.ltvPct ? Number(form.ltvPct) : undefined,
      dscrRatio: form.dscrRatio ? Number(form.dscrRatio) : undefined,
      interestType: form.interestType,
      interestRatePct: form.interestRatePct ? Number(form.interestRatePct) : undefined,
      loanTermYears: form.loanTermYears ? Number(form.loanTermYears) : undefined,
      amortizationType: form.amortizationType,
      targetClosingDate: form.targetClosingDate || undefined,
    });
    setEditing(false);
  };

  const handleCancel = () => setEditing(false);

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
        {editing ? (
          <>
            <View style={styles.card}>
              <SectionHeader title="Loan Structure" />
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
          </>
        ) : (
          <View style={styles.card}>
            <SectionHeader title="Loan Structure" />
            <DetailRow label="Loan Type" value={app?.loanType} />
            <DetailRow label="Loan Amount (USD)" value={app?.loanAmountUsd ? formatCurrencyFull(app.loanAmountUsd) : undefined} />
            <DetailRow label="LTV (%)" value={app?.ltvPct ? `${app.ltvPct}%` : undefined} />
            <DetailRow label="DSCR (×)" value={app?.dscrRatio ? `${app.dscrRatio}×` : undefined} />
            <DetailRow label="Interest Type" value={app?.interestType} />
            <DetailRow label="Interest Rate (% p.a.)" value={app?.interestRatePct ? `${app.interestRatePct}%` : undefined} />
            <DetailRow label="Loan Term" value={app?.loanTermYears ? `${app.loanTermYears} years` : undefined} />
            <DetailRow label="Amortization" value={app?.amortizationType} />
            <DetailRow label="Target Closing Date" value={app?.targetClosingDate} last />
          </View>
        )}
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
  row: { flexDirection: "row", alignItems: "flex-end" },
  flex1: { flex: 1 },
  gap: { width: 8 },
});
