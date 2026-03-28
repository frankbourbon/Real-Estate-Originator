import { Feather } from "@expo/vector-icons";
import React, { useCallback, useState } from "react";
import {
  LayoutChangeEvent,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import Colors from "@/constants/colors";

export type Tab = {
  key: string;
  label: string;
  icon?: keyof typeof Feather.glyphMap;
};

type Props = {
  tabs: Tab[];
  activeTab: string;
  onSelect: (key: string) => void;
};

const OVERFLOW_BTN_W = 44;
const TAB_MIN_W = 88;

export function TabBar({ tabs, activeTab, onSelect }: Props) {
  const [containerW, setContainerW] = useState(0);
  const [overflowOpen, setOverflowOpen] = useState(false);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    setContainerW(e.nativeEvent.layout.width);
  }, []);

  const visibleCount = containerW > 0
    ? Math.min(
        tabs.length,
        Math.max(1, Math.floor((containerW - OVERFLOW_BTN_W) / TAB_MIN_W))
      )
    : tabs.length;

  const hasOverflow = visibleCount < tabs.length;
  const visibleTabs = tabs.slice(0, hasOverflow ? visibleCount : tabs.length);
  const overflowTabs = hasOverflow ? tabs.slice(visibleCount) : [];
  const overflowActive = overflowTabs.some((t) => t.key === activeTab);

  return (
    <View style={styles.wrapper} onLayout={onLayout}>
      {/* Visible tab pills */}
      {visibleTabs.map((tab) => {
        const isActive = tab.key === activeTab;
        return (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, isActive && styles.tabActive]}
            onPress={() => onSelect(tab.key)}
            activeOpacity={0.75}
          >
            {tab.icon && (
              <Feather
                name={tab.icon}
                size={12}
                color={isActive ? Colors.light.tint : Colors.light.textSecondary}
                style={styles.tabIcon}
              />
            )}
            <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}

      {/* Overflow button */}
      {hasOverflow && (
        <TouchableOpacity
          style={[styles.tab, styles.overflowBtn, overflowActive && styles.tabActive]}
          onPress={() => setOverflowOpen(true)}
          activeOpacity={0.75}
        >
          <Feather
            name="more-horizontal"
            size={14}
            color={overflowActive ? Colors.light.tint : Colors.light.textSecondary}
          />
          {overflowActive && (
            <View style={styles.overflowDot} />
          )}
        </TouchableOpacity>
      )}

      {/* Overflow dropdown modal */}
      <Modal
        visible={overflowOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setOverflowOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setOverflowOpen(false)} />
        <View style={styles.dropdown}>
          {overflowTabs.map((tab) => {
            const isActive = tab.key === activeTab;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.dropdownItem, isActive && styles.dropdownItemActive]}
                onPress={() => { onSelect(tab.key); setOverflowOpen(false); }}
                activeOpacity={0.75}
              >
                {tab.icon && (
                  <Feather
                    name={tab.icon}
                    size={14}
                    color={isActive ? Colors.light.tint : Colors.light.text}
                    style={{ marginRight: 8 }}
                  />
                )}
                <Text style={[styles.dropdownLabel, isActive && styles.dropdownLabelActive]}>
                  {tab.label}
                </Text>
                {isActive && <Feather name="check" size={14} color={Colors.light.tint} />}
              </TouchableOpacity>
            );
          })}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
    paddingHorizontal: 12,
    gap: 2,
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
    marginBottom: -1,
  },
  tabActive: {
    borderBottomColor: Colors.light.tint,
  },
  tabIcon: { marginRight: 5 },
  tabLabel: {
    fontSize: 13,
    fontFamily: "OpenSans_600SemiBold",
    color: Colors.light.textSecondary,
  },
  tabLabelActive: {
    color: Colors.light.tint,
    fontFamily: "OpenSans_700Bold",
  },
  overflowBtn: {
    width: OVERFLOW_BTN_W,
    paddingHorizontal: 0,
    justifyContent: "center",
    position: "relative",
  },
  overflowDot: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.light.tint,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "transparent",
  },
  dropdown: {
    position: "absolute",
    top: 104,
    right: 12,
    backgroundColor: Colors.light.backgroundCard,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 6,
    minWidth: 160,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 10,
    overflow: "hidden",
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.borderLight,
  },
  dropdownItemActive: {
    backgroundColor: Colors.light.tintLight,
  },
  dropdownLabel: {
    flex: 1,
    fontSize: 14,
    fontFamily: "OpenSans_400Regular",
    color: Colors.light.text,
  },
  dropdownLabelActive: {
    fontFamily: "OpenSans_700Bold",
    color: Colors.light.tint,
  },
});
