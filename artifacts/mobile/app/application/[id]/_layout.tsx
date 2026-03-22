import { Stack } from "expo-router";
import React from "react";

export default function ApplicationLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="property" />
      <Stack.Screen name="loan" />
      <Stack.Screen name="borrower" />
      <Stack.Screen name="amortization" />
      <Stack.Screen name="comments" />
      <Stack.Screen name="documents" />
    </Stack>
  );
}
