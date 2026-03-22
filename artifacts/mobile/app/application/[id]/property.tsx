import { useLocalSearchParams } from "expo-router";
import React from "react";
import { StyleSheet, View } from "react-native";

import { DetailRow } from "@/components/DetailRow";
import { SectionHeader } from "@/components/SectionHeader";
import { SectionScreenLayout } from "@/components/SectionScreenLayout";
import Colors from "@/constants/colors";
import { useApplications } from "@/context/ApplicationContext";
import { formatPct, formatSqFt, getPropertyCityState } from "@/utils/formatting";

export default function PropertySection() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getApplication, getProperty } = useApplications();
  const app = getApplication(id);
  const property = getProperty(app?.propertyId ?? "");

  return (
    <SectionScreenLayout
      title="Property Details"
      subtitle={getPropertyCityState(property) || property?.propertyType || ""}
    >
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
        <SectionHeader
          title="Occupancy"
          subtitle="Unit-based vs rent-based — two distinct measures"
        />
        <DetailRow
          label="Physical Occupancy"
          value={property?.physicalOccupancyPct
            ? `${formatPct(property.physicalOccupancyPct)} (unit-based)`
            : undefined}
        />
        <DetailRow
          label="Economic Occupancy"
          value={property?.economicOccupancyPct
            ? `${formatPct(property.economicOccupancyPct)} (rent-based)`
            : undefined}
          last
        />
      </View>
    </SectionScreenLayout>
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
});
