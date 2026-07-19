import { Q } from "@nozbe/watermelondb";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Toast from "react-native-toast-message";

import { jobsCollection } from "../db";
import type Job from "../db/models/Job";
import { createJob, deleteJob } from "../db/mutations";
import type { RootStackParamList } from "../navigation/types";
import JobRow from "./components/JobRow";
import { useSync } from "../sync/SyncContext";
import { colors, radius, spacing } from "../theme";

type Nav = NativeStackNavigationProp<RootStackParamList, "Home">;

export default function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const { triggerSync } = useSync();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [title, setTitle] = useState("");

  useEffect(() => {
    const subscription = jobsCollection
      .query(Q.sortBy("created_at", Q.desc))
      .observe()
      .subscribe(setJobs);
    return () => subscription.unsubscribe();
  }, []);

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

  const handleDelete = (job: Job, postCount: number) => {
    Alert.alert(
      "Delete job?",
      postCount > 0
        ? `This will also delete ${postCount} post${postCount === 1 ? "" : "s"}.`
        : "This can't be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteJob(job);
              triggerSync({ silent: true });
            } catch (err) {
              Toast.show({
                type: "error",
                text1: "Couldn't delete job",
                text2: err instanceof Error ? err.message : "Please try again.",
              });
            }
          },
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      {jobs.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="briefcase-outline" size={48} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>No jobs yet</Text>
          <Text style={styles.emptySubtitle}>Tap the + button to create your first job</Text>
        </View>
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={(job) => job.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <JobRow
              job={item}
              onPress={() =>
                navigation.navigate("JobDetails", { jobId: item.id, jobTitle: item.title })
              }
              onDelete={handleDelete}
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
  list: { padding: spacing.lg },
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
