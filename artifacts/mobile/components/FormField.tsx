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
        {required && <Text style={styles.required}> *</Text>}
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
        {suffix ? <Text style={styles.affixRight}>{suffix}</Text> : null}
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
    marginBottom: 4,
  },
  label: {
    fontSize: 12,
    fontFamily: "OpenSans_600SemiBold",
    color: Colors.light.textSecondary,
    letterSpacing: 0.2,
    textTransform: "uppercase",
  },
  required: {
    fontSize: 12,
    color: Colors.light.error,
    fontFamily: "OpenSans_600SemiBold",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.backgroundCard,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 4,
    paddingHorizontal: 12,
    minHeight: 44,
  },
  inputError: {
    borderColor: Colors.light.error,
    borderWidth: 2,
  },
  inputDisabled: {
    backgroundColor: Colors.light.background,
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontFamily: "OpenSans_400Regular",
    color: Colors.light.text,
    paddingVertical: 10,
  },
  affix: {
    fontSize: 14,
    fontFamily: "OpenSans_400Regular",
    color: Colors.light.textSecondary,
    marginRight: 6,
  },
  affixRight: {
    fontSize: 14,
    fontFamily: "OpenSans_400Regular",
    color: Colors.light.textSecondary,
    marginLeft: 6,
  },
  hint: {
    fontSize: 11,
    fontFamily: "OpenSans_400Regular",
    color: Colors.light.textTertiary,
    marginTop: 4,
  },
  errorText: {
    fontSize: 11,
    fontFamily: "OpenSans_400Regular",
    color: Colors.light.error,
    marginTop: 4,
  },
});
