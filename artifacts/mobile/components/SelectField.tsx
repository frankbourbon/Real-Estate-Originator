import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";

type Props = {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  required?: boolean;
};

export function SelectField({ label, value, options, onChange, required }: Props) {
  const [open, setOpen] = useState(false);
  const insets = useSafeAreaInsets();

  return (
    <>
      <View style={styles.wrapper}>
        <View style={styles.labelRow}>
          <Text style={styles.label}>{label}</Text>
          {required && <Text style={styles.required}> *</Text>}
        </View>
        <TouchableOpacity
          style={styles.selector}
          onPress={() => setOpen(true)}
          activeOpacity={0.8}
        >
          <Text style={[styles.selectorText, !value && styles.placeholder]}>
            {value || `Select ${label}`}
          </Text>
          <Feather name="chevron-down" size={14} color={Colors.light.textSecondary} />
        </TouchableOpacity>
      </View>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setOpen(false)} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>{label}</Text>
          <View style={styles.divider} />
          <FlatList
            data={options}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.option, item === value && styles.optionSelected]}
                onPress={() => {
                  onChange(item);
                  setOpen(false);
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.optionText, item === value && styles.optionTextSelected]}>
                  {item}
                </Text>
                {item === value && (
                  <Feather name="check" size={16} color={Colors.light.tint} />
                )}
              </TouchableOpacity>
            )}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </Modal>
    </>
  );
}

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
  selector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.light.backgroundCard,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 44,
  },
  selectorText: {
    fontSize: 14,
    fontFamily: "OpenSans_400Regular",
    color: Colors.light.text,
  },
  placeholder: {
    color: Colors.light.textTertiary,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.light.backgroundCard,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    paddingTop: 12,
    paddingHorizontal: 20,
    maxHeight: "60%",
  },
  sheetHandle: {
    width: 36,
    height: 4,
    backgroundColor: Colors.light.border,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 14,
    fontFamily: "OpenSans_700Bold",
    color: Colors.light.text,
    letterSpacing: 0.2,
    marginBottom: 12,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.light.border,
    marginBottom: 4,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 0,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.borderLight,
  },
  optionSelected: {
    backgroundColor: Colors.light.tintLight + "60",
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  optionText: {
    fontSize: 14,
    fontFamily: "OpenSans_400Regular",
    color: Colors.light.text,
  },
  optionTextSelected: {
    fontFamily: "OpenSans_700Bold",
    color: Colors.light.tint,
  },
});
