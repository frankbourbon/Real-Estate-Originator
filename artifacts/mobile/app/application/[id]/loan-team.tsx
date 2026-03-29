import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";
import type { AdminUser } from "@/services/admin";
import { useAdminService } from "@/services/admin";
import type { FunctionalGroup, TeamMember, TeamRole } from "@/services/loan-team";
import { ALL_ROLES, ROLE_GROUPS, getRoleGroup, useLoanTeamService } from "@/services/loan-team";
import { useCoreService } from "@/services/core";
import { getPropertyShortAddress, getPropertyCityState } from "@/utils/formatting";

// ─── Constants ────────────────────────────────────────────────────────────────

const GROUP_ORDER: FunctionalGroup[] = ["Sales", "Operations", "Credit"];

const GROUP_STYLE: Record<FunctionalGroup, { color: string; bg: string; icon: keyof typeof Feather.glyphMap }> = {
  Sales:      { color: "#0078CF", bg: "#EAF6FF", icon: "briefcase" },
  Operations: { color: "#C75300", bg: "#FFECDC", icon: "settings" },
  Credit:     { color: "#6B4FBB", bg: "#F0EEFF", icon: "shield" },
};

// ─── Initials avatar ──────────────────────────────────────────────────────────

function Avatar({ firstName, lastName, color }: { firstName: string; lastName: string; color: string }) {
  const initials = `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();
  return (
    <View style={[av.circle, { backgroundColor: color + "22", borderColor: color + "44" }]}>
      <Text style={[av.text, { color }]}>{initials}</Text>
    </View>
  );
}

const av = StyleSheet.create({
  circle: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1,
  },
  text: { fontSize: 13, fontFamily: "OpenSans_700Bold" },
});

// ─── Add Member Modal (two steps: lookup → role pick) ────────────────────────

type ModalStep = "lookup" | "role" | "manual";

function AddMemberModal({
  visible,
  onClose,
  onAdd,
}: {
  visible: boolean;
  onClose: () => void;
  onAdd: (data: { adminSid: string; sid: string; firstName: string; lastName: string; role: TeamRole }) => void;
}) {
  const { searchUsers } = useAdminService();
  const [step, setStep] = useState<ModalStep>("lookup");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const [role, setRole] = useState<TeamRole | null>(null);

  // Manual entry state
  const [manSid, setManSid] = useState("");
  const [manFirst, setManFirst] = useState("");
  const [manLast, setManLast] = useState("");
  const [manRole, setManRole] = useState<TeamRole | null>(null);

  React.useEffect(() => {
    if (!visible) {
      setStep("lookup");
      setQuery("");
      setSelected(null);
      setRole(null);
      setManSid(""); setManFirst(""); setManLast(""); setManRole(null);
    }
  }, [visible]);

  const results = searchUsers(query);

  const handleSelectUser = (user: AdminUser) => {
    setSelected(user);
    setStep("role");
  };

  const handleConfirmRole = () => {
    if (!selected || !role) return;
    onAdd({ adminSid: selected.sid, sid: selected.sid, firstName: selected.firstName, lastName: selected.lastName, role });
  };

  const handleManualAdd = () => {
    if (!manSid.trim() || !manFirst.trim() || !manLast.trim() || !manRole) return;
    onAdd({ adminSid: manSid.trim().toUpperCase(), sid: manSid.trim().toUpperCase(), firstName: manFirst.trim(), lastName: manLast.trim(), role: manRole });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={md.backdrop} onPress={onClose} />
      <View style={md.sheet}>
        {/* Header */}
        <View style={md.header}>
          {step !== "lookup" ? (
            <TouchableOpacity onPress={() => setStep("lookup")} hitSlop={12}>
              <Feather name="arrow-left" size={18} color={Colors.light.textSecondary} />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 18 }} />
          )}
          <Text style={md.title}>
            {step === "lookup" ? "Add Team Member" : step === "role" ? "Select Role" : "Manual Entry"}
          </Text>
          <TouchableOpacity onPress={onClose} hitSlop={12}>
            <Feather name="x" size={20} color={Colors.light.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* ── Step 1: Lookup ── */}
        {step === "lookup" && (
          <>
            <View style={md.searchRow}>
              <Feather name="search" size={14} color={Colors.light.textTertiary} />
              <TextInput
                style={md.searchInput}
                placeholder="Search by name or SID..."
                placeholderTextColor={Colors.light.textTertiary}
                value={query}
                onChangeText={setQuery}
                autoFocus
              />
              {query ? (
                <Pressable onPress={() => setQuery("")}>
                  <Feather name="x" size={14} color={Colors.light.textTertiary} />
                </Pressable>
              ) : null}
            </View>

            <FlatList
              data={results}
              keyExtractor={(u) => u.sid}
              style={{ maxHeight: 320 }}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                <View style={md.emptySearch}>
                  <Text style={md.emptySearchText}>
                    {query ? "No users found" : "Start typing to search the employee registry"}
                  </Text>
                </View>
              }
              renderItem={({ item }) => (
                <TouchableOpacity style={md.userRow} onPress={() => handleSelectUser(item)} activeOpacity={0.7}>
                  <View style={md.userAvatar}>
                    <Text style={md.userAvatarText}>
                      {`${item.firstName[0] ?? ""}${item.lastName[0] ?? ""}`.toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={md.userName}>{item.firstName} {item.lastName}</Text>
                    <Text style={md.userSid}>{item.sid}</Text>
                  </View>
                  <Feather name="chevron-right" size={14} color={Colors.light.textTertiary} />
                </TouchableOpacity>
              )}
            />

            <TouchableOpacity style={md.manualBtn} onPress={() => setStep("manual")} activeOpacity={0.7}>
              <Feather name="edit-2" size={14} color={Colors.light.tint} />
              <Text style={md.manualBtnText}>Enter manually (not in registry)</Text>
            </TouchableOpacity>
          </>
        )}

        {/* ── Step 2: Role picker (after lookup) ── */}
        {step === "role" && selected && (
          <>
            <View style={md.selectedBanner}>
              <View style={md.userAvatar}>
                <Text style={md.userAvatarText}>
                  {`${selected.firstName[0] ?? ""}${selected.lastName[0] ?? ""}`.toUpperCase()}
                </Text>
              </View>
              <View>
                <Text style={md.userName}>{selected.firstName} {selected.lastName}</Text>
                <Text style={md.userSid}>{selected.sid}</Text>
              </View>
            </View>

            <Text style={md.roleGroupLabel}>Select a role</Text>
            <ScrollView style={{ maxHeight: 340 }} keyboardShouldPersistTaps="handled">
              {GROUP_ORDER.map((group) => (
                <View key={group}>
                  <View style={md.roleGroupHeader}>
                    <View style={[md.roleGroupIcon, { backgroundColor: GROUP_STYLE[group].bg }]}>
                      <Feather name={GROUP_STYLE[group].icon} size={11} color={GROUP_STYLE[group].color} />
                    </View>
                    <Text style={[md.roleGroupName, { color: GROUP_STYLE[group].color }]}>{group}</Text>
                  </View>
                  {ROLE_GROUPS[group].map((r) => {
                    const active = role === r;
                    return (
                      <TouchableOpacity
                        key={r}
                        style={[md.roleRow, active && { backgroundColor: GROUP_STYLE[group].bg }]}
                        onPress={() => setRole(r)}
                        activeOpacity={0.7}
                      >
                        <Text style={[md.roleText, active && { color: GROUP_STYLE[group].color, fontFamily: "OpenSans_600SemiBold" }]}>{r}</Text>
                        {active && <Feather name="check" size={14} color={GROUP_STYLE[group].color} />}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </ScrollView>

            <View style={md.footer}>
              <TouchableOpacity
                style={[md.confirmBtn, !role && md.confirmBtnDisabled]}
                onPress={handleConfirmRole}
                activeOpacity={role ? 0.8 : 1}
              >
                <Text style={md.confirmText}>Add to team</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* ── Manual entry ── */}
        {step === "manual" && (
          <ScrollView style={md.manualBody} keyboardShouldPersistTaps="handled">
            <Text style={md.fieldLabel}>SID</Text>
            <TextInput
              style={md.input}
              value={manSid}
              onChangeText={(v) => setManSid(v.toUpperCase())}
              placeholder="A100001"
              placeholderTextColor={Colors.light.textTertiary}
              autoCapitalize="characters"
            />
            <Text style={md.fieldLabel}>First name</Text>
            <TextInput
              style={md.input}
              value={manFirst}
              onChangeText={setManFirst}
              placeholder="Jane"
              placeholderTextColor={Colors.light.textTertiary}
            />
            <Text style={md.fieldLabel}>Last name</Text>
            <TextInput
              style={md.input}
              value={manLast}
              onChangeText={setManLast}
              placeholder="Smith"
              placeholderTextColor={Colors.light.textTertiary}
            />
            <Text style={md.roleGroupLabel}>Select a role</Text>
            {GROUP_ORDER.map((group) => (
              <View key={group}>
                <View style={md.roleGroupHeader}>
                  <View style={[md.roleGroupIcon, { backgroundColor: GROUP_STYLE[group].bg }]}>
                    <Feather name={GROUP_STYLE[group].icon} size={11} color={GROUP_STYLE[group].color} />
                  </View>
                  <Text style={[md.roleGroupName, { color: GROUP_STYLE[group].color }]}>{group}</Text>
                </View>
                {ROLE_GROUPS[group].map((r) => {
                  const active = manRole === r;
                  return (
                    <TouchableOpacity
                      key={r}
                      style={[md.roleRow, active && { backgroundColor: GROUP_STYLE[group].bg }]}
                      onPress={() => setManRole(r)}
                      activeOpacity={0.7}
                    >
                      <Text style={[md.roleText, active && { color: GROUP_STYLE[group].color, fontFamily: "OpenSans_600SemiBold" }]}>{r}</Text>
                      {active && <Feather name="check" size={14} color={GROUP_STYLE[group].color} />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}

            <View style={{ height: 16 }} />
            <TouchableOpacity
              style={[md.confirmBtn, (!manSid.trim() || !manFirst.trim() || !manLast.trim() || !manRole) && md.confirmBtnDisabled]}
              onPress={handleManualAdd}
              activeOpacity={manSid && manFirst && manLast && manRole ? 0.8 : 1}
            >
              <Text style={md.confirmText}>Add to team</Text>
            </TouchableOpacity>
            <View style={{ height: 24 }} />
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function LoanTeamScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getApplication, getProperty } = useCoreService();
  const { getTeamMembers, addTeamMember, removeTeamMember } = useLoanTeamService();
  const insets = useSafeAreaInsets();

  const [addModal, setAddModal] = useState(false);

  const app = getApplication(id);
  const property = app ? getProperty(app.propertyId) : null;
  const members = getTeamMembers(id);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const grouped: Record<FunctionalGroup, TeamMember[]> = {
    Sales: [], Operations: [], Credit: [],
  };
  for (const m of members) {
    const g = getRoleGroup(m.role);
    grouped[g].push(m);
  }

  const handleRemove = (member: TeamMember) => {
    Alert.alert(
      "Remove team member",
      `Remove ${member.firstName} ${member.lastName} from this loan?\n\nThis does not delete them from the employee registry.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Remove", style: "destructive", onPress: () => removeTeamMember(member.id) },
      ]
    );
  };

  const handleAdd = async (data: { adminSid: string; sid: string; firstName: string; lastName: string; role: TeamRole }) => {
    setAddModal(false);
    await addTeamMember(id, data);
  };

  return (
    <View style={sc.container}>
      {/* ── Header ── */}
      <View style={[sc.header, { paddingTop: topPad + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={sc.backBtn} activeOpacity={0.7}>
          <Feather name="arrow-left" size={20} color="#fff" />
        </TouchableOpacity>
        <View style={sc.headerText}>
          <Text style={sc.headerTitle}>Loan Team</Text>
          {property && (
            <Text style={sc.headerSub}>
              {getPropertyShortAddress(property)} · {members.length} member{members.length !== 1 ? "s" : ""}
            </Text>
          )}
        </View>
        <TouchableOpacity style={sc.addBtn} onPress={() => setAddModal(true)} activeOpacity={0.8}>
          <Feather name="plus" size={16} color="#fff" />
          <Text style={sc.addBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={sc.scroll}
        contentContainerStyle={{ paddingBottom: bottomPad + 32 }}
        showsVerticalScrollIndicator={false}
      >
        {members.length === 0 ? (
          <View style={sc.empty}>
            <View style={sc.emptyIcon}>
              <Feather name="users" size={26} color={Colors.light.tint} />
            </View>
            <Text style={sc.emptyTitle}>No team members yet</Text>
            <Text style={sc.emptyBody}>
              Add team members from the employee registry or enter them manually.
            </Text>
            <TouchableOpacity style={sc.emptyBtn} onPress={() => setAddModal(true)} activeOpacity={0.8}>
              <Feather name="plus" size={14} color="#fff" />
              <Text style={sc.emptyBtnText}>Add first member</Text>
            </TouchableOpacity>
          </View>
        ) : (
          GROUP_ORDER.map((group) => {
            const grpMembers = grouped[group];
            if (grpMembers.length === 0) return null;
            const gs = GROUP_STYLE[group];
            return (
              <View key={group} style={sc.group}>
                {/* Group header */}
                <View style={sc.groupHeader}>
                  <View style={[sc.groupIcon, { backgroundColor: gs.bg }]}>
                    <Feather name={gs.icon} size={13} color={gs.color} />
                  </View>
                  <Text style={[sc.groupLabel, { color: gs.color }]}>{group}</Text>
                  <Text style={sc.groupCount}>{grpMembers.length}</Text>
                </View>

                {/* Members */}
                <View style={sc.card}>
                  {grpMembers.map((member, idx) => (
                    <View
                      key={member.id}
                      style={[sc.memberRow, idx < grpMembers.length - 1 && sc.memberBorder]}
                    >
                      <Avatar firstName={member.firstName} lastName={member.lastName} color={gs.color} />
                      <View style={sc.memberBody}>
                        <Text style={sc.memberName}>{member.firstName} {member.lastName}</Text>
                        <Text style={sc.memberRole}>{member.role}</Text>
                        <Text style={sc.memberSid}>{member.sid}</Text>
                      </View>
                      <TouchableOpacity
                        style={sc.removeBtn}
                        onPress={() => handleRemove(member)}
                        hitSlop={12}
                        activeOpacity={0.7}
                      >
                        <Feather name="trash-2" size={14} color={Colors.light.textTertiary} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <AddMemberModal
        visible={addModal}
        onClose={() => setAddModal(false)}
        onAdd={handleAdd}
      />
    </View>
  );
}

// ─── Screen Styles ────────────────────────────────────────────────────────────

const sc = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },

  header: {
    backgroundColor: Colors.light.surface,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 14,
    gap: 12,
  },
  backBtn: {
    width: 34, height: 34,
    alignItems: "center", justifyContent: "center",
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  headerText: { flex: 1 },
  headerTitle: {
    fontSize: 18,
    fontFamily: "OpenSans_700Bold",
    color: "#fff",
    letterSpacing: -0.2,
  },
  headerSub: {
    fontSize: 11,
    fontFamily: "OpenSans_400Regular",
    color: "rgba(255,255,255,0.55)",
    marginTop: 2,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: Colors.light.tint,
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  addBtnText: {
    fontSize: 13,
    fontFamily: "OpenSans_700Bold",
    color: "#fff",
  },

  scroll: { flex: 1 },

  empty: {
    margin: 16,
    backgroundColor: Colors.light.backgroundCard,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 4,
    padding: 32,
    alignItems: "center",
    gap: 6,
  },
  emptyIcon: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: Colors.light.tintLight,
    alignItems: "center", justifyContent: "center",
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontFamily: "OpenSans_700Bold",
    color: Colors.light.text,
  },
  emptyBody: {
    fontSize: 13,
    fontFamily: "OpenSans_400Regular",
    color: Colors.light.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  emptyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
    backgroundColor: Colors.light.tint,
    borderRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  emptyBtnText: {
    fontSize: 13,
    fontFamily: "OpenSans_700Bold",
    color: "#fff",
  },

  group: { marginTop: 16, paddingHorizontal: 16 },
  groupHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  groupIcon: {
    width: 24, height: 24, borderRadius: 4,
    alignItems: "center", justifyContent: "center",
  },
  groupLabel: {
    flex: 1,
    fontSize: 11,
    fontFamily: "OpenSans_700Bold",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  groupCount: {
    fontSize: 11,
    fontFamily: "OpenSans_600SemiBold",
    color: Colors.light.textTertiary,
  },

  card: {
    backgroundColor: Colors.light.backgroundCard,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 4,
    overflow: "hidden",
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  memberBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.borderLight,
  },
  memberBody: { flex: 1 },
  memberName: {
    fontSize: 14,
    fontFamily: "OpenSans_600SemiBold",
    color: Colors.light.text,
    marginBottom: 1,
  },
  memberRole: {
    fontSize: 12,
    fontFamily: "OpenSans_400Regular",
    color: Colors.light.textSecondary,
  },
  memberSid: {
    fontSize: 10,
    fontFamily: "OpenSans_400Regular",
    color: Colors.light.textTertiary,
    letterSpacing: 0.3,
    marginTop: 1,
  },
  removeBtn: { padding: 4 },
});

// ─── Modal Styles ─────────────────────────────────────────────────────────────

const md = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  sheet: {
    position: "absolute",
    bottom: 0, left: 0, right: 0,
    backgroundColor: Colors.light.backgroundCard,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: "90%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  title: {
    fontSize: 16,
    fontFamily: "OpenSans_700Bold",
    color: Colors.light.text,
  },

  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.borderLight,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "OpenSans_400Regular",
    color: Colors.light.text,
  },

  userRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 11,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.borderLight,
  },
  userAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.light.tintLight,
    alignItems: "center", justifyContent: "center",
  },
  userAvatarText: {
    fontSize: 12,
    fontFamily: "OpenSans_700Bold",
    color: Colors.light.tint,
  },
  userName: {
    fontSize: 14,
    fontFamily: "OpenSans_600SemiBold",
    color: Colors.light.text,
    marginBottom: 1,
  },
  userSid: {
    fontSize: 11,
    fontFamily: "OpenSans_400Regular",
    color: Colors.light.textTertiary,
  },

  emptySearch: {
    padding: 24,
    alignItems: "center",
  },
  emptySearchText: {
    fontSize: 13,
    fontFamily: "OpenSans_400Regular",
    color: Colors.light.textSecondary,
    textAlign: "center",
  },

  manualBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  manualBtnText: {
    fontSize: 13,
    fontFamily: "OpenSans_600SemiBold",
    color: Colors.light.tint,
  },

  selectedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.light.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },

  roleGroupLabel: {
    fontSize: 11,
    fontFamily: "OpenSans_600SemiBold",
    color: Colors.light.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  roleGroupHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Colors.light.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.borderLight,
  },
  roleGroupIcon: {
    width: 22, height: 22, borderRadius: 4,
    alignItems: "center", justifyContent: "center",
  },
  roleGroupName: {
    fontSize: 11,
    fontFamily: "OpenSans_700Bold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  roleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.borderLight,
  },
  roleText: {
    fontSize: 14,
    fontFamily: "OpenSans_400Regular",
    color: Colors.light.text,
  },

  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  confirmBtn: {
    backgroundColor: Colors.light.tint,
    borderRadius: 4,
    paddingVertical: 13,
    alignItems: "center",
  },
  confirmBtnDisabled: { opacity: 0.4 },
  confirmText: {
    fontSize: 14,
    fontFamily: "OpenSans_700Bold",
    color: "#fff",
  },

  manualBody: { paddingHorizontal: 16 },
  fieldLabel: {
    fontSize: 11,
    fontFamily: "OpenSans_600SemiBold",
    color: Colors.light.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginTop: 14,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: "OpenSans_400Regular",
    color: Colors.light.text,
    backgroundColor: Colors.light.background,
  },
});
