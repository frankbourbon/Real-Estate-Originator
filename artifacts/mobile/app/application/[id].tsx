import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { DetailRow } from "@/components/DetailRow";
import { SectionHeader } from "@/components/SectionHeader";
import { StatusBadge } from "@/components/StatusBadge";
import Colors from "@/constants/colors";
import type { ApplicationStatus, LOAApplication } from "@/context/ApplicationContext";
import { useApplications } from "@/context/ApplicationContext";
import {
  formatCurrencyFull,
  formatFullDate,
  formatPercent,
  formatSF,
} from "@/utils/formatting";

const STATUS_OPTIONS: ApplicationStatus[] = [
  "Draft",
  "Submitted",
  "Under Review",
  "Approved",
  "Declined",
];

export default function ApplicationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getApplication, updateApplication, deleteApplication, addNote } = useApplications();
  const insets = useSafeAreaInsets();
  const [statusModal, setStatusModal] = useState(false);
  const [noteModal, setNoteModal] = useState(false);
  const [noteText, setNoteText] = useState("");

  const app = getApplication(id);

  if (!app) {
    return (
      <View style={styles.center}>
        <Text style={styles.notFound}>Application not found</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backLink}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleDelete = () => {
    Alert.alert(
      "Delete Application",
      "This cannot be undone. Are you sure you want to delete this application?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteApplication(id);
            router.back();
          },
        },
      ]
    );
  };

  const handleStatusChange = async (status: ApplicationStatus) => {
    await updateApplication(id, { status });
    setStatusModal(false);
  };

  const handleAddNote = async () => {
    if (!noteText.trim()) return;
    await addNote(id, noteText.trim());
    setNoteText("");
    setNoteModal(false);
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <>
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" size={20} color={Colors.light.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Application Detail
        </Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() =>
              router.push({ pathname: "/new-application", params: { id: app.id } })
            }
            activeOpacity={0.7}
          >
            <Feather name="edit-2" size={18} color={Colors.light.tint} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={handleDelete}
            activeOpacity={0.7}
          >
            <Feather name="trash-2" size={18} color={Colors.light.error} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: bottomPad + 40 },
        ]}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
      >
        {/* Hero Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View style={styles.heroLeft}>
              <View style={styles.typeTag}>
                <Text style={styles.typeTagText}>{app.propertyType}</Text>
              </View>
              <Text style={styles.heroAddress}>{app.propertyAddress || "No address set"}</Text>
              <Text style={styles.heroCity}>
                {[app.propertyCity, app.propertyState, app.propertyZip]
                  .filter(Boolean)
                  .join(", ") || "City, State"}
              </Text>
            </View>
          </View>

          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>
                {app.loanAmount ? formatCurrencyFull(app.loanAmount) : "—"}
              </Text>
              <Text style={styles.heroStatLabel}>Loan Amount</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{app.ltv ? `${app.ltv}%` : "—"}</Text>
              <Text style={styles.heroStatLabel}>LTV</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{app.dscr ? `${app.dscr}x` : "—"}</Text>
              <Text style={styles.heroStatLabel}>DSCR</Text>
            </View>
          </View>

          <View style={styles.heroFooter}>
            <StatusBadge status={app.status} />
            <TouchableOpacity
              style={styles.changeStatusBtn}
              onPress={() => setStatusModal(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.changeStatusText}>Change Status</Text>
              <Feather name="chevron-right" size={14} color={Colors.light.tint} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Dates */}
        <View style={styles.metaRow}>
          <Feather name="calendar" size={13} color={Colors.light.textTertiary} />
          <Text style={styles.metaText}>
            Created {formatFullDate(app.createdAt)} · Updated {formatFullDate(app.updatedAt)}
          </Text>
        </View>

        {/* Property Details */}
        <View style={styles.card}>
          <SectionHeader title="Property Details" />
          <DetailRow label="Address" value={app.propertyAddress} />
          <DetailRow label="City" value={app.propertyCity} />
          <DetailRow label="State" value={app.propertyState} />
          <DetailRow label="ZIP Code" value={app.propertyZip} />
          <DetailRow label="Property Type" value={app.propertyType} />
          <DetailRow label="Square Footage" value={app.propertySquareFeet ? formatSF(app.propertySquareFeet) : undefined} />
          <DetailRow label="Units" value={app.propertyUnits} />
          <DetailRow label="Year Built" value={app.yearBuilt} />
          <DetailRow label="Occupancy Rate" value={app.occupancyRate ? `${app.occupancyRate}%` : undefined} last />
        </View>

        {/* Loan Terms */}
        <View style={styles.card}>
          <SectionHeader title="Loan Terms" />
          <DetailRow label="Loan Type" value={app.loanType} />
          <DetailRow label="Loan Amount" value={app.loanAmount ? formatCurrencyFull(app.loanAmount) : undefined} />
          <DetailRow label="LTV" value={app.ltv ? `${app.ltv}%` : undefined} />
          <DetailRow label="DSCR" value={app.dscr ? `${app.dscr}x` : undefined} />
          <DetailRow label="Interest Type" value={app.interestType} />
          <DetailRow label="Interest Rate" value={app.interestRate ? `${app.interestRate}%` : undefined} />
          <DetailRow label="Loan Term" value={app.loanTerm ? `${app.loanTerm} years` : undefined} />
          <DetailRow label="Amortization" value={app.amortizationType} />
          <DetailRow label="Closing Date" value={app.closingDate} last />
        </View>

        {/* Borrower */}
        <View style={styles.card}>
          <SectionHeader title="Borrower" />
          <DetailRow label="Name" value={app.borrowerName} />
          <DetailRow label="Entity" value={app.borrowerEntity} />
          <DetailRow label="Email" value={app.borrowerEmail} />
          <DetailRow label="Phone" value={app.borrowerPhone} />
          <DetailRow label="CRE Experience" value={app.borrowerExperience} />
          <DetailRow label="Net Worth" value={app.netWorth ? formatCurrencyFull(app.netWorth) : undefined} />
          <DetailRow label="Liquidity" value={app.liquidity ? formatCurrencyFull(app.liquidity) : undefined} />
          <DetailRow label="Credit Score" value={app.creditScore} last />
        </View>

        {/* Notes */}
        <View style={styles.card}>
          <View style={styles.notesHeader}>
            <SectionHeader title={`Notes (${app.notes.length})`} />
            <TouchableOpacity
              style={styles.addNoteBtn}
              onPress={() => setNoteModal(true)}
              activeOpacity={0.7}
            >
              <Feather name="plus" size={16} color={Colors.light.tint} />
              <Text style={styles.addNoteBtnText}>Add Note</Text>
            </TouchableOpacity>
          </View>

          {app.notes.length === 0 ? (
            <View style={styles.notesEmpty}>
              <Feather name="message-square" size={28} color={Colors.light.textTertiary} />
              <Text style={styles.notesEmptyText}>No notes yet</Text>
            </View>
          ) : (
            app.notes.map((note, i) => (
              <View
                key={note.id}
                style={[styles.note, i === app.notes.length - 1 && styles.noteLast]}
              >
                <View style={styles.noteHeader}>
                  <Text style={styles.noteAuthor}>{note.author}</Text>
                  <Text style={styles.noteDate}>{formatFullDate(note.createdAt)}</Text>
                </View>
                <Text style={styles.noteText}>{note.text}</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Status Modal */}
      <Modal
        visible={statusModal}
        transparent
        animationType="slide"
        onRequestClose={() => setStatusModal(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setStatusModal(false)} />
        <View style={[styles.sheet, { paddingBottom: bottomPad + 16 }]}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>Change Status</Text>
          {STATUS_OPTIONS.map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.statusOption, s === app.status && styles.statusOptionActive]}
              onPress={() => handleStatusChange(s)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.statusOptionText,
                  s === app.status && styles.statusOptionTextActive,
                ]}
              >
                {s}
              </Text>
              {s === app.status && (
                <Feather name="check" size={16} color={Colors.light.tint} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </Modal>

      {/* Note Modal */}
      <Modal
        visible={noteModal}
        transparent
        animationType="slide"
        onRequestClose={() => setNoteModal(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setNoteModal(false)} />
        <View style={[styles.sheet, { paddingBottom: bottomPad + 16 }]}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>Add Note</Text>
          <TextInput
            style={styles.noteInput}
            multiline
            placeholder="Type your note here..."
            placeholderTextColor={Colors.light.textTertiary}
            value={noteText}
            onChangeText={setNoteText}
            autoFocus
            textAlignVertical="top"
          />
          <View style={styles.noteModalActions}>
            <TouchableOpacity
              style={styles.cancelNoteBtn}
              onPress={() => {
                setNoteText("");
                setNoteModal(false);
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelNoteText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveNoteBtn, !noteText.trim() && styles.saveNoteBtnDisabled]}
              onPress={handleAddNote}
              disabled={!noteText.trim()}
              activeOpacity={0.8}
            >
              <Text style={styles.saveNoteText}>Save Note</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  notFound: {
    fontSize: 16,
    fontFamily: "Inter_500Medium",
    color: Colors.light.text,
  },
  backLink: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.light.tint,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: Colors.light.background,
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: Colors.light.backgroundCard,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.light.text,
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
  },
  editBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: Colors.light.tint + "12",
  },
  deleteBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: Colors.light.errorBg,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  heroCard: {
    backgroundColor: Colors.light.backgroundCard,
    borderRadius: 20,
    padding: 20,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  heroTop: {
    marginBottom: 16,
  },
  heroLeft: {
    gap: 4,
  },
  typeTag: {
    backgroundColor: Colors.light.tint + "15",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: "flex-start",
    marginBottom: 8,
  },
  typeTagText: {
    color: Colors.light.tint,
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  heroAddress: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: Colors.light.text,
    letterSpacing: -0.3,
  },
  heroCity: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.light.textSecondary,
  },
  heroStats: {
    flexDirection: "row",
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  heroStat: {
    flex: 1,
    alignItems: "center",
  },
  heroStatValue: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: Colors.light.text,
    marginBottom: 2,
  },
  heroStatLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: Colors.light.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  heroStatDivider: {
    width: 1,
    backgroundColor: Colors.light.border,
    marginVertical: 4,
  },
  heroFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  changeStatusBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  changeStatusText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.light.tint,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 4,
    marginBottom: 16,
    marginTop: 4,
  },
  metaText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.light.textTertiary,
  },
  card: {
    backgroundColor: Colors.light.backgroundCard,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  notesHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  addNoteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingTop: 2,
  },
  addNoteBtnText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.light.tint,
  },
  notesEmpty: {
    alignItems: "center",
    paddingVertical: 24,
    gap: 8,
  },
  notesEmptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.light.textTertiary,
  },
  note: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.borderLight,
  },
  noteLast: {
    borderBottomWidth: 0,
  },
  noteHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  noteAuthor: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.light.tint,
  },
  noteDate: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.light.textTertiary,
  },
  noteText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.light.text,
    lineHeight: 20,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.light.backgroundCard,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    paddingHorizontal: 16,
    maxHeight: "70%",
  },
  sheetHandle: {
    width: 36,
    height: 4,
    backgroundColor: Colors.light.border,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: Colors.light.text,
    marginBottom: 12,
  },
  statusOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.borderLight,
  },
  statusOptionActive: {
    backgroundColor: Colors.light.tint + "08",
    borderRadius: 8,
    paddingHorizontal: 8,
  },
  statusOptionText: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: Colors.light.text,
  },
  statusOptionTextActive: {
    fontFamily: "Inter_600SemiBold",
    color: Colors.light.tint,
  },
  noteInput: {
    backgroundColor: Colors.light.backgroundSecondary,
    borderRadius: 12,
    padding: 14,
    minHeight: 100,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.light.text,
    marginBottom: 16,
  },
  noteModalActions: {
    flexDirection: "row",
    gap: 12,
  },
  cancelNoteBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.light.border,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelNoteText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: Colors.light.textSecondary,
  },
  saveNoteBtn: {
    flex: 2,
    height: 46,
    borderRadius: 12,
    backgroundColor: Colors.light.tint,
    alignItems: "center",
    justifyContent: "center",
  },
  saveNoteBtnDisabled: {
    opacity: 0.5,
  },
  saveNoteText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
});
