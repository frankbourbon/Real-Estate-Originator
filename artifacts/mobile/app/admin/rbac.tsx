import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";
import { ENTITLEMENTS, MS_GROUPS } from "@/services/rbac";
import { useSystemCoreService } from "@/services/system-core";
import { useAdminService } from "@/services/admin";
import { useSessionService } from "@/services/session";

// ─── User Picker Modal ────────────────────────────────────────────────────────

function UserPickerModal({
  visible,
  currentSid,
  onSelect,
  onClose,
}: {
  visible: boolean;
  currentSid: string | null;
  onSelect: (sid: string | null) => void;
  onClose: () => void;
}) {
  const { users } = useAdminService();
  const { profiles, userProfiles } = useSystemCoreService();

  const getProfileNamesForUser = (sid: string) => {
    const profileIds = userProfiles.filter((up) => up.userSid === sid).map((up) => up.profileId);
    return profiles
      .filter((p) => profileIds.includes(p.id))
      .map((p) => p.name)
      .join(", ");
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={pm.backdrop} onPress={onClose} />
      <View style={pm.sheet}>
        <View style={pm.header}>
          <Text style={pm.title}>Switch Active User</Text>
          <TouchableOpacity onPress={onClose} hitSlop={12}>
            <Feather name="x" size={20} color={Colors.light.textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView style={pm.list} keyboardShouldPersistTaps="handled">
          <TouchableOpacity
            style={[pm.row, currentSid === null && pm.rowSelected]}
            onPress={() => { onSelect(null); onClose(); }}
            activeOpacity={0.7}
          >
            <View style={[pm.avatar, { backgroundColor: "#E5E7EB" }]}>
              <Feather name="user-x" size={15} color="#6B7280" />
            </View>
            <View style={pm.rowBody}>
              <Text style={pm.name}>No session (bypass mode)</Text>
              <Text style={pm.sid}>All screens fully accessible</Text>
            </View>
            {currentSid === null && (
              <Feather name="check" size={16} color={Colors.light.tint} />
            )}
          </TouchableOpacity>

          {users.map((u) => {
            const initials = `${u.firstName[0] ?? ""}${u.lastName[0] ?? ""}`.toUpperCase();
            const profileNames = getProfileNamesForUser(u.sid);
            const isSelected = currentSid === u.sid;
            return (
              <TouchableOpacity
                key={u.sid}
                style={[pm.row, isSelected && pm.rowSelected]}
                onPress={() => { onSelect(u.sid); onClose(); }}
                activeOpacity={0.7}
              >
                <View style={[pm.avatar, isSelected && pm.avatarSelected]}>
                  <Text style={[pm.avatarText, isSelected && pm.avatarTextSelected]}>
                    {initials}
                  </Text>
                </View>
                <View style={pm.rowBody}>
                  <Text style={pm.name}>{u.lastName}, {u.firstName}</Text>
                  <Text style={pm.sid}>
                    {u.sid}{profileNames ? ` · ${profileNames}` : " · No profiles assigned"}
                  </Text>
                </View>
                {isSelected && <Feather name="check" size={16} color={Colors.light.tint} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function RbacScreen() {
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const { profiles, userProfiles } = useSystemCoreService();
  const { currentSid, setCurrentSid } = useSessionService();
  const { users, getUser } = useAdminService();
  const [pickerVisible, setPickerVisible] = useState(false);

  const currentUser = currentSid ? getUser(currentSid) : null;
  const unassignedCount = users.filter(
    (u) => !userProfiles.some((up) => up.userSid === u.sid)
  ).length;

  const systemCoreSections = [
    {
      key: "profiles",
      icon: "shield" as const,
      label: "Access Profiles",
      detail: `${profiles.length} profile${profiles.length !== 1 ? "s" : ""} defined`,
      route: "/admin/profiles",
      warn: false,
    },
    {
      key: "users",
      icon: "users" as const,
      label: "User Assignments",
      detail: unassignedCount > 0
        ? `${unassignedCount} user${unassignedCount !== 1 ? "s" : ""} unassigned`
        : "All users assigned",
      route: "/admin/user-assignments",
      warn: unassignedCount > 0,
    },
  ];

  const entitlementSections = [
    {
      key: "entitlements",
      icon: "sliders" as const,
      label: "Entitlement Mapping",
      detail: `${MS_GROUPS.length} microservices · ${ENTITLEMENTS.length} entitlements`,
      route: "/admin/entitlements",
      warn: false,
    },
  ];

  const renderMenuRow = (sec: typeof systemCoreSections[0], idx: number, isLast: boolean) => (
    <TouchableOpacity
      key={sec.key}
      style={[s.menuRow, !isLast && s.menuBorder]}
      onPress={() => router.push(sec.route as any)}
      activeOpacity={0.7}
    >
      <View style={[s.menuIcon, sec.warn && s.menuIconWarn]}>
        <Feather name={sec.icon} size={18} color={sec.warn ? "#9E5B1B" : Colors.light.tint} />
      </View>
      <View style={s.menuBody}>
        <Text style={s.menuLabel}>{sec.label}</Text>
        <Text style={[s.menuDetail, sec.warn && s.menuDetailWarn]}>{sec.detail}</Text>
      </View>
      <Feather name="chevron-right" size={16} color={Colors.light.textTertiary} />
    </TouchableOpacity>
  );

  return (
    <View style={s.container}>
      {/* ── Header ── */}
      <View style={[s.header, { paddingTop: topPadding + 12 }]}>
        <View style={s.headerLeft}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={s.backBtn}>
            <Feather name="chevron-left" size={22} color="#fff" />
          </TouchableOpacity>
          <View>
            <Text style={s.eyebrow}>Admin</Text>
            <Text style={s.title}>Access Control</Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={{ paddingBottom: (Platform.OS === "web" ? 34 : insets.bottom) + 60 }}
      >
        {/* ── Active Session ── */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionLabel}>Active Session</Text>
        </View>
        <View style={s.card}>
          <View style={s.sessionRow}>
            <View style={s.sessionInfo}>
              <View style={[s.avatar, currentUser && s.avatarActive]}>
                {currentUser ? (
                  <Text style={s.avatarText}>
                    {`${currentUser.firstName[0] ?? ""}${currentUser.lastName[0] ?? ""}`.toUpperCase()}
                  </Text>
                ) : (
                  <Feather name="user-x" size={16} color={Colors.light.textTertiary} />
                )}
              </View>
              <View>
                <Text style={s.sessionName}>
                  {currentUser
                    ? `${currentUser.lastName}, ${currentUser.firstName}`
                    : "No session active"}
                </Text>
                <Text style={s.sessionSub}>
                  {currentUser
                    ? `${currentSid} · permissions enforced`
                    : "All screens accessible (bypass mode)"}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={s.switchBtn}
              onPress={() => setPickerVisible(true)}
              activeOpacity={0.7}
            >
              <Text style={s.switchText}>Switch</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={s.infoBanner}>
          <Feather name="info" size={13} color={Colors.light.tint} style={{ marginTop: 1 }} />
          <Text style={s.infoText}>
            Setting an active session user simulates logging in as that user. All screens enforce
            their VIEW and EDIT entitlements based on the user&apos;s assigned profiles.
          </Text>
        </View>

        {/* ── System Core — Profile Registry ── */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionLabel}>System Core</Text>
          <Text style={s.sectionSub}>Profiles &amp; user assignments</Text>
        </View>
        {systemCoreSections.map((sec, idx) =>
          renderMenuRow(sec, idx, idx === systemCoreSections.length - 1)
        )}

        {/* ── Microservice Entitlements ── */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionLabel}>Microservice Entitlements</Text>
          <Text style={s.sectionSub}>Per-MS access configuration</Text>
        </View>
        {entitlementSections.map((sec, idx) =>
          renderMenuRow(sec as any, idx, true)
        )}
      </ScrollView>

      <UserPickerModal
        visible={pickerVisible}
        currentSid={currentSid}
        onSelect={setCurrentSid}
        onClose={() => setPickerVisible(false)}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  scroll: { flex: 1 },

  header: {
    backgroundColor: Colors.light.surface,
    paddingHorizontal: 16,
    paddingBottom: 16,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  headerLeft: { flexDirection: "row", alignItems: "flex-end", gap: 10 },
  backBtn: { marginBottom: 4 },
  eyebrow: {
    fontSize: 10,
    fontFamily: "OpenSans_600SemiBold",
    color: "rgba(255,255,255,0.55)",
    letterSpacing: 1.0,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  title: {
    fontSize: 22,
    fontFamily: "OpenSans_700Bold",
    color: "#fff",
    letterSpacing: -0.3,
  },

  sectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 6,
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: "OpenSans_600SemiBold",
    color: Colors.light.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  sectionSub: {
    fontSize: 11,
    fontFamily: "OpenSans_400Regular",
    color: Colors.light.textTertiary,
    marginTop: 1,
  },

  card: {
    backgroundColor: Colors.light.backgroundCard,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.light.border,
  },
  sessionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  sessionInfo: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.light.background,
    borderWidth: 1,
    borderColor: Colors.light.border,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarActive: {
    backgroundColor: Colors.light.tintLight,
    borderColor: Colors.light.tint,
  },
  avatarText: {
    fontSize: 14,
    fontFamily: "OpenSans_700Bold",
    color: Colors.light.tint,
  },
  sessionName: {
    fontSize: 14,
    fontFamily: "OpenSans_600SemiBold",
    color: Colors.light.text,
    marginBottom: 2,
  },
  sessionSub: {
    fontSize: 11,
    fontFamily: "OpenSans_400Regular",
    color: Colors.light.textTertiary,
  },
  switchBtn: {
    borderWidth: 1,
    borderColor: Colors.light.tint,
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  switchText: {
    fontSize: 13,
    fontFamily: "OpenSans_600SemiBold",
    color: Colors.light.tint,
  },

  infoBanner: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: Colors.light.tintLight,
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "OpenSans_400Regular",
    color: Colors.light.text,
    lineHeight: 18,
  },

  menuRow: {
    backgroundColor: Colors.light.backgroundCard,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  menuBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.borderLight,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: Colors.light.tintLight,
    alignItems: "center",
    justifyContent: "center",
  },
  menuIconWarn: { backgroundColor: "#FEF3E2" },
  menuBody: { flex: 1 },
  menuLabel: {
    fontSize: 14,
    fontFamily: "OpenSans_600SemiBold",
    color: Colors.light.text,
    marginBottom: 2,
  },
  menuDetail: {
    fontSize: 12,
    fontFamily: "OpenSans_400Regular",
    color: Colors.light.textSecondary,
  },
  menuDetailWarn: { color: "#9E5B1B" },

});

const pm = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.4)" },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.light.backgroundCard,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: "75%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  title: {
    fontSize: 16,
    fontFamily: "OpenSans_700Bold",
    color: Colors.light.text,
  },
  list: { maxHeight: 420 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.borderLight,
  },
  rowSelected: { backgroundColor: Colors.light.tintLight },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.light.background,
    borderWidth: 1,
    borderColor: Colors.light.border,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarSelected: {
    backgroundColor: Colors.light.tintLight,
    borderColor: Colors.light.tint,
  },
  avatarText: {
    fontSize: 12,
    fontFamily: "OpenSans_700Bold",
    color: Colors.light.textSecondary,
  },
  avatarTextSelected: { color: Colors.light.tint },
  rowBody: { flex: 1 },
  name: {
    fontSize: 13,
    fontFamily: "OpenSans_600SemiBold",
    color: Colors.light.text,
    marginBottom: 1,
  },
  sid: {
    fontSize: 11,
    fontFamily: "OpenSans_400Regular",
    color: Colors.light.textTertiary,
  },
});
