import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type Post from "../../db/models/Post";
import { colors, radius, spacing } from "../../theme";
import { formatRelativeTime } from "../../utils/formatRelativeTime";
import StatusBadge from "./StatusBadge";

type Props = {
  post: Post;
  onPress: (post: Post) => void;
};

export default function PostSearchRow({ post, onPress }: Props) {
  const [jobTitle, setJobTitle] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    post.job.fetch().then((job) => {
      if (!cancelled) setJobTitle(job?.title ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [post]);

  const imageSource = post.pictureLocalUri || post.pictureUrl || null;
  const isPending = post.syncStatus !== "synced";

  return (
    <Pressable style={styles.row} onPress={() => onPress(post)}>
      {imageSource ? (
        <Image source={{ uri: imageSource }} style={styles.image} contentFit="cover" />
      ) : (
        <View style={[styles.image, styles.imagePlaceholder]}>
          <Ionicons name="image-outline" size={22} color={colors.textMuted} />
        </View>
      )}

      <View style={styles.info}>
        {jobTitle && (
          <Text style={styles.jobTitle} numberOfLines={1}>
            {jobTitle}
          </Text>
        )}
        <View style={styles.descriptionRow}>
          <Text style={styles.description} numberOfLines={2}>
            {post.description || "No description"}
          </Text>
          {isPending && (
            <Ionicons
              name="cloud-offline-outline"
              size={14}
              color={colors.textMuted}
              style={styles.pendingIcon}
            />
          )}
        </View>
        <View style={styles.badgeRow}>
          <StatusBadge status={post.status} />
          <Text style={styles.date}>{formatRelativeTime(post.createdAt)}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  image: {
    width: 56,
    height: 56,
    borderRadius: radius.sm,
    backgroundColor: colors.background,
  },
  imagePlaceholder: { alignItems: "center", justifyContent: "center" },
  info: { flex: 1, marginLeft: spacing.md, marginRight: spacing.sm },
  jobTitle: { fontSize: 12, fontWeight: "600", color: colors.primary },
  descriptionRow: { flexDirection: "row", alignItems: "flex-start", marginTop: 2 },
  description: { fontSize: 14, color: colors.text, flexShrink: 1 },
  pendingIcon: { marginLeft: spacing.xs, marginTop: 2 },
  badgeRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: 4 },
  date: { fontSize: 12, color: colors.textMuted },
});
