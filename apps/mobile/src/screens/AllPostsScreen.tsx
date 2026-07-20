import { Q } from "@nozbe/watermelondb";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { postsCollection } from "../db";
import type Post from "../db/models/Post";
import type { PostsStackParamList } from "../navigation/types";
import PostSearchRow from "./components/PostSearchRow";
import { useSync } from "../sync/SyncContext";
import { colors, radius, spacing } from "../theme";

type Nav = NativeStackNavigationProp<PostsStackParamList, "AllPosts">;

export default function AllPostsScreen() {
  const navigation = useNavigation<Nav>();
  const { status, triggerSync } = useSync();
  const [posts, setPosts] = useState<Post[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const subscription = postsCollection
      .query(Q.sortBy("created_at", Q.desc))
      .observe()
      .subscribe(setPosts);
    return () => subscription.unsubscribe();
  }, []);

  const filteredPosts = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return posts;
    return posts.filter((post) => post.description.toLowerCase().includes(trimmed));
  }, [posts, query]);

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
      <View style={styles.searchWrapper}>
        <Ionicons name="search-outline" size={18} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search posts by description"
          placeholderTextColor={colors.textMuted}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>

      {filteredPosts.length === 0 ? (
        // A plain ScrollView (not FlatList's ListEmptyComponent) so
        // pull-to-refresh keeps working when there's nothing to show — see
        // HomeScreen/JobDetailsScreen for the same pattern.
        <ScrollView
          style={styles.scrollFill}
          contentContainerStyle={styles.emptyList}
          refreshControl={refreshControl}
        >
          <View style={styles.empty}>
            <Ionicons
              name={posts.length === 0 ? "images-outline" : "search-outline"}
              size={48}
              color={colors.textMuted}
            />
            <Text style={styles.emptyTitle}>
              {posts.length === 0 ? "No posts yet" : "No matching posts"}
            </Text>
            <Text style={styles.emptySubtitle}>
              {posts.length === 0
                ? "Posts you add to any job will show up here"
                : `No posts match "${query}"`}
            </Text>
          </View>
        </ScrollView>
      ) : (
        <FlatList
          style={styles.scrollFill}
          data={filteredPosts}
          keyExtractor={(post) => post.id}
          contentContainerStyle={styles.list}
          refreshControl={refreshControl}
          renderItem={({ item }) => (
            <PostSearchRow
              post={item}
              onPress={(post) => navigation.navigate("PostDetails", { postId: post.id })}
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  searchWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  searchInput: { flex: 1, fontSize: 15, color: colors.text, padding: 0 },
  scrollFill: { flex: 1 },
  list: { padding: spacing.lg, paddingTop: 0 },
  emptyList: { flexGrow: 1 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl },
  emptyTitle: { fontSize: 17, fontWeight: "600", color: colors.text, marginTop: spacing.md },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: spacing.xs,
    textAlign: "center",
  },
});
