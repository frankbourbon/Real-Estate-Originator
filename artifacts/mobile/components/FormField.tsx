import React, { forwardRef } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from "react-native";

import Colors from "@/constants/colors";

type Props = TextInputProps & {
  label: string;
  hint?: string;
  error?: string;
  prefix?: string;
  suffix?: string;
  required?: boolean;
};

export const FormField = forwardRef<TextInput, Props>(function FormField(
  { label, hint, error, prefix, suffix, required, style, ...props },
  ref
) {
  return (
    <View style={styles.wrapper}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {required && <Text style={styles.required}>*</Text>}
      </View>
      <View
        style={[
          styles.inputContainer,
          error ? styles.inputError : null,
          props.editable === false ? styles.inputDisabled : null,
        ]}
      >
        {prefix ? <Text style={styles.affix}>{prefix}</Text> : null}
        <TextInput
          ref={ref}
          style={[styles.input, style]}
          placeholderTextColor={Colors.light.textTertiary}
          {...props}
        />
        {suffix ? <Text style={styles.affix}>{suffix}</Text> : null}
      </View>
      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 16,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    gap: 2,
  },
  label: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.light.textSecondary,
    letterSpacing: 0.1,
  },
  required: {
    fontSize: 13,
    color: Colors.light.error,
    fontFamily: "Inter_500Medium",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.backgroundCard,
    borderWidth: 1.5,
    borderColor: Colors.light.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    minHeight: 46,
  },
  inputError: {
    borderColor: Colors.light.error,
  },
  inputDisabled: {
    backgroundColor: Colors.light.backgroundSecondary,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.light.text,
    paddingVertical: 10,
  },
  affix: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.light.textSecondary,
    marginRight: 4,
  },
  hint: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.light.textTertiary,
    marginTop: 4,
  },
  errorText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.light.error,
    marginTop: 4,
  },
});
