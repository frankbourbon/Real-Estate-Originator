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
import { Profile, useRbacService } from "@/services/rbac";

// ─── Color Picker ─────────────────────────────────────────────────────────────

const PALETTE = [
  "#1B7F9E", "#0B6E4F", "#7B3F9E", "#9E5B1B",
  "#6B7280", "#C0392B", "#2980B9", "#1A5276",
];

function ColorDot({ color, selected, onPress }: { color: string; selected: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <View style={[cp.dot, { backgroundColor: color }, selected && cp.dotSelected]}>
        {selected && <Feather name="check" size={12} color="#fff" />}
      </View>
    </TouchableOpacity>
  );
}

// ─── Create/Edit Profile Modal ────────────────────────────────────────────────

type FormState = { name: string; description: string; colorHex: string };

function ProfileFormModal({
  visible,
  profile,
  onSave,
  onClose,
}: {
  visible: boolean;
  profile: Profile | null;
  onSave: (data: FormState) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<FormState>(
    profile
      ? { name: profile.name, description: profile.description, colorHex: profile.colorHex }
      : { name: "", description: "", colorHex: PALETTE[0] }
  );

  React.useEffect(() => {
    if (visible) {
      setForm(
        profile
          ? { name: profile.name, description: profile.description, colorHex: profile.colorHex }
          : { name: "", description: "", colorHex: PALETTE[0] }
      );
    }
  }, [visible, profile]);

  const valid = form.name.trim().length > 0;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={fm.backdrop} onPress={onClose} />
      <View style={fm.sheet}>
        <View style={fm.header}>
          <Text style={fm.title}>{profile ? "Edit Profile" : "New Profile"}</Text>
          <TouchableOpacity onPress={onClose} hitSlop={12}>
            <Feather name="x" size={20} color={Colors.light.textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView style={fm.body} keyboardShouldPersistTaps="handled">
          <Text style={fm.label}>Profile Name *</Text>
          <TextInput
            style={fm.input}
            value={form.name}
            onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
            placeholder="e.g. Loan Officer"
            placeholderTextColor={Colors.light.textTertiary}
          />

          <Text style={fm.label}>Description</Text>
          <TextInput
            style={[fm.input, fm.textArea]}
            value={form.description}
            onChangeText={(v) => setForm((f) => ({ ...f, description: v }))}
            placeholder="Optional description..."
            placeholderTextColor={Colors.light.textTertiary}
            multiline
            numberOfLines={2}
          />

          <Text style={fm.label}>Color</Text>
          <View style={fm.palette}>
            {PALETTE.map((c) => (
              <ColorDot
                key={c}
                color={c}
                selected={form.colorHex === c}
                onPress={() => setForm((f) => ({ ...f, colorHex: c }))}
              />
            ))}
          </View>
        </ScrollView>

        <View style={fm.footer}>
          <TouchableOpacity style={fm.cancelBtn} onPress={onClose} activeOpacity={0.7}>
            <Text style={fm.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[fm.saveBtn, !valid && fm.saveBtnDisabled]}
            onPress={() => valid && onSave(form)}
            activeOpacity={valid ? 0.8 : 1}
          >
            <Text style={fm.saveText}>{profile ? "Save changes" : "Create profile"}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Profile Row ──────────────────────────────────────────────────────────────

function ProfileRow({
  profile,
  entitlementCount,
  userCount,
  onEdit,
  onPress,
}: {
  profile: Profile;
  entitlementCount: number;
  userCount: number;
  onEdit: () => void;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={s.row} onPress={onPress} activeOpacity={0.7}>
      <View style={[s.colorBar, { backgroundColor: profile.colorHex }]} />
      <View style={s.rowBody}>
        <Text style={s.profileName}>{profile.name}</Text>
        {!!profile.description && (
          <Text style={s.profileDesc} numberOfLines={1}>{profile.description}</Text>
        )}
        <View style={s.rowMeta}>
          <Text style={s.metaText}>{entitlementCount} entitlement{entitlementCount !== 1 ? "s" : ""}</Text>
          <Text style={s.metaDot}>·</Text>
          <Text style={s.metaText}>{userCount} user{userCount !== 1 ? "s" : ""}</Text>
        </View>
      </View>
      <TouchableOpacity onPress={onEdit} hitSlop={10} style={s.editBtn}>
        <Feather name="edit-2" size={14} color={Colors.light.textTertiary} />
      </TouchableOpacity>
      <Feather name="chevron-right" size={16} color={Colors.light.textTertiary} />
    </TouchableOpacity>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ProfilesScreen() {
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const { profiles, profileEnts, userProfiles, createProfile, updateProfile } = useRbacService();

  const [modalVisible, setModalVisible] = useState(false);
  const [editTarget, setEditTarget] = useState<Profile | null>(null);

  const handleSave = async (form: { name: string; description: string; colorHex: string }) => {
    setModalVisible(false);
    if (editTarget) {
      await updateProfile(editTarget.id, {
        name: form.name.trim(),
        description: form.description.trim(),
        colorHex: form.colorHex,
      });
    } else {
      await createProfile({
        name: form.name.trim(),
        description: form.description.trim(),
        colorHex: form.colorHex,
      });
    }
    setEditTarget(null);
  };

  return (
    <View style={s.container}>
      {/* ── Header ── */}
      <View style={[s.header, { paddingTop: topPadding + 12 }]}>
        <View style={s.headerLeft}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={s.backBtn}>
            <Feather name="chevron-left" size={22} color="#fff" />
          </TouchableOpacity>
          <View>
            <Text style={s.eyebrow}>Access Control</Text>
            <Text style={s.title}>Profiles</Text>
          </View>
        </View>
        <TouchableOpacity
          style={s.addBtn}
          onPress={() => { setEditTarget(null); setModalVisible(true); }}
          activeOpacity={0.8}
        >
          <Feather name="plus" size={16} color="#fff" />
          <Text style={s.addBtnText}>New profile</Text>
        </TouchableOpacity>
      </View>

      {/* ── Count ── */}
      <View style={s.countRow}>
        <Text style={s.countText}>
          {profiles.length} profile{profiles.length !== 1 ? "s" : ""}
        </Text>
      </View>

      {profiles.length === 0 ? (
        <View style={s.empty}>
          <Feather name="shield" size={28} color={Colors.light.textTertiary} style={{ marginBottom: 8 }} />
          <Text style={s.emptyTitle}>No profiles yet</Text>
          <Text style={s.emptyBody}>
            Create a profile, then assign entitlements and users to it.
          </Text>
        </View>
      ) : (
        <FlatList
          data={profiles}
          keyExtractor={(p) => p.id}
          contentContainerStyle={{ paddingBottom: (Platform.OS === "web" ? 34 : insets.bottom) + 60 }}
          renderItem={({ item, index }) => (
            <View style={[s.rowWrapper, index < profiles.length - 1 && s.rowBorder]}>
              <ProfileRow
                profile={item}
                entitlementCount={profileEnts.filter((pe) => pe.profileId === item.id).length}
                userCount={userProfiles.filter((up) => up.profileId === item.id).length}
                onEdit={() => { setEditTarget(item); setModalVisible(true); }}
                onPress={() => router.push(`/admin/profile/${item.id}` as any)}
              />
            </View>
          )}
        />
      )}

      <ProfileFormModal
        visible={modalVisible}
        profile={editTarget}
        onSave={handleSave}
        onClose={() => { setModalVisible(false); setEditTarget(null); }}
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
    paddingVertical: 14,
    gap: 12,
  },
  colorBar: {
    width: 4,
    height: 40,
    borderRadius: 2,
  },
  rowBody: { flex: 1 },
  profileName: {
    fontSize: 14,
    fontFamily: "OpenSans_600SemiBold",
    color: Colors.light.text,
    marginBottom: 2,
  },
  profileDesc: {
    fontSize: 12,
    fontFamily: "OpenSans_400Regular",
    color: Colors.light.textSecondary,
    marginBottom: 4,
  },
  rowMeta: { flexDirection: "row", alignItems: "center", gap: 6 },
  metaText: {
    fontSize: 11,
    fontFamily: "OpenSans_400Regular",
    color: Colors.light.textTertiary,
  },
  metaDot: {
    fontSize: 11,
    color: Colors.light.textTertiary,
  },
  editBtn: { padding: 4, marginRight: 4 },
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

const cp = StyleSheet.create({
  dot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  dotSelected: { borderColor: "#fff", opacity: 1 },
});

const fm = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.4)" },
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  title: { fontSize: 16, fontFamily: "OpenSans_700Bold", color: Colors.light.text },
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
  textArea: { height: 64, textAlignVertical: "top" },
  palette: { flexDirection: "row", gap: 10, flexWrap: "wrap", paddingVertical: 4 },
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
  cancelText: { fontSize: 14, fontFamily: "OpenSans_600SemiBold", color: Colors.light.textSecondary },
  saveBtn: {
    flex: 2,
    backgroundColor: Colors.light.tint,
    borderRadius: 4,
    paddingVertical: 11,
    alignItems: "center",
  },
  saveBtnDisabled: { opacity: 0.4 },
  saveText: { fontSize: 14, fontFamily: "OpenSans_700Bold", color: "#fff" },
});
