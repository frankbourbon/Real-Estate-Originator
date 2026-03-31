import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { StatusBadge } from "@/components/StatusBadge";
import Colors from "@/constants/colors";
import { useCoreService } from "@/services/core";
import type { LoanApplication } from "@/services/core";
import { useLoanTeamService } from "@/services/loan-team";
import { useDocumentsService } from "@/services/documents";
import {
  formatCurrency,
  formatDate,
  getBorrowerDisplayName,
  getPropertyShortAddress,
  getPropertyCityState,
} from "@/utils/formatting";

type Props = {
  application: LoanApplication;
};

export function ApplicationCard({ application }: Props) {
  const { getBorrower, getProperty } = useCoreService();
  const { getComments } = useLoanTeamService();
  const { getDocuments } = useDocumentsService();

  const borrower = getBorrower(application.borrowerId);
  const property = getProperty(application.propertyId);
  const commentCount = getComments(application.id).length;
  const documentCount = getDocuments(application.id).length;

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.85}
      onPress={() =>
        router.push({ pathname: "/application/[id]", params: { id: application.id } })
      }
    >
      {/* Left accent bar */}
      <View style={styles.accentBar} />

      <View style={styles.body}>
        {/* Top row */}
        <View style={styles.header}>
          <View style={styles.typeTag}>
            <Text style={styles.typeText}>{property?.propertyType ?? "CRE"}</Text>
          </View>
          <StatusBadge status={application.status} size="sm" />
        </View>

        {/* Address */}
        <Text style={styles.address} numberOfLines={1}>
          {getPropertyShortAddress(property) || "Address not set"}
        </Text>
        <Text style={styles.cityState} numberOfLines={1}>
          {getPropertyCityState(property) || "City, State"}
        </Text>

        {/* Borrower */}
        <View style={styles.borrowerRow}>
          <Feather name="user" size={11} color={Colors.light.textTertiary} />
          <Text style={styles.borrowerText} numberOfLines={1}>
            {getBorrowerDisplayName(borrower)}
            {borrower?.entityName ? `  ·  ${borrower.entityName}` : ""}
          </Text>
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Metrics row */}
        <View style={styles.metricsRow}>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Loan Amt</Text>
            <Text style={styles.metricValue}>
              {application.loanAmountUsd ? formatCurrency(application.loanAmountUsd) : "—"}
            </Text>
          </View>
          <View style={styles.metricSep} />
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Type</Text>
            <Text style={styles.metricValue}>{application.loanType || "—"}</Text>
          </View>
          <View style={styles.metricSep} />
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>Updated</Text>
            <Text style={styles.metricValue}>{formatDate(application.updatedAt)}</Text>
          </View>
        </View>

        {/* Footer badges */}
        {(commentCount > 0 || documentCount > 0) && (
          <View style={styles.badges}>
            {commentCount > 0 && (
              <View style={styles.badge}>
                <Feather name="message-circle" size={11} color={Colors.light.tint} />
                <Text style={styles.badgeText}>{commentCount}</Text>
              </View>
            )}
            {documentCount > 0 && (
              <View style={styles.badge}>
                <Feather name="paperclip" size={11} color={Colors.light.tint} />
                <Text style={styles.badgeText}>{documentCount}</Text>
              </View>
            )}
          </View>
        )}
      </View>

      <View style={styles.chevronBox}>
        <Feather name="chevron-right" size={16} color={Colors.light.textTertiary} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.light.backgroundCard,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: Colors.light.border,
    marginBottom: 8,
    flexDirection: "row",
    overflow: "hidden",
  },
  accentBar: {
    width: 4,
    backgroundColor: Colors.light.tint,
  },
  body: {
    flex: 1,
    padding: 14,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  typeTag: {
    backgroundColor: Colors.light.tintLight,
    borderRadius: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  typeText: {
    color: Colors.light.tintDark,
    fontSize: 10,
    fontFamily: "OpenSans_700Bold",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  address: {
    fontSize: 15,
    fontFamily: "OpenSans_700Bold",
    color: Colors.light.text,
    marginBottom: 2,
    letterSpacing: -0.2,
  },
  cityState: {
    fontSize: 12,
    fontFamily: "OpenSans_400Regular",
    color: Colors.light.textSecondary,
    marginBottom: 6,
  },
  borrowerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 2,
  },
  borrowerText: {
    fontSize: 11,
    fontFamily: "OpenSans_400Regular",
    color: Colors.light.textTertiary,
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.light.border,
    marginVertical: 10,
  },
  metricsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  metric: {
    flex: 1,
  },
  metricLabel: {
    fontSize: 9,
    fontFamily: "OpenSans_600SemiBold",
    color: Colors.light.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 12,
    fontFamily: "OpenSans_600SemiBold",
    color: Colors.light.text,
  },
  metricSep: {
    width: 1,
    height: 24,
    backgroundColor: Colors.light.border,
    marginHorizontal: 10,
  },
  badges: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.light.tintLight,
    borderRadius: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: "OpenSans_600SemiBold",
    color: Colors.light.tint,
  },
  chevronBox: {
    justifyContent: "center",
    paddingRight: 12,
  },
});
