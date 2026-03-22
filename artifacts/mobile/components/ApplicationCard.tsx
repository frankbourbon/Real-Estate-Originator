import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import Colors from "@/constants/colors";
import type { LOAApplication } from "@/context/ApplicationContext";
import { StatusBadge } from "@/components/StatusBadge";
import { formatCurrency, formatDate, getPropertyShortAddress } from "@/utils/formatting";

type Props = {
  application: LOAApplication;
};

export function ApplicationCard({ application }: Props) {
  const shortAddress = getPropertyShortAddress(application);
  const hasLoanAmount = !!application.loanAmount;

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.7}
      onPress={() => router.push({ pathname: "/application/[id]", params: { id: application.id } })}
    >
      <View style={styles.header}>
        <View style={styles.typeTag}>
          <Text style={styles.typeText}>{application.propertyType || "CRE"}</Text>
        </View>
        <StatusBadge status={application.status} size="sm" />
      </View>

      <Text style={styles.address} numberOfLines={1}>
        {shortAddress || "Address not set"}
      </Text>
      <Text style={styles.cityState} numberOfLines={1}>
        {[application.propertyCity, application.propertyState].filter(Boolean).join(", ") || "City, State"}
      </Text>

      <View style={styles.divider} />

      <View style={styles.footer}>
        <View style={styles.footerItem}>
          <Text style={styles.footerLabel}>Loan Amount</Text>
          <Text style={styles.footerValue}>
            {hasLoanAmount ? formatCurrency(application.loanAmount) : "—"}
          </Text>
        </View>
        <View style={styles.footerDivider} />
        <View style={styles.footerItem}>
          <Text style={styles.footerLabel}>Type</Text>
          <Text style={styles.footerValue}>{application.loanType || "—"}</Text>
        </View>
        <View style={styles.footerDivider} />
        <View style={styles.footerItem}>
          <Text style={styles.footerLabel}>Updated</Text>
          <Text style={styles.footerValue}>{formatDate(application.updatedAt)}</Text>
        </View>
      </View>

      <View style={styles.chevron}>
        <Feather name="chevron-right" size={16} color={Colors.light.textTertiary} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.light.backgroundCard,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    position: "relative",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  typeTag: {
    backgroundColor: Colors.light.tint + "15",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  typeText: {
    color: Colors.light.tint,
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  address: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: Colors.light.text,
    marginBottom: 2,
  },
  cityState: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.light.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.light.border,
    marginVertical: 12,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
  },
  footerItem: {
    flex: 1,
  },
  footerLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: Colors.light.textTertiary,
    marginBottom: 2,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  footerValue: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.light.text,
  },
  footerDivider: {
    width: 1,
    height: 28,
    backgroundColor: Colors.light.border,
    marginHorizontal: 10,
  },
  chevron: {
    position: "absolute",
    right: 16,
    bottom: 16,
  },
});
