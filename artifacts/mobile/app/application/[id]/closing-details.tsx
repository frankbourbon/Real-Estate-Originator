import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { TabBar } from "@/components/TabBar";
import Colors from "@/constants/colors";
import { useCoreService } from "@/services/core";
import { useReadyForDocsService } from "@/services/ready-for-docs";
import { useClosingService } from "@/services/closing";

const TABS = [
  { key: "third-party", label: "Third-Party", icon: "users"        as const },
  { key: "legal-docs",  label: "Legal Docs",  icon: "file-text"    as const },
  { key: "docs-back",   label: "Docs Back",   icon: "inbox"        as const },
  { key: "wire",        label: "Wire",        icon: "send"         as const },
];

export default function ClosingDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getApplication } = useCoreService();
  const { getOrCreateRFD, updateRFD } = useReadyForDocsService();
  const { getOrCreateClosing, updateClosing } = useClosingService();
  const insets = useSafeAreaInsets();
  const app = getApplication(id);

  const rfd = getOrCreateRFD(id);
  const cl = getOrCreateClosing(id);

  const [activeTab, setActiveTab] = useState("third-party");
  const [insuranceCarrier, setInsuranceCarrier] = useState(rfd.insuranceCarrier);
  const [insurancePolicyNumber, setInsurancePolicyNumber] = useState(rfd.insurancePolicyNumber);
  const [insuranceEffectiveDate, setInsuranceEffectiveDate] = useState(rfd.insuranceEffectiveDate);
  const [titleCompany, setTitleCompany] = useState(rfd.titleCompany);
  const [escrowCompany, setEscrowCompany] = useState(rfd.escrowCompany);
  const [floodZoneDesignation, setFloodZoneDesignation] = useState(rfd.floodZoneDesignation);
  const [titleReportDate, setTitleReportDate] = useState(rfd.titleReportDate);
  const [docsDrawnDate, setDocsDrawnDate] = useState(cl.docsDrawnDate);
  const [settlementFeesUsd, setSettlementFeesUsd] = useState(cl.settlementFeesUsd);
  const [settlementStatementDate, setSettlementStatementDate] = useState(cl.settlementStatementDate);
  const [docsBackDate, setDocsBackDate] = useState(cl.docsBackDate);
  const [titleConfirmationDate, setTitleConfirmationDate] = useState(cl.titleConfirmationDate);
  const [wireAmountUsd, setWireAmountUsd] = useState(cl.wireAmountUsd);
  const [wireBankName, setWireBankName] = useState(cl.wireBankName);
  const [wireAbaNumber, setWireAbaNumber] = useState(cl.wireAbaNumber);
  const [wireAccountNumber, setWireAccountNumber] = useState(cl.wireAccountNumber);
  const [servicingLoanNumber, setServicingLoanNumber] = useState(cl.servicingLoanNumber);
  const [bookingDate, setBookingDate] = useState(cl.bookingDate);

  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); setDirty(false); }, []);
  useEffect(() => {
    if (mounted) setDirty(true);
  }, [
    insuranceCarrier, insurancePolicyNumber, insuranceEffectiveDate,
    titleCompany, escrowCompany, floodZoneDesignation, titleReportDate,
    docsDrawnDate, settlementFeesUsd, settlementStatementDate,
    docsBackDate, titleConfirmationDate,
    wireAmountUsd, wireBankName, wireAbaNumber, wireAccountNumber,
    servicingLoanNumber, bookingDate,
  ]);

  const handleSave = async () => {
    setSaving(true);
    await Promise.all([
      updateRFD(id, {
        insuranceCarrier, insurancePolicyNumber, insuranceEffectiveDate,
        titleCompany, escrowCompany, floodZoneDesignation, titleReportDate,
      }),
      updateClosing(id, {
        docsDrawnDate, settlementFeesUsd, settlementStatementDate,
        docsBackDate, titleConfirmationDate,
        wireAmountUsd, wireBankName, wireAbaNumber, wireAccountNumber,
        servicingLoanNumber, bookingDate,
      }),
    ]);
    setSaving(false);
    setDirty(false);
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  if (!app) return null;

  function renderTabContent() {
    switch (activeTab) {
      case "third-party":
        return (
          <View style={styles.card}>
            <Text style={styles.groupHeader}>Insurance Policy</Text>
            <View style={styles.row2}>
              <View style={styles.fieldHalf}>
                <Text style={styles.label}>Carrier</Text>
                <TextInput style={styles.input} value={insuranceCarrier} onChangeText={setInsuranceCarrier} placeholder="e.g. Lloyd's of London" placeholderTextColor={Colors.light.textTertiary} />
              </View>
              <View style={styles.fieldHalf}>
                <Text style={styles.label}>Policy Number</Text>
                <TextInput style={styles.input} value={insurancePolicyNumber} onChangeText={setInsurancePolicyNumber} placeholder="Policy #" placeholderTextColor={Colors.light.textTertiary} />
              </View>
            </View>
            <View style={[styles.field, { marginTop: 10 }]}>
              <Text style={styles.label}>Effective Date</Text>
              <TextInput style={styles.input} value={insuranceEffectiveDate} onChangeText={setInsuranceEffectiveDate} placeholder="MM/DD/YYYY" placeholderTextColor={Colors.light.textTertiary} />
            </View>

            <View style={styles.divider} />

            <Text style={styles.groupHeader}>Title, Escrow & Flood</Text>
            <View style={styles.row2}>
              <View style={styles.fieldHalf}>
                <Text style={styles.label}>Title Company</Text>
                <TextInput style={styles.input} value={titleCompany} onChangeText={setTitleCompany} placeholder="Company name" placeholderTextColor={Colors.light.textTertiary} />
              </View>
              <View style={styles.fieldHalf}>
                <Text style={styles.label}>Escrow Company</Text>
                <TextInput style={styles.input} value={escrowCompany} onChangeText={setEscrowCompany} placeholder="Company name" placeholderTextColor={Colors.light.textTertiary} />
              </View>
            </View>
            <View style={[styles.row2, { marginTop: 10 }]}>
              <View style={styles.fieldHalf}>
                <Text style={styles.label}>Flood Zone</Text>
                <TextInput style={styles.input} value={floodZoneDesignation} onChangeText={setFloodZoneDesignation} placeholder="e.g. Zone X, Zone AE" placeholderTextColor={Colors.light.textTertiary} />
              </View>
              <View style={styles.fieldHalf}>
                <Text style={styles.label}>Title Report Date</Text>
                <TextInput style={styles.input} value={titleReportDate} onChangeText={setTitleReportDate} placeholder="MM/DD/YYYY" placeholderTextColor={Colors.light.textTertiary} />
              </View>
            </View>
          </View>
        );

      case "legal-docs":
        return (
          <>
            <Text style={styles.sectionNote}>
              Promissory note, security instrument, guarantee, loan disclosure, and settlement statement are generated at this stage.
            </Text>
            <View style={styles.card}>
              <View style={styles.row2}>
                <View style={styles.fieldHalf}>
                  <Text style={styles.label}>Docs Drawn Date</Text>
                  <TextInput style={styles.input} value={docsDrawnDate} onChangeText={setDocsDrawnDate} placeholder="MM/DD/YYYY" placeholderTextColor={Colors.light.textTertiary} />
                </View>
                <View style={styles.fieldHalf}>
                  <Text style={styles.label}>Settlement Statement Date</Text>
                  <TextInput style={styles.input} value={settlementStatementDate} onChangeText={setSettlementStatementDate} placeholder="MM/DD/YYYY" placeholderTextColor={Colors.light.textTertiary} />
                </View>
              </View>
              <View style={[styles.field, { marginTop: 10 }]}>
                <Text style={styles.label}>Settlement / Closing Fees (USD)</Text>
                <TextInput style={styles.input} value={settlementFeesUsd} onChangeText={setSettlementFeesUsd} placeholder="e.g. 24,500" placeholderTextColor={Colors.light.textTertiary} keyboardType="numeric" />
              </View>
            </View>
          </>
        );

      case "docs-back":
        return (
          <>
            <Text style={styles.sectionNote}>
              Title company returns signed legal documents. Closing team confirms receipt.
            </Text>
            <View style={styles.card}>
              <View style={styles.row2}>
                <View style={styles.fieldHalf}>
                  <Text style={styles.label}>Signed Docs Received</Text>
                  <TextInput style={styles.input} value={docsBackDate} onChangeText={setDocsBackDate} placeholder="MM/DD/YYYY" placeholderTextColor={Colors.light.textTertiary} />
                </View>
                <View style={styles.fieldHalf}>
                  <Text style={styles.label}>Title Confirmation Date</Text>
                  <TextInput style={styles.input} value={titleConfirmationDate} onChangeText={setTitleConfirmationDate} placeholder="MM/DD/YYYY" placeholderTextColor={Colors.light.textTertiary} />
                </View>
              </View>
            </View>
          </>
        );

      case "wire":
        return (
          <>
            <Text style={styles.sectionNote}>
              Funds are wired and the loan is booked to servicing. Keep wire instructions confidential.
            </Text>
            <View style={styles.card}>
              <View style={styles.field}>
                <Text style={styles.label}>Wire Amount (USD)</Text>
                <TextInput style={styles.input} value={wireAmountUsd} onChangeText={setWireAmountUsd} placeholder="e.g. 3,250,000" placeholderTextColor={Colors.light.textTertiary} keyboardType="numeric" />
              </View>

              <View style={styles.divider} />

              <Text style={styles.groupHeader}>Receiving Bank Wire Instructions</Text>
              <View style={styles.field}>
                <Text style={styles.label}>Bank Name</Text>
                <TextInput style={styles.input} value={wireBankName} onChangeText={setWireBankName} placeholder="e.g. First National Bank" placeholderTextColor={Colors.light.textTertiary} />
              </View>
              <View style={[styles.row2, { marginTop: 10 }]}>
                <View style={styles.fieldHalf}>
                  <Text style={styles.label}>ABA / Routing Number</Text>
                  <TextInput style={styles.input} value={wireAbaNumber} onChangeText={setWireAbaNumber} placeholder="9-digit ABA" placeholderTextColor={Colors.light.textTertiary} keyboardType="numeric" />
                </View>
                <View style={styles.fieldHalf}>
                  <Text style={styles.label}>Account Number</Text>
                  <TextInput style={styles.input} value={wireAccountNumber} onChangeText={setWireAccountNumber} placeholder="Account #" placeholderTextColor={Colors.light.textTertiary} keyboardType="numeric" />
                </View>
              </View>

              <View style={styles.divider} />

              <Text style={styles.groupHeader}>Servicing Booking</Text>
              <View style={styles.row2}>
                <View style={styles.fieldHalf}>
                  <Text style={styles.label}>Servicing Loan Number</Text>
                  <TextInput style={styles.input} value={servicingLoanNumber} onChangeText={setServicingLoanNumber} placeholder="Assigned by system" placeholderTextColor={Colors.light.textTertiary} />
                </View>
                <View style={styles.fieldHalf}>
                  <Text style={styles.label}>Booking Date</Text>
                  <TextInput style={styles.input} value={bookingDate} onChangeText={setBookingDate} placeholder="MM/DD/YYYY" placeholderTextColor={Colors.light.textTertiary} />
                </View>
              </View>
            </View>
          </>
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
            <Feather name="check-circle" size={14} color="#005C3C" />
          </View>
          <View>
            <Text style={styles.headerEyebrow}>Closing Team</Text>
            <Text style={styles.headerLabel}>Closing Details</Text>
          </View>
        </View>
        {dirty ? (
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
  headerIconWrap: { width: 30, height: 30, borderRadius: 6, backgroundColor: "#D0F0E5", alignItems: "center", justifyContent: "center" },
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
  divider: { height: 1, backgroundColor: Colors.light.borderLight, marginVertical: 14 },
  label: { fontSize: 12, fontFamily: "OpenSans_600SemiBold", color: Colors.light.text },
  input: {
    backgroundColor: Colors.light.background, borderWidth: 1,
    borderColor: Colors.light.border, borderRadius: 4,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, fontFamily: "OpenSans_400Regular", color: Colors.light.text,
  },
  saveBtnFull: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, backgroundColor: Colors.light.tint, borderRadius: 4,
    paddingVertical: 14, marginTop: 16,
  },
  saveBtnFullText: { fontSize: 15, fontFamily: "OpenSans_700Bold", color: "#fff" },
});
