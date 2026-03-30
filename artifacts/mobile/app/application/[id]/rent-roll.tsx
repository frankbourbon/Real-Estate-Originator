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
import type {
  LeaseStatusType,
  LeaseType,
  RentRollUnit,
  UnitType,
} from "@/services/inquiry";
import { useInquiryService } from "@/services/inquiry";
import { useCoreService } from "@/services/core";
import {
  computeMFPhysicalOccupancy,
  computeCommPhysicalOccupancy,
  fmtPct,
} from "@/utils/occupancy";

// ─── Constants ────────────────────────────────────────────────────────────────

const LEASE_STATUSES: LeaseStatusType[] = ["Occupied", "Vacant", "Notice", "Model", "Down"];
const LEASE_TYPES: Array<LeaseType | ""> = ["", "NNN", "NN", "Gross", "Modified Gross", "Absolute Net", "Full Service"];

const MF_UNIT_TYPES: UnitType[] = [
  "Studio", "1BR/1BA", "1BR/1BA+Den",
  "2BR/1BA", "2BR/2BA", "2BR/2BA+Den",
  "3BR/2BA", "3BR/3BA", "Penthouse",
];
const COMM_UNIT_TYPES: UnitType[] = ["Office", "Retail", "Industrial", "Other"];

const MF_SET = new Set<UnitType>(MF_UNIT_TYPES);
const COMM_SET = new Set<UnitType>(COMM_UNIT_TYPES);

function isMFUnitType(t: UnitType): boolean { return MF_SET.has(t); }
function isCommUnitType(t: UnitType): boolean { return COMM_SET.has(t); }

/** Default beds + baths injected when a unit-type chip is selected. */
const UNIT_TYPE_DEFAULTS: Record<UnitType, { bedroomCount: string; bathroomCount: string }> = {
  "Studio":        { bedroomCount: "0", bathroomCount: "1" },
  "1BR/1BA":       { bedroomCount: "1", bathroomCount: "1" },
  "1BR/1BA+Den":   { bedroomCount: "1", bathroomCount: "1" },
  "2BR/1BA":       { bedroomCount: "2", bathroomCount: "1" },
  "2BR/2BA":       { bedroomCount: "2", bathroomCount: "2" },
  "2BR/2BA+Den":   { bedroomCount: "2", bathroomCount: "2" },
  "3BR/2BA":       { bedroomCount: "3", bathroomCount: "2" },
  "3BR/3BA":       { bedroomCount: "3", bathroomCount: "3" },
  "Penthouse":     { bedroomCount: "4", bathroomCount: "3" },
  "Office":        { bedroomCount: "0", bathroomCount: "0" },
  "Retail":        { bedroomCount: "0", bathroomCount: "0" },
  "Industrial":    { bedroomCount: "0", bathroomCount: "0" },
  "Other":         { bedroomCount: "0", bathroomCount: "0" },
};

// ─── Helper utils ─────────────────────────────────────────────────────────────

function leaseStatusColor(s: LeaseStatusType) {
  if (s === "Occupied") return "#00875D";
  if (s === "Vacant") return "#B91C1C";
  if (s === "Notice") return "#C75300";
  return "#72777D";
}

function isMultifamily(propertyType?: string) {
  return propertyType === "Multifamily" || propertyType === "Mixed Use";
}

function isCommercial(propertyType?: string) {
  return (
    propertyType === "Retail" ||
    propertyType === "Office" ||
    propertyType === "Industrial" ||
    propertyType === "Mixed Use" ||
    propertyType === "Hotel" ||
    propertyType === "Self Storage" ||
    propertyType === "Healthcare"
  );
}

// ─── ChipRow ──────────────────────────────────────────────────────────────────

