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
      <Stack.Screen name="credit-evaluation" />
      <Stack.Screen name="commitment-letter" />
      <Stack.Screen name="processing" />
      <Stack.Screen name="closing-details" />
      <Stack.Screen name="conditions" />
      <Stack.Screen name="exceptions" />
      <Stack.Screen name="tasks" />
      <Stack.Screen name="rent-roll" />
      <Stack.Screen name="operating-history" />
    </Stack>
  );
}
