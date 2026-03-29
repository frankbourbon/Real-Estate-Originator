import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";
import type {
  ApprovalAuthorityLevel,
  Exception,
  ExceptionStatus,
} from "@/services/final-credit-review";
import { APPROVAL_LEVELS, useFinalCreditReviewService } from "@/services/final-credit-review";
import { useCoreService } from "@/services/core";

// ─── Status chips ─────────────────────────────────────────────────────────────

const EXCEPTION_STATUSES: ExceptionStatus[] = ["Pending Approval", "Approved", "Denied"];

function exceptionStatusColor(s: ExceptionStatus): string {
  if (s === "Approved") return "#00875D";
  if (s === "Denied") return "#B91C1C";
  return "#C75300";
}

// ─── Chip row ─────────────────────────────────────────────────────────────────

function ChipRow<T extends string>({
  options, value, onChange, colorFn,
}: {
  options: T[]; value: T; onChange: (v: T) => void; colorFn?: (v: T) => string;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 4 }}>
      {options.map((opt) => {
        const active = value === opt;
        const color = colorFn ? colorFn(opt) : Colors.light.tint;
        return (
          <TouchableOpacity
            key={opt} onPress={() => onChange(opt)}
            style={[chips.chip, active && { backgroundColor: color, borderColor: color }]}
          >
            <Text style={[chips.chipText, active && { color: "#fff" }]}>{opt}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const chips = StyleSheet.create({
  chip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
    borderWidth: 1, borderColor: "#CBD2D9", backgroundColor: "#fff", marginRight: 8,
  },
  chipText: { fontSize: 12, fontWeight: "500", color: "#3C4149" },
});

// ─── W-Level Picker ───────────────────────────────────────────────────────────

function WLevelPicker({ value, onChange }: { value: ApprovalAuthorityLevel; onChange: (v: ApprovalAuthorityLevel) => void }) {
  const rows: ApprovalAuthorityLevel[][] = [];
  for (let i = 0; i < APPROVAL_LEVELS.length; i += 6) rows.push(APPROVAL_LEVELS.slice(i, i + 6));
  return (
    <View style={{ marginVertical: 4 }}>
      {rows.map((row, ri) => (
        <View key={ri} style={{ flexDirection: "row", marginBottom: 6 }}>
          {row.map((level) => {
            const active = value === level;
            return (
              <TouchableOpacity
                key={level} onPress={() => onChange(level)}
                style={[wl.cell, active && { backgroundColor: "#0078CF", borderColor: "#0078CF" }]}
              >
                <Text style={[wl.cellText, active && { color: "#fff" }]}>{level}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
      <Text style={wl.hint}>W1 = lowest authority · W30 = highest (board-level)</Text>
    </View>
  );
}

const wl = StyleSheet.create({
  cell: {
    width: 44, height: 32, borderRadius: 6, borderWidth: 1,
    borderColor: "#CBD2D9", backgroundColor: "#fff",
    alignItems: "center", justifyContent: "center", marginRight: 6,
  },
  cellText: { fontSize: 11, fontWeight: "600", color: "#3C4149" },
  hint: { fontSize: 10, color: "#72777D", marginTop: 2 },
});

// ─── Types ────────────────────────────────────────────────────────────────────

type ExceptionDraft = {
  exceptionType: string;
  description: string;
  status: ExceptionStatus;
  approvalAuthorityLevel: ApprovalAuthorityLevel;
  createdByPersona: string;
  approvedBy: string;
  approvedAt: string;
};

type ModalState =
  | { mode: "none" }
  | { mode: "add" }
  | { mode: "edit"; item: Exception };

// ─── Form ─────────────────────────────────────────────────────────────────────

function ExceptionForm({ draft, onChange }: { draft: ExceptionDraft; onChange: (d: ExceptionDraft) => void }) {
  return (
    <ScrollView style={fm.scroll} keyboardShouldPersistTaps="handled">
      <Text style={fm.label}>Type</Text>
      <TextInput
        style={fm.input} value={draft.exceptionType}
        onChangeText={(v) => onChange({ ...draft, exceptionType: v })}
        placeholder="e.g. LTV, DSCR, IO Structure, Asset Class" placeholderTextColor="#9EA6AD"
      />
      <Text style={fm.label}>Description</Text>
      <TextInput
        style={[fm.input, fm.multiline]} value={draft.description}
        onChangeText={(v) => onChange({ ...draft, description: v })}
        placeholder="Describe the policy deviation and business justification..."
        placeholderTextColor="#9EA6AD" multiline textAlignVertical="top"
      />
      <Text style={fm.label}>Status</Text>
      <ChipRow options={EXCEPTION_STATUSES} value={draft.status} onChange={(v) => onChange({ ...draft, status: v })} colorFn={exceptionStatusColor} />
      <Text style={fm.label}>Approval Authority Level Required</Text>
      <WLevelPicker value={draft.approvalAuthorityLevel} onChange={(v) => onChange({ ...draft, approvalAuthorityLevel: v })} />
      <Text style={fm.label}>Raised By (Persona)</Text>
      <TextInput
        style={fm.input} value={draft.createdByPersona}
        onChangeText={(v) => onChange({ ...draft, createdByPersona: v })}
        placeholder="e.g. Credit Risk" placeholderTextColor="#9EA6AD"
      />
      {draft.status === "Approved" && (
        <>
          <Text style={fm.label}>Approved By</Text>
          <TextInput
            style={fm.input} value={draft.approvedBy}
            onChangeText={(v) => onChange({ ...draft, approvedBy: v })}
            placeholder="Name and title of approving authority" placeholderTextColor="#9EA6AD"
          />
          <Text style={fm.label}>Approval Date</Text>
          <TextInput
            style={fm.input} value={draft.approvedAt}
            onChangeText={(v) => onChange({ ...draft, approvedAt: v })}
            placeholder="MM/DD/YYYY" placeholderTextColor="#9EA6AD"
          />
        </>
      )}
    </ScrollView>
  );
}

const fm = StyleSheet.create({
  scroll: { flex: 1, paddingHorizontal: 20 },
  label: {
    fontSize: 11, fontWeight: "600", color: "#5F646A",
    letterSpacing: 0.5, textTransform: "uppercase",
    marginTop: 16, marginBottom: 4,
  },
  input: {
    borderWidth: 1, borderColor: "#CBD2D9", borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: Platform.OS === "ios" ? 10 : 8,
    fontSize: 14, color: "#1A1E23", backgroundColor: "#fff",
  },
  multiline: { minHeight: 80, paddingTop: 10 },
});

// ─── Card ─────────────────────────────────────────────────────────────────────

function ExceptionCard({ item, onEdit, onDelete }: { item: Exception; onEdit: () => void; onDelete: () => void }) {
  const statusColor = exceptionStatusColor(item.status);
  return (
    <TouchableOpacity style={ic.card} onPress={onEdit} activeOpacity={0.75}>
      <View style={ic.topRow}>
        <View style={[ic.typePill, { backgroundColor: "#FFECDC" }]}>
          <Text style={[ic.typeText, { color: "#C75300" }]}>{item.exceptionType || "Exception"}</Text>
        </View>
        <View style={[ic.statusPill, { backgroundColor: statusColor + "20", borderColor: statusColor + "40" }]}>
          <Text style={[ic.statusText, { color: statusColor }]}>{item.status}</Text>
        </View>
      </View>
      <Text style={ic.desc} numberOfLines={3}>{item.description}</Text>
      <View style={ic.metaRow}>
        <View style={[ic.metaItem, ic.wLevelBadge]}>
          <Text style={ic.wLevelText}>{item.approvalAuthorityLevel}</Text>
        </View>
        <View style={ic.metaItem}>
          <Feather name="user" size={11} color="#72777D" />
          <Text style={ic.metaText}>{item.createdByPersona || "Unknown"}</Text>
        </View>
        {item.status === "Approved" && item.approvedBy ? (
          <View style={ic.metaItem}>
            <Feather name="check-circle" size={11} color="#00875D" />
            <Text style={[ic.metaText, { color: "#00875D" }]}>{item.approvedBy}</Text>
          </View>
        ) : null}
      </View>
      <View style={ic.actions}>
        <TouchableOpacity style={ic.editBtn} onPress={onEdit}>
          <Feather name="edit-2" size={13} color="#0078CF" />
          <Text style={ic.editText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={ic.deleteBtn} onPress={onDelete}>
          <Feather name="trash-2" size={13} color="#B91C1C" />
          <Text style={ic.deleteText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const ic = StyleSheet.create({
  card: {
    backgroundColor: "#fff", borderRadius: 10, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: "#E6E9EB",
    shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },
  topRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  typePill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  typeText: { fontSize: 11, fontWeight: "700" },
  statusPill: { marginLeft: "auto", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, borderWidth: 1 },
  statusText: { fontSize: 11, fontWeight: "600" },
  desc: { fontSize: 13, color: "#3C4149", lineHeight: 19, marginBottom: 10 },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 10 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 11, color: "#72777D" },
  wLevelBadge: { backgroundColor: "#0078CF", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  wLevelText: { fontSize: 11, fontWeight: "700", color: "#fff" },
  actions: { flexDirection: "row", gap: 12, paddingTop: 8, borderTopWidth: 1, borderTopColor: "#F0F2F4" },
  editBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  editText: { fontSize: 12, color: "#0078CF", fontWeight: "500" },
  deleteBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  deleteText: { fontSize: 12, color: "#B91C1C", fontWeight: "500" },
});

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function ExceptionsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getApplication } = useCoreService();
  const { getExceptions, addException, updateException, deleteException } = useFinalCreditReviewService();
  const insets = useSafeAreaInsets();

  const app = getApplication(id);
  const exceptions = getExceptions(id);

  const [modal, setModal] = useState<ModalState>({ mode: "none" });
  const [saving, setSaving] = useState(false);

  const defaultDraft = (): ExceptionDraft => ({
    exceptionType: "", description: "", status: "Pending Approval",
    approvalAuthorityLevel: "W5", createdByPersona: "", approvedBy: "", approvedAt: "",
  });
  const [draft, setDraft] = useState<ExceptionDraft>(defaultDraft);

  function openAdd() { setDraft(defaultDraft()); setModal({ mode: "add" }); }
  function openEdit(item: Exception) {
    setDraft({
      exceptionType: item.exceptionType, description: item.description, status: item.status,
      approvalAuthorityLevel: item.approvalAuthorityLevel, createdByPersona: item.createdByPersona,
      approvedBy: item.approvedBy, approvedAt: item.approvedAt,
    });
    setModal({ mode: "edit", item });
  }

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    try {
      if (modal.mode === "add") {
        if (!draft.description.trim()) { Alert.alert("Required", "Please enter an exception description."); return; }
        await addException(id, { phaseAddedAt: app?.status ?? "Inquiry", ...draft });
      } else if (modal.mode === "edit") {
        await updateException(modal.item.id, draft);
      }
      setModal({ mode: "none" });
    } finally { setSaving(false); }
  }

  function handleDelete(item: Exception) {
    Alert.alert("Delete Exception", "Remove this exception permanently?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteException(item.id) },
    ]);
  }

  const pendingCount = exceptions.filter((e) => e.status === "Pending Approval").length;
  const isEditing = modal.mode === "edit";

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Feather name="arrow-left" size={20} color="#fff" />
        </TouchableOpacity>
        <View style={s.headerText}>
          <Text style={s.headerTitle}>Policy Exceptions</Text>
          <Text style={s.headerSub}>
            {exceptions.length} exception{exceptions.length !== 1 ? "s" : ""}
            {pendingCount > 0 ? ` · ${pendingCount} pending approval` : ""}
          </Text>
        </View>
      </View>

      {pendingCount > 0 && (
        <View style={s.summaryBar}>
          <View style={s.summaryChip}>
            <Feather name="shield-off" size={12} color="#C75300" />
            <Text style={s.summaryText}>{pendingCount} exception{pendingCount !== 1 ? "s" : ""} awaiting approval</Text>
          </View>
        </View>
      )}

      <ScrollView style={s.scroll} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <View style={s.sectionHeader}>
          <View style={s.sectionTitle}>
            <Feather name="shield-off" size={15} color="#C75300" />
            <Text style={s.sectionTitleText}>Policy Exceptions</Text>
            {exceptions.length > 0 && (
              <View style={s.countBadge}>
                <Text style={s.countBadgeText}>{exceptions.length}</Text>
              </View>
            )}
          </View>
          <TouchableOpacity style={s.addBtn} onPress={openAdd}>
            <Feather name="plus" size={14} color="#C75300" />
            <Text style={s.addBtnText}>Add</Text>
          </TouchableOpacity>
        </View>
        <Text style={s.sectionDesc}>
          Policy deviations requiring approval authority sign-off. W1 = lowest authority (Loan Officer) · W30 = highest (Board).
        </Text>
        {exceptions.length === 0 ? (
          <View style={s.emptyState}>
            <Feather name="shield" size={28} color="#CBD2D9" />
            <Text style={s.emptyText}>No exceptions</Text>
            <Text style={s.emptySubText}>No policy exceptions have been recorded for this loan.</Text>
          </View>
        ) : (
          exceptions.map((item) => (
            <ExceptionCard key={item.id} item={item} onEdit={() => openEdit(item)} onDelete={() => handleDelete(item)} />
          ))
        )}
      </ScrollView>

      <Modal visible={modal.mode !== "none"} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModal({ mode: "none" })}>
        <View style={[mod.container, { paddingTop: insets.top }]}>
          <View style={mod.modalHeader}>
            <TouchableOpacity onPress={() => setModal({ mode: "none" })} style={mod.cancelBtn}>
              <Text style={mod.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={mod.modalTitle}>{isEditing ? "Edit Exception" : "Add Exception"}</Text>
            <TouchableOpacity onPress={handleSave} style={mod.saveBtn} disabled={saving}>
              <Text style={mod.saveText}>{saving ? "Saving…" : "Save"}</Text>
            </TouchableOpacity>
          </View>
          <ExceptionForm draft={draft} onChange={setDraft} />
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#E6E9EB" },
  header: {
    backgroundColor: Colors.light.surface,
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 14, gap: 12,
  },
  backBtn: { padding: 4 },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#fff" },
  headerSub: { fontSize: 12, color: "rgba(255,255,255,0.65)", marginTop: 2 },
  summaryBar: {
    backgroundColor: "#FFF7ED", borderBottomWidth: 1, borderBottomColor: "#F5CBA7",
    flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 16, paddingVertical: 10,
  },
  summaryChip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "#FFECDC", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: "#F5CBA7",
  },
  summaryText: { fontSize: 12, color: "#C75300", fontWeight: "500" },
  scroll: { flex: 1 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  sectionTitle: { flexDirection: "row", alignItems: "center", gap: 6 },
  sectionTitleText: { fontSize: 16, fontWeight: "700", color: "#C75300" },
  countBadge: {
    backgroundColor: "#C75300", borderRadius: 10, minWidth: 20, height: 20,
    alignItems: "center", justifyContent: "center", paddingHorizontal: 6,
  },
  countBadgeText: { fontSize: 11, fontWeight: "700", color: "#fff" },
  addBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    borderWidth: 1, borderColor: "#C75300", borderRadius: 16, paddingHorizontal: 12, paddingVertical: 5,
  },
  addBtnText: { fontSize: 13, color: "#C75300", fontWeight: "600" },
  sectionDesc: { fontSize: 12, color: "#72777D", lineHeight: 17, marginBottom: 14 },
  emptyState: {
    alignItems: "center", paddingVertical: 32, backgroundColor: "#fff",
    borderRadius: 10, borderWidth: 1, borderColor: "#E6E9EB", marginBottom: 10,
  },
  emptyText: { fontSize: 14, fontWeight: "600", color: "#9EA6AD", marginTop: 10 },
  emptySubText: { fontSize: 12, color: "#9EA6AD", marginTop: 4, textAlign: "center", paddingHorizontal: 24 },
});

const mod = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F8FA" },
  modalHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#E6E9EB",
  },
  cancelBtn: { paddingVertical: 4, paddingHorizontal: 4 },
  cancelText: { fontSize: 15, color: "#72777D" },
  modalTitle: { fontSize: 16, fontWeight: "700", color: "#1A1E23" },
  saveBtn: { paddingVertical: 4, paddingHorizontal: 4 },
  saveText: { fontSize: 15, color: Colors.light.tint, fontWeight: "600" },
});
