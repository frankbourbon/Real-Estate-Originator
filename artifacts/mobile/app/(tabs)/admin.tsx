import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
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
import { useRbacService } from "@/services/rbac";
import { useSessionService } from "@/services/session";

// ─── Add/Edit Modal ───────────────────────────────────────────────────────────

type FormState = { sid: string; firstName: string; lastName: string };
const EMPTY_FORM: FormState = { sid: "", firstName: "", lastName: "" };

function UserFormModal({
  visible,
  user,
  onSave,
  onClose,
}: {
  visible: boolean;
  user: AdminUser | null;
  onSave: (data: FormState) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<FormState>(
    user ? { sid: user.sid, firstName: user.firstName, lastName: user.lastName } : EMPTY_FORM
  );

  const isEdit = !!user;

  React.useEffect(() => {
    if (visible) {
      setForm(user ? { sid: user.sid, firstName: user.firstName, lastName: user.lastName } : EMPTY_FORM);
    }
  }, [visible, user]);

  const valid = form.sid.trim() && form.firstName.trim() && form.lastName.trim();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={m.backdrop} onPress={onClose} />
      <View style={m.sheet}>
        <View style={m.sheetHeader}>
          <Text style={m.sheetTitle}>{isEdit ? "Edit User" : "Add User"}</Text>
          <TouchableOpacity onPress={onClose} hitSlop={12}>
            <Feather name="x" size={20} color={Colors.light.textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView style={m.body} keyboardShouldPersistTaps="handled">
          <Text style={m.label}>SID *</Text>
          <TextInput
            style={[m.input, isEdit && m.inputDisabled]}
            value={form.sid}
            onChangeText={(v) => setForm((f) => ({ ...f, sid: v.toUpperCase() }))}
            placeholder="A100001"
            placeholderTextColor={Colors.light.textTertiary}
            autoCapitalize="characters"
            editable={!isEdit}
          />
          {isEdit && (
            <Text style={m.hint}>SID cannot be changed after creation.</Text>
          )}

          <Text style={m.label}>First name *</Text>
          <TextInput
            style={m.input}
            value={form.firstName}
            onChangeText={(v) => setForm((f) => ({ ...f, firstName: v }))}
            placeholder="Jane"
            placeholderTextColor={Colors.light.textTertiary}
          />

          <Text style={m.label}>Last name *</Text>
          <TextInput
            style={m.input}
            value={form.lastName}
            onChangeText={(v) => setForm((f) => ({ ...f, lastName: v }))}
            placeholder="Smith"
            placeholderTextColor={Colors.light.textTertiary}
          />
        </ScrollView>

        <View style={m.footer}>
          <TouchableOpacity style={m.cancelBtn} onPress={onClose} activeOpacity={0.7}>
            <Text style={m.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[m.saveBtn, !valid && m.saveBtnDisabled]}
            onPress={() => valid && onSave(form)}
            activeOpacity={valid ? 0.8 : 1}
          >
            <Text style={m.saveText}>{isEdit ? "Save changes" : "Add user"}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Delete Confirmation Modal ────────────────────────────────────────────────

function DeleteConfirmModal({
  user,
  onConfirm,
  onClose,
}: {
  user: AdminUser | null;
  onConfirm: () => void;
  onClose: () => void;
}) {
  if (!user) return null;
  const initials = `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`.toUpperCase();

  return (
    <Modal visible={!!user} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={d.backdrop} onPress={onClose} />
      <View style={d.centeredOuter}>
        <View style={d.card}>
          {/* Icon */}
          <View style={d.iconRing}>
            <Feather name="trash-2" size={22} color="#C0392B" />
          </View>

          <Text style={d.title}>Remove from registry?</Text>

          {/* Employee pill */}
          <View style={d.pill}>
            <View style={d.pillAvatar}>
              <Text style={d.pillAvatarText}>{initials}</Text>
            </View>
            <View>
              <Text style={d.pillName}>{user.lastName}, {user.firstName}</Text>
              <Text style={d.pillSid}>{user.sid}</Text>
            </View>
          </View>

          {/* Non-cascade notice */}
          <View style={d.notice}>
            <Feather name="info" size={13} color={Colors.light.tint} style={{ marginTop: 1 }} />
            <Text style={d.noticeText}>
              Existing loan team records that reference this employee will{" "}
              <Text style={d.noticeBold}>not</Text> be changed. Historical attributions
              on closed loans are preserved.
            </Text>
          </View>

          {/* Actions */}
          <View style={d.actions}>
            <TouchableOpacity style={d.cancelBtn} onPress={onClose} activeOpacity={0.7}>
              <Text style={d.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={d.removeBtn} onPress={onConfirm} activeOpacity={0.8}>
              <Feather name="trash-2" size={14} color="#fff" />
              <Text style={d.removeText}>Remove</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── User Row ─────────────────────────────────────────────────────────────────

function UserRow({
  user,
  onEdit,
  onDelete,
}: {
  user: AdminUser;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const initials = `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`.toUpperCase();

  return (
    <TouchableOpacity style={s.row} onPress={onEdit} activeOpacity={0.7}>
      <View style={s.avatar}>
        <Text style={s.avatarText}>{initials}</Text>
      </View>
      <View style={s.rowBody}>
        <Text style={s.name}>{user.lastName}, {user.firstName}</Text>
        <Text style={s.sid}>{user.sid}</Text>
      </View>
      <TouchableOpacity
        style={s.deleteBtn}
        onPress={onDelete}
        hitSlop={12}
        activeOpacity={0.6}
      >
        <Feather name="trash-2" size={15} color={Colors.light.textTertiary} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

// ─── Access Control Banner ────────────────────────────────────────────────────

function AccessControlBanner() {
  const { currentSid } = useSessionService();
  const { getUser } = useAdminService();
  const { profiles, userProfiles } = useRbacService();

  const currentUser = currentSid ? getUser(currentSid) : null;
  const profileNames = currentSid
    ? userProfiles
        .filter((up) => up.userSid === currentSid)
        .map((up) => profiles.find((p) => p.id === up.profileId)?.name)
        .filter(Boolean)
        .join(", ")
    : null;

  return (
    <View style={ac.wrapper}>
      <View style={ac.sectionHeader}>
        <Text style={ac.sectionLabel}>Access Control</Text>
      </View>

      {/* Session pill */}
      <View style={ac.sessionCard}>
        <View style={ac.sessionLeft}>
          <View style={[ac.sessionDot, { backgroundColor: currentUser ? Colors.light.tint : Colors.light.textTertiary }]} />
          <View>
            <Text style={ac.sessionLabel}>
              {currentUser
                ? `${currentUser.firstName} ${currentUser.lastName} (${currentSid})`
                : "No session — bypass mode"}
            </Text>
            <Text style={ac.sessionSub}>
              {currentUser && profileNames
                ? profileNames
                : currentUser
                ? "No profiles assigned"
                : "All screens fully accessible"}
            </Text>
          </View>
        </View>
      </View>

      {/* Link card */}
      <TouchableOpacity
        style={ac.linkRow}
        onPress={() => router.push("/admin/rbac" as any)}
        activeOpacity={0.7}
      >
        <View style={ac.linkIcon}>
          <Feather name="shield" size={17} color={Colors.light.tint} />
        </View>
        <View style={ac.linkBody}>
          <Text style={ac.linkLabel}>Manage Access Control</Text>
          <Text style={ac.linkSub}>Profiles, entitlements &amp; user assignments</Text>
        </View>
        <Feather name="chevron-right" size={16} color={Colors.light.textTertiary} />
      </TouchableOpacity>

      {/* Divider between RBAC section and user list */}
      <View style={ac.sectionHeader}>
        <Text style={ac.sectionLabel}>Employee Registry</Text>
      </View>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function AdminScreen() {
  const { users, loading, searchUsers, addUser, updateUser, deleteUser } = useAdminService();
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const [query, setQuery] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [editTarget, setEditTarget] = useState<AdminUser | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);

  const results = searchUsers(query);

  const handleAdd = () => {
    setEditTarget(null);
    setModalVisible(true);
  };

  const handleEdit = (user: AdminUser) => {
    setEditTarget(user);
    setModalVisible(true);
  };

  const handleDeleteRequest = (user: AdminUser) => {
    setDeleteTarget(user);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    await deleteUser(deleteTarget.sid);
    setDeleteTarget(null);
  };

  const handleSave = async (form: FormState) => {
    setModalVisible(false);
    if (editTarget) {
      await updateUser(editTarget.sid, {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
      });
    } else {
      const existing = users.find((u) => u.sid === form.sid.trim().toUpperCase());
      if (existing) {
        setEditTarget(null);
        setModalVisible(false);
        return;
      }
      await addUser({
        sid: form.sid.trim().toUpperCase(),
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
      });
    }
  };

  return (
    <View style={s.container}>
      {/* ── Header ── */}
      <View style={[s.header, { paddingTop: topPadding + 12 }]}>
        <View>
          <Text style={s.eyebrow}>Commercial Banking</Text>
          <Text style={s.title}>Admin</Text>
        </View>
        <TouchableOpacity style={s.addBtn} onPress={handleAdd} activeOpacity={0.8}>
          <Feather name="plus" size={16} color="#fff" />
          <Text style={s.addBtnText}>Add user</Text>
        </TouchableOpacity>
      </View>

      {/* ── Search bar ── */}
      <View style={s.searchBar}>
        <Feather name="search" size={15} color={Colors.light.textTertiary} />
        <TextInput
          style={s.searchInput}
          placeholder="Search by name or SID..."
          placeholderTextColor={Colors.light.textTertiary}
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
        />
        {query ? (
          <Pressable onPress={() => setQuery("")}>
            <Feather name="x" size={15} color={Colors.light.textTertiary} />
          </Pressable>
        ) : null}
      </View>

      {/* ── List (with RBAC header when no search active) ── */}
      {loading ? (
        <Text style={s.loadingText}>Loading...</Text>
      ) : results.length === 0 && query ? (
        <View style={s.empty}>
          <Feather name="users" size={28} color={Colors.light.textTertiary} style={{ marginBottom: 8 }} />
          <Text style={s.emptyTitle}>No matches</Text>
          <Text style={s.emptyBody}>Try a different name or SID.</Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(u) => u.sid}
          contentContainerStyle={{ paddingBottom: (Platform.OS === "web" ? 34 : insets.bottom) + 80 }}
          ListHeaderComponent={!query ? <AccessControlBanner /> : (
            <View style={s.countRow}>
              <Text style={s.countText}>
                {results.length} result{results.length !== 1 ? "s" : ""}
              </Text>
            </View>
          )}
          renderItem={({ item, index }) => (
            <View style={[s.rowWrapper, index < results.length - 1 && s.rowBorder]}>
              <UserRow
                user={item}
                onEdit={() => handleEdit(item)}
                onDelete={() => handleDeleteRequest(item)}
              />
            </View>
          )}
          ListEmptyComponent={
            <View style={s.empty}>
              <Feather name="users" size={28} color={Colors.light.textTertiary} style={{ marginBottom: 8 }} />
              <Text style={s.emptyTitle}>No users yet</Text>
              <Text style={s.emptyBody}>
                Add employees to the registry so they can be assigned to loan teams.
              </Text>
            </View>
          }
        />
      )}

      <UserFormModal
        visible={modalVisible}
        user={editTarget}
        onSave={handleSave}
        onClose={() => setModalVisible(false)}
      />

      <DeleteConfirmModal
        user={deleteTarget}
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeleteTarget(null)}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },

  header: {
    backgroundColor: Colors.light.surface,
    paddingHorizontal: 16,
    paddingBottom: 16,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
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
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.light.tint,
    borderRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 2,
  },
  addBtnText: {
    fontSize: 13,
    fontFamily: "OpenSans_700Bold",
    color: "#fff",
  },

  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: Colors.light.backgroundCard,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "OpenSans_400Regular",
    color: Colors.light.text,
  },

  countRow: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Colors.light.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.borderLight,
  },
  countText: {
    fontSize: 11,
    fontFamily: "OpenSans_600SemiBold",
    color: Colors.light.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  rowWrapper: { backgroundColor: Colors.light.backgroundCard },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.light.borderLight },

  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.light.tintLight,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 13,
    fontFamily: "OpenSans_700Bold",
    color: Colors.light.tint,
  },
  rowBody: { flex: 1 },
  name: {
    fontSize: 14,
    fontFamily: "OpenSans_600SemiBold",
    color: Colors.light.text,
    marginBottom: 2,
  },
  sid: {
    fontSize: 11,
    fontFamily: "OpenSans_400Regular",
    color: Colors.light.textTertiary,
    letterSpacing: 0.3,
  },
  deleteBtn: {
    padding: 6,
  },

  loadingText: {
    fontSize: 14,
    fontFamily: "OpenSans_400Regular",
    color: Colors.light.textSecondary,
    textAlign: "center",
    paddingVertical: 24,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    gap: 4,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: "OpenSans_700Bold",
    color: Colors.light.text,
    marginBottom: 4,
  },
  emptyBody: {
    fontSize: 13,
    fontFamily: "OpenSans_400Regular",
    color: Colors.light.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
});

// ─── Add/Edit Modal Styles ─────────────────────────────────────────────────────

const m = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.light.backgroundCard,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: "85%",
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  sheetTitle: {
    fontSize: 16,
    fontFamily: "OpenSans_700Bold",
    color: Colors.light.text,
  },
  body: { paddingHorizontal: 20, paddingTop: 4 },
  label: {
    fontSize: 11,
    fontFamily: "OpenSans_600SemiBold",
    color: Colors.light.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginTop: 16,
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
  inputDisabled: {
    backgroundColor: Colors.light.background,
    color: Colors.light.textTertiary,
  },
  hint: {
    fontSize: 11,
    fontFamily: "OpenSans_400Regular",
    color: Colors.light.textTertiary,
    marginTop: 4,
  },
  footer: {
    flexDirection: "row",
    gap: 10,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 4,
    paddingVertical: 11,
    alignItems: "center",
  },
  cancelText: {
    fontSize: 14,
    fontFamily: "OpenSans_600SemiBold",
    color: Colors.light.textSecondary,
  },
  saveBtn: {
    flex: 2,
    backgroundColor: Colors.light.tint,
    borderRadius: 4,
    paddingVertical: 11,
    alignItems: "center",
  },
  saveBtnDisabled: { opacity: 0.4 },
  saveText: {
    fontSize: 14,
    fontFamily: "OpenSans_700Bold",
    color: "#fff",
  },
});

// ─── Delete Confirm Modal Styles ───────────────────────────────────────────────

const d = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  centeredOuter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  card: {
    width: "100%",
    backgroundColor: Colors.light.backgroundCard,
    borderRadius: 12,
    padding: 24,
    alignItems: "center",
    gap: 0,
  },

  iconRing: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#FDF0EF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },

  title: {
    fontSize: 17,
    fontFamily: "OpenSans_700Bold",
    color: Colors.light.text,
    marginBottom: 16,
    textAlign: "center",
  },

  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: Colors.light.background,
    borderWidth: 1,
    borderColor: Colors.light.borderLight,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignSelf: "stretch",
    marginBottom: 14,
  },
  pillAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.light.tintLight,
    alignItems: "center",
    justifyContent: "center",
  },
  pillAvatarText: {
    fontSize: 12,
    fontFamily: "OpenSans_700Bold",
    color: Colors.light.tint,
  },
  pillName: {
    fontSize: 13,
    fontFamily: "OpenSans_600SemiBold",
    color: Colors.light.text,
    marginBottom: 1,
  },
  pillSid: {
    fontSize: 11,
    fontFamily: "OpenSans_400Regular",
    color: Colors.light.textTertiary,
    letterSpacing: 0.3,
  },

  notice: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: Colors.light.tintLight,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignSelf: "stretch",
    marginBottom: 20,
  },
  noticeText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "OpenSans_400Regular",
    color: Colors.light.text,
    lineHeight: 18,
  },
  noticeBold: {
    fontFamily: "OpenSans_700Bold",
  },

  actions: {
    flexDirection: "row",
    gap: 10,
    alignSelf: "stretch",
  },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 4,
    paddingVertical: 11,
    alignItems: "center",
  },
  cancelText: {
    fontSize: 14,
    fontFamily: "OpenSans_600SemiBold",
    color: Colors.light.textSecondary,
  },
  removeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#C0392B",
    borderRadius: 4,
    paddingVertical: 11,
  },
  removeText: {
    fontSize: 14,
    fontFamily: "OpenSans_700Bold",
    color: "#fff",
  },
});

