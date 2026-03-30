import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { DetailRow } from "@/components/DetailRow";
import { FormField } from "@/components/FormField";
import { SectionHeader } from "@/components/SectionHeader";
import { SectionScreenLayout } from "@/components/SectionScreenLayout";
import { TabBar } from "@/components/TabBar";
import Colors from "@/constants/colors";
import type { ContactMethod, MailingAddress } from "@/services/core";
import { useCoreService } from "@/services/core";
import type { PhaseKey } from "@/services/phase-data";
import { usePhaseDataService } from "@/services/phase-data";
import { formatCurrencyFull, getBorrowerDisplayName } from "@/utils/formatting";

// ─── Tab definitions ──────────────────────────────────────────────────────────

const TABS = [
  { key: "identity",   label: "Identity",   icon: "user"       as const },
  { key: "contact",    label: "Contact",    icon: "phone"      as const },
  { key: "addresses",  label: "Addresses",  icon: "map-pin"    as const },
  { key: "financials", label: "Financials", icon: "bar-chart-2" as const },
];

// ─── Header buttons ───────────────────────────────────────────────────────────

function EditBtn({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity style={hdr.btn} onPress={onPress} activeOpacity={0.7}>
      <Feather name="edit-2" size={15} color="rgba(255,255,255,0.8)" />
      <Text style={hdr.btnText}>Edit</Text>
    </TouchableOpacity>
  );
}

function SaveCancelBtns({ onSave, onCancel }: { onSave: () => void; onCancel: () => void }) {
  return (
    <View style={hdr.row}>
      <TouchableOpacity style={hdr.cancelBtn} onPress={onCancel} activeOpacity={0.7}>
        <Text style={hdr.cancelText}>Cancel</Text>
      </TouchableOpacity>
      <TouchableOpacity style={hdr.saveBtn} onPress={onSave} activeOpacity={0.8}>
        <Text style={hdr.saveText}>Save</Text>
      </TouchableOpacity>
    </View>
  );
}

const hdr = StyleSheet.create({
  row: { flexDirection: "row", gap: 6 },
  btn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  btnText: { fontSize: 12, fontFamily: "OpenSans_600SemiBold", color: "rgba(255,255,255,0.85)" },
  cancelBtn: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  cancelText: { fontSize: 12, fontFamily: "OpenSans_600SemiBold", color: "rgba(255,255,255,0.6)" },
  saveBtn: {
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 4,
    backgroundColor: Colors.light.tint,
  },
  saveText: { fontSize: 12, fontFamily: "OpenSans_700Bold", color: "#fff" },
});

// ─── Editable contact list ────────────────────────────────────────────────────

function ContactList({
  items,
  onChange,
  valuePlaceholder,
  keyboardType,
  autoCapitalize,
}: {
  items: ContactMethod[];
  onChange: (items: ContactMethod[]) => void;
  valuePlaceholder: string;
  keyboardType?: any;
  autoCapitalize?: any;
}) {
  const add = () => onChange([...items, { label: "Primary", value: "" }]);
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));
  const update = (i: number, field: keyof ContactMethod, val: string) =>
    onChange(items.map((item, idx) => idx === i ? { ...item, [field]: val } : item));

  return (
    <View style={cl.wrap}>
      {items.map((item, i) => (
        <View key={i} style={cl.row}>
          <View style={cl.labelBox}>
            <TextInput
              style={cl.labelInput}
              value={item.label}
              onChangeText={(v) => update(i, "label", v)}
              placeholder="Label"
              placeholderTextColor={Colors.light.textTertiary}
            />
          </View>
          <View style={cl.valueBox}>
            <TextInput
              style={cl.valueInput}
              value={item.value}
              onChangeText={(v) => update(i, "value", v)}
              placeholder={valuePlaceholder}
              placeholderTextColor={Colors.light.textTertiary}
              keyboardType={keyboardType}
              autoCapitalize={autoCapitalize ?? "none"}
              autoCorrect={false}
            />
          </View>
          <TouchableOpacity style={cl.removeBtn} onPress={() => remove(i)} activeOpacity={0.7}>
            <Feather name="x" size={14} color={Colors.light.textTertiary} />
          </TouchableOpacity>
        </View>
      ))}
      <TouchableOpacity style={cl.addBtn} onPress={add} activeOpacity={0.7}>
        <Feather name="plus" size={13} color={Colors.light.tint} />
        <Text style={cl.addText}>Add</Text>
      </TouchableOpacity>
    </View>
  );
}