function ChipRow<T extends string>({
  options, value, onChange, colorFn,
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
            key={opt || "—"}
            onPress={() => onChange(opt)}
            style={[chip.chip, active && { backgroundColor: color, borderColor: color }]}
          >
            <Text style={[chip.chipText, active && { color: "#fff" }]}>{opt || "—"}</Text>
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
  chipText: { fontSize: 12, fontFamily: "OpenSans_600SemiBold", color: Colors.light.text },
});

// ─── Labeled field ────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={f.wrap}>
      <Text style={f.label}>{label}</Text>
      {children}
    </View>
  );
}

const f = StyleSheet.create({
  wrap: { marginBottom: 12 },
  label: { fontSize: 11, fontFamily: "OpenSans_600SemiBold", color: Colors.light.textTertiary, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 },
});

function FieldInput({
  value, onChangeText, placeholder, keyboardType,
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "decimal-pad" | "numeric";
}) {
  return (
    <TextInput
      style={fi.input}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder ?? ""}
      placeholderTextColor={Colors.light.textTertiary}
      keyboardType={keyboardType ?? "default"}
    />
  );
}

const fi = StyleSheet.create({
  input: {
    borderWidth: 1, borderColor: Colors.light.border, borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 8,
    fontSize: 14, fontFamily: "OpenSans_400Regular", color: Colors.light.text,
    backgroundColor: "#fff",
  },
});

// ─── Unit form (used in both Add and Edit modals) ─────────────────────────────

type UnitDraft = Omit<RentRollUnit, "id" | "applicationId" | "createdAt" | "updatedAt">;

function emptyDraft(): UnitDraft {
  return {
    unitIdentifier: "", unitType: "Studio", bedroomCount: "0", bathroomCount: "1",
    squareFeet: "", tenantName: "", leaseStatus: "Vacant",
    leaseBeginDate: "", leaseEndDate: "",
    monthlyRentAmount: "", marketRentAmount: "",
    annualBaseRentAmount: "", baseRentPsf: "", leaseType: "", renewalOptions: "", tenantIndustry: "",
  };
}

