import React from "react";
import { StyleSheet, Text, View } from "react-native";

import Colors from "@/constants/colors";

type Props = {
  label: string;
  value?: string;
  last?: boolean;
};

export function DetailRow({ label, value, last }: Props) {
  return (
    <View style={[styles.row, last && styles.last]}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value} numberOfLines={2}>
        {value || "—"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.borderLight,
    gap: 16,
  },
  last: {
    borderBottomWidth: 0,
  },
  label: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.light.textSecondary,
    flex: 1,
  },
  value: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.light.text,
    flex: 1.5,
    textAlign: "right",
  },
});