const cl = StyleSheet.create({
  wrap: { gap: 8 },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  labelBox: { width: 80 },
  valueBox: { flex: 1 },
  labelInput: {
    backgroundColor: Colors.light.background, borderWidth: 1,
    borderColor: Colors.light.border, borderRadius: 4,
    paddingHorizontal: 8, paddingVertical: 8,
    fontSize: 12, fontFamily: "OpenSans_600SemiBold", color: Colors.light.textSecondary,
  },
  valueInput: {
    backgroundColor: Colors.light.background, borderWidth: 1,
    borderColor: Colors.light.border, borderRadius: 4,
    paddingHorizontal: 10, paddingVertical: 8,
    fontSize: 13, fontFamily: "OpenSans_400Regular", color: Colors.light.text,
  },
  removeBtn: {
    width: 28, height: 28, alignItems: "center", justifyContent: "center",
    borderRadius: 4, backgroundColor: Colors.light.background,
    borderWidth: 1, borderColor: Colors.light.border,
  },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingVertical: 6, paddingHorizontal: 2 },
  addText: { fontSize: 12, fontFamily: "OpenSans_600SemiBold", color: Colors.light.tint },
});

// ─── Editable mailing address list ───────────────────────────────────────────

function MailingAddressList({
  items,
  onChange,
}: {
  items: MailingAddress[];
  onChange: (items: MailingAddress[]) => void;
}) {
  const add = () => onChange([...items, { label: "Primary", street: "", city: "", state: "", zipCode: "" }]);
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));
  const update = (i: number, field: keyof MailingAddress, val: string) =>
    onChange(items.map((item, idx) => idx === i ? { ...item, [field]: val } : item));

  return (
    <View style={ma.wrap}>
      {items.map((addr, i) => (
        <View key={i} style={ma.card}>
          <View style={ma.cardHeader}>
            <TextInput
              style={ma.labelInput}
              value={addr.label}
              onChangeText={(v) => update(i, "label", v)}
              placeholder="Label (e.g. Office)"
              placeholderTextColor={Colors.light.textTertiary}
            />
            <TouchableOpacity style={ma.removeBtn} onPress={() => remove(i)} activeOpacity={0.7}>
              <Feather name="trash-2" size={13} color={Colors.light.textTertiary} />
            </TouchableOpacity>
          </View>
          <TextInput
            style={ma.streetInput}
            value={addr.street}
            onChangeText={(v) => update(i, "street", v)}
            placeholder="Street address"
            placeholderTextColor={Colors.light.textTertiary}
            autoCapitalize="words"
          />
          <View style={ma.row}>
            <TextInput
              style={[ma.input, { flex: 2 }]}
              value={addr.city}
              onChangeText={(v) => update(i, "city", v)}
              placeholder="City"
              placeholderTextColor={Colors.light.textTertiary}
              autoCapitalize="words"
            />
            <TextInput
              style={[ma.input, { width: 48 }]}
              value={addr.state}
              onChangeText={(v) => update(i, "state", v.toUpperCase())}
              placeholder="ST"
              placeholderTextColor={Colors.light.textTertiary}
              maxLength={2}
              autoCapitalize="characters"
            />
            <TextInput
              style={[ma.input, { width: 72 }]}
              value={addr.zipCode}
              onChangeText={(v) => update(i, "zipCode", v)}
              placeholder="ZIP"
              placeholderTextColor={Colors.light.textTertiary}
              keyboardType="number-pad"
              maxLength={5}
            />
          </View>
        </View>
      ))}
      <TouchableOpacity style={cl.addBtn} onPress={add} activeOpacity={0.7}>
        <Feather name="plus" size={13} color={Colors.light.tint} />
        <Text style={cl.addText}>Add Address</Text>
      </TouchableOpacity>
    </View>
  );
}

