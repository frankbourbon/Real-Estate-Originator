import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";
import { MS_GROUPS, MsGroup, useRbacService } from "@/services/rbac";
import { Profile, useSystemCoreService } from "@/services/system-core";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Derive a short abbreviation from a profile name. "Loan Officer" → "LO" */
function profileAbbr(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
  return words.map((w) => w[0] ?? "").join("").toUpperCase().substring(0, 3);
}

// ─── Screen Row Type ──────────────────────────────────────────────────────────

type ScreenRow = {
  screenKey: string;
  screenLabel: string;
  viewId: string | null;
  editId: string | null;
};

function buildScreenRows(group: MsGroup): ScreenRow[] {
  const map = new Map<string, ScreenRow>();
  for (const e of group.entitlements) {
    if (!map.has(e.screenKey)) {
      map.set(e.screenKey, { screenKey: e.screenKey, screenLabel: e.screenLabel, viewId: null, editId: null });
    }
    const row = map.get(e.screenKey)!;
    if (e.action === "VIEW") row.viewId = e.id;
    else row.editId = e.id;
  }
  return Array.from(map.values());
}

// ─── Profile Chip ─────────────────────────────────────────────────────────────

function ProfileChip({
  profile,
  granted,
  onToggle,
}: {
  profile: Profile;
  granted: boolean;
  onToggle: () => void;
}) {
  const abbr = profileAbbr(profile.name);
  return (
    <TouchableOpacity
      onPress={onToggle}
      activeOpacity={0.7}
      style={[
        chip.base,
        granted
          ? { backgroundColor: profile.colorHex + "22", borderColor: profile.colorHex }
          : chip.off,
      ]}
    >
      <Text
        style={[
          chip.text,
          granted ? { color: profile.colorHex } : chip.textOff,
        ]}
      >
        {abbr}
      </Text>
      {granted && (
        <Feather name="check" size={9} color={profile.colorHex} style={{ marginLeft: 2 }} />
      )}
    </TouchableOpacity>
  );
}

// ─── Entitlement Row (VIEW or EDIT line) ─────────────────────────────────────

function EntitlementLine({
  label,
  entitlementId,
  profiles,
  grantedIds,
  onToggle,
}: {
  label: "VIEW" | "EDIT";
  entitlementId: string;
  profiles: Profile[];
  grantedIds: Set<string>;
  onToggle: (profileId: string, entitlementId: string) => void;
}) {
  const isView = label === "VIEW";
  return (
    <View style={el.row}>
      <View style={[el.badge, isView ? el.viewBadge : el.editBadge]}>
        <Text style={[el.badgeText, isView ? el.viewText : el.editText]}>{label}</Text>
      </View>
      <View style={el.chips}>
        {profiles.map((p) => (
          <ProfileChip
            key={p.id}
            profile={p}
            granted={grantedIds.has(entitlementId + "|" + p.id)}
            onToggle={() => onToggle(p.id, entitlementId)}
          />
        ))}
      </View>
    </View>
  );
}

// ─── MS Panel (one accordion section) ────────────────────────────────────────

