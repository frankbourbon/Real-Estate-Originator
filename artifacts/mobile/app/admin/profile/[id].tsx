import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";
import { ENTITLEMENTS, useRbacService } from "@/services/rbac";
import { useSystemCoreService } from "@/services/system-core";

// ─── Types ────────────────────────────────────────────────────────────────────

type GroupedScreen = {
  screenKey: string;
  screenLabel: string;
  hasView: boolean;
  hasEdit: boolean;
  viewId: string;
  editId: string;
  editExists: boolean;
};

// ─── Screen Group ─────────────────────────────────────────────────────────────

function EntitlementGroup({
  microservice,
  screens,
  grantedIds,
  onToggle,
}: {
  microservice: string;
  screens: GroupedScreen[];
  grantedIds: Set<string>;
  onToggle: (entitlementId: string) => void;
}) {
  const totalCount = screens.reduce(
    (acc, scr) => acc + (grantedIds.has(scr.viewId) ? 1 : 0) + (scr.editExists && grantedIds.has(scr.editId) ? 1 : 0),
    0
  );
  const maxCount = screens.reduce((acc, scr) => acc + 1 + (scr.editExists ? 1 : 0), 0);
  const allGranted = totalCount === maxCount;

  const handleSelectAll = () => {
    screens.forEach((scr) => {
      if (!grantedIds.has(scr.viewId)) onToggle(scr.viewId);
      if (scr.editExists && !grantedIds.has(scr.editId)) onToggle(scr.editId);
    });
  };

  const handleDeselectAll = () => {
    screens.forEach((scr) => {
      if (grantedIds.has(scr.viewId)) onToggle(scr.viewId);
      if (scr.editExists && grantedIds.has(scr.editId)) onToggle(scr.editId);
    });
  };

  return (
    <View style={g.container}>
      <View style={g.groupHeader}>
        <Text style={g.groupTitle}>{microservice}</Text>
        <TouchableOpacity
          onPress={allGranted ? handleDeselectAll : handleSelectAll}
          hitSlop={8}
          activeOpacity={0.7}
        >
          <Text style={g.selectAllText}>{allGranted ? "Deselect all" : "Select all"}</Text>
        </TouchableOpacity>
      </View>

      {screens.map((scr, idx) => (
        <View key={scr.screenKey} style={[g.screenRow, idx < screens.length - 1 && g.rowBorder]}>
          <Text style={g.screenLabel}>{scr.screenLabel}</Text>
          <View style={g.toggleRow}>
            {/* VIEW toggle */}
            <View style={g.toggleItem}>
              <Text style={g.toggleLabel}>VIEW</Text>
              <Switch
                value={grantedIds.has(scr.viewId)}
                onValueChange={() => onToggle(scr.viewId)}
                trackColor={{ false: Colors.light.borderLight, true: Colors.light.tint }}
                thumbColor="#fff"
                style={g.switch}
              />
            </View>
            {/* EDIT toggle (only if EDIT entitlement exists) */}
            {scr.editExists ? (
              <View style={g.toggleItem}>
                <Text style={g.toggleLabel}>EDIT</Text>
                <Switch
                  value={grantedIds.has(scr.editId)}
                  onValueChange={() => onToggle(scr.editId)}
                  trackColor={{ false: Colors.light.borderLight, true: Colors.light.tint }}
                  thumbColor="#fff"
                  style={g.switch}
                />
              </View>
            ) : (
              <View style={g.toggleItem}>
                <Text style={[g.toggleLabel, { opacity: 0 }]}>EDIT</Text>
                <View style={[g.switch, { opacity: 0 }]} />
              </View>
            )}
          </View>
        </View>
      ))}
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ProfileDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const { getProfile, deleteProfile } = useSystemCoreService();
  const { getProfileEntitlementIds, toggleEntitlement } = useRbacService();

  const profile = getProfile(id ?? "");
  const grantedIds = getProfileEntitlementIds(id ?? "");

  const [confirmDelete, setConfirmDelete] = useState(false);

  // Group entitlements by microservice → screen
  const groups = useMemo(() => {
    const msMap = new Map<string, Map<string, GroupedScreen>>();
    for (const e of ENTITLEMENTS) {
      if (!msMap.has(e.microservice)) msMap.set(e.microservice, new Map());
      const screenMap = msMap.get(e.microservice)!;
      if (!screenMap.has(e.screenKey)) {
        screenMap.set(e.screenKey, {
          screenKey: e.screenKey,
          screenLabel: e.screenLabel,
          hasView: false,
          hasEdit: false,
          viewId: `${e.screenKey}.VIEW`,
          editId: `${e.screenKey}.EDIT`,
          editExists: false,
        });
      }
      const scr = screenMap.get(e.screenKey)!;
      if (e.action === "VIEW") scr.hasView = true;
      if (e.action === "EDIT") { scr.hasEdit = true; scr.editExists = true; }
    }
    return Array.from(msMap.entries()).map(([ms, screenMap]) => ({
      microservice: ms,
      screens: Array.from(screenMap.values()),
    }));
  }, []);

  const grantedCount = grantedIds.size;
  const totalCount   = ENTITLEMENTS.length;

  if (!profile) {
    return (
      <View style={s.container}>
        <View style={[s.header, { paddingTop: topPadding + 12 }]}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={s.backBtn}>
            <Feather name="chevron-left" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={s.title}>Profile not found</Text>
        </View>
      </View>
    );
  }

  const handleDelete = async () => {
    await deleteProfile(profile.id);
    router.back();
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
            <Text style={s.eyebrow}>Access Profiles</Text>
            <View style={s.titleRow}>
              <View style={[s.colorDot, { backgroundColor: profile.colorHex }]} />
              <Text style={s.title}>{profile.name}</Text>
            </View>
          </View>
        </View>
        {!confirmDelete ? (
          <TouchableOpacity onPress={() => setConfirmDelete(true)} hitSlop={10} style={s.deleteBtn}>
            <Feather name="trash-2" size={16} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>
        ) : (
          <View style={s.confirmRow}>
            <TouchableOpacity onPress={() => setConfirmDelete(false)} style={s.confirmNo}>
              <Text style={s.confirmNoText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleDelete} style={s.confirmYes}>
              <Text style={s.confirmYesText}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* ── Description + stats bar ── */}
      {!!profile.description && (
        <View style={s.descRow}>
          <Text style={s.descText}>{profile.description}</Text>
        </View>
      )}
      <View style={s.statsRow}>
        <Text style={s.statsText}>
          {grantedCount} of {totalCount} entitlements granted
        </Text>
        <View style={s.progressTrack}>
          <View
            style={[
              s.progressFill,
              { width: `${Math.round((grantedCount / totalCount) * 100)}%` as any },
            ]}
          />
        </View>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={{ paddingBottom: (Platform.OS === "web" ? 34 : insets.bottom) + 60 }}
      >
        {groups.map((grp) => (
          <EntitlementGroup
            key={grp.microservice}
            microservice={grp.microservice}
            screens={grp.screens}
            grantedIds={grantedIds}
            onToggle={(eid) => toggleEntitlement(id ?? "", eid)}
          />
        ))}
      </ScrollView>
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
  headerLeft: { flexDirection: "row", alignItems: "flex-end", gap: 10, flex: 1 },
  backBtn: { marginBottom: 4 },
  eyebrow: {
    fontSize: 10,
    fontFamily: "OpenSans_600SemiBold",
    color: "rgba(255,255,255,0.55)",
    letterSpacing: 1.0,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  colorDot: { width: 12, height: 12, borderRadius: 6 },
  title: {
    fontSize: 20,
    fontFamily: "OpenSans_700Bold",
    color: "#fff",
    letterSpacing: -0.3,
    flexShrink: 1,
  },
  deleteBtn: { paddingBottom: 4, paddingLeft: 8 },
  confirmRow: { flexDirection: "row", gap: 8, alignItems: "center", paddingBottom: 4 },
  confirmNo: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  confirmNoText: { fontSize: 12, fontFamily: "OpenSans_600SemiBold", color: "rgba(255,255,255,0.8)" },
  confirmYes: {
    backgroundColor: "#C0392B",
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  confirmYesText: { fontSize: 12, fontFamily: "OpenSans_700Bold", color: "#fff" },

  descRow: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: Colors.light.backgroundCard,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.borderLight,
  },
  descText: {
    fontSize: 13,
    fontFamily: "OpenSans_400Regular",
    color: Colors.light.textSecondary,
  },
  statsRow: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: Colors.light.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.borderLight,
    gap: 6,
  },
  statsText: {
    fontSize: 11,
    fontFamily: "OpenSans_600SemiBold",
    color: Colors.light.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  progressTrack: {
    height: 4,
    backgroundColor: Colors.light.borderLight,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: 4,
    backgroundColor: Colors.light.tint,
    borderRadius: 2,
  },
});

const g = StyleSheet.create({
  container: {
    marginTop: 12,
    backgroundColor: Colors.light.backgroundCard,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.light.border,
  },
  groupHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.borderLight,
  },
  groupTitle: {
    fontSize: 12,
    fontFamily: "OpenSans_700Bold",
    color: Colors.light.tint,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  selectAllText: {
    fontSize: 12,
    fontFamily: "OpenSans_600SemiBold",
    color: Colors.light.tint,
  },
  screenRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.borderLight,
  },
  screenLabel: {
    flex: 1,
    fontSize: 13,
    fontFamily: "OpenSans_400Regular",
    color: Colors.light.text,
  },
  toggleRow: {
    flexDirection: "row",
    gap: 16,
    alignItems: "center",
  },
  toggleItem: {
    alignItems: "center",
    gap: 2,
    width: 52,
  },
  toggleLabel: {
    fontSize: 9,
    fontFamily: "OpenSans_600SemiBold",
    color: Colors.light.textTertiary,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  switch: {
    transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }],
  },
});
