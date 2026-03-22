import React from "react";
import { StyleSheet, Text, View } from "react-native";

import Colors from "@/constants/colors";
import type { ApplicationStatus } from "@/context/ApplicationContext";

type Props = { status: ApplicationStatus; size?: "sm" | "md" };

const statusConfig: Record<ApplicationStatus, { label: string; color: string; bg: string; border: string }> = {
  Draft: {
    label: "Draft",
    color: Colors.light.statusDraft,
    bg: Colors.light.statusDraftBg,
    border: Colors.light.statusDraft + "40",
  },
  Submitted: {
    label: "Submitted",
    color: Colors.light.statusSubmitted,
    bg: Colors.light.statusSubmittedBg,
    border: Colors.light.statusSubmitted + "40",
  },
  "Under Review": {
    label: "Under Review",
    color: Colors.light.statusReview,
    bg: Colors.light.statusReviewBg,
    border: Colors.light.statusReview + "40",
  },
  Approved: {
    label: "Approved",
    color: Colors.light.statusApproved,
    bg: Colors.light.statusApprovedBg,
    border: Colors.light.statusApproved + "40",
  },
  Declined: {
    label: "Declined",
    color: Colors.light.statusDeclined,
    bg: Colors.light.statusDeclinedBg,
    border: Colors.light.statusDeclined + "40",
  },
};

export function StatusBadge({ status, size = "md" }: Props) {
  const config = statusConfig[status];
  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: config.bg,
          borderColor: config.border,
        },
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
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    gap: 5,
    alignSelf: "flex-start",
  },
  badgeSm: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    fontSize: 12,
    fontFamily: "OpenSans_600SemiBold",
    letterSpacing: 0.2,
  },
  labelSm: {
    fontSize: 11,
  },
});
