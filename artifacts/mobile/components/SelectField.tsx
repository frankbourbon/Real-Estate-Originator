import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  FlatList,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
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
          {required && <Text style={styles.required}>*</Text>}
        </View>
        <TouchableOpacity
          style={styles.selector}
          onPress={() => setOpen(true)}
          activeOpacity={0.7}
        >
          <Text style={[styles.selectorText, !value && styles.placeholder]}>
            {value || `Select ${label}`}
          </Text>
          <Feather name="chevron-down" size={16} color={Colors.light.textSecondary} />
        </TouchableOpacity>
      </View>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setOpen(false)} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>{label}</Text>
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
  selector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.light.backgroundCard,
    borderWidth: 1.5,
    borderColor: Colors.light.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 46,
  },
  selectorText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.light.text,
  },
  placeholder: {
    color: Colors.light.textTertiary,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.light.backgroundCard,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    paddingHorizontal: 16,
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
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.light.text,
    marginBottom: 12,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.borderLight,
  },
  optionSelected: {
    backgroundColor: Colors.light.tint + "08",
  },
  optionText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.light.text,
  },
  optionTextSelected: {
    fontFamily: "Inter_600SemiBold",
    color: Colors.light.tint,
  },
});