const ma = StyleSheet.create({
  wrap: { gap: 10 },
  card: {
    backgroundColor: Colors.light.background,
    borderWidth: 1, borderColor: Colors.light.border,
    borderRadius: 4, padding: 10, gap: 8,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  labelInput: {
    flex: 1, borderWidth: 1, borderColor: Colors.light.border, borderRadius: 4,
    paddingHorizontal: 8, paddingVertical: 6,
    fontSize: 12, fontFamily: "OpenSans_700Bold", color: Colors.light.tint,
    backgroundColor: Colors.light.backgroundCard,
  },
  removeBtn: { width: 28, height: 28, alignItems: "center", justifyContent: "center" },
  streetInput: {
    borderWidth: 1, borderColor: Colors.light.border, borderRadius: 4,
    paddingHorizontal: 10, paddingVertical: 8,
    fontSize: 13, fontFamily: "OpenSans_400Regular", color: Colors.light.text,
    backgroundColor: Colors.light.backgroundCard,
  },
  row: { flexDirection: "row", gap: 8 },
  input: {
    borderWidth: 1, borderColor: Colors.light.border, borderRadius: 4,
    paddingHorizontal: 8, paddingVertical: 8,
    fontSize: 13, fontFamily: "OpenSans_400Regular", color: Colors.light.text,
    backgroundColor: Colors.light.backgroundCard,
  },
});

// ─── Tab content panels ───────────────────────────────────────────────────────

function IdentityView({ borrower }: { borrower: any }) {
  return (
    <View style={s.card}>
      <SectionHeader title="Identity" />
      <DetailRow label="First Name"       value={borrower?.firstName} />
      <DetailRow label="Last Name"        value={borrower?.lastName} />
      <DetailRow label="Entity / Company" value={borrower?.entityName} last />
    </View>
  );
}

function IdentityEdit({ form, set }: { form: any; set: (k: string) => (v: string) => void }) {
  return (
    <View style={s.card}>
      <SectionHeader title="Identity" />
      <View style={s.row}>
        <View style={s.flex1}>
          <FormField label="First Name" value={form.firstName} onChangeText={set("firstName")} placeholder="John" autoCapitalize="words" required />
        </View>
        <View style={s.gap} />
        <View style={s.flex1}>
          <FormField label="Last Name" value={form.lastName} onChangeText={set("lastName")} placeholder="Smith" autoCapitalize="words" required />
        </View>
      </View>
      <FormField label="Entity / Company Name" value={form.entityName} onChangeText={set("entityName")} placeholder="ABC Holdings LLC" autoCapitalize="words" />
    </View>
  );
}

function ContactView({ borrower }: { borrower: any }) {
  return (
    <>
      <View style={s.card}>
        <SectionHeader title="Email Addresses" />
        {borrower?.emails?.length ? (
          borrower.emails.map((e: ContactMethod, i: number) => (
            <DetailRow key={i} label={e.label} value={e.value} last={i === (borrower.emails?.length ?? 0) - 1} />
          ))
        ) : (
          <DetailRow label="Email" value={undefined} last />
        )}
      </View>
      <View style={s.card}>
        <SectionHeader title="Phone Numbers" />
        {borrower?.phones?.length ? (
          borrower.phones.map((p: ContactMethod, i: number) => (
            <DetailRow key={i} label={p.label} value={p.value} last={i === (borrower.phones?.length ?? 0) - 1} />
          ))
        ) : (
          <DetailRow label="Phone" value={undefined} last />
        )}
      </View>
    </>
  );
}

function ContactEdit({ form, setForm }: { form: any; setForm: React.Dispatch<React.SetStateAction<any>> }) {
  return (
    <>
      <View style={s.card}>
        <SectionHeader title="Email Addresses" />
        <ContactList
          items={form.emails}
          onChange={(v) => setForm((f: any) => ({ ...f, emails: v }))}
          valuePlaceholder="email@company.com"
          keyboardType="email-address"
        />
      </View>
      <View style={s.card}>
        <SectionHeader title="Phone Numbers" />
        <ContactList
          items={form.phones}
          onChange={(v) => setForm((f: any) => ({ ...f, phones: v }))}
          valuePlaceholder="(312) 555-0100"
          keyboardType="phone-pad"
        />
      </View>
    </>
  );
}

function AddressesView({ borrower }: { borrower: any }) {
  return (
    <View style={s.card}>
      <SectionHeader title="Mailing Addresses" />
      {borrower?.mailingAddresses?.length ? (
        borrower.mailingAddresses.map((addr: MailingAddress, i: number) => (
          <View key={i} style={[s.addrBlock, i < (borrower.mailingAddresses?.length ?? 0) - 1 && s.addrBorder]}>
            <Text style={s.addrLabel}>{addr.label}</Text>
            <Text style={s.addrLine}>{addr.street}</Text>
            <Text style={s.addrLine}>{[addr.city, addr.state, addr.zipCode].filter(Boolean).join(", ")}</Text>
          </View>
        ))
      ) : (
        <DetailRow label="Mailing Address" value={undefined} last />
      )}
    </View>
  );
}

function AddressesEdit({ form, setForm }: { form: any; setForm: React.Dispatch<React.SetStateAction<any>> }) {
  return (
    <View style={s.card}>
      <SectionHeader title="Mailing Addresses" />
      <MailingAddressList
        items={form.mailingAddresses}
        onChange={(v) => setForm((f: any) => ({ ...f, mailingAddresses: v }))}
      />
    </View>
  );
}

function FinancialsView({ borrower, phase }: { borrower: any; phase: PhaseKey }) {
  const showFico = phase === "application" || phase === "final-review";
  return (
    <View style={s.card}>
      <SectionHeader title="Financial Profile" />
      <DetailRow label="CRE Experience" value={borrower?.creExperienceYears ? `${borrower.creExperienceYears} years` : undefined} />
      <DetailRow label="Net Worth (USD)" value={borrower?.netWorthUsd ? formatCurrencyFull(borrower.netWorthUsd) : undefined} />
      <DetailRow label="Liquid Assets"   value={borrower?.liquidityUsd ? formatCurrencyFull(borrower.liquidityUsd) : undefined} last={!showFico} />
      {showFico && <DetailRow label="FICO Credit Score" value={borrower?.creditScore} last />}
    </View>
  );
}

function FinancialsEdit({ form, set, phase }: { form: any; set: (k: string) => (v: string) => void; phase: PhaseKey }) {
  const showFico = phase === "application" || phase === "final-review";
  return (
    <View style={s.card}>
      <SectionHeader title="Financial Profile" subtitle="Used for underwriting and credit assessment" />
      <FormField label="CRE Experience (years)" value={form.creExperienceYears} onChangeText={set("creExperienceYears")} placeholder="10" keyboardType="number-pad" suffix="yrs" hint="Commercial real estate experience" />
      <View style={s.row}>
        <View style={s.flex1}>
          <FormField label="Net Worth (USD)" value={form.netWorthUsd} onChangeText={set("netWorthUsd")} placeholder="5,000,000" keyboardType="number-pad" prefix="$" />
        </View>
        <View style={s.gap} />
        <View style={s.flex1}>
          <FormField label="Liquid Assets (USD)" value={form.liquidityUsd} onChangeText={set("liquidityUsd")} placeholder="500,000" keyboardType="number-pad" prefix="$" />
        </View>
      </View>
      {showFico && (
        <FormField label="FICO Credit Score" value={form.creditScore} onChangeText={set("creditScore")} placeholder="740" keyboardType="number-pad" maxLength={3} hint="FICO score (300–850)" />
      )}
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function BorrowerSection() {
  const { id, phase: phaseParam } = useLocalSearchParams<{ id: string; phase: string }>();
  const phase = (phaseParam as PhaseKey) ?? "inquiry";

  const { getApplication, getBorrower } = useCoreService();
  const { getBorrowerSnapshot, saveBorrowerSnapshot } = usePhaseDataService();

  const app = getApplication(id);
  const coreBorrower = getBorrower(app?.borrowerId ?? "");

  // Phase snapshot is authoritative; fall back to shared core record if no snapshot exists yet
  const snapshot = getBorrowerSnapshot(id, phase);
  const borrower = snapshot ?? coreBorrower;

  const [activeTab, setActiveTab] = useState("identity");
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    firstName: borrower?.firstName ?? "",
    lastName: borrower?.lastName ?? "",
    entityName: borrower?.entityName ?? "",
    emails: borrower?.emails ?? [],
    phones: borrower?.phones ?? [],
    mailingAddresses: borrower?.mailingAddresses ?? [],
    creExperienceYears: borrower?.creExperienceYears ?? "",
    netWorthUsd: borrower?.netWorthUsd ?? "",
    liquidityUsd: borrower?.liquidityUsd ?? "",
    creditScore: borrower?.creditScore ?? "",
  });

  const set = (key: string) => (val: string) => setForm((f) => ({ ...f, [key]: val }));

  const handleEdit = () => {
    setForm({
      firstName: borrower?.firstName ?? "",
      lastName: borrower?.lastName ?? "",
      entityName: borrower?.entityName ?? "",
      emails: borrower?.emails ?? [],
      phones: borrower?.phones ?? [],
      mailingAddresses: borrower?.mailingAddresses ?? [],
      creExperienceYears: borrower?.creExperienceYears ?? "",
      netWorthUsd: borrower?.netWorthUsd ?? "",
      liquidityUsd: borrower?.liquidityUsd ?? "",
      creditScore: borrower?.creditScore ?? "",
    });
    setEditing(true);
  };

  const handleSave = async () => {
    // Writes to this phase's isolated snapshot — does not cascade to other phases
    await saveBorrowerSnapshot(id, phase, {
      firstName: form.firstName,
      lastName: form.lastName,
      entityName: form.entityName,
      emails: form.emails,
      phones: form.phones,
      mailingAddresses: form.mailingAddresses,
      creExperienceYears: form.creExperienceYears,
      netWorthUsd: form.netWorthUsd,
      liquidityUsd: form.liquidityUsd,
      creditScore: form.creditScore,
    });
    setEditing(false);
  };

  const handleCancel = () => setEditing(false);

  function renderTabContent() {
    if (editing) {
      switch (activeTab) {
        case "identity":   return <IdentityEdit   form={form} set={set} />;
        case "contact":    return <ContactEdit    form={form} setForm={setForm} />;
        case "addresses":  return <AddressesEdit  form={form} setForm={setForm} />;
        case "financials": return <FinancialsEdit form={form} set={set} phase={phase} />;
      }
    } else {
      switch (activeTab) {
        case "identity":   return <IdentityView   borrower={borrower} />;
        case "contact":    return <ContactView    borrower={borrower} />;
        case "addresses":  return <AddressesView  borrower={borrower} />;
        case "financials": return <FinancialsView borrower={borrower} phase={phase} />;
      }
    }
    return null;
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <SectionScreenLayout
        title="Borrower Profile"
        subtitle={getBorrowerDisplayName(borrower)}
        rightAction={
          editing
            ? <SaveCancelBtns onSave={handleSave} onCancel={handleCancel} />
            : <EditBtn onPress={handleEdit} />
        }
        headerSlot={
          <TabBar tabs={TABS} activeTab={activeTab} onSelect={setActiveTab} />
        }
      >
        {renderTabContent()}
      </SectionScreenLayout>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: Colors.light.backgroundCard,
    borderWidth: 1, borderColor: Colors.light.border,
    borderRadius: 4, padding: 16,
  },
  row: { flexDirection: "row", alignItems: "flex-end" },
  flex1: { flex: 1 },
  gap: { width: 8 },
  addrBlock: { paddingVertical: 8 },
  addrBorder: { borderBottomWidth: 1, borderBottomColor: Colors.light.borderLight },
  addrLabel: {
    fontSize: 11, fontFamily: "OpenSans_700Bold",
    color: Colors.light.tint, textTransform: "uppercase",
    letterSpacing: 0.4, marginBottom: 3,
  },
  addrLine: {
    fontSize: 13, fontFamily: "OpenSans_400Regular",
    color: Colors.light.text, lineHeight: 19,
  },
});
