import { useLocalSearchParams } from "expo-router";
import React from "react";
import { StyleSheet, View } from "react-native";

import { DetailRow } from "@/components/DetailRow";
import { SectionHeader } from "@/components/SectionHeader";
import { SectionScreenLayout } from "@/components/SectionScreenLayout";
import Colors from "@/constants/colors";
import { useApplications } from "@/context/ApplicationContext";
import { formatCurrencyFull } from "@/utils/formatting";

export default function LoanSection() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getApplication } = useApplications();
  const app = getApplication(id);

  return (
    <SectionScreenLayout
      title="Loan Terms"
      subtitle="Structure, rate, and amortization"
    >
      <View style={styles.card}>
        <SectionHeader title="Loan Structure" />
        <DetailRow label="Loan Type" value={app?.loanType} />
        <DetailRow
          label="Loan Amount (USD)"
          value={app?.loanAmountUsd ? formatCurrencyFull(app.loanAmountUsd) : undefined}
        />
        <DetailRow label="LTV (%)" value={app?.ltvPct ? `${app.ltvPct}%` : undefined} />
        <DetailRow label="DSCR (×)" value={app?.dscrRatio ? `${app.dscrRatio}×` : undefined} />
        <DetailRow label="Interest Type" value={app?.interestType} />
        <DetailRow
          label="Interest Rate (% p.a.)"
          value={app?.interestRatePct ? `${app.interestRatePct}%` : undefined}
        />
        <DetailRow
          label="Loan Term"
          value={app?.loanTermYears ? `${app.loanTermYears} years` : undefined}
        />
        <DetailRow label="Amortization" value={app?.amortizationType} />
        <DetailRow label="Target Closing Date" value={app?.targetClosingDate} last />
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
