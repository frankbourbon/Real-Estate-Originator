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

import { ApplicationCard } from "@/components/ApplicationCard";
import Colors from "@/constants/colors";
import type { ApplicationStatus } from "@/context/ApplicationContext";
import { useApplications } from "@/context/ApplicationContext";
import { getBorrowerDisplayName, getPropertyShortAddress } from "@/utils/formatting";

const STATUS_FILTERS: (ApplicationStatus | "All")[] = [
  "All",
  "Inquiry",
  "Letter of Interest",
  "Application Start",
  "Application Processing",
  "Final Credit Review",
  "Pre-close",
  "Ready for Docs",
  "Docs Drawn",
  "Docs Back",
  "Closing",
];

export default function ApplicationsScreen() {
  const { applications, loading, createApplication, getBorrower, getProperty } = useApplications();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | "All">("All");

  const filtered = applications.filter((app) => {
    const matchStatus = statusFilter === "All" || app.status === statusFilter;
    const q = search.toLowerCase();
    if (!q) return matchStatus;
    const borrower = getBorrower(app.borrowerId);
    const property = getProperty(app.propertyId);
    const matchSearch =
      getBorrowerDisplayName(borrower).toLowerCase().includes(q) ||
      (borrower?.entityName ?? "").toLowerCase().includes(q) ||
      getPropertyShortAddress(property).toLowerCase().includes(q) ||
      (property?.city ?? "").toLowerCase().includes(q) ||
      (property?.propertyType ?? "").toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const handleCreate = async () => {
    const { application } = await createApplication();
    router.push({ pathname: "/new-application", params: { id: application.id } });
  };

  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={styles.container}>
      {/* ── Header bar ── */}
      <View style={[styles.header, { paddingTop: topPadding + 12 }]}>
        <View>
          <Text style={styles.headerEyebrow}>Commercial Banking</Text>
          <Text style={styles.headerTitle}>Applications</Text>
        </View>
        <TouchableOpacity style={styles.newBtn} onPress={handleCreate} activeOpacity={0.8}>
          <Feather name="plus" size={16} color="#fff" />
          <Text style={styles.newBtnText}>New</Text>
        </TouchableOpacity>
      </View>

      {/* ── Search bar ── */}
      <View style={styles.searchBar}>
        <Feather name="search" size={15} color={Colors.light.textTertiary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search address, borrower, entity..."
          placeholderTextColor={Colors.light.textTertiary}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
        />
        {search ? (
          <Pressable onPress={() => setSearch("")}>
            <Feather name="x" size={15} color={Colors.light.textTertiary} />
          </Pressable>
        ) : null}
      </View>

      {/* ── Filter chips ── */}
      <FlatList
        horizontal
        data={STATUS_FILTERS}
        keyExtractor={(item) => item}
        style={styles.filterBar}
        contentContainerStyle={styles.filterBarContent}
        showsHorizontalScrollIndicator={false}
        renderItem={({ item }) => {
          const active = item === statusFilter;
          const count = item === "All"
            ? applications.length
            : applications.filter((a) => a.status === item).length;
          return (
            <TouchableOpacity
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => setStatusFilter(item)}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {item}
              </Text>
              <Text style={[styles.chipCount, active && styles.chipCountActive]}>
                {count}
              </Text>
            </TouchableOpacity>
          );
        }}
      />

      {/* ── Results ── */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: 100 }]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          filtered.length > 0 ? (
            <Text style={styles.resultsCount}>
              {filtered.length} result{filtered.length !== 1 ? "s" : ""}
            </Text>
          ) : null
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>Loading...</Text>
            </View>
          ) : (
            <View style={styles.emptyBox}>
              <Feather name="inbox" size={32} color={Colors.light.textTertiary} />
              <Text style={styles.emptyTitle}>
                {search || statusFilter !== "All" ? "No matching applications" : "No applications yet"}
              </Text>
              <Text style={styles.emptyText}>
                {search || statusFilter !== "All"
                  ? "Try adjusting your search or filter."
                  : "Tap New Loan to create your first application."}
              </Text>
              {!search && statusFilter === "All" && (
                <TouchableOpacity style={styles.createBtn} onPress={handleCreate}>
                  <Feather name="plus" size={15} color="#fff" />
                  <Text style={styles.createBtnText}>Create Application</Text>
                </TouchableOpacity>
              )}
            </View>
          )
        }
        renderItem={({ item }) => <ApplicationCard application={item} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  header: {
    backgroundColor: Colors.light.surface,
    paddingHorizontal: 16,
    paddingBottom: 16,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  headerEyebrow: {
    fontSize: 10,
    fontFamily: "OpenSans_600SemiBold",
    color: "rgba(255,255,255,0.5)",
    letterSpacing: 1.0,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: "OpenSans_700Bold",
    color: "#fff",
    letterSpacing: -0.3,
  },
  newBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: Colors.light.tint,
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  newBtnText: {
    fontSize: 13,
    fontFamily: "OpenSans_700Bold",
    color: "#fff",
  },

  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.backgroundCard,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "OpenSans_400Regular",
    color: Colors.light.text,
  },

  filterBar: {
    maxHeight: 44,
    backgroundColor: Colors.light.backgroundCard,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  filterBarContent: {
    paddingHorizontal: 12,
    gap: 6,
    alignItems: "center",
    paddingVertical: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: Colors.light.background,
    borderRadius: 2,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  chipActive: {
    backgroundColor: Colors.light.tint,
    borderColor: Colors.light.tint,
  },
  chipText: {
    fontSize: 12,
    fontFamily: "OpenSans_600SemiBold",
    color: Colors.light.textSecondary,
  },
  chipTextActive: {
    color: "#fff",
  },
  chipCount: {
    fontSize: 11,
    fontFamily: "OpenSans_700Bold",
    color: Colors.light.textTertiary,
    minWidth: 14,
    textAlign: "center",
  },
  chipCountActive: {
    color: "rgba(255,255,255,0.75)",
  },

  list: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  resultsCount: {
    fontSize: 11,
    fontFamily: "OpenSans_600SemiBold",
    color: Colors.light.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },

  emptyBox: {
    alignItems: "center",
    paddingVertical: 48,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: "OpenSans_700Bold",
    color: Colors.light.text,
    marginTop: 8,
  },
  emptyText: {
    fontSize: 13,
    fontFamily: "OpenSans_400Regular",
    color: Colors.light.textSecondary,
    textAlign: "center",
  },
  createBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
    backgroundColor: Colors.light.tint,
    borderRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  createBtnText: {
    fontSize: 14,
    fontFamily: "OpenSans_700Bold",
    color: "#fff",
  },
});
