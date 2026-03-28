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

import { AddressLookup } from "@/components/AddressLookup";
import { DetailRow } from "@/components/DetailRow";
import { FormField } from "@/components/FormField";
import { SectionHeader } from "@/components/SectionHeader";
import { SectionScreenLayout } from "@/components/SectionScreenLayout";
import { SelectField } from "@/components/SelectField";
import { TabBar } from "@/components/TabBar";
import Colors from "@/constants/colors";
import type { PropertyType } from "@/services/core";
import { useCoreService } from "@/services/core";
import { formatPct, formatSqFt, getPropertyCityState } from "@/utils/formatting";

const PROPERTY_TYPES: PropertyType[] = [
  "Office", "Retail", "Industrial", "Multifamily", "Mixed Use",
  "Hotel", "Self Storage", "Healthcare", "Land",
];

const TABS = [
  { key: "location",   label: "Location",   icon: "map-pin"   as const },
  { key: "attributes", label: "Attributes", icon: "home"      as const },
  { key: "occupancy",  label: "Occupancy",  icon: "percent"   as const },
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

  const [activeTab, setActiveTab] = useState("location");
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    streetAddress: property?.streetAddress ?? "",
    city: property?.city ?? "",
    state: property?.state ?? "",
    zipCode: property?.zipCode ?? "",
    latitude: property?.latitude ?? "",
    longitude: property?.longitude ?? "",
    googlePlaceId: property?.googlePlaceId ?? "",
    propertyType: property?.propertyType ?? ("Office" as PropertyType),
    grossSqFt: property?.grossSqFt ?? "",
    numberOfUnits: property?.numberOfUnits ?? "",
    yearBuilt: property?.yearBuilt ?? "",
    physicalOccupancyPct: property?.physicalOccupancyPct ?? "",
    economicOccupancyPct: property?.economicOccupancyPct ?? "",
  });

  const set = (key: string) => (val: string) => setForm((f) => ({ ...f, [key]: val }));

  const handleEdit = () => {
    setForm({
      streetAddress: property?.streetAddress ?? "",
      city: property?.city ?? "",
      state: property?.state ?? "",
      zipCode: property?.zipCode ?? "",
      latitude: property?.latitude ?? "",
      longitude: property?.longitude ?? "",
      googlePlaceId: property?.googlePlaceId ?? "",
      propertyType: property?.propertyType ?? "Office",
      grossSqFt: property?.grossSqFt ?? "",
      numberOfUnits: property?.numberOfUnits ?? "",
      yearBuilt: property?.yearBuilt ?? "",
      physicalOccupancyPct: property?.physicalOccupancyPct ?? "",
      economicOccupancyPct: property?.economicOccupancyPct ?? "",
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
      latitude: form.latitude,
      longitude: form.longitude,
      googlePlaceId: form.googlePlaceId,
      propertyType: form.propertyType,
      grossSqFt: form.grossSqFt || undefined,
      numberOfUnits: form.numberOfUnits || undefined,
      yearBuilt: form.yearBuilt || undefined,
      physicalOccupancyPct: form.physicalOccupancyPct || undefined,
      economicOccupancyPct: form.economicOccupancyPct || undefined,
    });
    setEditing(false);
  };

  const handleCancel = () => setEditing(false);

  const hasCoords = property?.latitude && property?.longitude;
  const coordsDisplay = hasCoords
    ? `${Number(property!.latitude).toFixed(5)}, ${Number(property!.longitude).toFixed(5)}`
    : undefined;

  function renderTabContent() {
    if (editing) {
      switch (activeTab) {
        case "location":
          return (
            <View style={styles.card}>
              <SectionHeader title="Location" subtitle="Use address search to auto-fill lat/long and Place ID" />
              <Text style={styles.fieldLabel}>Street Address</Text>
              <AddressLookup
                value={form.streetAddress}
                onSelect={(result) => setForm((f) => ({
                  ...f,
                  streetAddress: result.streetAddress,
                  city: result.city,
                  state: result.state,
                  zipCode: result.zipCode,
                  latitude: result.latitude,
                  longitude: result.longitude,
                  googlePlaceId: result.googlePlaceId,
                }))}
              />
              <View style={[styles.row, { marginTop: 12 }]}>
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
              <View style={styles.geoRow}>
                <View style={styles.flex1}>
                  <FormField label="Latitude" value={form.latitude} onChangeText={set("latitude")} placeholder="41.8858" keyboardType="decimal-pad" />
                </View>
                <View style={styles.gap} />
                <View style={styles.flex1}>
                  <FormField label="Longitude" value={form.longitude} onChangeText={set("longitude")} placeholder="-87.6245" keyboardType="decimal-pad" />
                </View>
              </View>
              {form.googlePlaceId ? (
                <View style={styles.placeIdRow}>
                  <Feather name="check-circle" size={12} color="#00875D" />
                  <Text style={styles.placeIdText} numberOfLines={1}>Place ID: {form.googlePlaceId}</Text>
                </View>
              ) : null}
            </View>
          );
        case "attributes":
          return (
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
          );
        case "occupancy":
          return (
            <View style={styles.card}>
              <SectionHeader title="Occupancy" subtitle="Unit-based vs rent-based — two distinct measures" />
              <FormField label="Physical Occupancy (%)" value={form.physicalOccupancyPct} onChangeText={set("physicalOccupancyPct")} placeholder="95.0" keyboardType="decimal-pad" suffix="%" hint="= Occupied units ÷ Total rentable units × 100" />
              <FormField label="Economic Occupancy (%)" value={form.economicOccupancyPct} onChangeText={set("economicOccupancyPct")} placeholder="91.0" keyboardType="decimal-pad" suffix="%" hint="= Collected rent ÷ Gross potential rent × 100" />
            </View>
          );
      }
    } else {
      switch (activeTab) {
        case "location":
          return (
            <View style={styles.card}>
              <SectionHeader title="Location" />
              <DetailRow label="Street Address" value={property?.streetAddress} />
              <DetailRow label="City" value={property?.city} />
              <DetailRow label="State" value={property?.state} />
              <DetailRow label="ZIP Code" value={property?.zipCode} />
              <DetailRow label="Coordinates" value={coordsDisplay} />
              <DetailRow label="Google Place ID" value={property?.googlePlaceId || undefined} last />
            </View>
          );
        case "attributes":
          return (
            <View style={styles.card}>
              <SectionHeader title="Physical Attributes" />
              <DetailRow label="Property Type" value={property?.propertyType} />
              <DetailRow label="Gross Sq Ft" value={property?.grossSqFt ? formatSqFt(property.grossSqFt) : undefined} />
              <DetailRow label="Rentable Units" value={property?.numberOfUnits} />
              <DetailRow label="Year Built" value={property?.yearBuilt} last />
            </View>
          );
        case "occupancy":
          return (
            <View style={styles.card}>
              <SectionHeader title="Occupancy" subtitle="Unit-based vs rent-based — two distinct measures" />
              <DetailRow label="Physical Occupancy" value={property?.physicalOccupancyPct ? `${formatPct(property.physicalOccupancyPct)} (unit-based)` : undefined} />
              <DetailRow label="Economic Occupancy" value={property?.economicOccupancyPct ? `${formatPct(property.economicOccupancyPct)} (rent-based)` : undefined} last />
            </View>
          );
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
        title="Property Details"
        subtitle={getPropertyCityState(property) || property?.propertyType || ""}
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

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.light.backgroundCard,
    borderWidth: 1, borderColor: Colors.light.border,
    borderRadius: 4, padding: 16,
  },
  row: { flexDirection: "row", alignItems: "flex-end" },
  geoRow: { flexDirection: "row", alignItems: "flex-end", marginTop: 0 },
  flex1: { flex: 1 },
  flex2: { flex: 2 },
  gap: { width: 8 },
  fieldLabel: {
    fontSize: 12, fontFamily: "OpenSans_600SemiBold",
    color: Colors.light.text, marginBottom: 6, marginTop: 4,
  },
  placeIdRow: {
    flexDirection: "row", alignItems: "center", gap: 5,
    marginTop: 8, paddingTop: 8,
    borderTopWidth: 1, borderTopColor: Colors.light.borderLight,
  },
  placeIdText: {
    fontSize: 11, fontFamily: "OpenSans_400Regular",
    color: Colors.light.textSecondary, flex: 1,
  },
});