function UnitForm({
  draft, onChange, propertyType,
}: {
  draft: UnitDraft;
  onChange: (d: UnitDraft) => void;
  propertyType?: string;
}) {
  const set = (k: keyof UnitDraft) => (v: string) => onChange({ ...draft, [k]: v });

  // Available unit types filtered by property type, then drive form fields
  const showMFPicker = isMultifamily(propertyType);
  const showCommPicker = isCommercial(propertyType);
  const unitTypes = [
    ...(showMFPicker ? MF_UNIT_TYPES : []),
    ...(showCommPicker ? COMM_UNIT_TYPES : []),
    ...(!showMFPicker && !showCommPicker ? [...MF_UNIT_TYPES, ...COMM_UNIT_TYPES] : []),
  ] as UnitType[];

  // Fields rendered dynamically based on the selected unit type (not property type)
  const isMF = isMFUnitType(draft.unitType);
  const isComm = isCommUnitType(draft.unitType);

  return (
    <>
      {/* Unit Type — always first; determines which fields follow */}
      <Field label="Unit Type">
        <ChipRow
          options={unitTypes}
          value={draft.unitType as UnitType}
          onChange={(v) => {
            const defaults = UNIT_TYPE_DEFAULTS[v as UnitType] ?? {};
            onChange({ ...draft, unitType: v, ...defaults });
          }}
        />
      </Field>

      {/* Universal fields */}
      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 2 }}>
          <Field label="Unit / Suite ID">
            <FieldInput value={draft.unitIdentifier} onChangeText={set("unitIdentifier")} placeholder="e.g. 101 or Suite 200" />
          </Field>
        </View>
        <View style={{ flex: 1 }}>
          <Field label="Sq Ft">
            <FieldInput value={draft.squareFeet} onChangeText={set("squareFeet")} keyboardType="decimal-pad" />
          </Field>
        </View>
      </View>

      {/* Multifamily only — Beds & Baths */}
      {isMF && (
        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Field label="Beds">
              <FieldInput value={draft.bedroomCount} onChangeText={set("bedroomCount")} keyboardType="numeric" />
            </Field>
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Baths">
              <FieldInput value={draft.bathroomCount} onChangeText={set("bathroomCount")} keyboardType="numeric" />
            </Field>
          </View>
        </View>
      )}

      <Field label="Lease Status">
        <ChipRow options={LEASE_STATUSES} value={draft.leaseStatus} onChange={(v) => onChange({ ...draft, leaseStatus: v })} colorFn={leaseStatusColor} />
      </Field>

      <Field label="Tenant Name">
        <FieldInput value={draft.tenantName} onChangeText={set("tenantName")} placeholder="Full name or entity" />
      </Field>

      {/* Multifamily only — monthly rent */}
      {isMF && (
        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Field label="Contract Rent / Mo">
              <FieldInput value={draft.monthlyRentAmount} onChangeText={set("monthlyRentAmount")} keyboardType="decimal-pad" placeholder="$0" />
            </Field>
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Market Rent / Mo">
              <FieldInput value={draft.marketRentAmount} onChangeText={set("marketRentAmount")} keyboardType="decimal-pad" placeholder="$0" />
            </Field>
          </View>
        </View>
      )}

      {/* Commercial only — lease dates, rent, lease terms */}
      {isComm && (
        <>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Field label="Lease Begin (MM/DD/YYYY)">
                <FieldInput value={draft.leaseBeginDate} onChangeText={set("leaseBeginDate")} placeholder="MM/DD/YYYY" />
              </Field>
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Lease End">
                <FieldInput value={draft.leaseEndDate} onChangeText={set("leaseEndDate")} placeholder="MM/DD/YYYY" />
              </Field>
            </View>
          </View>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Field label="Annual Base Rent">
                <FieldInput value={draft.annualBaseRentAmount} onChangeText={set("annualBaseRentAmount")} keyboardType="decimal-pad" placeholder="$0" />
              </Field>
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Base Rent PSF">
                <FieldInput value={draft.baseRentPsf} onChangeText={set("baseRentPsf")} keyboardType="decimal-pad" placeholder="$0.00" />
              </Field>
            </View>
          </View>
          <Field label="Lease Type">
            <ChipRow options={LEASE_TYPES} value={draft.leaseType as LeaseType | ""} onChange={(v) => onChange({ ...draft, leaseType: v })} />
          </Field>
          <Field label="Renewal Options">
            <FieldInput value={draft.renewalOptions} onChangeText={set("renewalOptions")} placeholder="e.g. Two 5-year options" />
          </Field>
          <Field label="Tenant Industry">
            <FieldInput value={draft.tenantIndustry} onChangeText={set("tenantIndustry")} placeholder="e.g. Logistics" />
          </Field>
        </>
      )}
    </>
  );
}

// ─── Add / Edit modal ─────────────────────────────────────────────────────────

function UnitModal({
  visible, draft, onChange, onClose, onSave, title, propertyType,
}: {
  visible: boolean;
  draft: UnitDraft;
  onChange: (d: UnitDraft) => void;
  onClose: () => void;
  onSave: () => void;
  title: string;
  propertyType?: string;
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
            <UnitForm draft={draft} onChange={onChange} propertyType={propertyType} />
          </ScrollView>
          <View style={mo.footer}>
            <TouchableOpacity style={mo.cancel} onPress={onClose}>
              <Text style={mo.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={mo.save} onPress={onSave}>
              <Text style={mo.saveText}>Save Unit</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const mo = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#fff", borderTopLeftRadius: 16, borderTopRightRadius: 16,
    maxHeight: "90%",
  },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.light.border,
  },
  title: { fontSize: 16, fontFamily: "OpenSans_700Bold", color: Colors.light.text },
  scroll: { paddingHorizontal: 16, paddingTop: 12 },
  footer: {
    flexDirection: "row", gap: 10, padding: 16,
    borderTopWidth: 1, borderTopColor: Colors.light.border,
  },
  cancel: {
    flex: 1, paddingVertical: 11, borderRadius: 6,
    borderWidth: 1, borderColor: Colors.light.border, alignItems: "center",
  },
  cancelText: { fontSize: 14, fontFamily: "OpenSans_600SemiBold", color: Colors.light.text },
  save: {
    flex: 1, paddingVertical: 11, borderRadius: 6,
    backgroundColor: Colors.light.tint, alignItems: "center",
  },
  saveText: { fontSize: 14, fontFamily: "OpenSans_600SemiBold", color: "#fff" },
});

