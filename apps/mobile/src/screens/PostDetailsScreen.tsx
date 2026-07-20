import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import Toast from "react-native-toast-message";

import { postsCollection } from "../db";
import type Job from "../db/models/Job";
import type Post from "../db/models/Post";
import { updatePostStatus } from "../db/mutations";
import type { PostDetailsParams } from "../navigation/types";
import { useSync } from "../sync/SyncContext";
import type { Status } from "../status";
import { colors, radius, spacing } from "../theme";
import { formatRelativeTime } from "../utils/formatRelativeTime";
import StatusDropdown from "./components/StatusDropdown";

// Typed against the shared params shape rather than a specific stack's
// param list — this screen is registered in both HomeStackNavigator and
// PostsStackNavigator, and only reads route.params here (no navigation
// calls), so it doesn't need either stack's full type.
type Props = { route: { params: PostDetailsParams } };

export default function PostDetailsScreen({ route }: Props) {
  const { postId } = route.params;
  const { triggerSync } = useSync();
  const [post, setPost] = useState<Post | null>(null);
  const [job, setJob] = useState<Job | null>(null);

  useEffect(() => {
    let subscription: { unsubscribe: () => void } | null = null;
    postsCollection
      .find(postId)
      .then((found) => {
        setPost(found);
        subscription = found.observe().subscribe(setPost);
        found.job.fetch().then(setJob);
      })
      .catch(() => {
        Toast.show({ type: "error", text1: "This post could not be found" });
      });
    return () => subscription?.unsubscribe();
  }, [postId]);

  const handleStatusChange = async (nextStatus: Status) => {
    if (!post) return;
    try {
      await updatePostStatus(post, nextStatus);
      triggerSync({ silent: true });
    } catch (err) {
      Toast.show({
        type: "error",
        text1: "Couldn't update status",
        text2: err instanceof Error ? err.message : "Please try again.",
      });
    }
  };

  if (!post) return null;

  const imageSource = post.pictureLocalUri || post.pictureUrl || null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {imageSource ? (
        <Image source={{ uri: imageSource }} style={styles.image} contentFit="contain" />
      ) : (
        <View style={[styles.image, styles.imagePlaceholder]}>
          <Ionicons name="image-outline" size={40} color={colors.textMuted} />
        </View>
      )}

      {job && <Text style={styles.jobTitle}>{job.title}</Text>}
      <Text style={styles.description}>{post.description || "No description"}</Text>
      <Text style={styles.date}>{formatRelativeTime(post.createdAt)}</Text>

      <Text style={styles.statusLabel}>Status</Text>
      <StatusDropdown status={post.status} onChange={handleStatusChange} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  image: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  imagePlaceholder: { alignItems: "center", justifyContent: "center" },
  jobTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.primary,
    marginTop: spacing.lg,
  },
  description: {
    fontSize: 16,
    color: colors.text,
    marginTop: spacing.xs,
    lineHeight: 22,
  },
  date: { fontSize: 13, color: colors.textMuted, marginTop: spacing.sm },
  statusLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textMuted,
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },
});
