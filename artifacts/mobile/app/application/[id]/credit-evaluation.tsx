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
import { useLetterOfInterestService } from "@/services/letter-of-interest";
import { useCoreService } from "@/services/core";

export default function CreditEvaluationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getApplication } = useCoreService();
  const { getOrCreateLOI, updateLOI } = useLetterOfInterestService();
  const { getOrCreateFCR, updateFCR, getConditions, getExceptions } = useFinalCreditReviewService();
  const insets = useSafeAreaInsets();
  const app = getApplication(id);

  const loi = getOrCreateLOI(id);
  const fcr = getOrCreateFCR(id);
  const conditions = getConditions(id);
  const exceptions = getExceptions(id);

  const [creditBoxNotes, setCreditBoxNotes] = useState(loi.creditBoxNotes);
  const [loiRecommended, setLoiRecommended] = useState(loi.loiRecommended);
  const [loiIssuedDate, setLoiIssuedDate] = useState(loi.loiIssuedDate);
  const [loiExpirationDate, setLoiExpirationDate] = useState(loi.loiExpirationDate);
  const [commitmentLetterRecommended, setCommitmentLetterRecommended] = useState(
    fcr.commitmentLetterRecommended
  );
  const [commitmentLetterIssuedDate, setCommitmentLetterIssuedDate] = useState(
    fcr.commitmentLetterIssuedDate
  );
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setDirty(true); }, [
    creditBoxNotes, loiRecommended, loiIssuedDate, loiExpirationDate,
    commitmentLetterRecommended, commitmentLetterIssuedDate,
  ]);

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); setDirty(false); }, []);

  const handleSave = async () => {
    setSaving(true);
    await Promise.all([
      updateLOI(id, { creditBoxNotes, loiRecommended, loiIssuedDate, loiExpirationDate }),
      updateFCR(id, { commitmentLetterRecommended, commitmentLetterIssuedDate }),
    ]);
    setSaving(false);
    setDirty(false);
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  if (!app) return null;

  const pendingConditions = conditions.filter((c) => c.status === "Pending").length;
  const pendingExceptions = exceptions.filter((e) => e.status === "Pending Approval").length;

  return (
    <>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Feather name="arrow-left" size={18} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>
        <View style={styles.headerTitle}>
          <View style={styles.headerIconWrap}>
            <Feather name="shield" size={14} color="#0078CF" />
          </View>
          <View>
            <Text style={styles.headerEyebrow}>Credit Risk</Text>
            <Text style={styles.headerLabel}>Credit Evaluation</Text>
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
        {/* ── Letter of Interest ── */}
        <Text style={styles.sectionLabel}>Letter of Interest (LOI)</Text>
        <Text style={styles.sectionNote}>
          Non-binding recommendation to issue. Does NOT require borrower financials or credit score.
        </Text>
        <View style={styles.card}>
          <View style={styles.field}>
            <Text style={styles.label}>Credit Box Assessment Notes</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              value={creditBoxNotes}
              onChangeText={setCreditBoxNotes}
              placeholder="Notes on how this deal fits the credit box, debt yield, cap rate, market assessment…"
              placeholderTextColor={Colors.light.textTertiary}
              multiline
              numberOfLines={5}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.switchRow}>
            <View style={styles.switchLabel}>
              <Text style={styles.label}>LOI Recommended</Text>
              <Text style={styles.sublabel}>Credit Risk approves issuing Letter of Interest to borrower</Text>
            </View>
            <Switch
              value={loiRecommended}
              onValueChange={setLoiRecommended}
              trackColor={{ false: Colors.light.border, true: "#0078CF" }}
              thumbColor="#fff"
            />
          </View>

          {loiRecommended && (
            <>
              <View style={styles.divider} />
              <View style={styles.row2}>
                <View style={styles.fieldHalf}>
                  <Text style={styles.label}>LOI Issued Date</Text>
                  <TextInput
                    style={styles.input}
                    value={loiIssuedDate}
                    onChangeText={setLoiIssuedDate}
                    placeholder="MM/DD/YYYY"
                    placeholderTextColor={Colors.light.textTertiary}
                  />
                </View>
                <View style={styles.fieldHalf}>
                  <Text style={styles.label}>LOI Expiration Date</Text>
                  <TextInput
                    style={styles.input}
                    value={loiExpirationDate}
                    onChangeText={setLoiExpirationDate}
                    placeholder="MM/DD/YYYY"
                    placeholderTextColor={Colors.light.textTertiary}
                  />
                </View>
              </View>
            </>
          )}
        </View>

        {/* ── Commitment Letter ── */}
        <Text style={styles.sectionLabel}>Commitment Letter (CL)</Text>
        <Text style={styles.sectionNote}>
          Legally binding commitment to fund. Issued after Final Credit Review.
        </Text>
        <View style={styles.card}>
          <View style={styles.switchRow}>
            <View style={styles.switchLabel}>
              <Text style={styles.label}>CL Recommended</Text>
              <Text style={styles.sublabel}>Credit Risk approves issuing Commitment Letter</Text>
            </View>
            <Switch
              value={commitmentLetterRecommended}
              onValueChange={setCommitmentLetterRecommended}
              trackColor={{ false: Colors.light.border, true: "#0078CF" }}
              thumbColor="#fff"
            />
          </View>

          {commitmentLetterRecommended && (
            <>
              <View style={styles.divider} />
              <View style={styles.field}>
                <Text style={styles.label}>Commitment Letter Issued Date</Text>
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

        {/* ── Conditions & Exceptions link card ── */}
        <Text style={styles.sectionLabel}>Conditions & Exceptions</Text>
        <Text style={styles.sectionNote}>
          Conditions and exceptions are now normalized records. Any persona can add them at any phase.
        </Text>

        <TouchableOpacity
          style={styles.condExcCard}
          activeOpacity={0.75}
          onPress={() => router.push(`/application/${id}/conditions`)}
        >
          <View style={styles.condExcRow}>
            <View style={styles.condExcBlock}>
              <View style={styles.condExcIconWrap}>
                <Feather name="check-square" size={18} color="#0078CF" />
              </View>
              <View style={styles.condExcText}>
                <Text style={styles.condExcCount}>{conditions.length}</Text>
                <Text style={styles.condExcLabel}>Condition{conditions.length !== 1 ? "s" : ""}</Text>
                {pendingConditions > 0 && (
                  <Text style={styles.condExcPending}>{pendingConditions} pending</Text>
                )}
              </View>
            </View>

            <View style={styles.condExcDivider} />

            <View style={styles.condExcBlock}>
              <View style={[styles.condExcIconWrap, { backgroundColor: "#FFECDC" }]}>
                <Feather name="shield-off" size={18} color="#C75300" />
              </View>
              <View style={styles.condExcText}>
                <Text style={[styles.condExcCount, { color: "#C75300" }]}>{exceptions.length}</Text>
                <Text style={styles.condExcLabel}>Exception{exceptions.length !== 1 ? "s" : ""}</Text>
                {pendingExceptions > 0 && (
                  <Text style={[styles.condExcPending, { color: "#C75300" }]}>{pendingExceptions} pending approval</Text>
                )}
              </View>
            </View>

            <View style={styles.condExcArrow}>
              <Feather name="chevron-right" size={18} color={Colors.light.textTertiary} />
            </View>
          </View>

          <View style={styles.condExcFooter}>
            <Feather name="users" size={11} color="#72777D" />
            <Text style={styles.condExcFooterText}>Any persona can add conditions or exceptions at any phase</Text>
          </View>
        </TouchableOpacity>

        {/* Save button */}
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
    backgroundColor: "#EAF6FF",
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

  sectionLabel: {
    fontSize: 10, fontFamily: "OpenSans_700Bold",
    color: Colors.light.textTertiary,
    textTransform: "uppercase", letterSpacing: 0.8,
    marginTop: 12, marginBottom: 4, marginLeft: 2,
  },
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
    gap: 0,
  },
  field: { gap: 6, marginBottom: 4 },
  fieldHalf: { flex: 1, gap: 6 },
  row2: { flexDirection: "row", gap: 12 },
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
  textarea: { minHeight: 100, textAlignVertical: "top", paddingTop: 10 },

  // Conditions & Exceptions link card
  condExcCard: {
    backgroundColor: Colors.light.backgroundCard,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 4,
    overflow: "hidden",
  },
  condExcRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 0,
  },
  condExcBlock: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  condExcIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "#EAF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  condExcText: { flex: 1 },
  condExcCount: {
    fontSize: 22,
    fontFamily: "OpenSans_700Bold",
    color: "#0078CF",
    lineHeight: 26,
  },
  condExcLabel: {
    fontSize: 11,
    fontFamily: "OpenSans_600SemiBold",
    color: Colors.light.textSecondary,
    marginTop: 1,
  },
  condExcPending: {
    fontSize: 11,
    fontFamily: "OpenSans_400Regular",
    color: "#C75300",
    marginTop: 2,
  },
  condExcDivider: {
    width: 1,
    height: 44,
    backgroundColor: Colors.light.border,
    marginHorizontal: 16,
  },
  condExcArrow: {
    paddingLeft: 8,
  },
  condExcFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#F7F8FA",
    borderTopWidth: 1,
    borderTopColor: Colors.light.borderLight,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  condExcFooterText: {
    fontSize: 11,
    fontFamily: "OpenSans_400Regular",
    color: Colors.light.textTertiary,
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
