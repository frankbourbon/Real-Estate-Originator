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
  Condition,
  ConditionAppliesTo,
  ConditionStatus,
  Exception,
  ExceptionStatus,
} from "@/context/ApplicationContext";
import { APPROVAL_LEVELS, useApplications } from "@/context/ApplicationContext";

// ─── Status chips ─────────────────────────────────────────────────────────────

const CONDITION_STATUSES: ConditionStatus[] = ["Pending", "Satisfied", "Waived"];
const EXCEPTION_STATUSES: ExceptionStatus[] = ["Pending Approval", "Approved", "Denied"];
const APPLIES_TO: ConditionAppliesTo[] = ["Application", "Borrower", "Property"];

function conditionStatusColor(s: ConditionStatus): string {
  if (s === "Satisfied") return "#00875D";
  if (s === "Waived") return "#72777D";
  return "#C75300";
}

function exceptionStatusColor(s: ExceptionStatus): string {
  if (s === "Approved") return "#00875D";
  if (s === "Denied") return "#B91C1C";
  return "#C75300";
}

// ─── Chip row component ───────────────────────────────────────────────────────

function ChipRow<T extends string>({
  options,
  value,
  onChange,
  colorFn,
}: {
  options: T[];
  value: T;
  onChange: (v: T) => void;
  colorFn?: (v: T) => string;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 4 }}>
      {options.map((opt) => {
        const active = value === opt;
        const color = colorFn ? colorFn(opt) : Colors.light.tint;
        return (
          <TouchableOpacity
            key={opt}
            onPress={() => onChange(opt)}
            style={[
              chips.chip,
              active && { backgroundColor: color, borderColor: color },
            ]}
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
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#CBD2D9",
    backgroundColor: "#fff",
    marginRight: 8,
  },
  chipText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#3C4149",
  },
});

// ─── W-Level Picker ───────────────────────────────────────────────────────────

