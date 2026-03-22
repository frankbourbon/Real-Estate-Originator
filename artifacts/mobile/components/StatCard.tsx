import React from "react";
import { StyleSheet, Text, View } from "react-native";

import Colors from "@/constants/colors";

type Props = {
  label: string;
  value: string | number;
  color?: string;
  bg?: string;
  border?: string;
};

export function StatCard({
  label,
  value,
  color = Colors.light.text,
  bg = Colors.light.backgroundCard,
  border = Colors.light.border,
}: Props) {
  return (
    <View style={[styles.card, { backgroundColor: bg, borderColor: border }]}>
      <Text style={[styles.value, { color }]}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 4,
    padding: 16,
    borderWidth: 1,
  },
  value: {
    fontSize: 24,
    fontFamily: "OpenSans_700Bold",
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  label: {
    fontSize: 12,
    fontFamily: "OpenSans_600SemiBold",
    color: Colors.light.textSecondary,
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
});
