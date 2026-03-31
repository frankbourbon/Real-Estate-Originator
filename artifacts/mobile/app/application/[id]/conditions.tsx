import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
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
import { confirmDestructive, showAlert } from "@/utils/confirm";
import type {
  AppliesToRef,
  Condition,
  ConditionStatus,
} from "@/services/conditions";
import {
  CONDITION_CATEGORIES,
  SATISFY_BY_PHASES,
  useConditionsService,
} from "@/services/conditions";
import { useCoreService } from "@/services/core";
import { AccessDenied } from "@/components/AccessDenied";
import { usePermission } from "@/hooks/usePermission";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function conditionStatusColor(s: ConditionStatus): string {
  if (s === "Satisfied") return "#00875D";
  if (s === "Waived") return "#72777D";
  return "#C75300"; // Open
}

type AppliesToOption = { kind: "borrower" | "property"; id: string; label: string };

// ─── Single-select chip row ────────────────────────────────────────────────────

function ChipRow<T extends string>({
  options,
  value,
  onChange,
  colorFn,
}: {
  options: readonly T[] | T[];
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
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 16, borderWidth: 1,
    borderColor: "#CBD2D9", backgroundColor: "#fff",
    marginRight: 8,
  },
  chipText: { fontSize: 12, fontWeight: "500", color: "#3C4149" },
});

// ─── Multi-select applies-to ──────────────────────────────────────────────────

