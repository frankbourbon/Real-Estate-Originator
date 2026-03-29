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
  Condition,
  ConditionAppliesTo,
  ConditionStatus,
} from "@/services/conditions";
import { useConditionsService } from "@/services/conditions";
import { useCoreService } from "@/services/core";

// ─── Status chips ─────────────────────────────────────────────────────────────

const CONDITION_STATUSES: ConditionStatus[] = ["Pending", "Satisfied", "Waived"];
const APPLIES_TO: ConditionAppliesTo[] = ["Application", "Borrower", "Property"];

function conditionStatusColor(s: ConditionStatus): string {
  if (s === "Satisfied") return "#00875D";
  if (s === "Waived") return "#72777D";
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

// ─── Form Modal ───────────────────────────────────────────────────────────────

type ConditionDraft = {
  conditionType: string;
  description: string;
  status: ConditionStatus;
  appliesTo: ConditionAppliesTo;
  createdByPersona: string;
};

type ModalState =
  | { mode: "none" }
  | { mode: "add-condition" }
  | { mode: "edit-condition"; item: Condition };

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
  actions: { flexDirection: "row", gap: 12, paddingTop: 8, borderTopWidth: 1, borderTopColor: "#F0F2F4" },
  editBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  editText: { fontSize: 12, color: "#0078CF", fontWeight: "500" },
  deleteBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  deleteText: { fontSize: 12, color: "#B91C1C", fontWeight: "500" },
});

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function ConditionsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getApplication } = useCoreService();
  const {
    getConditions,
    addCondition, updateCondition, deleteCondition,
  } = useConditionsService();
  const insets = useSafeAreaInsets();

  const app = getApplication(id);
  const conditions = getConditions(id);

  const [modal, setModal] = useState<ModalState>({ mode: "none" });
  const [saving, setSaving] = useState(false);

  const defaultConditionDraft = (): ConditionDraft => ({
    conditionType: "",
    description: "",
    status: "Pending",
    appliesTo: "Application",
    createdByPersona: "",
  });

  const [conditionDraft, setConditionDraft] = useState<ConditionDraft>(defaultConditionDraft);

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

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    try {
      if (modal.mode === "add-condition") {
        if (!conditionDraft.description.trim()) {
          Alert.alert("Required", "Please enter a condition description.");
          return;
        }
        await addCondition(id, {
          phaseAddedAt: app?.status ?? "Inquiry",
          ...conditionDraft,
        });
      } else if (modal.mode === "edit-condition") {
        await updateCondition(modal.item.id, conditionDraft);
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

  const isEditing = modal.mode === "edit-condition";
  const modalTitle = isEditing ? "Edit Condition" : "Add Condition";
  const pendingConditions = conditions.filter((c) => c.status === "Pending").length;

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Feather name="arrow-left" size={20} color="#fff" />
        </TouchableOpacity>
        <View style={s.headerText}>
          <Text style={s.headerTitle}>Conditions</Text>
          <Text style={s.headerSub}>
            {conditions.length} condition{conditions.length !== 1 ? "s" : ""}
            {pendingConditions > 0 ? ` · ${pendingConditions} pending` : ""}
          </Text>
        </View>
      </View>

      {/* Summary bar */}
      {pendingConditions > 0 && (
        <View style={s.summaryBar}>
          <View style={s.summaryChip}>
            <Feather name="alert-circle" size={12} color="#C75300" />
            <Text style={s.summaryText}>{pendingConditions} condition{pendingConditions !== 1 ? "s" : ""} pending satisfaction</Text>
          </View>
        </View>
      )}

      <ScrollView style={s.scroll} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
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

          <ConditionForm draft={conditionDraft} onChange={setConditionDraft} />
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#E6E9EB" },
  header: {
    backgroundColor: Colors.light.surface,
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
