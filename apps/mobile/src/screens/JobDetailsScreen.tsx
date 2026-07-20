import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from "@react-navigation/native-stack";
import React, { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Toast from "react-native-toast-message";

import { jobsCollection } from "../db";
import type Job from "../db/models/Job";
import type Post from "../db/models/Post";
import { createPost, deleteJob, deletePost, updateJobStatus } from "../db/mutations";
import type { HomeStackParamList } from "../navigation/types";
import CreatePostModal from "./components/CreatePostModal";
import PostRow from "./components/PostRow";
import StatusDropdown from "./components/StatusDropdown";
import { useSync } from "../sync/SyncContext";
import { compareByStatus, type Status } from "../status";
import { colors, radius, spacing } from "../theme";

type Props = NativeStackScreenProps<HomeStackParamList, "JobDetails">;
type Nav = NativeStackNavigationProp<HomeStackParamList, "JobDetails">;

// Single combined list — no per-status tabs here (those are Home's Job
// list only) — sorted new > in_progress > complete, newest first within
// each status.
function sortPosts(list: Post[]): Post[] {
  return [...list].sort((a, b) => {
    const statusDiff = compareByStatus(a, b);
    return statusDiff !== 0 ? statusDiff : b.createdAt.getTime() - a.createdAt.getTime();
  });
}

export default function JobDetailsScreen({ route }: Props) {
  const { jobId } = route.params;
  const navigation = useNavigation<Nav>();
  const { status, triggerSync } = useSync();
  const [job, setJob] = useState<Job | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    let jobSubscription: { unsubscribe: () => void } | null = null;
    let postsSubscription: { unsubscribe: () => void } | null = null;
    jobsCollection
      .find(jobId)
      .then((foundJob) => {
        setJob(foundJob);
        jobSubscription = foundJob.observe().subscribe(setJob);
        postsSubscription = foundJob.posts
          .observe()
          .subscribe((list) => setPosts(sortPosts(list)));
      })
      .catch(() => {
        Toast.show({ type: "error", text1: "This job could not be found" });
      });
    return () => {
      jobSubscription?.unsubscribe();
      postsSubscription?.unsubscribe();
    };
  }, [jobId]);

  const handleDeleteJob = () => {
    if (!job) return;
    const postCount = posts.length;
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
              navigation.goBack();
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

  // Header-right icon rather than a row button — deleting a Job now only
  // happens from its own detail screen, not from Home's list (moved per
  // explicit direction).
  useEffect(() => {
    navigation.setOptions({
      headerRight: job
        ? () => (
            <Pressable
              hitSlop={8}
              onPress={handleDeleteJob}
              style={styles.headerDeleteButton}
              accessibilityLabel="Delete job"
            >
              <Ionicons name="trash-outline" size={22} color={colors.danger} />
            </Pressable>
          )
        : undefined,
    });
  }, [navigation, job, posts.length]);

  const handleStatusChange = async (nextStatus: Status) => {
    if (!job) return;
    try {
      await updateJobStatus(job, nextStatus);
      triggerSync({ silent: true });
    } catch (err) {
      Toast.show({
        type: "error",
        text1: "Couldn't update status",
        text2: err instanceof Error ? err.message : "Please try again.",
      });
    }
  };

  const handleAddPost = async (values: { description: string; pictureLocalUri: string | null }) => {
    if (!job) return;
    setModalVisible(false);
    try {
      await createPost(job, values);
      triggerSync({ silent: true });
    } catch (err) {
      Toast.show({
        type: "error",
        text1: "Couldn't add post",
        text2: err instanceof Error ? err.message : "Please try again.",
      });
    }
  };

  const handleDeletePost = (post: Post) => {
    Alert.alert("Delete post?", "This can't be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deletePost(post);
            triggerSync({ silent: true });
          } catch (err) {
            Toast.show({
              type: "error",
              text1: "Couldn't delete post",
              text2: err instanceof Error ? err.message : "Please try again.",
            });
          }
        },
      },
    ]);
  };

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
      {job && (
        <View style={styles.statusSection}>
          <Text style={styles.statusLabel}>Status</Text>
          <StatusDropdown status={job.status} onChange={handleStatusChange} />
        </View>
      )}
      {posts.length === 0 ? (
        // A ScrollView reliably supports pull-to-refresh regardless of
        // content size; FlatList's ListEmptyComponent + refreshControl does
        // not consistently register the pull gesture when there's no data.
        <ScrollView
          style={styles.scrollFill}
          contentContainerStyle={styles.emptyList}
          refreshControl={refreshControl}
        >
          <View style={styles.empty}>
            <Ionicons name="images-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No posts yet</Text>
            <Text style={styles.emptySubtitle}>Add a post to start documenting this job</Text>
          </View>
        </ScrollView>
      ) : (
        <FlatList
          style={styles.scrollFill}
          data={posts}
          keyExtractor={(post) => post.id}
          contentContainerStyle={styles.list}
          refreshControl={refreshControl}
          renderItem={({ item }) => (
            <PostRow
              post={item}
              onPress={(post) => navigation.navigate("PostDetails", { postId: post.id })}
              onDelete={handleDeletePost}
            />
          )}
        />
      )}

      <Pressable
        style={styles.addButton}
        onPress={() => setModalVisible(true)}
        disabled={!job}
        accessibilityLabel="Add post"
      >
        <Ionicons name="add" size={20} color={colors.primaryText} />
        <Text style={styles.addButtonText}>Add post</Text>
      </Pressable>

      <CreatePostModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSubmit={handleAddPost}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  // Applied as `style` (not contentContainerStyle) on the FlatList/ScrollView
  // themselves — without it they size to their content instead of filling
  // the screen, so pull-to-refresh only works when touching that small
  // content area rather than anywhere on screen.
  scrollFill: { flex: 1 },
  statusSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  statusLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  list: { padding: spacing.lg, paddingBottom: 96 },
  emptyList: { flexGrow: 1 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl },
  emptyTitle: { fontSize: 17, fontWeight: "600", color: colors.text, marginTop: spacing.md },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: spacing.xs,
    textAlign: "center",
  },
  addButton: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.xl,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  addButtonText: { color: colors.primaryText, fontWeight: "600", fontSize: 15 },
  headerDeleteButton: { padding: spacing.xs, marginRight: spacing.xs },
});
