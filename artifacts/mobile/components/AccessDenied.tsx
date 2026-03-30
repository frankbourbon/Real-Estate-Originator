import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import Colors from "@/constants/colors";

/**
 * Shown when the current session user does not have VIEW access to a screen.
 */
export function AccessDenied({ screenLabel }: { screenLabel?: string }) {
  return (
    <View style={s.container}>
      <View style={s.iconRing}>
        <Feather name="lock" size={26} color={Colors.light.textTertiary} />
      </View>
      <Text style={s.title}>Access Restricted</Text>
      <Text style={s.body}>
        {screenLabel
          ? `Your profile does not include VIEW access to ${screenLabel}.`
          : "Your profile does not grant access to this screen."}
      </Text>
      <Text style={s.hint}>
        Contact your system administrator to request access.
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    backgroundColor: Colors.light.background,
    gap: 0,
  },
  iconRing: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.light.backgroundCard,
    borderWidth: 1,
    borderColor: Colors.light.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 17,
    fontFamily: "OpenSans_700Bold",
    color: Colors.light.text,
    marginBottom: 8,
    textAlign: "center",
  },
  body: {
    fontSize: 13,
    fontFamily: "OpenSans_400Regular",
    color: Colors.light.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 12,
  },
  hint: {
    fontSize: 12,
    fontFamily: "OpenSans_400Regular",
    color: Colors.light.textTertiary,
    textAlign: "center",
    lineHeight: 18,
  },
});
