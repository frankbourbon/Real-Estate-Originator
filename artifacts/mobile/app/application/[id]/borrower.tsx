import { useLocalSearchParams } from "expo-router";
import React from "react";
import { StyleSheet, View } from "react-native";

import { DetailRow } from "@/components/DetailRow";
import { SectionHeader } from "@/components/SectionHeader";
import { SectionScreenLayout } from "@/components/SectionScreenLayout";
import Colors from "@/constants/colors";
import { useApplications } from "@/context/ApplicationContext";
import { formatCurrencyFull, getBorrowerDisplayName } from "@/utils/formatting";

export default function BorrowerSection() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getApplication, getBorrower } = useApplications();
  const app = getApplication(id);
  const borrower = getBorrower(app?.borrowerId ?? "");

  return (
    <SectionScreenLayout
      title="Borrower Profile"
      subtitle={getBorrowerDisplayName(borrower)}
    >
      <View style={styles.card}>
        <SectionHeader title="Identity" />
        <DetailRow label="First Name" value={borrower?.firstName} />
        <DetailRow label="Last Name" value={borrower?.lastName} />
        <DetailRow label="Entity / Company" value={borrower?.entityName} last />
      </View>

      <View style={styles.card}>
        <SectionHeader title="Contact" />
        <DetailRow label="Email" value={borrower?.email} />
        <DetailRow label="Phone" value={borrower?.phone} last />
      </View>

      <View style={styles.card}>
        <SectionHeader title="Financial Profile" />
        <DetailRow
          label="CRE Experience"
          value={borrower?.creExperienceYears ? `${borrower.creExperienceYears} years` : undefined}
        />
        <DetailRow
          label="Net Worth (USD)"
          value={borrower?.netWorthUsd ? formatCurrencyFull(borrower.netWorthUsd) : undefined}
        />
        <DetailRow
          label="Liquid Assets (USD)"
          value={borrower?.liquidityUsd ? formatCurrencyFull(borrower.liquidityUsd) : undefined}
        />
        <DetailRow label="FICO Credit Score" value={borrower?.creditScore} last />
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
