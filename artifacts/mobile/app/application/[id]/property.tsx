import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  KeyboardAvoidingView,
  Linking,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { AddressLookup } from "@/components/AddressLookup";
import { CensusCard } from "@/components/CensusCard";
import { FloodZoneCard } from "@/components/FloodZoneCard";
import { PropertyMapView } from "@/components/PropertyMapView";
import { DetailRow } from "@/components/DetailRow";
import { FormField } from "@/components/FormField";
import { SectionHeader } from "@/components/SectionHeader";
import { SectionScreenLayout } from "@/components/SectionScreenLayout";
import { SelectField } from "@/components/SelectField";
import { TabBar } from "@/components/TabBar";
import Colors from "@/constants/colors";
import type { PropertyLocation, PropertyType } from "@/services/core";
import { useCoreService } from "@/services/core";
import { useInquiryService } from "@/services/inquiry";
import { formatSqFt, getPropertyCityState } from "@/utils/formatting";

// ─── Constants ────────────────────────────────────────────────────────────────

const PROPERTY_TYPES: PropertyType[] = [
  "Office", "Retail", "Industrial", "Multifamily", "Mixed Use",
  "Hotel", "Self Storage", "Healthcare", "Land",
];

const TABS = [
  { key: "location",          label: "Location",    icon: "map-pin"      as const },
  { key: "attributes",        label: "Attributes",  icon: "home"         as const },
  { key: "rent-roll",         label: "Rent Roll",   icon: "list"         as const },
  { key: "operating-history", label: "Op. History", icon: "trending-up"  as const },
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

// ─── Location helpers ─────────────────────────────────────────────────────────

function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
}

function emptyLocation(propertyId: string, idx: number): PropertyLocation {
  return {
    id: `loc_${propertyId}_${genId()}`,
    label: idx === 0 ? "Main" : "",
    streetAddress: "", city: "", state: "", zipCode: "",
    latitude: "", longitude: "", googlePlaceId: "",
  };
}

function mapsUrl(loc: PropertyLocation): string {
  if (loc.googlePlaceId) {
    return `https://maps.google.com/maps/search/?api=1&query_place_id=${loc.googlePlaceId}`;
  }
  if (loc.latitude && loc.longitude) {
    return `https://maps.google.com/maps?q=${loc.latitude},${loc.longitude}`;
  }
  const q = encodeURIComponent(
    [loc.streetAddress, loc.city, loc.state, loc.zipCode].filter(Boolean).join(", ")
  );
  return `https://maps.google.com/maps?q=${q}`;
}

// ─── Main screen ──────────────────────────────────────────────────────────────

type FormState = {
  legalAddress: string;
  locations: PropertyLocation[];
  propertyType: PropertyType;
  grossSqFt: string;
  numberOfUnits: string;
  yearBuilt: string;
};

