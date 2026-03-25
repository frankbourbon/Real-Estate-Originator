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
import Colors from "@/constants/colors";
import { useApplications } from "@/context/ApplicationContext";
import { formatCurrencyFull, getBorrowerDisplayName } from "@/utils/formatting";

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

export default function BorrowerSection() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getApplication, getBorrower, updateBorrower } = useApplications();
  const app = getApplication(id);
  const borrower = getBorrower(app?.borrowerId ?? "");

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    firstName: borrower?.firstName ?? "",
    lastName: borrower?.lastName ?? "",
    entityName: borrower?.entityName ?? "",
    email: borrower?.email ?? "",
    phone: borrower?.phone ?? "",
    creExperienceYears: borrower?.creExperienceYears != null ? String(borrower.creExperienceYears) : "",
    netWorthUsd: borrower?.netWorthUsd != null ? String(borrower.netWorthUsd) : "",
    liquidityUsd: borrower?.liquidityUsd != null ? String(borrower.liquidityUsd) : "",
    creditScore: borrower?.creditScore != null ? String(borrower.creditScore) : "",
  });

  const set = (key: string) => (val: string) => setForm((f) => ({ ...f, [key]: val }));

  const handleEdit = () => {
    setForm({
      firstName: borrower?.firstName ?? "",
      lastName: borrower?.lastName ?? "",
      entityName: borrower?.entityName ?? "",
      email: borrower?.email ?? "",
      phone: borrower?.phone ?? "",
      creExperienceYears: borrower?.creExperienceYears != null ? String(borrower.creExperienceYears) : "",
      netWorthUsd: borrower?.netWorthUsd != null ? String(borrower.netWorthUsd) : "",
      liquidityUsd: borrower?.liquidityUsd != null ? String(borrower.liquidityUsd) : "",
      creditScore: borrower?.creditScore != null ? String(borrower.creditScore) : "",
    });
    setEditing(true);
  };

  const handleSave = async () => {
    if (!borrower) return;
    await updateBorrower(borrower.id, {
      firstName: form.firstName || undefined,
      lastName: form.lastName || undefined,
      entityName: form.entityName || undefined,
      email: form.email || undefined,
      phone: form.phone || undefined,
      creExperienceYears: form.creExperienceYears ? Number(form.creExperienceYears) : undefined,
      netWorthUsd: form.netWorthUsd ? Number(form.netWorthUsd) : undefined,
      liquidityUsd: form.liquidityUsd ? Number(form.liquidityUsd) : undefined,
      creditScore: form.creditScore ? Number(form.creditScore) : undefined,
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
        title="Borrower Profile"
        subtitle={getBorrowerDisplayName(borrower)}
        rightAction={
          editing
            ? <SaveCancelBtns onSave={handleSave} onCancel={handleCancel} />
            : <EditBtn onPress={handleEdit} />
        }
      >
        {editing ? (
          <>
            <View style={styles.card}>
              <SectionHeader title="Identity" />
              <View style={styles.row}>
                <View style={styles.flex1}>
                  <FormField label="First Name" value={form.firstName} onChangeText={set("firstName")} placeholder="John" autoCapitalize="words" required />
                </View>
                <View style={styles.gap} />
                <View style={styles.flex1}>
                  <FormField label="Last Name" value={form.lastName} onChangeText={set("lastName")} placeholder="Smith" autoCapitalize="words" required />
                </View>
              </View>
              <FormField label="Entity / Company Name" value={form.entityName} onChangeText={set("entityName")} placeholder="ABC Holdings LLC" autoCapitalize="words" />
            </View>

            <View style={styles.card}>
              <SectionHeader title="Contact" />
              <FormField label="Email Address" value={form.email} onChangeText={set("email")} placeholder="john@company.com" keyboardType="email-address" autoCapitalize="none" />
              <FormField label="Phone Number" value={form.phone} onChangeText={set("phone")} placeholder="(312) 555-0100" keyboardType="phone-pad" />
            </View>

            <View style={styles.card}>
              <SectionHeader title="Financial Profile" subtitle="Used for underwriting and credit assessment" />
              <FormField label="CRE Experience (years)" value={form.creExperienceYears} onChangeText={set("creExperienceYears")} placeholder="10" keyboardType="number-pad" suffix="yrs" hint="Commercial real estate experience" />
              <View style={styles.row}>
                <View style={styles.flex1}>
                  <FormField label="Net Worth (USD)" value={form.netWorthUsd} onChangeText={set("netWorthUsd")} placeholder="5,000,000" keyboardType="number-pad" prefix="$" />
                </View>
                <View style={styles.gap} />
                <View style={styles.flex1}>
                  <FormField label="Liquid Assets (USD)" value={form.liquidityUsd} onChangeText={set("liquidityUsd")} placeholder="500,000" keyboardType="number-pad" prefix="$" />
                </View>
              </View>
              <FormField label="FICO Credit Score" value={form.creditScore} onChangeText={set("creditScore")} placeholder="740" keyboardType="number-pad" maxLength={3} hint="FICO score (300–850)" />
            </View>
          </>
        ) : (
          <>
            <View style={styles.card}>
              <SectionHeader title="Identity" />
              <DetailRow label="First Name" value={borrower?.firstName} />
              <DetailRow label="Last Name" value={borrower?.lastName} />
              <DetailRow label="Entity / Company" value={borrower?.entityName} last />
            </View>

            <View style={styles.card}>
              <SectionHeader title="Contact" />
              <DetailRow label="Email" value={borrower?.email} />
              <DetailRow label="Phone" value={borrower?.phone} last />
            </View>

            <View style={styles.card}>
              <SectionHeader title="Financial Profile" />
              <DetailRow label="CRE Experience" value={borrower?.creExperienceYears ? `${borrower.creExperienceYears} years` : undefined} />
              <DetailRow label="Net Worth (USD)" value={borrower?.netWorthUsd ? formatCurrencyFull(borrower.netWorthUsd) : undefined} />
              <DetailRow label="Liquid Assets (USD)" value={borrower?.liquidityUsd ? formatCurrencyFull(borrower.liquidityUsd) : undefined} />
              <DetailRow label="FICO Credit Score" value={borrower?.creditScore} last />
            </View>
          </>
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
