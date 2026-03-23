import React from "react";
import { StyleSheet, Text, View } from "react-native";

import type { ApplicationStatus } from "@/context/ApplicationContext";
import { PHASE_INFO } from "@/utils/phases";

type Props = { status: ApplicationStatus; size?: "sm" | "md" };

export function StatusBadge({ status, size = "md" }: Props) {
  const info = PHASE_INFO[status];
  if (!info) return null;
  const { color, bg } = info;

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: bg, borderColor: color + "40" },
        size === "sm" && styles.badgeSm,
      ]}
    >
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text
        style={[styles.label, { color }, size === "sm" && styles.labelSm]}
        numberOfLines={1}
      >
        {status}
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
  badgeSm: { paddingHorizontal: 6, paddingVertical: 2 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  label: { fontSize: 12, fontFamily: "OpenSans_600SemiBold", letterSpacing: 0.2 },
  labelSm: { fontSize: 10 },
});
