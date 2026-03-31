import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
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
import { confirmDestructive } from "@/utils/confirm";
import type { CollaborationMember } from "@/services/core";
import { useCoreService } from "@/services/core";
import { AccessDenied } from "@/components/AccessDenied";
import { usePermission } from "@/hooks/usePermission";

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ firstName, lastName }: { firstName: string; lastName: string }) {
  const initials = `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();
  return (
    <View style={av.circle}>
      <Text style={av.text}>{initials || "?"}</Text>
    </View>
  );
}

const av = StyleSheet.create({
  circle: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.light.tintLight,
    borderWidth: 1, borderColor: Colors.light.tint + "40",
    alignItems: "center", justifyContent: "center",
  },
  text: { fontSize: 14, fontFamily: "OpenSans_700Bold", color: Colors.light.tint },
});

// ─── Add Collaborator Modal ────────────────────────────────────────────────────

type Draft = { sid: string; firstName: string; lastName: string };

function emptyDraft(): Draft { return { sid: "", firstName: "", lastName: "" }; }

function AddModal({
  visible,
  onClose,
  onSave,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (d: Draft) => void;
}) {
  const [draft, setDraft] = useState<Draft>(emptyDraft());

  React.useEffect(() => {
    if (!visible) setDraft(emptyDraft());
  }, [visible]);

  const set = (k: keyof Draft) => (v: string) => setDraft((d) => ({ ...d, [k]: v }));

  const canSave = draft.sid.trim() && draft.firstName.trim() && draft.lastName.trim();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={md.backdrop} onPress={onClose} />
      <View style={md.sheet}>
        <View style={md.header}>
          <Text style={md.title}>Add Collaborator</Text>
          <TouchableOpacity onPress={onClose} hitSlop={12}>
            <Feather name="x" size={20} color={Colors.light.textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView style={md.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={md.notice}>
            <Feather name="info" size={12} color={Colors.light.tint} />
            <Text style={md.noticeText}>
              Collaborators are granted read-only access to this loan. Once added, their record cannot be edited — only deleted.
            </Text>
          </View>

          <Text style={md.label}>SID</Text>
          <TextInput
            style={md.input}
            value={draft.sid}
            onChangeText={(v) => set("sid")(v.toUpperCase())}
            placeholder="e.g. A100001"
            placeholderTextColor={Colors.light.textTertiary}
            autoCapitalize="characters"
            autoCorrect={false}
          />

          <Text style={md.label}>First Name</Text>
          <TextInput
            style={md.input}
            value={draft.firstName}
            onChangeText={set("firstName")}
            placeholder="Jane"
            placeholderTextColor={Colors.light.textTertiary}
          />

          <Text style={md.label}>Last Name</Text>
          <TextInput
            style={md.input}
            value={draft.lastName}
            onChangeText={set("lastName")}
            placeholder="Smith"
            placeholderTextColor={Colors.light.textTertiary}
          />

          <View style={{ height: 8 }} />
        </ScrollView>

        <View style={md.footer}>
          <TouchableOpacity style={md.cancelBtn} onPress={onClose} activeOpacity={0.75}>
            <Text style={md.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[md.saveBtn, !canSave && md.saveBtnDisabled]}
            onPress={() => canSave && onSave(draft)}
            activeOpacity={canSave ? 0.8 : 1}
          >
            <Text style={md.saveText}>Add Collaborator</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const md = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.4)" },
  sheet: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: Colors.light.backgroundCard ?? "#fff",
    borderTopLeftRadius: 16, borderTopRightRadius: 16,
    maxHeight: "85%",
  },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.light.border,
  },
  title: { fontSize: 16, fontFamily: "OpenSans_700Bold", color: Colors.light.text },
  body: { paddingHorizontal: 16, paddingTop: 14 },
  notice: {
    flexDirection: "row", gap: 8, alignItems: "flex-start",
    backgroundColor: Colors.light.tintLight,
    borderWidth: 1, borderColor: Colors.light.tint + "40",
    borderRadius: 6, padding: 10, marginBottom: 16,
  },
  noticeText: {
    flex: 1, fontSize: 12, fontFamily: "OpenSans_400Regular",
    color: Colors.light.tint, lineHeight: 17,
  },
  label: {
    fontSize: 11, fontFamily: "OpenSans_600SemiBold", color: Colors.light.textTertiary,
    textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 4, marginTop: 12,
  },
  input: {
    borderWidth: 1, borderColor: Colors.light.border, borderRadius: 6,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, fontFamily: "OpenSans_400Regular", color: Colors.light.text,
    backgroundColor: "#fff",
  },
  footer: {
    flexDirection: "row", gap: 10, padding: 16,
    borderTopWidth: 1, borderTopColor: Colors.light.border,
  },
  cancelBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 6,
    borderWidth: 1, borderColor: Colors.light.border, alignItems: "center",
  },
  cancelText: { fontSize: 14, fontFamily: "OpenSans_600SemiBold", color: Colors.light.text },
  saveBtn: { flex: 1, paddingVertical: 12, borderRadius: 6, backgroundColor: Colors.light.tint, alignItems: "center" },
  saveBtnDisabled: { opacity: 0.4 },
  saveText: { fontSize: 14, fontFamily: "OpenSans_700Bold", color: "#fff" },
});

// ─── Collaborator Row ──────────────────────────────────────────────────────────

function CollabRow({
  member,
  isLast,
  onDelete,
}: {
  member: CollaborationMember;
  isLast: boolean;
  onDelete: () => void;
}) {
  return (
    <View style={[row.wrap, !isLast && row.border]}>
      <Avatar firstName={member.firstName} lastName={member.lastName} />
      <View style={row.body}>
        <Text style={row.name}>{member.firstName} {member.lastName}</Text>
        <View style={row.sidRow}>
          <View style={row.sidBadge}>
            <Text style={row.sidText}>{member.sid}</Text>
          </View>
        </View>
      </View>
      <TouchableOpacity style={row.deleteBtn} onPress={onDelete} hitSlop={12} activeOpacity={0.7}>
        <Feather name="trash-2" size={15} color="#B91C1C" />
      </TouchableOpacity>
    </View>
  );
}

const row = StyleSheet.create({
  wrap: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 12, gap: 12 },
  border: { borderBottomWidth: 1, borderBottomColor: Colors.light.borderLight ?? Colors.light.border },
  body: { flex: 1 },
  name: { fontSize: 14, fontFamily: "OpenSans_600SemiBold", color: Colors.light.text },
  sidRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 3 },
  sidBadge: {
    backgroundColor: Colors.light.tintLight,
    borderWidth: 1, borderColor: Colors.light.tint + "40",
    borderRadius: 4, paddingHorizontal: 6, paddingVertical: 1,
  },
  sidText: { fontSize: 11, fontFamily: "OpenSans_700Bold", color: Colors.light.tint, letterSpacing: 0.3 },
  deleteBtn: { padding: 4 },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function CollaborationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getApplication, getProperty, getCollaborators, addCollaborator, removeCollaborator } = useCoreService();
  const insets = useSafeAreaInsets();
  const { canView, canEdit } = usePermission("collaboration.main");

  const [addModal, setAddModal] = useState(false);

  const app = getApplication(id);
  const property = app ? getProperty(app.propertyId) : null;
  const members = getCollaborators(id);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  if (!app) {
    return (
      <View style={s.center}>
        <Text style={s.notFound}>Application not found</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={s.backLink}>← Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!canView) return <AccessDenied screenLabel="Collaboration" />;

  const handleAdd = async (draft: Draft) => {
    setAddModal(false);
    await addCollaborator(id, draft);
  };

  const handleDelete = (member: CollaborationMember) => {
    confirmDestructive(
      "Remove Collaborator",
      `Remove ${member.firstName} ${member.lastName} (${member.sid}) from this loan?`,
      "Remove",
      () => removeCollaborator(member.id),
    );
  };

  const streetAddr = property?.locations?.[0]?.streetAddress ?? property?.streetAddress ?? "";

  return (
    <View style={s.container}>
      {/* ── Header ── */}
      <View style={[s.header, { paddingTop: topPad + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.7}>
          <Feather name="arrow-left" size={20} color="#fff" />
        </TouchableOpacity>
        <View style={s.headerText}>
          <Text style={s.headerTitle}>Collaboration</Text>
          <Text style={s.headerSub} numberOfLines={1}>
            {streetAddr ? `${streetAddr}  ·  ` : ""}{members.length} collaborator{members.length !== 1 ? "s" : ""}
          </Text>
        </View>
        {canEdit && (
          <TouchableOpacity style={s.addBtn} onPress={() => setAddModal(true)} activeOpacity={0.8}>
            <Feather name="plus" size={16} color="#fff" />
            <Text style={s.addBtnText}>Add</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Info banner ── */}
      <View style={s.infoBanner}>
        <Feather name="lock" size={12} color={Colors.light.tint} />
        <Text style={s.infoText}>
          Collaborators are granted read-only access to this loan. Records are immutable once added — use delete to remove access.
        </Text>
      </View>

      {/* ── List ── */}
      <ScrollView
        style={s.scroll}
        contentContainerStyle={[s.content, { paddingBottom: bottomPad + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {members.length === 0 ? (
          <View style={s.empty}>
            <View style={s.emptyIcon}>
              <Feather name="user-check" size={28} color={Colors.light.tint} />
            </View>
            <Text style={s.emptyTitle}>No collaborators yet</Text>
            <Text style={s.emptyBody}>
              Add collaborators by SID to grant them read-only access to this loan.
            </Text>
            <TouchableOpacity style={s.emptyBtn} onPress={() => setAddModal(true)} activeOpacity={0.8}>
              <Feather name="plus" size={14} color="#fff" />
              <Text style={s.emptyBtnText}>Add first collaborator</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={s.card}>
            {members.map((member, idx) => (
              <CollabRow
                key={member.id}
                member={member}
                isLast={idx === members.length - 1}
                onDelete={() => handleDelete(member)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <AddModal
        visible={addModal}
        onClose={() => setAddModal(false)}
        onSave={handleAdd}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },

  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  notFound: { fontSize: 15, fontFamily: "OpenSans_600SemiBold", color: Colors.light.text },
  backLink: { marginTop: 12, fontSize: 14, color: Colors.light.tint, fontFamily: "OpenSans_600SemiBold" },

  header: {
    backgroundColor: Colors.light.surface,
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingBottom: 14, gap: 12,
  },
  backBtn: {
    width: 34, height: 34,
    alignItems: "center", justifyContent: "center",
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  headerText: { flex: 1 },
  headerTitle: { fontSize: 18, fontFamily: "OpenSans_700Bold", color: "#fff", letterSpacing: -0.2 },
  headerSub: { fontSize: 11, fontFamily: "OpenSans_400Regular", color: "rgba(255,255,255,0.55)", marginTop: 2 },
  addBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: Colors.light.tint, borderRadius: 4,
    paddingHorizontal: 12, paddingVertical: 7,
  },
  addBtnText: { fontSize: 13, fontFamily: "OpenSans_700Bold", color: "#fff" },

  infoBanner: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    backgroundColor: Colors.light.tintLight,
    borderBottomWidth: 1, borderBottomColor: Colors.light.tint + "30",
    paddingHorizontal: 16, paddingVertical: 10,
  },
  infoText: {
    flex: 1, fontSize: 11, fontFamily: "OpenSans_400Regular",
    color: Colors.light.tint, lineHeight: 16,
  },

  scroll: { flex: 1 },
  content: { padding: 16 },

  empty: {
    backgroundColor: Colors.light.backgroundCard ?? "#fff",
    borderWidth: 1, borderColor: Colors.light.border,
    borderRadius: 8, padding: 32,
    alignItems: "center", gap: 6,
  },
  emptyIcon: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: Colors.light.tintLight,
    alignItems: "center", justifyContent: "center", marginBottom: 8,
  },
  emptyTitle: { fontSize: 15, fontFamily: "OpenSans_700Bold", color: Colors.light.text },
  emptyBody: {
    fontSize: 13, fontFamily: "OpenSans_400Regular",
    color: Colors.light.textSecondary, textAlign: "center", lineHeight: 20,
  },
  emptyBtn: {
    flexDirection: "row", alignItems: "center", gap: 6, marginTop: 12,
    backgroundColor: Colors.light.tint, borderRadius: 4,
    paddingHorizontal: 16, paddingVertical: 10,
  },
  emptyBtnText: { fontSize: 13, fontFamily: "OpenSans_700Bold", color: "#fff" },

  card: {
    backgroundColor: Colors.light.backgroundCard ?? "#fff",
    borderWidth: 1, borderColor: Colors.light.border,
    borderRadius: 8, overflow: "hidden",
  },
});
