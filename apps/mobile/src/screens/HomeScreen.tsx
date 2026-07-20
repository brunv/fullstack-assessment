import { Q } from "@nozbe/watermelondb";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Toast from "react-native-toast-message";

import { jobsCollection } from "../db";
import type Job from "../db/models/Job";
import { createJob } from "../db/mutations";
import type { HomeStackParamList } from "../navigation/types";
import JobRow from "./components/JobRow";
import StatusPicker from "./components/StatusPicker";
import { useSync } from "../sync/SyncContext";
import { STATUS_LABELS, type Status } from "../status";
import { colors, radius, spacing } from "../theme";

type Nav = NativeStackNavigationProp<HomeStackParamList, "Home">;

export default function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const { status, triggerSync } = useSync();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<Status>("new");
  const [modalVisible, setModalVisible] = useState(false);
  const [title, setTitle] = useState("");

  useEffect(() => {
    // Single subscription covering every Job regardless of the selected tab
    // — tabs are a client-side filter over this one list, not separate
    // queries, so pull-to-refresh (below) always syncs everything rather
    // than whatever happens to be showing in the current tab.
    const subscription = jobsCollection
      .query(Q.sortBy("created_at", Q.desc))
      .observe()
      .subscribe(setJobs);
    return () => subscription.unsubscribe();
  }, []);

  const filteredJobs = useMemo(
    () => jobs.filter((job) => job.status === selectedStatus),
    [jobs, selectedStatus],
  );

  const closeModal = () => {
    setModalVisible(false);
    setTitle("");
  };

  const handleCreate = async () => {
    const trimmed = title.trim();
    if (!trimmed) return;
    closeModal();
    try {
      await createJob(trimmed);
      triggerSync({ silent: true });
    } catch (err) {
      Toast.show({
        type: "error",
        text1: "Couldn't create job",
        text2: err instanceof Error ? err.message : "Please try again.",
      });
    }
  };

  // One shared control for the whole screen — pulling always triggers a
  // full sync (all Jobs, all Posts), never scoped to just the active tab.
  const refreshControl = (
    <RefreshControl
      refreshing={status === "syncing"}
      onRefresh={() => triggerSync()}
      tintColor={colors.primary}
      colors={[colors.primary]}
    />
  );

  return (
    <View style={styles.container}>
      <View style={styles.tabsSection}>
        <StatusPicker status={selectedStatus} onChange={setSelectedStatus} />
      </View>

      {filteredJobs.length === 0 ? (
        // A ScrollView reliably supports pull-to-refresh regardless of
        // content size; FlatList's ListEmptyComponent + refreshControl does
        // not consistently register the pull gesture when there's no data.
        <ScrollView
          style={styles.scrollFill}
          contentContainerStyle={styles.emptyList}
          refreshControl={refreshControl}
        >
          <View style={styles.empty}>
            <Ionicons name="briefcase-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>
              No {STATUS_LABELS[selectedStatus].toLowerCase()} jobs
            </Text>
            <Text style={styles.emptySubtitle}>
              {jobs.length === 0
                ? "Tap the + button to create your first job"
                : "Jobs you move to this status will show up here"}
            </Text>
          </View>
        </ScrollView>
      ) : (
        <FlatList
          style={styles.scrollFill}
          data={filteredJobs}
          keyExtractor={(job) => job.id}
          contentContainerStyle={styles.list}
          refreshControl={refreshControl}
          renderItem={({ item }) => (
            <JobRow
              job={item}
              onPress={() =>
                navigation.navigate("JobDetails", { jobId: item.id, jobTitle: item.title })
              }
            />
          )}
        />
      )}

      <Pressable
        style={styles.fab}
        onPress={() => setModalVisible(true)}
        accessibilityLabel="Create job"
      >
        <Ionicons name="add" size={28} color={colors.primaryText} />
      </Pressable>

      <Modal visible={modalVisible} animationType="fade" transparent onRequestClose={closeModal}>
        <View style={styles.overlay}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>New job</Text>
            <TextInput
              style={styles.input}
              placeholder="Job title"
              placeholderTextColor={colors.textMuted}
              value={title}
              onChangeText={setTitle}
              autoFocus
              onSubmitEditing={handleCreate}
              returnKeyType="done"
            />
            <View style={styles.actions}>
              <Pressable style={styles.secondaryButton} onPress={closeModal}>
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.primaryButton, !title.trim() && styles.primaryButtonDisabled]}
                onPress={handleCreate}
                disabled={!title.trim()}
              >
                <Text style={styles.primaryButtonText}>Create</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  tabsSection: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.sm },
  // Applied as `style` (not contentContainerStyle) on the FlatList/ScrollView
  // themselves — without it they size to their content instead of filling
  // the screen, so pull-to-refresh only works when touching that small
  // content area rather than anywhere on screen.
  scrollFill: { flex: 1 },
  list: { padding: spacing.lg },
  emptyList: { flexGrow: 1 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl },
  emptyTitle: { fontSize: 17, fontWeight: "600", color: colors.text, marginTop: spacing.md },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: spacing.xs,
    textAlign: "center",
  },
  fab: {
    position: "absolute",
    right: spacing.lg,
    bottom: spacing.xl,
    width: 56,
    height: 56,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(17, 24, 39, 0.4)",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  card: {
    width: "100%",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  cardTitle: { fontSize: 18, fontWeight: "700", color: colors.text, marginBottom: spacing.md },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 15,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  actions: { flexDirection: "row", gap: spacing.sm },
  secondaryButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryButtonText: { color: colors.text, fontWeight: "600" },
  primaryButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: "center",
    backgroundColor: colors.primary,
  },
  primaryButtonDisabled: { opacity: 0.5 },
  primaryButtonText: { color: colors.primaryText, fontWeight: "600" },
});
