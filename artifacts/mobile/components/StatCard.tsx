import React from "react";
import { StyleSheet, Text, View } from "react-native";

import Colors from "@/constants/colors";

type Props = {
  label: string;
  value: string | number;
  color?: string;
  bg?: string;
};

export function StatCard({ label, value, color = Colors.light.text, bg = Colors.light.backgroundCard }: Props) {
  return (
    <View style={[styles.card, { backgroundColor: bg }]}>
      <Text style={[styles.value, { color }]}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 14,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  value: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    marginBottom: 2,
  },
  label: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.light.textSecondary,
    letterSpacing: 0.2,
  },
});