function WLevelPicker({
  value,
  onChange,
}: {
  value: ApprovalAuthorityLevel;
  onChange: (v: ApprovalAuthorityLevel) => void;
}) {
  const rows: ApprovalAuthorityLevel[][] = [];
  for (let i = 0; i < APPROVAL_LEVELS.length; i += 6) {
    rows.push(APPROVAL_LEVELS.slice(i, i + 6));
  }
  return (
    <View style={{ marginVertical: 4 }}>
      {rows.map((row, ri) => (
        <View key={ri} style={{ flexDirection: "row", marginBottom: 6 }}>
          {row.map((level) => {
            const active = value === level;
            return (
              <TouchableOpacity
                key={level}
                onPress={() => onChange(level)}
                style={[
                  wl.cell,
                  active && { backgroundColor: "#0078CF", borderColor: "#0078CF" },
                ]}
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
    width: 44,
    height: 32,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#CBD2D9",
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 6,
  },
  cellText: { fontSize: 11, fontWeight: "600", color: "#3C4149" },
  hint: { fontSize: 10, color: "#72777D", marginTop: 2 },
});

// ─── Form Modal ───────────────────────────────────────────────────────────────

type ConditionDraft = {
  conditionType: string;
  description: string;
  status: ConditionStatus;
  appliesTo: ConditionAppliesTo;
  createdByPersona: string;
};

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
  | { mode: "add-condition" }
  | { mode: "edit-condition"; item: Condition }
  | { mode: "add-exception" }
  | { mode: "edit-exception"; item: Exception };

function ConditionForm({
  draft,
  onChange,
}: {
  draft: ConditionDraft;
  onChange: (d: ConditionDraft) => void;
}) {
  return (
    <ScrollView style={fm.scroll} keyboardShouldPersistTaps="handled">
      <Text style={fm.label}>Type</Text>
      <TextInput
        style={fm.input}
        value={draft.conditionType}
        onChangeText={(v) => onChange({ ...draft, conditionType: v })}
        placeholder="e.g. Financial Covenant, Insurance, Title, Legal"
        placeholderTextColor="#9EA6AD"
      />

      <Text style={fm.label}>Description</Text>
      <TextInput
        style={[fm.input, fm.multiline]}
        value={draft.description}
        onChangeText={(v) => onChange({ ...draft, description: v })}
        placeholder="Describe the condition requirement..."
        placeholderTextColor="#9EA6AD"
        multiline
        textAlignVertical="top"
      />

      <Text style={fm.label}>Status</Text>
      <ChipRow
        options={CONDITION_STATUSES}
        value={draft.status}
        onChange={(v) => onChange({ ...draft, status: v })}
        colorFn={conditionStatusColor}
      />

      <Text style={fm.label}>Applies To</Text>
      <ChipRow
        options={APPLIES_TO}
        value={draft.appliesTo}
        onChange={(v) => onChange({ ...draft, appliesTo: v })}
      />

      <Text style={fm.label}>Added By (Persona)</Text>
      <TextInput
        style={fm.input}
        value={draft.createdByPersona}
        onChangeText={(v) => onChange({ ...draft, createdByPersona: v })}
        placeholder="e.g. Credit Risk, Processing, Sales"
        placeholderTextColor="#9EA6AD"
      />
    </ScrollView>
  );
}

function ExceptionForm({
  draft,
  onChange,
}: {
  draft: ExceptionDraft;
  onChange: (d: ExceptionDraft) => void;
}) {
  return (
    <ScrollView style={fm.scroll} keyboardShouldPersistTaps="handled">
      <Text style={fm.label}>Type</Text>
      <TextInput
        style={fm.input}
        value={draft.exceptionType}
        onChangeText={(v) => onChange({ ...draft, exceptionType: v })}
        placeholder="e.g. LTV, DSCR, IO Structure, Asset Class"
        placeholderTextColor="#9EA6AD"
      />

      <Text style={fm.label}>Description</Text>
      <TextInput
        style={[fm.input, fm.multiline]}
        value={draft.description}
        onChangeText={(v) => onChange({ ...draft, description: v })}
        placeholder="Describe the policy deviation and business justification..."
        placeholderTextColor="#9EA6AD"
        multiline
        textAlignVertical="top"
      />

      <Text style={fm.label}>Status</Text>
      <ChipRow
        options={EXCEPTION_STATUSES}
        value={draft.status}
        onChange={(v) => onChange({ ...draft, status: v })}
        colorFn={exceptionStatusColor}
      />

      <Text style={fm.label}>Approval Authority Level Required</Text>
      <WLevelPicker
        value={draft.approvalAuthorityLevel}
        onChange={(v) => onChange({ ...draft, approvalAuthorityLevel: v })}
      />

      <Text style={fm.label}>Raised By (Persona)</Text>
      <TextInput
        style={fm.input}
        value={draft.createdByPersona}
        onChangeText={(v) => onChange({ ...draft, createdByPersona: v })}
        placeholder="e.g. Credit Risk"
        placeholderTextColor="#9EA6AD"
      />

      {draft.status === "Approved" && (
        <>
          <Text style={fm.label}>Approved By</Text>
          <TextInput
            style={fm.input}
            value={draft.approvedBy}
            onChangeText={(v) => onChange({ ...draft, approvedBy: v })}
            placeholder="Name and title of approving authority"
            placeholderTextColor="#9EA6AD"
          />
          <Text style={fm.label}>Approval Date</Text>
          <TextInput
            style={fm.input}
            value={draft.approvedAt}
            onChangeText={(v) => onChange({ ...draft, approvedAt: v })}
            placeholder="MM/DD/YYYY"
            placeholderTextColor="#9EA6AD"
          />
        </>
      )}
    </ScrollView>
  );
}

const fm = StyleSheet.create({
  scroll: { flex: 1, paddingHorizontal: 20 },
  label: {
    fontSize: 11,
    fontWeight: "600",
    color: "#5F646A",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginTop: 16,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: "#CBD2D9",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 10 : 8,
    fontSize: 14,
    color: "#1A1E23",
    backgroundColor: "#fff",
  },
  multiline: { minHeight: 80, paddingTop: 10 },
});

// ─── Item Cards ───────────────────────────────────────────────────────────────

function ConditionCard({
  item,
  onEdit,
  onDelete,
}: {
  item: Condition;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const statusColor = conditionStatusColor(item.status);
  return (
    <TouchableOpacity style={ic.card} onPress={onEdit} activeOpacity={0.75}>
      <View style={ic.topRow}>
        <View style={[ic.typePill, { backgroundColor: "#EAF6FF" }]}>
          <Text style={[ic.typeText, { color: "#0078CF" }]}>{item.conditionType || "Condition"}</Text>
        </View>
        <View style={[ic.statusPill, { backgroundColor: statusColor + "20", borderColor: statusColor + "40" }]}>
          <Text style={[ic.statusText, { color: statusColor }]}>{item.status}</Text>
        </View>
      </View>
      <Text style={ic.desc} numberOfLines={3}>{item.description}</Text>
      <View style={ic.metaRow}>
        <View style={ic.metaItem}>
          <Feather name="link" size={11} color="#72777D" />
          <Text style={ic.metaText}>{item.appliesTo}</Text>
        </View>
        <View style={ic.metaItem}>
          <Feather name="user" size={11} color="#72777D" />
          <Text style={ic.metaText}>{item.createdByPersona || "Unknown"}</Text>
        </View>
        <View style={ic.metaItem}>
          <Feather name="git-branch" size={11} color="#72777D" />
          <Text style={ic.metaText}>{item.phaseAddedAt}</Text>
        </View>
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

function ExceptionCard({
  item,
  onEdit,
  onDelete,
}: {
  item: Exception;
  onEdit: () => void;
  onDelete: () => void;
}) {
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
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E6E9EB",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  topRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  typePill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  typeText: { fontSize: 11, fontWeight: "700" },
  statusPill: {
    marginLeft: "auto",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
  },
  statusText: { fontSize: 11, fontWeight: "600" },
  desc: { fontSize: 13, color: "#3C4149", lineHeight: 19, marginBottom: 10 },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 10 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 11, color: "#72777D" },
  wLevelBadge: {
    backgroundColor: "#0078CF",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  wLevelText: { fontSize: 11, fontWeight: "700", color: "#fff" },
  actions: { flexDirection: "row", gap: 12, paddingTop: 8, borderTopWidth: 1, borderTopColor: "#F0F2F4" },
  editBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  editText: { fontSize: 12, color: "#0078CF", fontWeight: "500" },
  deleteBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  deleteText: { fontSize: 12, color: "#B91C1C", fontWeight: "500" },
});

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function ConditionsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    getApplication,
    getConditionsForApplication,
    getExceptionsForApplication,
    addCondition,
    updateCondition,
    deleteCondition,
    addException,
    updateException,
    deleteException,
  } = useApplications();
  const insets = useSafeAreaInsets();

  const app = getApplication(id);
  const conditions = getConditionsForApplication(id);
  const exceptions = getExceptionsForApplication(id);

  const [modal, setModal] = useState<ModalState>({ mode: "none" });
  const [saving, setSaving] = useState(false);

  const defaultConditionDraft = (): ConditionDraft => ({
    conditionType: "",
    description: "",
    status: "Pending",
    appliesTo: "Application",
    createdByPersona: "",
  });

  const defaultExceptionDraft = (): ExceptionDraft => ({
    exceptionType: "",
    description: "",
    status: "Pending Approval",
    approvalAuthorityLevel: "W5",
    createdByPersona: "",
    approvedBy: "",
    approvedAt: "",
  });

  const [conditionDraft, setConditionDraft] = useState<ConditionDraft>(defaultConditionDraft);
  const [exceptionDraft, setExceptionDraft] = useState<ExceptionDraft>(defaultExceptionDraft);

  function openAddCondition() {
    setConditionDraft(defaultConditionDraft());
    setModal({ mode: "add-condition" });
  }

  function openEditCondition(item: Condition) {
    setConditionDraft({
      conditionType: item.conditionType,
      description: item.description,
      status: item.status,
      appliesTo: item.appliesTo,
      createdByPersona: item.createdByPersona,
    });
    setModal({ mode: "edit-condition", item });
  }

  function openAddException() {
    setExceptionDraft(defaultExceptionDraft());
    setModal({ mode: "add-exception" });
  }

  function openEditException(item: Exception) {
    setExceptionDraft({
      exceptionType: item.exceptionType,
      description: item.description,
      status: item.status,
      approvalAuthorityLevel: item.approvalAuthorityLevel,
      createdByPersona: item.createdByPersona,
      approvedBy: item.approvedBy,
      approvedAt: item.approvedAt,
    });
    setModal({ mode: "edit-exception", item });
  }

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    try {
      if (modal.mode === "add-condition") {
        if (!conditionDraft.description.trim()) {
          Alert.alert("Required", "Please enter a condition description.");
          return;
        }
        await addCondition({
          applicationId: id,
          phaseAddedAt: app?.status ?? "Inquiry",
          ...conditionDraft,
        });
      } else if (modal.mode === "edit-condition") {
        await updateCondition(modal.item.id, conditionDraft);
      } else if (modal.mode === "add-exception") {
        if (!exceptionDraft.description.trim()) {
          Alert.alert("Required", "Please enter an exception description.");
          return;
        }
        await addException({
          applicationId: id,
          phaseAddedAt: app?.status ?? "Inquiry",
          ...exceptionDraft,
        });
      } else if (modal.mode === "edit-exception") {
        await updateException(modal.item.id, exceptionDraft);
      }
      setModal({ mode: "none" });
    } finally {
      setSaving(false);
    }
  }

  function handleDeleteCondition(item: Condition) {
    Alert.alert(
      "Delete Condition",
      "Remove this condition permanently?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteCondition(item.id),
        },
      ]
    );
  }

  function handleDeleteException(item: Exception) {
    Alert.alert(
      "Delete Exception",
      "Remove this exception permanently?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteException(item.id),
        },
      ]
    );
  }

  const isConditionMode =
    modal.mode === "add-condition" || modal.mode === "edit-condition";
  const isExceptionMode =
    modal.mode === "add-exception" || modal.mode === "edit-exception";
  const isEditing =
    modal.mode === "edit-condition" || modal.mode === "edit-exception";

  const modalTitle = isConditionMode
    ? isEditing
      ? "Edit Condition"
      : "Add Condition"
    : isEditing
    ? "Edit Exception"
    : "Add Exception";

  const pendingConditions = conditions.filter((c) => c.status === "Pending").length;
  const pendingExceptions = exceptions.filter((e) => e.status === "Pending Approval").length;

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Feather name="arrow-left" size={20} color="#fff" />
        </TouchableOpacity>
        <View style={s.headerText}>
          <Text style={s.headerTitle}>Conditions & Exceptions</Text>
          <Text style={s.headerSub}>
            {conditions.length} condition{conditions.length !== 1 ? "s" : ""} · {exceptions.length} exception{exceptions.length !== 1 ? "s" : ""}
          </Text>
        </View>
      </View>

      {/* Summary bar */}
      {(pendingConditions > 0 || pendingExceptions > 0) && (
        <View style={s.summaryBar}>
          {pendingConditions > 0 && (
            <View style={s.summaryChip}>
              <Feather name="alert-circle" size={12} color="#C75300" />
              <Text style={s.summaryText}>{pendingConditions} condition{pendingConditions !== 1 ? "s" : ""} pending</Text>
            </View>
          )}
          {pendingExceptions > 0 && (
            <View style={[s.summaryChip, { backgroundColor: "#FFECDC", borderColor: "#F5CBA7" }]}>
              <Feather name="shield-off" size={12} color="#C75300" />
              <Text style={s.summaryText}>{pendingExceptions} exception{pendingExceptions !== 1 ? "s" : ""} awaiting approval</Text>
            </View>
          )}
        </View>
      )}

      <ScrollView style={s.scroll} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {/* Conditions section */}
        <View style={s.sectionHeader}>
          <View style={s.sectionTitle}>
            <Feather name="check-square" size={15} color="#0078CF" />
            <Text style={s.sectionTitleText}>Conditions</Text>
            {conditions.length > 0 && (
              <View style={s.countBadge}>
                <Text style={s.countBadgeText}>{conditions.length}</Text>
              </View>
            )}
          </View>
          <TouchableOpacity style={s.addBtn} onPress={openAddCondition}>
            <Feather name="plus" size={14} color="#0078CF" />
            <Text style={s.addBtnText}>Add</Text>
          </TouchableOpacity>
        </View>
        <Text style={s.sectionDesc}>
          Requirements that must be satisfied before the loan can advance. Any persona can add conditions at any phase.
        </Text>

        {conditions.length === 0 ? (
          <View style={s.emptyState}>
            <Feather name="check-square" size={28} color="#CBD2D9" />
            <Text style={s.emptyText}>No conditions yet</Text>
            <Text style={s.emptySubText}>Tap "Add" to record the first condition for this loan.</Text>
          </View>
        ) : (
          conditions.map((item) => (
            <ConditionCard
              key={item.id}
              item={item}
              onEdit={() => openEditCondition(item)}
              onDelete={() => handleDeleteCondition(item)}
            />
          ))
        )}

        {/* Exceptions section */}
        <View style={[s.sectionHeader, { marginTop: 28 }]}>
          <View style={s.sectionTitle}>
            <Feather name="shield-off" size={15} color="#C75300" />
            <Text style={[s.sectionTitleText, { color: "#C75300" }]}>Exceptions</Text>
            {exceptions.length > 0 && (
              <View style={[s.countBadge, { backgroundColor: "#C75300" }]}>
                <Text style={s.countBadgeText}>{exceptions.length}</Text>
              </View>
            )}
          </View>
          <TouchableOpacity style={[s.addBtn, { borderColor: "#C75300" }]} onPress={openAddException}>
            <Feather name="plus" size={14} color="#C75300" />
            <Text style={[s.addBtnText, { color: "#C75300" }]}>Add</Text>
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
            <ExceptionCard
              key={item.id}
              item={item}
              onEdit={() => openEditException(item)}
              onDelete={() => handleDeleteException(item)}
            />
          ))
        )}
      </ScrollView>

      {/* Add / Edit Modal */}
      <Modal
        visible={modal.mode !== "none"}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModal({ mode: "none" })}
      >
        <View style={[mod.container, { paddingTop: insets.top }]}>
          <View style={mod.modalHeader}>
            <TouchableOpacity onPress={() => setModal({ mode: "none" })} style={mod.cancelBtn}>
              <Text style={mod.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={mod.modalTitle}>{modalTitle}</Text>
            <TouchableOpacity onPress={handleSave} style={mod.saveBtn} disabled={saving}>
              <Text style={mod.saveText}>{saving ? "Saving…" : "Save"}</Text>
            </TouchableOpacity>
          </View>

          {isConditionMode && (
            <ConditionForm draft={conditionDraft} onChange={setConditionDraft} />
          )}
          {isExceptionMode && (
            <ExceptionForm draft={exceptionDraft} onChange={setExceptionDraft} />
          )}
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#E6E9EB" },
  header: {
    backgroundColor: Colors.light.darkSurface,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  backBtn: { padding: 4 },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#fff" },
  headerSub: { fontSize: 12, color: "rgba(255,255,255,0.65)", marginTop: 2 },
  summaryBar: {
    backgroundColor: "#FFF7ED",
    borderBottomWidth: 1,
    borderBottomColor: "#F5CBA7",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  summaryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#FFECDC",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "#F5CBA7",
  },
  summaryText: { fontSize: 12, color: "#C75300", fontWeight: "500" },
  scroll: { flex: 1 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  sectionTitle: { flexDirection: "row", alignItems: "center", gap: 6 },
  sectionTitleText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0078CF",
  },
  countBadge: {
    backgroundColor: "#0078CF",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  countBadgeText: { fontSize: 11, fontWeight: "700", color: "#fff" },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: "#0078CF",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  addBtnText: { fontSize: 13, color: "#0078CF", fontWeight: "600" },
  sectionDesc: {
    fontSize: 12,
    color: "#72777D",
    lineHeight: 17,
    marginBottom: 14,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 32,
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E6E9EB",
    marginBottom: 10,
  },
  emptyText: { fontSize: 14, fontWeight: "600", color: "#9EA6AD", marginTop: 10 },
  emptySubText: { fontSize: 12, color: "#9EA6AD", marginTop: 4, textAlign: "center", paddingHorizontal: 24 },
});

const mod = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F7F8FA" },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E6E9EB",
  },
  cancelBtn: { paddingVertical: 4, paddingHorizontal: 4 },
  cancelText: { fontSize: 15, color: "#72777D" },
  modalTitle: { fontSize: 16, fontWeight: "700", color: "#1A1E23" },
  saveBtn: { paddingVertical: 4, paddingHorizontal: 4 },
  saveText: { fontSize: 15, color: Colors.light.tint, fontWeight: "600" },
});
