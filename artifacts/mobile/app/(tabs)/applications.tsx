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
import { useApplications } from "@/context/ApplicationContext";
import type { ApplicationStatus } from "@/context/ApplicationContext";

const STATUS_FILTERS: (ApplicationStatus | "All")[] = [
  "All",
  "Draft",
  "Submitted",
  "Under Review",
  "Approved",
  "Declined",
];

export default function ApplicationsScreen() {
  const { applications, loading, createApplication } = useApplications();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | "All">("All");

  const filtered = applications.filter((app) => {
    const matchStatus = statusFilter === "All" || app.status === statusFilter;
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      app.propertyAddress.toLowerCase().includes(q) ||
      app.propertyCity.toLowerCase().includes(q) ||
      app.borrowerName.toLowerCase().includes(q) ||
      app.borrowerEntity.toLowerCase().includes(q) ||
      app.propertyType.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const handleCreate = async () => {
    const app = await createApplication();
    router.push({ pathname: "/new-application", params: { id: app.id } });
  };

  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPadding + 16 }]}>
        <Text style={styles.title}>Applications</Text>
        <TouchableOpacity style={styles.newBtn} onPress={handleCreate} activeOpacity={0.8}>
          <Feather name="plus" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Feather name="search" size={16} color={Colors.light.textTertiary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by address, borrower..."
          placeholderTextColor={Colors.light.textTertiary}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
        />
        {search ? (
          <Pressable onPress={() => setSearch("")}>
            <Feather name="x" size={16} color={Colors.light.textTertiary} />
          </Pressable>
        ) : null}
      </View>

      {/* Status Filters */}
      <FlatList
        horizontal
        data={STATUS_FILTERS}
        keyExtractor={(item) => item}
        style={styles.filterList}
        contentContainerStyle={styles.filterContent}
        showsHorizontalScrollIndicator={false}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.filterChip,
              item === statusFilter && styles.filterChipActive,
            ]}
            onPress={() => setStatusFilter(item)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.filterChipText,
                item === statusFilter && styles.filterChipTextActive,
              ]}
            >
              {item}
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: Platform.OS === "web" ? 100 : 100 },
        ]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          loading ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>Loading...</Text>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Feather name="inbox" size={44} color={Colors.light.textTertiary} />
              <Text style={styles.emptyTitle}>
                {search || statusFilter !== "All"
                  ? "No matching applications"
                  : "No applications yet"}
              </Text>
              <Text style={styles.emptyText}>
                {search || statusFilter !== "All"
                  ? "Try adjusting your filters"
                  : "Tap + to create your first LOA"}
              </Text>
              {!search && statusFilter === "All" && (
                <TouchableOpacity style={styles.emptyBtn} onPress={handleCreate}>
                  <Text style={styles.emptyBtnText}>Create Application</Text>
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: Colors.light.background,
  },
  title: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    color: Colors.light.text,
    letterSpacing: -0.5,
  },
  newBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: Colors.light.tint,
    alignItems: "center",
    justifyContent: "center",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.backgroundCard,
    borderRadius: 12,
    marginHorizontal: 20,
    marginBottom: 12,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: Colors.light.border,
    gap: 8,
  },
  searchIcon: {},
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.light.text,
  },
  filterList: {
    maxHeight: 44,
    marginBottom: 4,
  },
  filterContent: {
    paddingHorizontal: 20,
    gap: 8,
    paddingRight: 20,
  },
  filterChip: {
    backgroundColor: Colors.light.backgroundCard,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  filterChipActive: {
    backgroundColor: Colors.light.tint,
    borderColor: Colors.light.tint,
  },
  filterChipText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.light.textSecondary,
  },
  filterChipTextActive: {
    color: "#fff",
    fontFamily: "Inter_600SemiBold",
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: Colors.light.text,
    marginTop: 8,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.light.textSecondary,
  },
  emptyBtn: {
    marginTop: 12,
    backgroundColor: Colors.light.tint,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  emptyBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
});