// ─── Unit card ────────────────────────────────────────────────────────────────

function UnitCard({
  unit, onEdit, onDelete,
}: {
  unit: RentRollUnit;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const isMF = isMFUnitType(unit.unitType);
  const isComm = isCommUnitType(unit.unitType);
  const statusColor = leaseStatusColor(unit.leaseStatus);

  return (
    <View style={uc.card}>
      <View style={uc.topRow}>
        <View style={{ flex: 1 }}>
          <Text style={uc.unitId}>{unit.unitIdentifier || "—"}</Text>
          <Text style={uc.unitType}>{unit.unitType}{unit.squareFeet ? ` · ${unit.squareFeet} SF` : ""}</Text>
        </View>
        <View style={[uc.statusBadge, { backgroundColor: statusColor + "1A", borderColor: statusColor + "44" }]}>
          <Text style={[uc.statusText, { color: statusColor }]}>{unit.leaseStatus}</Text>
        </View>
        <TouchableOpacity onPress={onEdit} hitSlop={8} style={{ marginLeft: 8 }}>
          <Feather name="edit-2" size={14} color={Colors.light.tint} />
        </TouchableOpacity>
        <TouchableOpacity onPress={onDelete} hitSlop={8} style={{ marginLeft: 6 }}>
          <Feather name="trash-2" size={14} color="#B91C1C" />
        </TouchableOpacity>
      </View>

      {unit.tenantName ? (
        <Text style={uc.tenant}>{unit.tenantName}</Text>
      ) : unit.leaseStatus !== "Vacant" ? (
        <Text style={[uc.tenant, { color: Colors.light.textTertiary }]}>No tenant name</Text>
      ) : null}

      {(unit.leaseBeginDate || unit.leaseEndDate) && (
        <Text style={uc.dates}>
          {unit.leaseBeginDate || "—"} → {unit.leaseEndDate || "—"}
        </Text>
      )}

      <View style={uc.rentRow}>
        {isMF && unit.monthlyRentAmount ? (
          <>
            <View style={uc.rentItem}>
              <Text style={uc.rentLabel}>Contract Rent</Text>
              <Text style={uc.rentValue}>${unit.monthlyRentAmount}/mo</Text>
            </View>
            {unit.marketRentAmount ? (
              <View style={uc.rentItem}>
                <Text style={uc.rentLabel}>Market Rent</Text>
                <Text style={uc.rentValue}>${unit.marketRentAmount}/mo</Text>
              </View>
            ) : null}
          </>
        ) : null}
        {isComm && unit.annualBaseRentAmount ? (
          <>
            <View style={uc.rentItem}>
              <Text style={uc.rentLabel}>Annual Base Rent</Text>
              <Text style={uc.rentValue}>${unit.annualBaseRentAmount}</Text>
            </View>
            {unit.baseRentPsf ? (
              <View style={uc.rentItem}>
                <Text style={uc.rentLabel}>PSF</Text>
                <Text style={uc.rentValue}>${unit.baseRentPsf}/SF</Text>
              </View>
            ) : null}
          </>
        ) : null}
        {isComm && unit.leaseType ? (
          <View style={uc.rentItem}>
            <Text style={uc.rentLabel}>Lease Type</Text>
            <Text style={uc.rentValue}>{unit.leaseType}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const uc = StyleSheet.create({
  card: {
    backgroundColor: Colors.light.card, borderRadius: 10, padding: 12, marginBottom: 8,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2, elevation: 1,
  },
  topRow: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  unitId: { fontSize: 14, fontFamily: "OpenSans_700Bold", color: Colors.light.text },
  unitType: { fontSize: 11, fontFamily: "OpenSans_400Regular", color: Colors.light.textTertiary },
  statusBadge: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 7, paddingVertical: 2 },
  statusText: { fontSize: 11, fontFamily: "OpenSans_600SemiBold" },
  tenant: { fontSize: 12, fontFamily: "OpenSans_400Regular", color: Colors.light.text, marginBottom: 2 },
  dates: { fontSize: 11, fontFamily: "OpenSans_400Regular", color: Colors.light.textTertiary, marginBottom: 4 },
  rentRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 4 },
  rentItem: {},
  rentLabel: { fontSize: 10, fontFamily: "OpenSans_600SemiBold", color: Colors.light.textTertiary, textTransform: "uppercase" },
  rentValue: { fontSize: 13, fontFamily: "OpenSans_700Bold", color: Colors.light.text },
});

// ─── Summary stats bar ────────────────────────────────────────────────────────

function occColor(pct: number) {
  return pct >= 90 ? "#00875D" : pct >= 80 ? "#C75300" : "#B91C1C";
}

function SummaryBar({ units }: { units: RentRollUnit[] }) {
  const mfUnits = units.filter((u) => isMFUnitType(u.unitType));
  const commUnits = units.filter((u) => isCommUnitType(u.unitType));
  const hasMF = mfUnits.length > 0;
  const hasComm = commUnits.length > 0;

  const mfOcc = hasMF ? Math.round((mfUnits.filter((u) => u.leaseStatus === "Occupied").length / mfUnits.length) * 100) : 0;
  const commOcc = hasComm ? Math.round((commUnits.filter((u) => u.leaseStatus === "Occupied").length / commUnits.length) * 100) : 0;

  const occupied = units.filter((u) => u.leaseStatus === "Occupied").length;
  const vacant = units.filter((u) => u.leaseStatus === "Vacant").length;
  const notice = units.filter((u) => u.leaseStatus === "Notice").length;

  return (
    <View style={sb.row}>
      <View style={sb.item}>
        <Text style={sb.val}>{units.length}</Text>
        <Text style={sb.lbl}>Units</Text>
      </View>
      <View style={sb.divider} />
      <View style={sb.item}>
        <Text style={[sb.val, { color: "#00875D" }]}>{occupied}</Text>
        <Text style={sb.lbl}>Occupied</Text>
      </View>
      <View style={sb.divider} />
      <View style={sb.item}>
        <Text style={[sb.val, { color: "#B91C1C" }]}>{vacant}</Text>
        <Text style={sb.lbl}>Vacant</Text>
      </View>
      <View style={sb.divider} />
      <View style={sb.item}>
        <Text style={[sb.val, { color: "#C75300" }]}>{notice}</Text>
        <Text style={sb.lbl}>Notice</Text>
      </View>
      {hasMF && (
        <>
          <View style={sb.divider} />
          <View style={sb.item}>
            <Text style={[sb.val, { color: occColor(mfOcc) }]}>{mfOcc}%</Text>
            <Text style={sb.lbl}>MF Occ.</Text>
          </View>
        </>
      )}
      {hasComm && (
        <>
          <View style={sb.divider} />
          <View style={sb.item}>
            <Text style={[sb.val, { color: occColor(commOcc) }]}>{commOcc}%</Text>
            <Text style={sb.lbl}>Comm. Occ.</Text>
          </View>
        </>
      )}
    </View>
  );
}

const sb = StyleSheet.create({
  row: {
    flexDirection: "row", backgroundColor: Colors.light.card,
    borderRadius: 10, padding: 12, marginBottom: 12,
    alignItems: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2, elevation: 1,
  },
  item: { flex: 1, alignItems: "center" },
  val: { fontSize: 18, fontFamily: "OpenSans_700Bold", color: Colors.light.text },
  lbl: { fontSize: 10, fontFamily: "OpenSans_400Regular", color: Colors.light.textTertiary, marginTop: 1 },
  divider: { width: 1, height: 30, backgroundColor: Colors.light.border, marginHorizontal: 2 },
});

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function RentRollScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getApplication, getProperty } = useCoreService();
  const { getRentRoll, addUnit, updateUnit, deleteUnit } = useInquiryService();
  const insets = useSafeAreaInsets();

  const [addModal, setAddModal] = useState(false);
  const [addDraft, setAddDraft] = useState<UnitDraft>(emptyDraft());

  const [editUnit, setEditUnit] = useState<RentRollUnit | null>(null);
  const [editDraft, setEditDraft] = useState<UnitDraft>(emptyDraft());

  const app = getApplication(id);
  const property = getProperty(app?.propertyId ?? "");
  const units = getRentRoll(id);

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

  const handleAdd = async () => {
    if (!addDraft.unitIdentifier.trim()) return;
    await addUnit(id, addDraft);
    setAddModal(false);
    setAddDraft(emptyDraft());
  };

  const handleEditOpen = (unit: RentRollUnit) => {
    const { id: _id, applicationId: _aid, createdAt: _ca, updatedAt: _ua, ...rest } = unit;
    setEditDraft(rest);
    setEditUnit(unit);
  };

  const handleEditSave = async () => {
    if (!editUnit) return;
    await updateUnit(editUnit.id, editDraft);
    setEditUnit(null);
  };

  const handleDelete = (unit: RentRollUnit) => {
    Alert.alert("Delete Unit", `Remove unit "${unit.unitIdentifier}"?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteUnit(unit.id) },
    ]);
  };

  return (
    <>
      <View style={[s.header, { paddingTop: topPad + 8 }]}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Feather name="arrow-left" size={18} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>Rent Roll</Text>
          <Text style={s.headerSub}>{property?.streetAddress ?? ""}</Text>
        </View>
        <TouchableOpacity
          style={s.addBtn}
          onPress={() => { setAddDraft(emptyDraft()); setAddModal(true); }}
          activeOpacity={0.8}
        >
          <Feather name="plus" size={16} color="#fff" />
          <Text style={s.addBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={[s.content, { paddingBottom: bottomPad + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Physical Occupancy Cards ── */}
        {(() => {
          const mf = computeMFPhysicalOccupancy(units);
          const comm = computeCommPhysicalOccupancy(units);
          const hasMF = mf.source === "rent-roll";
          const hasComm = comm.source === "rent-roll";
          if (!hasMF && !hasComm) return null;
          return (
            <View style={s.occRow}>
              {hasMF && (
                <View style={[s.occCard, { flex: hasComm ? 1 : undefined, width: hasComm ? undefined : "100%" }]}>
                  <View style={s.occCardHeader}>
                    <View style={s.occIconBox}>
                      <Feather name="home" size={11} color={Colors.light.tint} />
                    </View>
                    <Text style={s.occCardLabel}>MF Physical Occ.</Text>
                  </View>
                  <Text style={s.occPct}>{fmtPct(mf.pct)}</Text>
                  <View style={s.occBreakRow}>
                    <Text style={s.occBreakItem}><Text style={s.occBreakVal}>{mf.occupied}</Text> occ</Text>
                    {mf.notice > 0 && <Text style={[s.occBreakItem, { color: "#C75300" }]}><Text style={[s.occBreakVal, { color: "#C75300" }]}>{mf.notice}</Text> ntc</Text>}
                    <Text style={[s.occBreakItem, { color: Colors.light.textTertiary }]}><Text style={[s.occBreakVal, { color: Colors.light.textTertiary }]}>{mf.total - mf.occupied - mf.notice}</Text> vac</Text>
                    <Text style={s.occBreakTotal}>/{mf.total}</Text>
                  </View>
                </View>
              )}
              {hasComm && (
                <View style={[s.occCard, { flex: hasMF ? 1 : undefined, width: hasMF ? undefined : "100%" }]}>
                  <View style={s.occCardHeader}>
                    <View style={s.occIconBox}>
                      <Feather name="briefcase" size={11} color={Colors.light.tint} />
                    </View>
                    <Text style={s.occCardLabel}>Comm. Physical Occ.</Text>
                  </View>
                  <Text style={s.occPct}>{fmtPct(comm.pct)}</Text>
                  <View style={s.occBreakRow}>
                    <Text style={s.occBreakItem}><Text style={s.occBreakVal}>{comm.occupied}</Text> occ</Text>
                    {comm.notice > 0 && <Text style={[s.occBreakItem, { color: "#C75300" }]}><Text style={[s.occBreakVal, { color: "#C75300" }]}>{comm.notice}</Text> ntc</Text>}
                    <Text style={[s.occBreakItem, { color: Colors.light.textTertiary }]}><Text style={[s.occBreakVal, { color: Colors.light.textTertiary }]}>{comm.total - comm.occupied - comm.notice}</Text> vac</Text>
                    <Text style={s.occBreakTotal}>/{comm.total}</Text>
                  </View>
                </View>
              )}
            </View>
          );
        })()}

        <SummaryBar units={units} />

        {units.length === 0 ? (
          <View style={s.empty}>
            <Feather name="list" size={32} color={Colors.light.textTertiary} />
            <Text style={s.emptyTitle}>No units yet</Text>
            <Text style={s.emptyText}>Tap "Add" to enter the first unit on the rent roll.</Text>
          </View>
        ) : (
          units.map((unit) => (
            <UnitCard
              key={unit.id}
              unit={unit}
              onEdit={() => handleEditOpen(unit)}
              onDelete={() => handleDelete(unit)}
            />
          ))
        )}
      </ScrollView>

      <UnitModal
        visible={addModal}
        draft={addDraft}
        onChange={setAddDraft}
        onClose={() => setAddModal(false)}
        onSave={handleAdd}
        title="Add Unit"
        propertyType={property?.propertyType}
      />

      <UnitModal
        visible={editUnit !== null}
        draft={editDraft}
        onChange={setEditDraft}
        onClose={() => setEditUnit(null)}
        onSave={handleEditSave}
        title={`Edit Unit ${editUnit?.unitIdentifier ?? ""}`}
        propertyType={property?.propertyType}
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

  occRow: { flexDirection: "row", gap: 10, marginBottom: 10 },
  occCard: {
    backgroundColor: Colors.light.card,
    borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: Colors.light.border,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2, elevation: 1,
  },
  occCardHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
  occIconBox: {
    width: 20, height: 20, borderRadius: 4,
    backgroundColor: Colors.light.tintLight,
    alignItems: "center", justifyContent: "center",
  },
  occCardLabel: { fontSize: 11, fontFamily: "OpenSans_600SemiBold", color: Colors.light.textSecondary, flex: 1 },
  occPct: { fontSize: 24, fontFamily: "OpenSans_700Bold", color: Colors.light.tint, marginBottom: 6 },
  occBreakRow: { flexDirection: "row", gap: 8, flexWrap: "wrap", alignItems: "center" },
  occBreakItem: { fontSize: 11, fontFamily: "OpenSans_400Regular", color: Colors.light.text },
  occBreakVal: { fontFamily: "OpenSans_700Bold" },
  occBreakTotal: { fontSize: 11, fontFamily: "OpenSans_400Regular", color: Colors.light.textTertiary },
});
