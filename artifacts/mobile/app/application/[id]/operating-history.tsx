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

import Colors from "@/constants/colors";
import type { OperatingPeriodType, OperatingYear } from "@/services/inquiry";
import { useInquiryService } from "@/services/inquiry";
import { useCoreService } from "@/services/core";
import {
  computeEconomicOccupancy,
  fmtPct,
  fmtCur,
} from "@/utils/occupancy";

// ─── Constants ────────────────────────────────────────────────────────────────

const PERIOD_TYPES: OperatingPeriodType[] = [
  "Actual Year 1",
  "Actual Year 2",
  "T12 (Trailing 12)",
  "Current Year Budget",
  "Lender Underwriting",
];

const MAX_PERIODS = 5;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseFmt(v: string): number {
  return parseFloat(v.replace(/,/g, "")) || 0;
}

function fmt(v: string | number): string {
  const n = typeof v === "string" ? parseFmt(v) : v;
  if (!n) return "—";
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function calcNOI(d: YearDraft): string {
  const egi = parseFmt(d.effectiveGrossIncome);
  const exp = parseFmt(d.totalOperatingExpenses);
  if (!egi) return "";
  return (egi - exp).toLocaleString("en-US", { maximumFractionDigits: 0 });
}

// ─── Types ────────────────────────────────────────────────────────────────────

type YearDraft = Omit<OperatingYear, "id" | "applicationId" | "createdAt" | "updatedAt">;

function emptyDraft(): YearDraft {
  return {
    periodType: "T12 (Trailing 12)", periodYear: "",
    grossPotentialRent: "", vacancyAndCreditLoss: "", otherIncome: "", effectiveGrossIncome: "",
    realEstateTaxes: "", insurance: "", utilities: "", repairsAndMaintenance: "",
    managementFee: "", administrative: "", replacementReserves: "", otherExpenses: "",
    totalOperatingExpenses: "", netOperatingIncome: "",
  };
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function ChipRow<T extends string>({
  options, value, onChange,
}: {
  options: T[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 4 }}>
      {options.map((opt) => {
        const active = value === opt;
        return (
          <TouchableOpacity
            key={opt}
            onPress={() => onChange(opt)}
            style={[chip.chip, active && chip.chipActive]}
          >
            <Text style={[chip.chipText, active && chip.chipTextActive]}>{opt}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const chip = StyleSheet.create({
  chip: {
    borderWidth: 1, borderColor: Colors.light.border, borderRadius: 16,
    paddingHorizontal: 10, paddingVertical: 4, marginRight: 6, backgroundColor: "#fff",
  },
  chipActive: { backgroundColor: Colors.light.tint, borderColor: Colors.light.tint },
  chipText: { fontSize: 12, fontFamily: "OpenSans_600SemiBold", color: Colors.light.text },
  chipTextActive: { color: "#fff" },
});

function LabeledInput({
  label, value, onChange, placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <View style={li.wrap}>
      <Text style={li.label}>{label}</Text>
      <TextInput
        style={li.input}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder ?? "0"}
        placeholderTextColor={Colors.light.textTertiary}
        keyboardType="decimal-pad"
      />
    </View>
  );
}

const li = StyleSheet.create({
  wrap: { flex: 1, minWidth: "45%" },
  label: {
    fontSize: 10, fontFamily: "OpenSans_600SemiBold", color: Colors.light.textTertiary,
    textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 3,
  },
  input: {
    borderWidth: 1, borderColor: Colors.light.border, borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 8,
    fontSize: 13, fontFamily: "OpenSans_400Regular", color: Colors.light.text,
    backgroundColor: "#fff",
  },
});

// ─── Operating year form ──────────────────────────────────────────────────────

function YearForm({ draft, onChange }: { draft: YearDraft; onChange: (d: YearDraft) => void }) {
  const set = (k: keyof YearDraft) => (v: string) => onChange({ ...draft, [k]: v });

  return (
    <>
      <View style={{ marginBottom: 12 }}>
        <Text style={ff.sectionLabel}>Period Type</Text>
        <ChipRow options={PERIOD_TYPES} value={draft.periodType} onChange={(v) => onChange({ ...draft, periodType: v })} />
      </View>

      <View style={{ marginBottom: 12 }}>
        <Text style={ff.sectionLabel}>Calendar Year</Text>
        <TextInput
          style={[li.input, { width: 120 }]}
          value={draft.periodYear}
          onChangeText={set("periodYear")}
          placeholder="e.g. 2024"
          placeholderTextColor={Colors.light.textTertiary}
          keyboardType="numeric"
          maxLength={4}
        />
      </View>

      <Text style={ff.sectionHeader}>Income</Text>
      <View style={ff.row}>
        <LabeledInput label="Gross Potential Rent" value={draft.grossPotentialRent} onChange={set("grossPotentialRent")} />
        <LabeledInput label="Vacancy & Credit Loss" value={draft.vacancyAndCreditLoss} onChange={set("vacancyAndCreditLoss")} />
      </View>
      <View style={ff.row}>
        <LabeledInput label="Other Income" value={draft.otherIncome} onChange={set("otherIncome")} />
        <LabeledInput label="Effective Gross Income" value={draft.effectiveGrossIncome} onChange={set("effectiveGrossIncome")} />
      </View>

      <Text style={ff.sectionHeader}>Expenses</Text>
      <View style={ff.row}>
        <LabeledInput label="RE Taxes" value={draft.realEstateTaxes} onChange={set("realEstateTaxes")} />
        <LabeledInput label="Insurance" value={draft.insurance} onChange={set("insurance")} />
      </View>
      <View style={ff.row}>
        <LabeledInput label="Utilities" value={draft.utilities} onChange={set("utilities")} />
        <LabeledInput label="Repairs & Maintenance" value={draft.repairsAndMaintenance} onChange={set("repairsAndMaintenance")} />
      </View>
      <View style={ff.row}>
        <LabeledInput label="Management Fee" value={draft.managementFee} onChange={set("managementFee")} />
        <LabeledInput label="Administrative" value={draft.administrative} onChange={set("administrative")} />
      </View>
      <View style={ff.row}>
        <LabeledInput label="Replacement Reserves" value={draft.replacementReserves} onChange={set("replacementReserves")} />
        <LabeledInput label="Other Expenses" value={draft.otherExpenses} onChange={set("otherExpenses")} />
      </View>
      <View style={ff.row}>
        <LabeledInput label="Total Operating Expenses" value={draft.totalOperatingExpenses} onChange={set("totalOperatingExpenses")} />
      </View>

      <View style={ff.noiCalc}>
        <Text style={ff.noiLabel}>Calculated NOI</Text>
        <Text style={ff.noiValue}>${calcNOI(draft) || "—"}</Text>
      </View>
    </>
  );
}

const ff = StyleSheet.create({
  sectionLabel: { fontSize: 11, fontFamily: "OpenSans_600SemiBold", color: Colors.light.textTertiary, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.4 },
  sectionHeader: {
    fontSize: 12, fontFamily: "OpenSans_700Bold", color: Colors.light.text,
    marginTop: 14, marginBottom: 8,
    borderBottomWidth: 1, borderBottomColor: Colors.light.border, paddingBottom: 4,
  },
  row: { flexDirection: "row", gap: 10, marginBottom: 10 },
  noiCalc: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    backgroundColor: Colors.light.tintLight, borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 10, marginTop: 6,
  },
  noiLabel: { fontSize: 12, fontFamily: "OpenSans_700Bold", color: Colors.light.tint },
  noiValue: { fontSize: 20, fontFamily: "OpenSans_700Bold", color: Colors.light.tint },
});

// ─── Add / Edit modal ─────────────────────────────────────────────────────────

function YearModal({
  visible, draft, onChange, onClose, onSave, title,
}: {
  visible: boolean;
  draft: YearDraft;
  onChange: (d: YearDraft) => void;
  onClose: () => void;
  onSave: () => void;
  title: string;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={mo.overlay} onPress={onClose}>
        <Pressable style={mo.sheet} onPress={() => {}}>
          <View style={mo.header}>
            <Text style={mo.title}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Feather name="x" size={20} color={Colors.light.text} />
            </TouchableOpacity>
          </View>
          <ScrollView style={mo.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <YearForm draft={draft} onChange={onChange} />
            <View style={{ height: 20 }} />
          </ScrollView>
          <View style={mo.footer}>
            <TouchableOpacity style={mo.cancel} onPress={onClose}>
              <Text style={mo.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={mo.save} onPress={onSave}>
              <Text style={mo.saveText}>Save Period</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const mo = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: { backgroundColor: "#fff", borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: "92%" },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.light.border,
  },
  title: { fontSize: 16, fontFamily: "OpenSans_700Bold", color: Colors.light.text },
  scroll: { paddingHorizontal: 16, paddingTop: 12 },
  footer: { flexDirection: "row", gap: 10, padding: 16, borderTopWidth: 1, borderTopColor: Colors.light.border },
  cancel: { flex: 1, paddingVertical: 11, borderRadius: 6, borderWidth: 1, borderColor: Colors.light.border, alignItems: "center" },
  cancelText: { fontSize: 14, fontFamily: "OpenSans_600SemiBold", color: Colors.light.text },
  save: { flex: 1, paddingVertical: 11, borderRadius: 6, backgroundColor: Colors.light.tint, alignItems: "center" },
  saveText: { fontSize: 14, fontFamily: "OpenSans_600SemiBold", color: "#fff" },
});

// ─── Period card ──────────────────────────────────────────────────────────────

function PeriodCard({
  year, onEdit, onDelete,
}: {
  year: OperatingYear;
  onEdit: () => void;
  onDelete: () => void;
}) {
  function row(label: string, val: string, bold?: boolean) {
    return (
      <View key={label} style={pc.row}>
        <Text style={[pc.rowLabel, bold && { fontFamily: "OpenSans_700Bold" }]}>{label}</Text>
        <Text style={[pc.rowVal, bold && { fontFamily: "OpenSans_700Bold", color: Colors.light.text }]}>
          {val ? `$${fmt(val)}` : "—"}
        </Text>
      </View>
    );
  }

  const noi = parseFmt(year.netOperatingIncome);
  const noiPositive = noi >= 0;

  return (
    <View style={pc.card}>
      <View style={pc.header}>
        <View>
          <Text style={pc.periodType}>{year.periodType}</Text>
          <Text style={pc.periodYear}>{year.periodYear}</Text>
        </View>
        <View style={pc.actions}>
          <TouchableOpacity onPress={onEdit} hitSlop={8}>
            <Feather name="edit-2" size={14} color={Colors.light.tint} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onDelete} hitSlop={8}>
            <Feather name="trash-2" size={14} color="#B91C1C" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={pc.section}>
        <Text style={pc.sectionTitle}>Income</Text>
        {row("Gross Potential Rent", year.grossPotentialRent)}
        {row("Vacancy & Credit Loss", year.vacancyAndCreditLoss)}
        {row("Other Income", year.otherIncome)}
        {row("Effective Gross Income (EGI)", year.effectiveGrossIncome, true)}
      </View>

      <View style={pc.section}>
        <Text style={pc.sectionTitle}>Expenses</Text>
        {row("RE Taxes", year.realEstateTaxes)}
        {row("Insurance", year.insurance)}
        {row("Utilities", year.utilities)}
        {row("Repairs & Maintenance", year.repairsAndMaintenance)}
        {row("Management Fee", year.managementFee)}
        {row("Administrative", year.administrative)}
        {row("Replacement Reserves", year.replacementReserves)}
        {row("Other Expenses", year.otherExpenses)}
        {row("Total Operating Expenses", year.totalOperatingExpenses, true)}
      </View>

      <View style={[pc.noiRow, { backgroundColor: noiPositive ? "#D0F0E5" : "#FDDDD7" }]}>
        <Text style={[pc.noiLabel, { color: noiPositive ? "#00875D" : "#B91C1C" }]}>
          Net Operating Income
        </Text>
        <Text style={[pc.noiValue, { color: noiPositive ? "#00875D" : "#B91C1C" }]}>
          ${fmt(year.netOperatingIncome)}
        </Text>
      </View>
    </View>
  );
}

const pc = StyleSheet.create({
  card: {
    backgroundColor: Colors.light.card, borderRadius: 10, marginBottom: 12,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2, elevation: 1,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start",
    padding: 12, borderBottomWidth: 1, borderBottomColor: Colors.light.border,
  },
  periodType: { fontSize: 13, fontFamily: "OpenSans_700Bold", color: Colors.light.text },
  periodYear: { fontSize: 12, fontFamily: "OpenSans_400Regular", color: Colors.light.textTertiary, marginTop: 2 },
  actions: { flexDirection: "row", gap: 12 },
  section: { padding: 12, borderBottomWidth: 1, borderBottomColor: Colors.light.border },
  sectionTitle: {
    fontSize: 11, fontFamily: "OpenSans_700Bold", color: Colors.light.textTertiary,
    textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6,
  },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  rowLabel: { fontSize: 12, fontFamily: "OpenSans_400Regular", color: Colors.light.text, flex: 1 },
  rowVal: { fontSize: 12, fontFamily: "OpenSans_600SemiBold", color: Colors.light.textTertiary },
  noiRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 12 },
  noiLabel: { fontSize: 13, fontFamily: "OpenSans_700Bold" },
  noiValue: { fontSize: 18, fontFamily: "OpenSans_700Bold" },
});

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function OperatingHistoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getApplication, getProperty } = useCoreService();
  const { getOpHistory, addYear, updateYear, deleteYear } = useInquiryService();
  const insets = useSafeAreaInsets();

  const [addModal, setAddModal] = useState(false);
  const [addDraft, setAddDraft] = useState<YearDraft>(emptyDraft());

  const [editYear, setEditYear] = useState<OperatingYear | null>(null);
  const [editDraft, setEditDraft] = useState<YearDraft>(emptyDraft());

  const app = getApplication(id);
  const property = getProperty(app?.propertyId ?? "");
  const history = getOpHistory(id);

  if (!app) {
    return (
      <View style={s.center}>
        <Text style={s.notFound}>Application not found</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={s.backLink}>← Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;
  const canAdd = history.length < MAX_PERIODS;

  const handleAdd = async () => {
    const noi = calcNOI(addDraft);
    await addYear(id, {
      ...addDraft,
      netOperatingIncome: noi || addDraft.netOperatingIncome,
    });
    setAddModal(false);
    setAddDraft(emptyDraft());
  };

  const handleEditOpen = (year: OperatingYear) => {
    const { id: _id, applicationId: _aid, createdAt: _ca, updatedAt: _ua, ...rest } = year;
    setEditDraft(rest);
    setEditYear(year);
  };

  const handleEditSave = async () => {
    if (!editYear) return;
    const noi = calcNOI(editDraft);
    await updateYear(editYear.id, {
      ...editDraft,
      netOperatingIncome: noi || editDraft.netOperatingIncome,
    });
    setEditYear(null);
  };

  const handleDelete = (year: OperatingYear) => {
    Alert.alert("Delete Period", `Remove ${year.periodType} ${year.periodYear}?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteYear(year.id) },
    ]);
  };

  return (
    <>
      <View style={[s.header, { paddingTop: topPad + 8 }]}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Feather name="arrow-left" size={18} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Operating History</Text>
          <Text style={s.headerSub}>
            {property?.streetAddress ?? ""} · {history.length}/{MAX_PERIODS} periods</Text>
        </View>
        {canAdd && (
          <TouchableOpacity
            style={s.addBtn}
            onPress={() => { setAddDraft(emptyDraft()); setAddModal(true); }}
            activeOpacity={0.8}
          >
            <Feather name="plus" size={16} color="#fff" />
            <Text style={s.addBtnText}>Add</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={[s.content, { paddingBottom: bottomPad + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Economic Occupancy Card ── */}
        {(() => {
          const econ = computeEconomicOccupancy(history);
          return (
            <View style={ec.card}>
              <View style={ec.header}>
                <View style={ec.iconBox}>
                  <Feather name="trending-up" size={11} color={Colors.light.tint} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={ec.label}>ECONOMIC OCCUPANCY</Text>
                  <Text style={ec.subtitle}>Effective Gross Income ÷ Gross Potential Rent</Text>
                </View>
                <Text style={[ec.pct, econ.pct === null && ec.pctNone]}>{fmtPct(econ.pct)}</Text>
              </View>
              {econ.source === "operating-history" ? (
                <View style={ec.breakdown}>
                  <Text style={ec.sourceLabel}>Source: {econ.periodLabel}</Text>
                  <View style={ec.row}>
                    <View style={ec.item}>
                      <Text style={ec.itemVal}>{fmtCur(econ.egi)}</Text>
                      <Text style={ec.itemKey}>EGI</Text>
                    </View>
                    <View style={ec.divider} />
                    <View style={ec.item}>
                      <Text style={ec.itemVal}>{fmtCur(econ.gpr)}</Text>
                      <Text style={ec.itemKey}>Gross Potential Rent</Text>
                    </View>
                    {econ.gpr && econ.egi !== null && (
                      <>
                        <View style={ec.divider} />
                        <View style={ec.item}>
                          <Text style={[ec.itemVal, { color: "#B91C1C" }]}>{fmtCur(econ.gpr - econ.egi)}</Text>
                          <Text style={ec.itemKey}>Vacancy Loss</Text>
                        </View>
                      </>
                    )}
                  </View>
                </View>
              ) : (
                <Text style={ec.noData}>Add a period below to compute economic occupancy.</Text>
              )}
            </View>
          );
        })()}

        {history.length === 0 ? (
          <View style={s.empty}>
            <Feather name="trending-up" size={32} color={Colors.light.textTertiary} />
            <Text style={s.emptyTitle}>No periods yet</Text>
            <Text style={s.emptyText}>Tap "Add" to enter the first operating statement period.</Text>
          </View>
        ) : (
          history.map((year) => (
            <PeriodCard
              key={year.id}
              year={year}
              onEdit={() => handleEditOpen(year)}
              onDelete={() => handleDelete(year)}
            />
          ))
        )}
      </ScrollView>

      <YearModal
        visible={addModal}
        draft={addDraft}
        onChange={setAddDraft}
        onClose={() => setAddModal(false)}
        onSave={handleAdd}
        title="Add Operating Period"
      />

      <YearModal
        visible={editYear !== null}
        draft={editDraft}
        onChange={setEditDraft}
        onClose={() => setEditYear(null)}
        onSave={handleEditSave}
        title={`Edit: ${editYear?.periodType ?? ""} ${editYear?.periodYear ?? ""}`}
      />
    </>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  notFound: { fontSize: 15, fontFamily: "OpenSans_600SemiBold", color: Colors.light.text },
  backLink: { marginTop: 12, fontSize: 14, color: Colors.light.tint, fontFamily: "OpenSans_600SemiBold" },

  header: {
    backgroundColor: Colors.light.surface,
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingBottom: 14, gap: 12,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.08)",
    justifyContent: "center", alignItems: "center",
  },
  headerTitle: { fontSize: 17, fontFamily: "OpenSans_700Bold", color: "#fff" },
  headerSub: { fontSize: 11, fontFamily: "OpenSans_400Regular", color: "rgba(255,255,255,0.6)", marginTop: 2 },
  addBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: Colors.light.tint, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 6,
  },
  addBtnText: { fontSize: 13, fontFamily: "OpenSans_700Bold", color: "#fff" },

  scroll: { flex: 1, backgroundColor: Colors.light.background },
  content: { padding: 14 },

  empty: { alignItems: "center", paddingVertical: 48, gap: 8 },
  emptyTitle: { fontSize: 15, fontFamily: "OpenSans_700Bold", color: Colors.light.textTertiary },
  emptyText: { fontSize: 13, fontFamily: "OpenSans_400Regular", color: Colors.light.textTertiary, textAlign: "center", maxWidth: 240 },
});

const ec = StyleSheet.create({
  card: {
    backgroundColor: Colors.light.card,
    borderRadius: 10, padding: 14, marginBottom: 14,
    borderWidth: 1, borderColor: Colors.light.border,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2, elevation: 1,
  },
  header: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 10 },
  iconBox: {
    width: 24, height: 24, borderRadius: 5,
    backgroundColor: Colors.light.tintLight,
    alignItems: "center", justifyContent: "center",
    marginTop: 1,
  },
  label: {
    fontSize: 10, fontFamily: "OpenSans_700Bold", color: Colors.light.textSecondary,
    letterSpacing: 0.7, textTransform: "uppercase",
  },
  subtitle: {
    fontSize: 11, fontFamily: "OpenSans_400Regular", color: Colors.light.textTertiary, marginTop: 2,
  },
  pct: { fontSize: 26, fontFamily: "OpenSans_700Bold", color: Colors.light.tint },
  pctNone: { fontSize: 20, color: Colors.light.textTertiary },
  breakdown: {
    backgroundColor: Colors.light.background, borderRadius: 6,
    borderWidth: 1, borderColor: Colors.light.border, padding: 10,
  },
  sourceLabel: {
    fontSize: 11, fontFamily: "OpenSans_600SemiBold", color: Colors.light.textSecondary, marginBottom: 8,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 6 },
  item: { flex: 1, alignItems: "center" },
  itemVal: { fontSize: 14, fontFamily: "OpenSans_700Bold", color: Colors.light.tint },
  itemKey: { fontSize: 10, fontFamily: "OpenSans_400Regular", color: Colors.light.textTertiary, textAlign: "center", marginTop: 2 },
  divider: { width: 1, height: 30, backgroundColor: Colors.light.border },
  noData: {
    fontSize: 12, fontFamily: "OpenSans_400Regular", color: Colors.light.textTertiary,
    textAlign: "center", paddingVertical: 4,
  },
});
