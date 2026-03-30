import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { TabBar } from "@/components/TabBar";
import Colors from "@/constants/colors";
import { useProcessingService } from "@/services/processing";
import { usePreCloseService } from "@/services/pre-close";
import { useCoreService } from "@/services/core";
import { AccessDenied } from "@/components/AccessDenied";
import { usePermission } from "@/hooks/usePermission";

type EnvStatus = "" | "Ordered" | "In Progress" | "Clear" | "Issues Found";
type FormsStatus = "" | "Not Started" | "Packaged" | "Sent for Signature" | "Received";

const ENV_OPTIONS: EnvStatus[] = ["", "Ordered", "In Progress", "Clear", "Issues Found"];
const FORMS_OPTIONS: FormsStatus[] = ["", "Not Started", "Packaged", "Sent for Signature", "Received"];

const TABS = [
  { key: "appraisal",    label: "Appraisal",      icon: "home"       as const },
  { key: "diligence",   label: "Due Diligence",   icon: "search"     as const },
  { key: "hmda",        label: "HMDA",            icon: "clipboard"  as const },
];

function OptionPicker<T extends string>({
  value,
  options,
  onSelect,
}: {
  value: T;
  options: T[];
  onSelect: (v: T) => void;
  placeholder?: string;
}) {
  return (
    <View style={op.wrap}>
      {options.filter(Boolean).map((opt) => (
        <TouchableOpacity
          key={opt}
          style={[op.chip, value === opt && op.chipActive]}
          onPress={() => onSelect(opt)}
          activeOpacity={0.7}
        >
          <Text style={[op.chipText, value === opt && op.chipTextActive]}>{opt}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const op = StyleSheet.create({
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 },
  chip: {
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 4, borderWidth: 1, borderColor: Colors.light.border,
    backgroundColor: Colors.light.background,
  },
  chipActive: { borderColor: Colors.light.tint, backgroundColor: Colors.light.tintLight },
  chipText: { fontSize: 12, fontFamily: "OpenSans_600SemiBold", color: Colors.light.textSecondary },
  chipTextActive: { color: Colors.light.tint },
});

export default function ProcessingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getApplication } = useCoreService();
  const { getOrCreateProcessing, updateProcessing } = useProcessingService();
  const { getOrCreatePreClose, updatePreClose } = usePreCloseService();
  const insets = useSafeAreaInsets();
  const { canView, canEdit } = usePermission("processing.main");
  const app = getApplication(id);
  const proc = getOrCreateProcessing(id);
  const preClose = getOrCreatePreClose(id);

  const [activeTab, setActiveTab] = useState("appraisal");
  const [appraisalOrderedDate, setAppraisalOrderedDate] = useState(proc.appraisalOrderedDate);
  const [appraisalCompletedDate, setAppraisalCompletedDate] = useState(proc.appraisalCompletedDate);
  const [appraisalValueUsd, setAppraisalValueUsd] = useState(proc.appraisalValueUsd);
  const [environmentalStatus, setEnvironmentalStatus] = useState<EnvStatus>(proc.environmentalStatus as EnvStatus);
  const [borrowerFormsStatus, setBorrowerFormsStatus] = useState<FormsStatus>(proc.borrowerFormsStatus as FormsStatus);
  const [hmdaComplete, setHmdaComplete] = useState(preClose.hmdaComplete);
  const [hmdaNotes, setHmdaNotes] = useState(preClose.hmdaNotes);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); setDirty(false); }, []);
  useEffect(() => { if (mounted) setDirty(true); }, [
    appraisalOrderedDate, appraisalCompletedDate, appraisalValueUsd,
    environmentalStatus, borrowerFormsStatus, hmdaComplete, hmdaNotes,
  ]);

  const handleSave = async () => {
    setSaving(true);
    await Promise.all([
      updateProcessing(id, { appraisalOrderedDate, appraisalCompletedDate, appraisalValueUsd, environmentalStatus, borrowerFormsStatus }),
      updatePreClose(id, { hmdaComplete, hmdaNotes }),
    ]);
    setSaving(false);
    setDirty(false);
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  if (!app) return null;
  if (!canView) return <AccessDenied screenLabel="Processing" />;

  function renderTabContent() {
    switch (activeTab) {
      case "appraisal":
        return (
          <View style={styles.card}>
            <View style={styles.row2}>
              <View style={styles.fieldHalf}>
                <Text style={styles.label}>Ordered Date</Text>
                <TextInput
                  style={styles.input}
                  value={appraisalOrderedDate}
                  onChangeText={setAppraisalOrderedDate}
                  placeholder="MM/DD/YYYY"
                  placeholderTextColor={Colors.light.textTertiary}
                />
              </View>
              <View style={styles.fieldHalf}>
                <Text style={styles.label}>Completed Date</Text>
                <TextInput
                  style={styles.input}
                  value={appraisalCompletedDate}
                  onChangeText={setAppraisalCompletedDate}
                  placeholder="MM/DD/YYYY"
                  placeholderTextColor={Colors.light.textTertiary}
                />
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.field}>
              <Text style={styles.label}>Appraised Value (USD)</Text>
              <TextInput
                style={styles.input}
                value={appraisalValueUsd}
                onChangeText={setAppraisalValueUsd}
                placeholder="e.g. 4,500,000"
                placeholderTextColor={Colors.light.textTertiary}
                keyboardType="numeric"
              />
            </View>
          </View>
        );

      case "diligence":
        return (
          <>
            <View style={styles.card}>
              <Text style={styles.groupHeader}>Environmental Review</Text>
              <Text style={styles.label}>Status</Text>
              <OptionPicker
                value={environmentalStatus}
                options={ENV_OPTIONS}
                onSelect={setEnvironmentalStatus}
              />
            </View>
            <View style={[styles.card, { marginTop: 12 }]}>
              <Text style={styles.groupHeader}>Borrower Forms</Text>
              <Text style={styles.sectionNote}>
                Package, send for signature, and track return of all required borrower documentation.
              </Text>
              <Text style={styles.label}>Status</Text>
              <OptionPicker
                value={borrowerFormsStatus}
                options={FORMS_OPTIONS}
                onSelect={setBorrowerFormsStatus}
              />
            </View>
          </>
        );

      case "hmda":
        return (
          <View style={styles.card}>
            <Text style={styles.groupHeader}>HMDA & Compliance (Pre-close)</Text>
            <Text style={styles.sectionNote}>
              Ensure the loan application is complete for HMDA reporting under the Home Mortgage
              Disclosure Act and all paperwork is in place before document preparation.
            </Text>
            <View style={styles.switchRow}>
              <View style={styles.switchLabel}>
                <Text style={styles.label}>HMDA Data Complete</Text>
                <Text style={styles.sublabel}>All LAR fields captured and verified</Text>
              </View>
              <Switch
                value={hmdaComplete}
                onValueChange={setHmdaComplete}
                trackColor={{ false: Colors.light.border, true: "#C75300" }}
                thumbColor="#fff"
              />
            </View>
            <View style={styles.divider} />
            <View style={styles.field}>
              <Text style={styles.label}>HMDA / Compliance Notes</Text>
              <TextInput
                style={[styles.input, styles.textarea]}
                value={hmdaNotes}
                onChangeText={setHmdaNotes}
                placeholder="Note any outstanding compliance items, exceptions, or corrections needed…"
                placeholderTextColor={Colors.light.textTertiary}
                multiline
                numberOfLines={4}
              />
            </View>
          </View>
        );
    }
    return null;
  }

  return (
    <>
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Feather name="arrow-left" size={18} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>
        <View style={styles.headerTitle}>
          <View style={styles.headerIconWrap}>
            <Feather name="clipboard" size={14} color="#C75300" />
          </View>
          <View>
            <Text style={styles.headerEyebrow}>Processing</Text>
            <Text style={styles.headerLabel}>Processing & Compliance</Text>
          </View>
        </View>
        {dirty && canEdit ? (
          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.8}
          >
            <Text style={styles.saveBtnText}>{saving ? "Saving…" : "Save"}</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.savedIndicator}>
            <Feather name="check" size={14} color="rgba(255,255,255,0.5)" />
            <Text style={styles.savedText}>Saved</Text>
          </View>
        )}
      </View>

      <TabBar tabs={TABS} activeTab={activeTab} onSelect={setActiveTab} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 40 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {renderTabContent()}

        {dirty && (
          <TouchableOpacity
            style={[styles.saveBtnFull, saving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.8}
          >
            <Feather name="save" size={16} color="#fff" />
            <Text style={styles.saveBtnFullText}>{saving ? "Saving…" : "Save Changes"}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: Colors.light.surface,
    paddingHorizontal: 16, paddingBottom: 14,
    flexDirection: "row", alignItems: "center", gap: 12,
  },
  backBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  headerIconWrap: {
    width: 30, height: 30, borderRadius: 6,
    backgroundColor: "#FFECDC", alignItems: "center", justifyContent: "center",
  },
  headerEyebrow: { fontSize: 9, fontFamily: "OpenSans_600SemiBold", color: "rgba(255,255,255,0.45)", textTransform: "uppercase", letterSpacing: 0.8 },
  headerLabel: { fontSize: 15, fontFamily: "OpenSans_700Bold", color: "#fff", marginTop: 1 },
  saveBtn: { backgroundColor: Colors.light.tint, borderRadius: 4, paddingHorizontal: 12, paddingVertical: 7 },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { fontSize: 13, fontFamily: "OpenSans_700Bold", color: "#fff" },
  savedIndicator: { flexDirection: "row", alignItems: "center", gap: 4 },
  savedText: { fontSize: 12, fontFamily: "OpenSans_400Regular", color: "rgba(255,255,255,0.4)" },

  scroll: { flex: 1, backgroundColor: Colors.light.background },
  content: { padding: 16, gap: 8 },
  sectionNote: {
    fontSize: 12, fontFamily: "OpenSans_400Regular", color: Colors.light.textSecondary,
    lineHeight: 18, marginBottom: 8,
  },
  card: {
    backgroundColor: Colors.light.backgroundCard, borderWidth: 1,
    borderColor: Colors.light.border, borderRadius: 4, padding: 16,
  },
  groupHeader: {
    fontSize: 11, fontFamily: "OpenSans_700Bold",
    color: Colors.light.text, marginBottom: 10,
    textTransform: "uppercase", letterSpacing: 0.4,
  },
  field: { gap: 6 },
  fieldHalf: { flex: 1, gap: 6 },
  row2: { flexDirection: "row", gap: 12 },
  divider: { height: 1, backgroundColor: Colors.light.borderLight, marginVertical: 12 },
  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  switchLabel: { flex: 1, gap: 2 },
  label: { fontSize: 12, fontFamily: "OpenSans_600SemiBold", color: Colors.light.text },
  sublabel: { fontSize: 11, fontFamily: "OpenSans_400Regular", color: Colors.light.textTertiary, lineHeight: 16 },
  input: {
    backgroundColor: Colors.light.background, borderWidth: 1,
    borderColor: Colors.light.border, borderRadius: 4,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, fontFamily: "OpenSans_400Regular", color: Colors.light.text,
  },
  textarea: { minHeight: 90, textAlignVertical: "top", paddingTop: 10 },
  saveBtnFull: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, backgroundColor: Colors.light.tint,
    borderRadius: 4, paddingVertical: 14, marginTop: 16,
  },
  saveBtnFullText: { fontSize: 15, fontFamily: "OpenSans_700Bold", color: "#fff" },
});