// ─── Access Control Banner Styles ─────────────────────────────────────────────

const ac = StyleSheet.create({
  wrapper: { backgroundColor: Colors.light.background },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 6,
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: "OpenSans_600SemiBold",
    color: Colors.light.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  sessionCard: {
    backgroundColor: Colors.light.backgroundCard,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.light.borderLight,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sessionLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  sessionDot: { width: 8, height: 8, borderRadius: 4 },
  sessionLabel: {
    fontSize: 13,
    fontFamily: "OpenSans_600SemiBold",
    color: Colors.light.text,
    marginBottom: 1,
  },
  sessionSub: {
    fontSize: 11,
    fontFamily: "OpenSans_400Regular",
    color: Colors.light.textTertiary,
  },
  linkRow: {
    backgroundColor: Colors.light.backgroundCard,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
    marginTop: 8,
  },
  linkIcon: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: Colors.light.tintLight,
    alignItems: "center",
    justifyContent: "center",
  },
  linkBody: { flex: 1 },
  linkLabel: {
    fontSize: 14,
    fontFamily: "OpenSans_600SemiBold",
    color: Colors.light.text,
    marginBottom: 2,
  },
  linkSub: {
    fontSize: 12,
    fontFamily: "OpenSans_400Regular",
    color: Colors.light.textSecondary,
  },
});
