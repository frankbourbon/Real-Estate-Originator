import React from "react";
import { StyleSheet, Text, View } from "react-native";

import Colors from "@/constants/colors";
import type { ApplicationStatus } from "@/context/ApplicationContext";

type Props = { status: ApplicationStatus; size?: "sm" | "md" };

const statusConfig: Record<ApplicationStatus, { label: string; color: string; bg: string }> = {
  Draft: {
    label: "Draft",
    color: Colors.light.statusDraft,
    bg: Colors.light.statusDraftBg,
  },
  Submitted: {
    label: "Submitted",
    color: Colors.light.statusSubmitted,
    bg: Colors.light.statusSubmittedBg,
  },
  "Under Review": {
    label: "Under Review",
    color: Colors.light.statusReview,
    bg: Colors.light.statusReviewBg,
  },
  Approved: {
    label: "Approved",
    color: Colors.light.statusApproved,
    bg: Colors.light.statusApprovedBg,
  },
  Declined: {
    label: "Declined",
    color: Colors.light.statusDeclined,
    bg: Colors.light.statusDeclinedBg,
  },
};

export function StatusBadge({ status, size = "md" }: Props) {
  const config = statusConfig[status];
  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: config.bg },
        size === "sm" && styles.badgeSm,
      ]}
    >
      <View style={[styles.dot, { backgroundColor: config.color }]} />
      <Text
        style={[
          styles.label,
          { color: config.color },
          size === "sm" && styles.labelSm,
        ]}
      >
        {config.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 5,
    alignSelf: "flex-start",
  },
  badgeSm: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.1,
  },
  labelSm: {
    fontSize: 11,
  },
});