function MsPanel({
  group,
  profiles,
  profileEntsForGroup,
  onToggle,
}: {
  group: MsGroup;
  profiles: Profile[];
  profileEntsForGroup: Set<string>;
  onToggle: (profileId: string, entitlementId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const screenRows = useMemo(() => buildScreenRows(group), [group]);

  const totalPossible = group.entitlements.length * profiles.length;
  const totalGranted  = group.entitlements.filter((e) =>
    profiles.some((p) => profileEntsForGroup.has(e.id + "|" + p.id))
  ).length;

  return (
    <View style={panel.container}>
      {/* Section header */}
      <TouchableOpacity
        style={panel.header}
        onPress={() => setExpanded((e) => !e)}
        activeOpacity={0.7}
      >
        <View style={[panel.dot, { backgroundColor: group.colorHex }]} />
        <View style={panel.headerBody}>
          <Text style={panel.msName}>{group.ms}</Text>
          <Text style={panel.msMeta}>
            {screenRows.length} screen{screenRows.length !== 1 ? "s" : ""}
            {totalPossible > 0
              ? ` · ${totalGranted}/${totalPossible} grants`
              : ""}
          </Text>
        </View>
        <Feather
          name={expanded ? "chevron-up" : "chevron-down"}
          size={16}
          color={Colors.light.textTertiary}
        />
      </TouchableOpacity>

      {/* Expanded content */}
      {expanded && (
        <View style={panel.body}>
          {screenRows.map((scr, idx) => (
            <View
              key={scr.screenKey}
              style={[panel.screenBlock, idx < screenRows.length - 1 && panel.screenBorder]}
            >
              <Text style={panel.screenLabel}>{scr.screenLabel}</Text>

              {scr.viewId && (
                <EntitlementLine
                  label="VIEW"
                  entitlementId={scr.viewId}
                  profiles={profiles}
                  grantedIds={profileEntsForGroup}
                  onToggle={onToggle}
                />
              )}
              {scr.editId && (
                <EntitlementLine
                  label="EDIT"
                  entitlementId={scr.editId}
                  profiles={profiles}
                  grantedIds={profileEntsForGroup}
                  onToggle={onToggle}
                />
              )}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function EntitlementsScreen() {
  const insets     = useSafeAreaInsets();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const { profiles } = useSystemCoreService();
  const { profileEnts, toggleEntitlement } = useRbacService();

  /**
   * Build a denormalized lookup Set keyed by `entitlementId|profileId` for O(1)
   * granted checks without re-running .some() on every chip render.
   */
  const grantedSet = useMemo(
    () => new Set(profileEnts.map((pe) => `${pe.entitlementId}|${pe.profileId}`)),
    [profileEnts]
  );

  const handleToggle = (profileId: string, entitlementId: string) => {
    toggleEntitlement(profileId, entitlementId);
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
            <Text style={s.eyebrow}>Microservice Entitlements</Text>
            <Text style={s.title}>Entitlement Mapping</Text>
          </View>
        </View>
      </View>

      {/* ── Info banner ── */}
      <View style={s.infoBanner}>
        <Feather name="info" size={13} color={Colors.light.tint} style={{ marginTop: 1 }} />
        <Text style={s.infoText}>
          Each microservice defines its own entitlement keys. Tap a profile chip to grant or
          revoke access for that profile. Changes take effect immediately.
        </Text>
      </View>

      {profiles.length === 0 ? (
        <View style={s.empty}>
          <Feather name="shield-off" size={28} color={Colors.light.textTertiary} />
          <Text style={s.emptyTitle}>No profiles yet</Text>
          <Text style={s.emptyBody}>
            Create profiles in System Core → Access Profiles first, then return here to
            configure entitlements.
          </Text>
          <TouchableOpacity
            style={s.emptyBtn}
            onPress={() => router.push("/admin/profiles" as any)}
            activeOpacity={0.8}
          >
            <Text style={s.emptyBtnText}>Go to Profiles</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={s.scroll}
          contentContainerStyle={[
            s.content,
            { paddingBottom: (Platform.OS === "web" ? 34 : insets.bottom) + 60 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {MS_GROUPS.map((group) => (
            <MsPanel
              key={group.msKey}
              group={group}
              profiles={profiles}
              profileEntsForGroup={grantedSet}
              onToggle={handleToggle}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  scroll: { flex: 1 },
  content: { paddingTop: 8 },

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

  infoBanner: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: Colors.light.tintLight,
    margin: 12,
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

  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: "OpenSans_700Bold",
    color: Colors.light.text,
    marginTop: 8,
  },
  emptyBody: {
    fontSize: 13,
    fontFamily: "OpenSans_400Regular",
    color: Colors.light.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  emptyBtn: {
    marginTop: 12,
    backgroundColor: Colors.light.tint,
    borderRadius: 4,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  emptyBtnText: {
    fontSize: 13,
    fontFamily: "OpenSans_700Bold",
    color: "#fff",
  },
});

const panel = StyleSheet.create({
  container: {
    backgroundColor: Colors.light.backgroundCard,
    marginHorizontal: 12,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.light.border,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 10,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  headerBody: { flex: 1 },
  msName: {
    fontSize: 13,
    fontFamily: "OpenSans_700Bold",
    color: Colors.light.text,
  },
  msMeta: {
    fontSize: 11,
    fontFamily: "OpenSans_400Regular",
    color: Colors.light.textTertiary,
    marginTop: 1,
  },
  body: {
    borderTopWidth: 1,
    borderTopColor: Colors.light.borderLight,
  },
  screenBlock: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  screenBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.borderLight,
  },
  screenLabel: {
    fontSize: 12,
    fontFamily: "OpenSans_600SemiBold",
    color: Colors.light.text,
    marginBottom: 6,
  },
});

const el = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  badge: {
    width: 38,
    paddingVertical: 2,
    borderRadius: 3,
    alignItems: "center",
  },
  viewBadge: { backgroundColor: Colors.light.tintLight },
  editBadge: { backgroundColor: "#FEF3E2" },
  badgeText: {
    fontSize: 9,
    fontFamily: "OpenSans_700Bold",
    letterSpacing: 0.4,
  },
  viewText: { color: Colors.light.tint },
  editText: { color: "#9E5B1B" },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    flex: 1,
  },
});

const chip = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
  },
  off: {
    backgroundColor: Colors.light.background,
    borderColor: Colors.light.border,
  },
  text: {
    fontSize: 10,
    fontFamily: "OpenSans_700Bold",
  },
  textOff: { color: Colors.light.textTertiary },
});
