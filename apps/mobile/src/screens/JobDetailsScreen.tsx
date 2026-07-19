import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from "@react-navigation/native-stack";
import React, { useEffect, useState } from "react";
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import Toast from "react-native-toast-message";

import { jobsCollection } from "../db";
import type Job from "../db/models/Job";
import type Post from "../db/models/Post";
import { createPost, deletePost } from "../db/mutations";
import type { RootStackParamList } from "../navigation/types";
import CreatePostModal from "./components/CreatePostModal";
import PostRow from "./components/PostRow";
import { useSync } from "../sync/SyncContext";
import { colors, radius, spacing } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "JobDetails">;
type Nav = NativeStackNavigationProp<RootStackParamList, "JobDetails">;

export default function JobDetailsScreen({ route }: Props) {
  const { jobId } = route.params;
  const navigation = useNavigation<Nav>();
  const { triggerSync } = useSync();
  const [job, setJob] = useState<Job | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    let postsSubscription: { unsubscribe: () => void } | null = null;
    jobsCollection
      .find(jobId)
      .then((foundJob) => {
        setJob(foundJob);
        postsSubscription = foundJob.posts.observe().subscribe(setPosts);
      })
      .catch(() => {
        Toast.show({ type: "error", text1: "This job could not be found" });
      });
    return () => postsSubscription?.unsubscribe();
  }, [jobId]);

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

  return (
    <View style={styles.container}>
      {posts.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="images-outline" size={48} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>No posts yet</Text>
          <Text style={styles.emptySubtitle}>Add a post to start documenting this job</Text>
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(post) => post.id}
          contentContainerStyle={styles.list}
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
  list: { padding: spacing.lg, paddingBottom: 96 },
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
});
