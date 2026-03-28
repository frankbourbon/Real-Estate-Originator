import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { DetailRow } from "@/components/DetailRow";
import { FormField } from "@/components/FormField";
import { SectionHeader } from "@/components/SectionHeader";
import { SectionScreenLayout } from "@/components/SectionScreenLayout";
import { SelectField } from "@/components/SelectField";
import Colors from "@/constants/colors";
import type { PropertyType } from "@/services/core";
import { useCoreService } from "@/services/core";
import { formatPct, formatSqFt, getPropertyCityState } from "@/utils/formatting";

const PROPERTY_TYPES: PropertyType[] = [
  "Office", "Retail", "Industrial", "Multifamily", "Mixed Use",
  "Hotel", "Self Storage", "Healthcare", "Land",
];

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

export default function PropertySection() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getApplication, getProperty, updateProperty } = useCoreService();
  const app = getApplication(id);
  const property = getProperty(app?.propertyId ?? "");

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    streetAddress: property?.streetAddress ?? "",
    city: property?.city ?? "",
    state: property?.state ?? "",
    zipCode: property?.zipCode ?? "",
    propertyType: property?.propertyType ?? ("Office" as PropertyType),
    grossSqFt: property?.grossSqFt != null ? String(property.grossSqFt) : "",
    numberOfUnits: property?.numberOfUnits != null ? String(property.numberOfUnits) : "",
    yearBuilt: property?.yearBuilt != null ? String(property.yearBuilt) : "",
    physicalOccupancyPct: property?.physicalOccupancyPct != null ? String(property.physicalOccupancyPct) : "",
    economicOccupancyPct: property?.economicOccupancyPct != null ? String(property.economicOccupancyPct) : "",
  });

  const set = (key: string) => (val: string) => setForm((f) => ({ ...f, [key]: val }));

  const handleEdit = () => {
    setForm({
      streetAddress: property?.streetAddress ?? "",
      city: property?.city ?? "",
      state: property?.state ?? "",
      zipCode: property?.zipCode ?? "",
      propertyType: property?.propertyType ?? "Office",
      grossSqFt: property?.grossSqFt != null ? String(property.grossSqFt) : "",
      numberOfUnits: property?.numberOfUnits != null ? String(property.numberOfUnits) : "",
      yearBuilt: property?.yearBuilt != null ? String(property.yearBuilt) : "",
      physicalOccupancyPct: property?.physicalOccupancyPct != null ? String(property.physicalOccupancyPct) : "",
      economicOccupancyPct: property?.economicOccupancyPct != null ? String(property.economicOccupancyPct) : "",
    });
    setEditing(true);
  };

  const handleSave = async () => {
    if (!property) return;
    await updateProperty(property.id, {
      streetAddress: form.streetAddress || undefined,
      city: form.city || undefined,
      state: form.state || undefined,
      zipCode: form.zipCode || undefined,
      propertyType: form.propertyType,
      grossSqFt: form.grossSqFt ? Number(form.grossSqFt) : undefined,
      numberOfUnits: form.numberOfUnits ? Number(form.numberOfUnits) : undefined,
      yearBuilt: form.yearBuilt ? Number(form.yearBuilt) : undefined,
      physicalOccupancyPct: form.physicalOccupancyPct ? Number(form.physicalOccupancyPct) : undefined,
      economicOccupancyPct: form.economicOccupancyPct ? Number(form.economicOccupancyPct) : undefined,
    });
    setEditing(false);
  };

  const handleCancel = () => setEditing(false);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <SectionScreenLayout
        title="Property Details"
        subtitle={getPropertyCityState(property) || property?.propertyType || ""}
        rightAction={
          editing
            ? <SaveCancelBtns onSave={handleSave} onCancel={handleCancel} />
            : <EditBtn onPress={handleEdit} />
        }
      >
        {editing ? (
          <>
            <View style={styles.card}>
              <SectionHeader title="Location" />
              <FormField label="Street Address" value={form.streetAddress} onChangeText={set("streetAddress")} placeholder="123 Commerce Drive" required />
              <View style={styles.row}>
                <View style={styles.flex2}>
                  <FormField label="City" value={form.city} onChangeText={set("city")} placeholder="Chicago" />
                </View>
                <View style={styles.gap} />
                <View style={styles.flex1}>
                  <FormField label="State" value={form.state} onChangeText={set("state")} placeholder="IL" maxLength={2} autoCapitalize="characters" />
                </View>
                <View style={styles.gap} />
                <View style={styles.flex1}>
                  <FormField label="ZIP" value={form.zipCode} onChangeText={set("zipCode")} placeholder="60601" keyboardType="number-pad" maxLength={5} />
                </View>
              </View>
            </View>

            <View style={styles.card}>
              <SectionHeader title="Physical Attributes" />
              <SelectField label="Property Type" value={form.propertyType} options={PROPERTY_TYPES} onChange={(v) => set("propertyType")(v)} required />
              <View style={styles.row}>
                <View style={styles.flex1}>
                  <FormField label="Gross Sq Ft" value={form.grossSqFt} onChangeText={set("grossSqFt")} placeholder="25,000" keyboardType="number-pad" />
                </View>
                <View style={styles.gap} />
                <View style={styles.flex1}>
                  <FormField label="Rentable Units" value={form.numberOfUnits} onChangeText={set("numberOfUnits")} placeholder="0" keyboardType="number-pad" />
                </View>
              </View>
              <FormField label="Year Built" value={form.yearBuilt} onChangeText={set("yearBuilt")} placeholder="2005" keyboardType="number-pad" maxLength={4} />
            </View>

            <View style={styles.card}>
              <SectionHeader title="Occupancy" subtitle="Unit-based vs rent-based — two distinct measures" />
              <FormField label="Physical Occupancy (%)" value={form.physicalOccupancyPct} onChangeText={set("physicalOccupancyPct")} placeholder="95.0" keyboardType="decimal-pad" suffix="%" hint="= Occupied units ÷ Total rentable units × 100" />
              <FormField label="Economic Occupancy (%)" value={form.economicOccupancyPct} onChangeText={set("economicOccupancyPct")} placeholder="91.0" keyboardType="decimal-pad" suffix="%" hint="= Collected rent ÷ Gross potential rent × 100" />
            </View>
          </>
        ) : (
          <>
            <View style={styles.card}>
              <SectionHeader title="Location" />
              <DetailRow label="Street Address" value={property?.streetAddress} />
              <DetailRow label="City" value={property?.city} />
              <DetailRow label="State" value={property?.state} />
              <DetailRow label="ZIP Code" value={property?.zipCode} last />
            </View>

            <View style={styles.card}>
              <SectionHeader title="Physical Attributes" />
              <DetailRow label="Property Type" value={property?.propertyType} />
              <DetailRow label="Gross Sq Ft" value={property?.grossSqFt ? formatSqFt(property.grossSqFt) : undefined} />
              <DetailRow label="Rentable Units" value={property?.numberOfUnits} />
              <DetailRow label="Year Built" value={property?.yearBuilt} last />
            </View>

            <View style={styles.card}>
              <SectionHeader title="Occupancy" subtitle="Unit-based vs rent-based — two distinct measures" />
              <DetailRow label="Physical Occupancy" value={property?.physicalOccupancyPct ? `${formatPct(property.physicalOccupancyPct)} (unit-based)` : undefined} />
              <DetailRow label="Economic Occupancy" value={property?.economicOccupancyPct ? `${formatPct(property.economicOccupancyPct)} (rent-based)` : undefined} last />
            </View>
          </>
        )}
      </SectionScreenLayout>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.light.backgroundCard,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 4,
    padding: 16,
  },
  row: { flexDirection: "row", alignItems: "flex-end" },
  flex1: { flex: 1 },
  flex2: { flex: 2 },
  gap: { width: 8 },
});