function AppliesToMultiSelect({
  options,
  value,
  onChange,
}: {
  options: AppliesToOption[];
  value: AppliesToRef[];
  onChange: (v: AppliesToRef[]) => void;
}) {
  const isSelected = (opt: AppliesToOption) =>
    value.some((r) => r.kind === opt.kind && r.id === opt.id);

  const toggle = (opt: AppliesToOption) => {
    if (isSelected(opt)) {
      onChange(value.filter((r) => !(r.kind === opt.kind && r.id === opt.id)));
    } else {
      onChange([...value, { kind: opt.kind, id: opt.id }]);
    }
  };

  if (options.length === 0) {
    return <Text style={ms.empty}>No borrower or property linked to this application.</Text>;
  }

  return (
    <View style={ms.list}>
      {options.map((opt) => {
        const sel = isSelected(opt);
        const color = opt.kind === "borrower" ? Colors.light.tint : Colors.light.success;
        const icon: React.ComponentProps<typeof Feather>["name"] =
          opt.kind === "borrower" ? "user" : "home";
        return (
          <TouchableOpacity
            key={`${opt.kind}:${opt.id}`}
            style={[ms.row, sel && { borderColor: color, backgroundColor: color + "10" }]}
            onPress={() => toggle(opt)}
            activeOpacity={0.7}
          >
            <View style={[ms.iconBox, { backgroundColor: color + "20" }]}>
              <Feather name={icon} size={12} color={color} />
            </View>
            <View style={ms.meta}>
              <Text style={ms.kind}>{opt.kind === "borrower" ? "BORROWER" : "PROPERTY"}</Text>
              <Text style={ms.label} numberOfLines={1}>{opt.label}</Text>
            </View>
            <View style={[ms.checkbox, sel && { backgroundColor: color, borderColor: color }]}>
              {sel && <Feather name="check" size={10} color="#fff" />}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const ms = StyleSheet.create({
  list: { gap: 8 },
  empty: { fontSize: 12, color: "#9EA6AD", fontStyle: "italic", marginVertical: 4 },
  row: {
    flexDirection: "row", alignItems: "center", gap: 10,
    borderWidth: 1, borderColor: "#CBD2D9", borderRadius: 6,
    padding: 10, backgroundColor: "#fff",
  },
  iconBox: { width: 28, height: 28, borderRadius: 4, alignItems: "center", justifyContent: "center" },
  meta: { flex: 1 },
  kind: { fontSize: 9, fontWeight: "700", color: "#9EA6AD", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 1 },
  label: { fontSize: 12, fontWeight: "600", color: "#1A1E23" },
  checkbox: { width: 18, height: 18, borderRadius: 3, borderWidth: 1.5, borderColor: "#CBD2D9", alignItems: "center", justifyContent: "center" },
});

// ─── Form ─────────────────────────────────────────────────────────────────────

const CONDITION_STATUSES: ConditionStatus[] = ["Open", "Satisfied", "Waived"];

type ConditionDraft = {
  category: string;
  description: string;
  status: ConditionStatus;
  appliesTo: AppliesToRef[];
  satisfyBy: string;
  createdByPersona: string;
};

function ConditionForm({
  draft,
  onChange,
  appliesToOptions,
}: {
  draft: ConditionDraft;
  onChange: (d: ConditionDraft) => void;
  appliesToOptions: AppliesToOption[];
}) {
  return (
    <ScrollView style={fm.scroll} keyboardShouldPersistTaps="handled">

      <Text style={fm.label}>Category</Text>
      <ChipRow
        options={CONDITION_CATEGORIES}
        value={draft.category as any}
        onChange={(v) => onChange({ ...draft, category: v })}
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
      <AppliesToMultiSelect
        options={appliesToOptions}
        value={draft.appliesTo}
        onChange={(v) => onChange({ ...draft, appliesTo: v })}
      />

      <Text style={fm.label}>Satisfy By</Text>
      <ChipRow
        options={["", ...SATISFY_BY_PHASES] as any[]}
        value={(draft.satisfyBy || "") as any}
        onChange={(v) => onChange({ ...draft, satisfyBy: v })}
      />

      <Text style={fm.label}>Added By (Persona)</Text>
      <TextInput
        style={fm.input}
        value={draft.createdByPersona}
        onChangeText={(v) => onChange({ ...draft, createdByPersona: v })}
        placeholder="e.g. Credit Risk, Processing, Sales"
        placeholderTextColor="#9EA6AD"
      />

      <View style={{ height: 24 }} />
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

// ─── Condition Card ───────────────────────────────────────────────────────────

function ConditionCard({
  item,
  appliesToOptions,
  onEdit,
  onDelete,
}: {
  item: Condition;
  appliesToOptions: AppliesToOption[];
  onEdit: () => void;
  onDelete: () => void;
}) {
  const statusColor = conditionStatusColor(item.status);

  const appliesToLabels = (item.appliesTo ?? [])
    .map((ref) => appliesToOptions.find((o) => o.kind === ref.kind && o.id === ref.id))
    .filter(Boolean) as AppliesToOption[];

  return (
    <TouchableOpacity style={ic.card} onPress={onEdit} activeOpacity={0.75}>
      {/* Top row: category + status */}
      <View style={ic.topRow}>
        {item.category ? (
          <View style={[ic.categoryPill, { backgroundColor: "#EAF6FF" }]}>
            <Text style={[ic.categoryText, { color: "#0078CF" }]}>{item.category}</Text>
          </View>
        ) : null}
        <View style={[ic.statusPill, { backgroundColor: statusColor + "20", borderColor: statusColor + "40" }]}>
          <Text style={[ic.statusText, { color: statusColor }]}>{item.status}</Text>
        </View>
      </View>

      {/* Description */}
      <Text style={ic.desc} numberOfLines={3}>{item.description}</Text>

      {/* Applies To tags */}
      {appliesToLabels.length > 0 && (
        <View style={ic.tagsRow}>
          {appliesToLabels.map((opt) => {
            const color = opt.kind === "borrower" ? Colors.light.tint : Colors.light.success;
            const icon: React.ComponentProps<typeof Feather>["name"] =
              opt.kind === "borrower" ? "user" : "home";
            return (
              <View key={`${opt.kind}:${opt.id}`} style={[ic.appliesToTag, { borderColor: color + "50", backgroundColor: color + "10" }]}>
                <Feather name={icon} size={9} color={color} />
                <Text style={[ic.appliesToText, { color }]} numberOfLines={1}>{opt.label}</Text>
              </View>
            );
          })}
        </View>
      )}

      {/* Meta row */}
      <View style={ic.metaRow}>
        {item.satisfyBy ? (
          <View style={ic.metaItem}>
            <Feather name="flag" size={11} color="#72777D" />
            <Text style={ic.metaText}>By {item.satisfyBy}</Text>
          </View>
        ) : null}
        <View style={ic.metaItem}>
          <Feather name="user" size={11} color="#72777D" />
          <Text style={ic.metaText}>{item.createdByPersona || "Unknown"}</Text>
        </View>
        <View style={ic.metaItem}>
          <Feather name="git-branch" size={11} color="#72777D" />
          <Text style={ic.metaText}>{item.phaseAddedAt}</Text>
        </View>
      </View>

      {/* Actions */}
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
    shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },
  topRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  categoryPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, flexShrink: 1 },
  categoryText: { fontSize: 11, fontWeight: "700" },
  statusPill: {
    marginLeft: "auto", paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 10, borderWidth: 1, flexShrink: 0,
  },
  statusText: { fontSize: 11, fontWeight: "600" },
  desc: { fontSize: 13, color: "#3C4149", lineHeight: 19, marginBottom: 8 },
  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 5, marginBottom: 8 },
  appliesToTag: {
    flexDirection: "row", alignItems: "center", gap: 3,
    borderWidth: 1, borderRadius: 3, paddingHorizontal: 5, paddingVertical: 2,
  },
  appliesToText: { fontSize: 10, fontWeight: "600" },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 10 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 11, color: "#72777D" },
  actions: { flexDirection: "row", gap: 12, paddingTop: 8, borderTopWidth: 1, borderTopColor: "#F0F2F4" },
  editBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  editText: { fontSize: 12, color: "#0078CF", fontWeight: "500" },
  deleteBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  deleteText: { fontSize: 12, color: "#B91C1C", fontWeight: "500" },
});

// ─── Modal state ──────────────────────────────────────────────────────────────

type ModalState =
  | { mode: "none" }
  | { mode: "add-condition" }
  | { mode: "edit-condition"; item: Condition };

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function ConditionsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getApplication, getBorrower, getProperty } = useCoreService();
  const {
    getConditions,
    addCondition, updateCondition, deleteCondition,
  } = useConditionsService();
  const insets = useSafeAreaInsets();
  const { canView, canEdit } = usePermission("conditions.main");

  const app = getApplication(id);
  const conditions = getConditions(id);

  // Build applies-to options from the application's linked borrower and property
  const appliesToOptions: AppliesToOption[] = [];
  const borrower = app ? getBorrower(app.borrowerId) : undefined;
  if (borrower) {
    const name = borrower.entityName?.trim()
      ? borrower.entityName
      : `${borrower.firstName} ${borrower.lastName}`.trim();
    appliesToOptions.push({ kind: "borrower", id: borrower.id, label: name });
  }
  const property = app ? getProperty(app.propertyId) : undefined;
  if (property) {
    const addr = property.streetAddress
      ? `${property.streetAddress}, ${property.city}, ${property.state}`
      : property.locations?.[0]
        ? `${property.locations[0].streetAddress}, ${property.locations[0].city}, ${property.locations[0].state}`
        : "Property";
    appliesToOptions.push({ kind: "property", id: property.id, label: addr });
  }

  const [modal, setModal] = useState<ModalState>({ mode: "none" });
  const [saving, setSaving] = useState(false);

  const defaultDraft = (): ConditionDraft => ({
    category: "",
    description: "",
    status: "Open",
    appliesTo: [],
    satisfyBy: "",
    createdByPersona: "",
  });

  const [draft, setDraft] = useState<ConditionDraft>(defaultDraft);

  function openAdd() {
    setDraft(defaultDraft());
    setModal({ mode: "add-condition" });
  }

  function openEdit(item: Condition) {
    setDraft({
      category: item.category ?? "",
      description: item.description,
      status: item.status,
      appliesTo: item.appliesTo ?? [],
      satisfyBy: item.satisfyBy ?? "",
      createdByPersona: item.createdByPersona,
    });
    setModal({ mode: "edit-condition", item });
  }

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    try {
      if (modal.mode === "add-condition") {
        if (!draft.description.trim()) {
          showAlert("Required", "Please enter a condition description.");
          return;
        }
        await addCondition(id, {
          phaseAddedAt: app?.status ?? "Inquiry",
          ...draft,
        });
      } else if (modal.mode === "edit-condition") {
        await updateCondition(modal.item.id, draft);
      }
      setModal({ mode: "none" });
    } finally {
      setSaving(false);
    }
  }

  function handleDelete(item: Condition) {
    confirmDestructive(
      "Delete Condition",
      "Remove this condition permanently?",
      "Delete",
      () => deleteCondition(item.id),
    );
  }

  if (!canView) return <AccessDenied screenLabel="Conditions" />;

  const isEditing = modal.mode === "edit-condition";
  const openCount = conditions.filter((c) => c.status === "Open").length;

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
            {openCount > 0 ? ` · ${openCount} open` : ""}
          </Text>
        </View>
      </View>

      {/* Summary bar */}
      {openCount > 0 && (
        <View style={s.summaryBar}>
          <View style={s.summaryChip}>
            <Feather name="alert-circle" size={12} color="#C75300" />
            <Text style={s.summaryText}>
              {openCount} condition{openCount !== 1 ? "s" : ""} open
            </Text>
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
          {canEdit && (
            <TouchableOpacity style={s.addBtn} onPress={openAdd}>
              <Feather name="plus" size={14} color="#0078CF" />
              <Text style={s.addBtnText}>Add</Text>
            </TouchableOpacity>
          )}
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
              appliesToOptions={appliesToOptions}
              onEdit={() => openEdit(item)}
              onDelete={() => handleDelete(item)}
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
            <Text style={mod.modalTitle}>{isEditing ? "Edit Condition" : "Add Condition"}</Text>
            <TouchableOpacity onPress={handleSave} style={mod.saveBtn} disabled={saving}>
              <Text style={mod.saveText}>{saving ? "Saving…" : "Save"}</Text>
            </TouchableOpacity>
          </View>

          <ConditionForm
            draft={draft}
            onChange={setDraft}
            appliesToOptions={appliesToOptions}
          />
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
    flexDirection: "row", flexWrap: "wrap", gap: 8,
    paddingHorizontal: 16, paddingVertical: 10,
  },
  summaryChip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "#FFECDC", borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: "#F5CBA7",
  },
  summaryText: { fontSize: 12, color: "#C75300", fontWeight: "500" },
  scroll: { flex: 1 },
  sectionHeader: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", marginBottom: 4,
  },
  sectionTitle: { flexDirection: "row", alignItems: "center", gap: 6 },
  sectionTitleText: { fontSize: 16, fontWeight: "700", color: "#0078CF" },
  countBadge: {
    backgroundColor: "#0078CF", borderRadius: 10,
    minWidth: 20, height: 20,
    alignItems: "center", justifyContent: "center", paddingHorizontal: 6,
  },
  countBadgeText: { fontSize: 11, fontWeight: "700", color: "#fff" },
  addBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    borderWidth: 1, borderColor: "#0078CF",
    borderRadius: 16, paddingHorizontal: 12, paddingVertical: 5,
  },
  addBtnText: { fontSize: 13, color: "#0078CF", fontWeight: "600" },
  sectionDesc: { fontSize: 12, color: "#72777D", lineHeight: 17, marginBottom: 14 },
  emptyState: {
    alignItems: "center", paddingVertical: 32,
    backgroundColor: "#fff", borderRadius: 10,
    borderWidth: 1, borderColor: "#E6E9EB", marginBottom: 10,
  },
  emptyText: { fontSize: 14, fontWeight: "600", color: "#9EA6AD", marginTop: 10 },
  emptySubText: {
    fontSize: 12, color: "#9EA6AD", marginTop: 4,
    textAlign: "center", paddingHorizontal: 24,
  },
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
