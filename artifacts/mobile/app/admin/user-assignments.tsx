import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";
import { useAdminService, AdminUser } from "@/services/admin";
import { Profile, useRbacService } from "@/services/rbac";

// ─── Profile Chip ─────────────────────────────────────────────────────────────

function ProfileChip({
  profile,
  assigned,
  onToggle,
}: {
  profile: Profile;
  assigned: boolean;
  onToggle: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onToggle}
      activeOpacity={0.7}
      style={[
        chip.base,
        assigned ? { backgroundColor: profile.colorHex + "22", borderColor: profile.colorHex } : chip.inactive,
      ]}
    >
      {assigned && (
        <View style={[chip.dot, { backgroundColor: profile.colorHex }]} />
      )}
      <Text
        style={[
          chip.text,
          assigned ? { color: profile.colorHex } : chip.textInactive,
        ]}
      >
        {profile.name}
      </Text>
    </TouchableOpacity>
  );
}

// ─── User Row ─────────────────────────────────────────────────────────────────

function UserRow({
  user,
  profiles,
  assignedProfileIds,
  onToggle,
}: {
  user: AdminUser;
  profiles: Profile[];
  assignedProfileIds: string[];
  onToggle: (profileId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const initials = `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`.toUpperCase();
  const hasProfiles = assignedProfileIds.length > 0;

  return (
    <View style={r.wrapper}>
      <TouchableOpacity
        style={r.headerRow}
        onPress={() => setExpanded((e) => !e)}
        activeOpacity={0.7}
      >
        <View style={[r.avatar, !hasProfiles && r.avatarEmpty]}>
          <Text style={[r.avatarText, !hasProfiles && r.avatarTextEmpty]}>{initials}</Text>
        </View>
        <View style={r.body}>
          <Text style={r.name}>{user.lastName}, {user.firstName}</Text>
          <Text style={r.sub}>
            {user.sid} · {hasProfiles
              ? `${assignedProfileIds.length} profile${assignedProfileIds.length !== 1 ? "s" : ""}`
              : "No profiles assigned"}
          </Text>
          {!hasProfiles && (
            <View style={r.warnPill}>
              <Feather name="alert-circle" size={10} color="#9E5B1B" />
              <Text style={r.warnText}>Unassigned — no access</Text>
            </View>
          )}
        </View>
        <Feather
          name={expanded ? "chevron-up" : "chevron-down"}
          size={16}
          color={Colors.light.textTertiary}
        />
      </TouchableOpacity>

      {expanded && (
        <View style={r.profileGrid}>
          {profiles.map((p) => (
            <ProfileChip
              key={p.id}
              profile={p}
              assigned={assignedProfileIds.includes(p.id)}
              onToggle={() => onToggle(p.id)}
            />
          ))}
          {profiles.length === 0 && (
            <Text style={r.noProfilesText}>No profiles defined yet.</Text>
          )}
        </View>
      )}
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function UserAssignmentsScreen() {
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const { users, loading: usersLoading } = useAdminService();
  const {
    profiles,
    userProfiles,
    assignUserProfile,
    removeUserProfile,
  } = useRbacService();

  const [query, setQuery] = useState("");

  const filtered = query.trim()
    ? users.filter(
        (u) =>
          u.sid.toLowerCase().includes(query.toLowerCase()) ||
          `${u.firstName} ${u.lastName}`.toLowerCase().includes(query.toLowerCase())
      )
    : [...users].sort((a, b) => a.lastName.localeCompare(b.lastName));

  const unassigned = users.filter(
    (u) => !userProfiles.some((up) => up.userSid === u.sid)
  ).length;

  const handleToggle = async (userSid: string, profileId: string) => {
    const assigned = userProfiles.some(
      (up) => up.userSid === userSid && up.profileId === profileId
    );
    if (assigned) {
      await removeUserProfile(userSid, profileId);
    } else {
      await assignUserProfile(userSid, profileId);
    }
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
            <Text style={s.title}>User Assignments</Text>
          </View>
        </View>
      </View>

      {/* ── Warning banner ── */}
      {unassigned > 0 && (
        <View style={s.warnBanner}>
          <Feather name="alert-circle" size={13} color="#9E5B1B" style={{ marginTop: 1 }} />
          <Text style={s.warnText}>
            {unassigned} user{unassigned !== 1 ? "s have" : " has"} no profile assigned and
            will have no access when a session is active.
          </Text>
        </View>
      )}

      {/* ── Search ── */}
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

      {/* ── Count ── */}
      <View style={s.countRow}>
        <Text style={s.countText}>
          {query
            ? `${filtered.length} result${filtered.length !== 1 ? "s" : ""}`
            : `${users.length} employee${users.length !== 1 ? "s" : ""}`}
        </Text>
      </View>

      {/* ── List ── */}
      {usersLoading ? (
        <Text style={s.loadingText}>Loading...</Text>
      ) : filtered.length === 0 ? (
        <View style={s.empty}>
          <Feather name="users" size={28} color={Colors.light.textTertiary} style={{ marginBottom: 8 }} />
          <Text style={s.emptyTitle}>{query ? "No matches" : "No users"}</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(u) => u.sid}
          contentContainerStyle={{ paddingBottom: (Platform.OS === "web" ? 34 : insets.bottom) + 60 }}
          renderItem={({ item, index }) => (
            <View style={[s.rowWrapper, index < filtered.length - 1 && s.rowBorder]}>
              <UserRow
                user={item}
                profiles={profiles}
                assignedProfileIds={userProfiles
                  .filter((up) => up.userSid === item.sid)
                  .map((up) => up.profileId)}
                onToggle={(profileId) => handleToggle(item.sid, profileId)}
              />
            </View>
          )}
        />
      )}
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
  warnBanner: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: "#FEF3E2",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#FCDDB6",
  },
  warnText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "OpenSans_400Regular",
    color: "#7C4A00",
    lineHeight: 18,
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
  loadingText: {
    fontSize: 14,
    fontFamily: "OpenSans_400Regular",
    color: Colors.light.textSecondary,
    textAlign: "center",
    paddingVertical: 24,
  },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40 },
  emptyTitle: {
    fontSize: 16,
    fontFamily: "OpenSans_700Bold",
    color: Colors.light.text,
    marginTop: 4,
  },
});

const r = StyleSheet.create({
  wrapper: {
    backgroundColor: Colors.light.backgroundCard,
  },
  headerRow: {
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
  avatarEmpty: {
    backgroundColor: Colors.light.background,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  avatarText: {
    fontSize: 13,
    fontFamily: "OpenSans_700Bold",
    color: Colors.light.tint,
  },
  avatarTextEmpty: { color: Colors.light.textTertiary },
  body: { flex: 1 },
  name: {
    fontSize: 14,
    fontFamily: "OpenSans_600SemiBold",
    color: Colors.light.text,
    marginBottom: 2,
  },
  sub: {
    fontSize: 11,
    fontFamily: "OpenSans_400Regular",
    color: Colors.light.textTertiary,
  },
  warnPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  warnText: {
    fontSize: 10,
    fontFamily: "OpenSans_600SemiBold",
    color: "#9E5B1B",
  },
  profileGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 14,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: Colors.light.borderLight,
  },
  noProfilesText: {
    fontSize: 12,
    fontFamily: "OpenSans_400Regular",
    color: Colors.light.textTertiary,
  },
});

const chip = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  inactive: {
    borderColor: Colors.light.border,
    backgroundColor: Colors.light.background,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  text: {
    fontSize: 12,
    fontFamily: "OpenSans_600SemiBold",
  },
  textInactive: {
    color: Colors.light.textSecondary,
  },
});