export default function PropertySection() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getApplication, getProperty, updateProperty } = useCoreService();
  const { getRentRoll, getOpHistory } = useInquiryService();
  const app = getApplication(id);
  const property = getProperty(app?.propertyId ?? "");
  const rentRoll = getRentRoll(id);
  const opHistory = getOpHistory(id);

  const [activeTab, setActiveTab] = useState("location");
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<FormState>({
    legalAddress: "",
    locations: [],
    propertyType: "Office",
    grossSqFt: "", numberOfUnits: "", yearBuilt: "",
  });

  const set = useCallback((key: keyof FormState) => (val: string) =>
    setForm((f) => ({ ...f, [key]: val })), []);

  const addLocation = useCallback(() => {
    setForm((f) => ({
      ...f,
      locations: [...f.locations, emptyLocation(app?.propertyId ?? "p", f.locations.length)],
    }));
  }, [app]);

  const removeLocation = useCallback((locId: string) => {
    setForm((f) => ({ ...f, locations: f.locations.filter((l) => l.id !== locId) }));
  }, []);

  const updateLocation = useCallback((locId: string, patch: Partial<PropertyLocation>) => {
    setForm((f) => ({
      ...f,
      locations: f.locations.map((l) => l.id === locId ? { ...l, ...patch } : l),
    }));
  }, []);

  const openInMaps = useCallback((loc: PropertyLocation) => {
    Linking.openURL(mapsUrl(loc)).catch(() => {});
  }, []);

  const initForm = useCallback((): FormState => {
    const locs = property?.locations?.length
      ? property.locations
      : (property?.streetAddress || property?.city
        ? [{
            id: `loc_${property.id}_0`,
            label: "Main",
            streetAddress: property.streetAddress ?? "",
            city: property.city ?? "",
            state: property.state ?? "",
            zipCode: property.zipCode ?? "",
            latitude: property.latitude ?? "",
            longitude: property.longitude ?? "",
            googlePlaceId: property.googlePlaceId ?? "",
          }]
        : []);
    return {
      legalAddress: property?.legalAddress ?? "",
      locations: locs,
      propertyType: property?.propertyType ?? "Office",
      grossSqFt: property?.grossSqFt ?? "",
      numberOfUnits: property?.numberOfUnits ?? "",
      yearBuilt: property?.yearBuilt ?? "",
    };
  }, [property]);

  const handleEdit = () => {
    setForm(initForm());
    setEditing(true);
  };

  const handleSave = async () => {
    if (!property) return;
    const primary = form.locations[0];
    await updateProperty(property.id, {
      legalAddress: form.legalAddress,
      locations: form.locations,
      // Sync primary location → legacy top-level fields for backward compat
      streetAddress: primary?.streetAddress ?? property.streetAddress ?? "",
      city: primary?.city ?? property.city ?? "",
      state: primary?.state ?? property.state ?? "",
      zipCode: primary?.zipCode ?? property.zipCode ?? "",
      latitude: primary?.latitude ?? property.latitude ?? "",
      longitude: primary?.longitude ?? property.longitude ?? "",
      googlePlaceId: primary?.googlePlaceId ?? property.googlePlaceId ?? "",
      propertyType: form.propertyType,
      grossSqFt: form.grossSqFt || undefined,
      numberOfUnits: form.numberOfUnits || undefined,
      yearBuilt: form.yearBuilt || undefined,
    });
    setEditing(false);
  };

  const handleCancel = () => setEditing(false);

  // ─── Tab content ────────────────────────────────────────────────────────────

  function renderTabContent() {
    if (editing) {
      switch (activeTab) {
        case "location":
          return (
            <View>
              {/* Legal Address */}
              <View style={s.card}>
                <SectionHeader
                  title="Legal Address"
                  subtitle="Free-form text as recorded on deed, title, or APN — not linked to Google Maps"
                />
                <TextInput
                  style={[s.legalInput]}
                  value={form.legalAddress}
                  onChangeText={set("legalAddress")}
                  placeholder={"e.g. Lot 14, Block 7, Section B, as described in Deed Book 4219,\nPage 302, County of Philadelphia"}
                  placeholderTextColor={Colors.light.textTertiary}
                  multiline
                  textAlignVertical="top"
                  numberOfLines={4}
                />
              </View>

              {/* Physical Locations */}
              <View style={s.card}>
                <View style={s.locSectionRow}>
                  <View style={{ flex: 1 }}>
                    <SectionHeader
                      title="Physical Locations"
                      subtitle="Google Maps–verified addresses for physical location verification"
                    />
                  </View>
                  <TouchableOpacity onPress={addLocation} style={s.addLocBtn} activeOpacity={0.75}>
                    <Feather name="plus" size={13} color={Colors.light.tint} />
                    <Text style={s.addLocText}>Add</Text>
                  </TouchableOpacity>
                </View>

                {form.locations.length === 0 && (
                  <View style={s.emptyLocBox}>
                    <Feather name="map-pin" size={20} color={Colors.light.textTertiary} />
                    <Text style={s.emptyLocText}>No locations yet. Tap "Add" to link a Google Maps address.</Text>
                  </View>
                )}

                {form.locations.map((loc, idx) => (
                  <View
                    key={loc.id}
                    style={[s.locEditCard, idx > 0 && s.locEditCardBorder, { zIndex: (form.locations.length - idx) * 50 }]}
                  >
                    {/* Location header row */}
                    <View style={s.locEditHeader}>
                      <TextInput
                        style={s.locLabelInput}
                        value={loc.label}
                        onChangeText={(v) => updateLocation(loc.id, { label: v })}
                        placeholder={`Label (e.g. ${idx === 0 ? "Main Building" : "Parking Structure"})`}
                        placeholderTextColor={Colors.light.textTertiary}
                      />
                      <TouchableOpacity
                        onPress={() => removeLocation(loc.id)}
                        style={s.removeBtn}
                        activeOpacity={0.7}
                      >
                        <Feather name="x" size={16} color="#B91C1C" />
                      </TouchableOpacity>
                    </View>

                    {/* Google Maps search */}
                    <Text style={s.fieldSubLabel}>Search Google Maps</Text>
                    <AddressLookup
                      value={loc.streetAddress}
                      onSelect={(result) => updateLocation(loc.id, {
                        streetAddress: result.streetAddress,
                        city: result.city,
                        state: result.state,
                        zipCode: result.zipCode,
                        latitude: result.latitude,
                        longitude: result.longitude,
                        googlePlaceId: result.googlePlaceId,
                      })}
                    />

                    {/* City / State / ZIP */}
                    <View style={[s.row, { marginTop: 10 }]}>
                      <View style={s.flex2}>
                        <FormField label="City" value={loc.city} onChangeText={(v) => updateLocation(loc.id, { city: v })} placeholder="Philadelphia" />
                      </View>
                      <View style={s.gap} />
                      <View style={s.flex1}>
                        <FormField label="State" value={loc.state} onChangeText={(v) => updateLocation(loc.id, { state: v })} placeholder="PA" maxLength={2} autoCapitalize="characters" />
                      </View>
                      <View style={s.gap} />
                      <View style={s.flex1}>
                        <FormField label="ZIP" value={loc.zipCode} onChangeText={(v) => updateLocation(loc.id, { zipCode: v })} placeholder="19107" keyboardType="number-pad" maxLength={5} />
                      </View>
                    </View>

                    {/* Lat / Lng */}
                    <View style={s.row}>
                      <View style={s.flex1}>
                        <FormField label="Latitude" value={loc.latitude} onChangeText={(v) => updateLocation(loc.id, { latitude: v })} placeholder="39.9526" keyboardType="decimal-pad" />
                      </View>
                      <View style={s.gap} />
                      <View style={s.flex1}>
                        <FormField label="Longitude" value={loc.longitude} onChangeText={(v) => updateLocation(loc.id, { longitude: v })} placeholder="-75.1652" keyboardType="decimal-pad" />
                      </View>
                    </View>

                    {/* Place ID badge */}
                    {loc.googlePlaceId ? (
                      <View style={s.placeIdRow}>
                        <Feather name="check-circle" size={12} color="#00875D" />
                        <Text style={s.placeIdText} numberOfLines={1}>Place ID: {loc.googlePlaceId}</Text>
                      </View>
                    ) : null}
                  </View>
                ))}
              </View>
            </View>
          );

        case "attributes":
          return (
            <View style={s.card}>
              <SectionHeader title="Physical Attributes" />
              <SelectField label="Property Type" value={form.propertyType} options={PROPERTY_TYPES} onChange={(v) => set("propertyType")(v)} required />
              <View style={s.row}>
                <View style={s.flex1}>
                  <FormField label="Gross Sq Ft" value={form.grossSqFt} onChangeText={set("grossSqFt")} placeholder="25,000" keyboardType="number-pad" />
                </View>
                <View style={s.gap} />
                <View style={s.flex1}>
                  <FormField label="Rentable Units" value={form.numberOfUnits} onChangeText={set("numberOfUnits")} placeholder="0" keyboardType="number-pad" />
                </View>
              </View>
              <FormField label="Year Built" value={form.yearBuilt} onChangeText={set("yearBuilt")} placeholder="2005" keyboardType="number-pad" maxLength={4} />
            </View>
          );

      }
    } else {
      switch (activeTab) {
        case "location": {
          // Prefer the structured locations array; fall back to legacy single-address fields.
          const locs: PropertyLocation[] =
            property?.locations?.length
              ? property.locations
              : property?.streetAddress || property?.city
              ? [{
                  id: `loc_${property!.id}_0`,
                  label: "Main",
                  streetAddress: property!.streetAddress ?? "",
                  city: property!.city ?? "",
                  state: property!.state ?? "",
                  zipCode: property!.zipCode ?? "",
                  latitude: property!.latitude ?? "",
                  longitude: property!.longitude ?? "",
                  googlePlaceId: property!.googlePlaceId ?? "",
                }]
              : [];
          return (
            <View>
              {/* Legal Address */}
              <View style={s.card}>
                <SectionHeader title="Legal Address" subtitle="As recorded on deed, title, or APN" />
                {property?.legalAddress ? (
                  <Text style={s.legalText}>{property.legalAddress}</Text>
                ) : (
                  <Text style={s.emptyHint}>No legal address recorded. Tap Edit to add.</Text>
                )}
              </View>

              {/* Physical Locations */}
              <View style={s.card}>
                <SectionHeader
                  title="Physical Locations"
                  subtitle={`${locs.length} location${locs.length !== 1 ? "s" : ""} · tap to open in Maps`}
                />
                {locs.length === 0 ? (
                  <Text style={s.emptyHint}>No physical locations linked. Tap Edit to add.</Text>
                ) : (
                  locs.map((loc, idx) => {
                    const hasMapData = loc.latitude || loc.longitude || loc.streetAddress;
                    return (
                      <View
                        key={loc.id}
                        style={[s.locCard, idx > 0 && s.locCardBorder]}
                      >
                        <View style={s.locCardHeader}>
                          <View style={s.locLabelBadge}>
                            <Feather name="map-pin" size={11} color={Colors.light.tint} />
                            <Text style={s.locLabelText}>{loc.label || `Location ${idx + 1}`}</Text>
                          </View>
                          {hasMapData && (
                            <TouchableOpacity
                              onPress={() => openInMaps(loc)}
                              style={s.mapBtn}
                              activeOpacity={0.75}
                            >
                              <Feather name="map" size={13} color={Colors.light.tint} />
                              <Text style={s.mapBtnText}>Open in Maps</Text>
                            </TouchableOpacity>
                          )}
                        </View>

                        {loc.streetAddress ? (
                          <Text style={s.locStreet}>{loc.streetAddress}</Text>
                        ) : null}
                        {(loc.city || loc.state || loc.zipCode) ? (
                          <Text style={s.locCityLine}>
                            {[loc.city, [loc.state, loc.zipCode].filter(Boolean).join(" ")].filter(Boolean).join(", ")}
                          </Text>
                        ) : null}
                        {(loc.latitude && loc.longitude) ? (
                          <Text style={s.locCoords}>
                            {Number(loc.latitude).toFixed(5)}, {Number(loc.longitude).toFixed(5)}
                          </Text>
                        ) : null}
                        {loc.googlePlaceId ? (
                          <View style={s.placeIdRow}>
                            <Feather name="check-circle" size={11} color="#00875D" />
                            <Text style={s.placeIdText} numberOfLines={1}>Place ID: {loc.googlePlaceId}</Text>
                          </View>
                        ) : null}

                        <PropertyMapView loc={loc} height={180} />
                        <CensusCard loc={loc} />
                        <FloodZoneCard loc={loc} />
                      </View>
                    );
                  })
                )}
              </View>
            </View>
          );
        }

        case "attributes":
          return (
            <View style={s.card}>
              <SectionHeader title="Physical Attributes" />
              <DetailRow label="Property Type" value={property?.propertyType} />
              <DetailRow label="Gross Sq Ft" value={property?.grossSqFt ? formatSqFt(property.grossSqFt) : undefined} />
              <DetailRow label="Rentable Units" value={property?.numberOfUnits} />
              <DetailRow label="Year Built" value={property?.yearBuilt} last />
            </View>
          );

        case "rent-roll": {
          const occupied = rentRoll.filter((u) => u.leaseStatus === "Occupied").length;
          return (
            <View>
              <View style={s.card}>
                <SectionHeader
                  title="Rent Roll"
                  subtitle={`${rentRoll.length} unit${rentRoll.length !== 1 ? "s" : ""} · ${occupied} occupied`}
                />
                <TouchableOpacity
                  style={s.openEditorBtn}
                  onPress={() => router.push(`/application/${id}/rent-roll` as any)}
                  activeOpacity={0.8}
                >
                  <Feather name="external-link" size={14} color={Colors.light.tint} />
                  <Text style={s.openEditorText}>Open Full Rent Roll Editor</Text>
                </TouchableOpacity>
              </View>
              {rentRoll.length === 0 ? (
                <View style={[s.card, s.emptyCard]}>
                  <Feather name="list" size={28} color={Colors.light.border} />
                  <Text style={s.emptyCardText}>No units yet</Text>
                  <Text style={s.emptyCardSub}>Open the rent roll editor to add units.</Text>
                </View>
              ) : (
                rentRoll.map((unit, idx) => {
                  const statusColor =
                    unit.leaseStatus === "Occupied" ? "#00875D"
                    : unit.leaseStatus === "Vacant" ? "#B91C1C"
                    : unit.leaseStatus === "Notice" ? "#C75300"
                    : "#72777D";
                  return (
                    <View key={unit.id} style={[s.unitCard, idx < rentRoll.length - 1 && s.unitCardBorder]}>
                      <View style={s.unitRow}>
                        <Text style={s.unitId} numberOfLines={1}>{unit.unitIdentifier || "—"}</Text>
                        <View style={[s.statusPill, { backgroundColor: statusColor + "20", borderColor: statusColor + "60" }]}>
                          <Text style={[s.statusPillText, { color: statusColor }]}>{unit.leaseStatus}</Text>
                        </View>
                      </View>
                      <View style={s.unitMeta}>
                        {unit.tenantName ? (
                          <View style={s.unitMetaItem}>
                            <Feather name="user" size={11} color={Colors.light.textTertiary} />
                            <Text style={s.unitMetaText} numberOfLines={1}>{unit.tenantName}</Text>
                          </View>
                        ) : null}
                        {unit.squareFeet ? (
                          <View style={s.unitMetaItem}>
                            <Feather name="maximize-2" size={11} color={Colors.light.textTertiary} />
                            <Text style={s.unitMetaText}>{formatSqFt(unit.squareFeet)} SF</Text>
                          </View>
                        ) : null}
                        {unit.monthlyRentAmount ? (
                          <View style={s.unitMetaItem}>
                            <Feather name="dollar-sign" size={11} color={Colors.light.textTertiary} />
                            <Text style={s.unitMetaText}>${Number(unit.monthlyRentAmount).toLocaleString()}/mo</Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          );
        }

        case "operating-history": {
          const formatCur = (v: string) =>
            v ? `$${Number(v.replace(/,/g, "")).toLocaleString()}` : "—";
          return (
            <View>
              <View style={s.card}>
                <SectionHeader
                  title="Operating History"
                  subtitle={`${opHistory.length} period${opHistory.length !== 1 ? "s" : ""} — DSCR underwriting`}
                />
                <TouchableOpacity
                  style={s.openEditorBtn}
                  onPress={() => router.push(`/application/${id}/operating-history` as any)}
                  activeOpacity={0.8}
                >
                  <Feather name="external-link" size={14} color={Colors.light.tint} />
                  <Text style={s.openEditorText}>Open Full Operating History Editor</Text>
                </TouchableOpacity>
              </View>
              {opHistory.length === 0 ? (
                <View style={[s.card, s.emptyCard]}>
                  <Feather name="trending-up" size={28} color={Colors.light.border} />
                  <Text style={s.emptyCardText}>No periods yet</Text>
                  <Text style={s.emptyCardSub}>Open the operating history editor to add periods.</Text>
                </View>
              ) : (
                opHistory.map((yr, idx) => (
                  <View key={yr.id} style={[s.card, { marginBottom: 10 }]}>
                    <View style={s.opPeriodHeader}>
                      <Text style={s.opPeriodType}>{yr.periodType}</Text>
                      {yr.periodYear ? (
                        <Text style={s.opPeriodYear}>{yr.periodYear}</Text>
                      ) : null}
                    </View>
                    <View style={s.opGrid}>
                      <View style={s.opCell}>
                        <Text style={s.opCellLabel}>EGI</Text>
                        <Text style={s.opCellValue}>{formatCur(yr.effectiveGrossIncome)}</Text>
                      </View>
                      <View style={s.opCell}>
                        <Text style={s.opCellLabel}>NOI</Text>
                        <Text style={s.opCellValue}>{formatCur(yr.netOperatingIncome)}</Text>
                      </View>
                      <View style={s.opCell}>
                        <Text style={s.opCellLabel}>Total Expenses</Text>
                        <Text style={s.opCellValue}>{formatCur(yr.totalOperatingExpenses)}</Text>
                      </View>
                    </View>
                  </View>
                ))
              )}
            </View>
          );
        }
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

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  card: {
    backgroundColor: Colors.light.backgroundCard,
    borderWidth: 1, borderColor: Colors.light.border,
    borderRadius: 4, padding: 16,
    marginBottom: 12,
  },
  row: { flexDirection: "row", alignItems: "flex-end" },
  flex1: { flex: 1 },
  flex2: { flex: 2 },
  gap: { width: 8 },

  // ── Legal address ──────────────────────────────────────────────────────────
  legalInput: {
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 10 : 8,
    paddingTop: 10,
    fontSize: 14,
    fontFamily: "OpenSans_400Regular",
    color: Colors.light.text,
    backgroundColor: Colors.light.background,
    minHeight: 90,
    marginTop: 4,
  },
  legalText: {
    fontSize: 13,
    fontFamily: "OpenSans_400Regular",
    color: Colors.light.text,
    lineHeight: 20,
    marginTop: 4,
  },
  emptyHint: {
    fontSize: 12,
    fontFamily: "OpenSans_400Regular",
    color: Colors.light.textTertiary,
    fontStyle: "italic",
    marginTop: 4,
  },

  // ── Physical locations (read) ───────────────────────────────────────────────
  locCard: { paddingVertical: 12 },
  locCardBorder: {
    borderTopWidth: 1,
    borderTopColor: Colors.light.borderLight,
  },
  locCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  locLabelBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: Colors.light.tintLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  locLabelText: {
    fontSize: 11,
    fontFamily: "OpenSans_700Bold",
    color: Colors.light.tint,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  mapBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: Colors.light.tint,
    backgroundColor: Colors.light.tintLight,
  },
  mapBtnText: {
    fontSize: 12,
    fontFamily: "OpenSans_600SemiBold",
    color: Colors.light.tint,
  },
  locStreet: {
    fontSize: 13,
    fontFamily: "OpenSans_600SemiBold",
    color: Colors.light.text,
    marginBottom: 1,
  },
  locCityLine: {
    fontSize: 12,
    fontFamily: "OpenSans_400Regular",
    color: Colors.light.textSecondary,
    marginBottom: 2,
  },
  locCoords: {
    fontSize: 11,
    fontFamily: "OpenSans_400Regular",
    color: Colors.light.textTertiary,
    marginTop: 2,
  },

  // ── Physical locations (edit) ───────────────────────────────────────────────
  locSectionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  addLocBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: Colors.light.tint,
    marginTop: 2,
  },
  addLocText: {
    fontSize: 12,
    fontFamily: "OpenSans_600SemiBold",
    color: Colors.light.tint,
  },
  emptyLocBox: {
    alignItems: "center",
    paddingVertical: 20,
    gap: 8,
  },
  emptyLocText: {
    fontSize: 12,
    fontFamily: "OpenSans_400Regular",
    color: Colors.light.textTertiary,
    textAlign: "center",
    fontStyle: "italic",
  },
  locEditCard: {
    paddingTop: 12,
  },
  locEditCardBorder: {
    borderTopWidth: 1,
    borderTopColor: Colors.light.borderLight,
    marginTop: 12,
  },
  locEditHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  locLabelInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: Platform.OS === "ios" ? 8 : 6,
    fontSize: 13,
    fontFamily: "OpenSans_600SemiBold",
    color: Colors.light.text,
    backgroundColor: Colors.light.background,
  },
  removeBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 4,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  fieldSubLabel: {
    fontSize: 11,
    fontFamily: "OpenSans_600SemiBold",
    color: Colors.light.textSecondary,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    marginBottom: 6,
    marginTop: 2,
  },

  // ── Place ID ───────────────────────────────────────────────────────────────
  placeIdRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.light.borderLight,
  },
  placeIdText: {
    fontSize: 11,
    fontFamily: "OpenSans_400Regular",
    color: Colors.light.textSecondary,
    flex: 1,
  },

  // ── Rent Roll / Operating History ──────────────────────────────────────────
  openEditorBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: Colors.light.tint,
    backgroundColor: Colors.light.tintLight,
    alignSelf: "flex-start",
  },
  openEditorText: {
    fontSize: 13,
    fontFamily: "OpenSans_600SemiBold",
    color: Colors.light.tint,
  },
  emptyCard: {
    alignItems: "center",
    paddingVertical: 28,
    gap: 8,
  },
  emptyCardText: {
    fontSize: 14,
    fontFamily: "OpenSans_600SemiBold",
    color: Colors.light.textTertiary,
  },
  emptyCardSub: {
    fontSize: 12,
    fontFamily: "OpenSans_400Regular",
    color: Colors.light.textTertiary,
    textAlign: "center",
  },
  unitCard: {
    backgroundColor: Colors.light.backgroundCard,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 4,
    padding: 12,
    marginBottom: 8,
  },
  unitCardBorder: {},
  unitRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  unitId: {
    fontSize: 13,
    fontFamily: "OpenSans_700Bold",
    color: Colors.light.text,
    flex: 1,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    marginLeft: 8,
  },
  statusPillText: { fontSize: 11, fontFamily: "OpenSans_600SemiBold" },
  unitMeta: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  unitMetaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  unitMetaText: { fontSize: 11, fontFamily: "OpenSans_400Regular", color: Colors.light.textSecondary },
  opPeriodHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  opPeriodType: {
    fontSize: 13,
    fontFamily: "OpenSans_700Bold",
    color: Colors.light.text,
  },
  opPeriodYear: {
    fontSize: 12,
    fontFamily: "OpenSans_400Regular",
    color: Colors.light.textSecondary,
  },
  opGrid: {
    flexDirection: "row",
    gap: 8,
  },
  opCell: {
    flex: 1,
    backgroundColor: Colors.light.background,
    borderRadius: 4,
    padding: 8,
    alignItems: "center",
  },
  opCellLabel: {
    fontSize: 10,
    fontFamily: "OpenSans_600SemiBold",
    color: Colors.light.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  opCellValue: {
    fontSize: 13,
    fontFamily: "OpenSans_700Bold",
    color: Colors.light.text,
  },
});
