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

import Colors from "@/constants/colors";
import { useFinalCreditReviewService } from "@/services/final-credit-review";
import { useCoreService } from "@/services/core";

export default function CommitmentLetterScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getApplication } = useCoreService();
  const { getOrCreateFCR, updateFCR } = useFinalCreditReviewService();
  const insets = useSafeAreaInsets();
  const app = getApplication(id);
  const fcr = getOrCreateFCR(id);

  const [commitmentLetterRecommended, setCommitmentLetterRecommended] = useState(
    fcr.commitmentLetterRecommended
  );
  const [commitmentLetterIssuedDate, setCommitmentLetterIssuedDate] = useState(
    fcr.commitmentLetterIssuedDate
  );
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setDirty(true); }, [commitmentLetterRecommended, commitmentLetterIssuedDate]);

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); setDirty(false); }, []);

  const handleSave = async () => {
    setSaving(true);
    await updateFCR(id, { commitmentLetterRecommended, commitmentLetterIssuedDate });
    setSaving(false);
    setDirty(false);
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  if (!app) return null;

  return (
    <>
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Feather name="arrow-left" size={18} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>
        <View style={styles.headerTitle}>
          <View style={styles.headerIconWrap}>
            <Feather name="shield" size={14} color="#6B46C1" />
          </View>
          <View>
            <Text style={styles.headerEyebrow}>Credit Risk · Final Credit Review</Text>
            <Text style={styles.headerLabel}>Final Credit Review</Text>
          </View>
        </View>
        {dirty && mounted ? (
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

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad + 40 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.sectionNote}>
          Legally binding commitment to fund. Issued after Final Credit Review approval. All conditions and exceptions must be documented before issuance.
        </Text>

        <View style={styles.card}>
          <View style={styles.switchRow}>
            <View style={styles.switchLabel}>
              <Text style={styles.label}>FCR Recommended</Text>
              <Text style={styles.sublabel}>Credit Risk approves issuing Final Credit Review to borrower</Text>
            </View>
            <Switch
              value={commitmentLetterRecommended}
              onValueChange={setCommitmentLetterRecommended}
              trackColor={{ false: Colors.light.border, true: "#6B46C1" }}
              thumbColor="#fff"
            />
          </View>

          {commitmentLetterRecommended && (
            <>
              <View style={styles.divider} />
              <View style={styles.field}>
                <Text style={styles.label}>Final Credit Review Issued Date</Text>
                <TextInput
                  style={styles.input}
                  value={commitmentLetterIssuedDate}
                  onChangeText={setCommitmentLetterIssuedDate}
                  placeholder="MM/DD/YYYY"
                  placeholderTextColor={Colors.light.textTertiary}
                />
              </View>
            </>
          )}
        </View>

        {dirty && mounted && (
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
    paddingHorizontal: 16,
    paddingBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  headerIconWrap: {
    width: 30, height: 30,
    borderRadius: 6,
    backgroundColor: "#F3F0FF",
    alignItems: "center", justifyContent: "center",
  },
  headerEyebrow: { fontSize: 9, fontFamily: "OpenSans_600SemiBold", color: "rgba(255,255,255,0.45)", textTransform: "uppercase", letterSpacing: 0.8 },
  headerLabel: { fontSize: 15, fontFamily: "OpenSans_700Bold", color: "#fff", marginTop: 1 },
  saveBtn: {
    backgroundColor: Colors.light.tint,
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { fontSize: 13, fontFamily: "OpenSans_700Bold", color: "#fff" },
  savedIndicator: { flexDirection: "row", alignItems: "center", gap: 4 },
  savedText: { fontSize: 12, fontFamily: "OpenSans_400Regular", color: "rgba(255,255,255,0.4)" },

  scroll: { flex: 1, backgroundColor: Colors.light.background },
  content: { padding: 16, gap: 8 },

  sectionNote: {
    fontSize: 12, fontFamily: "OpenSans_400Regular",
    color: Colors.light.textSecondary,
    lineHeight: 18, marginBottom: 8, marginLeft: 2,
  },

  card: {
    backgroundColor: Colors.light.backgroundCard,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 4,
    padding: 16,
  },
  field: { gap: 6 },
  divider: { height: 1, backgroundColor: Colors.light.borderLight, marginVertical: 12 },

  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  switchLabel: { flex: 1, gap: 2 },

  label: { fontSize: 12, fontFamily: "OpenSans_600SemiBold", color: Colors.light.text },
  sublabel: { fontSize: 11, fontFamily: "OpenSans_400Regular", color: Colors.light.textTertiary, lineHeight: 16 },

  input: {
    backgroundColor: Colors.light.background,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: "OpenSans_400Regular",
    color: Colors.light.text,
  },

  saveBtnFull: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.light.tint,
    borderRadius: 4,
    paddingVertical: 14,
    marginTop: 16,
  },
  saveBtnFullText: { fontSize: 15, fontFamily: "OpenSans_700Bold", color: "#fff" },
});
