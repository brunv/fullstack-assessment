import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Image } from "expo-image";
import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import Toast from "react-native-toast-message";

import { postsCollection } from "../db";
import type Post from "../db/models/Post";
import type { RootStackParamList } from "../navigation/types";
import { colors, radius, spacing } from "../theme";
import { formatRelativeTime } from "../utils/formatRelativeTime";

type Props = NativeStackScreenProps<RootStackParamList, "PostDetails">;

export default function PostDetailsScreen({ route }: Props) {
  const { postId } = route.params;
  const [post, setPost] = useState<Post | null>(null);

  useEffect(() => {
    let subscription: { unsubscribe: () => void } | null = null;
    postsCollection
      .find(postId)
      .then((found) => {
        setPost(found);
        subscription = found.observe().subscribe(setPost);
      })
      .catch(() => {
        Toast.show({ type: "error", text1: "This post could not be found" });
      });
    return () => subscription?.unsubscribe();
  }, [postId]);

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

      <Text style={styles.description}>{post.description || "No description"}</Text>
      <Text style={styles.date}>{formatRelativeTime(post.createdAt)}</Text>
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
  description: {
    fontSize: 16,
    color: colors.text,
    marginTop: spacing.lg,
    lineHeight: 22,
  },
  date: { fontSize: 13, color: colors.textMuted, marginTop: spacing.sm },
});
