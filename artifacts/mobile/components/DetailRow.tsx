import React from "react";
import { StyleSheet, Text, View } from "react-native";

import Colors from "@/constants/colors";

type Props = {
  label: string;
  value?: string;
  last?: boolean;
  hint?: string;
};

export function DetailRow({ label, value, last, hint }: Props) {
  return (
    <View style={[styles.row, last && styles.last]}>
      <View style={styles.labelCol}>
        <Text style={styles.label}>{label}</Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
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
    borderBottomColor: Colors.light.border,
    gap: 16,
  },
  last: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  labelCol: { flex: 1 },
  label: {
    fontSize: 13,
    fontFamily: "OpenSans_400Regular",
    color: Colors.light.textSecondary,
  },
  hint: {
    fontSize: 10,
    fontFamily: "OpenSans_400Regular",
    color: Colors.light.textTertiary,
    marginTop: 2,
  },
  value: {
    fontSize: 13,
    fontFamily: "OpenSans_600SemiBold",
    color: Colors.light.text,
    flex: 1.5,
    textAlign: "right",
  },
});
