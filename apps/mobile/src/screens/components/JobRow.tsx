import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type Job from "../../db/models/Job";
import { colors, radius, spacing } from "../../theme";
import StatusBadge from "./StatusBadge";

type Props = {
  job: Job;
  onPress: () => void;
};

export default function JobRow({ job, onPress }: Props) {
  const [postCount, setPostCount] = useState(0);

  useEffect(() => {
    const subscription = job.posts.observeCount().subscribe(setPostCount);
    return () => subscription.unsubscribe();
  }, [job]);

  const isPending = job.syncStatus !== "synced";

  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={styles.info}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>
            {job.title}
          </Text>
          {isPending && (
            <Ionicons
              name="cloud-offline-outline"
              size={15}
              color={colors.textMuted}
              style={styles.pendingIcon}
            />
          )}
        </View>
        <Text style={styles.subtitle}>
          {postCount} post{postCount === 1 ? "" : "s"}
        </Text>
        <View style={styles.badgeRow}>
          <StatusBadge status={job.status} />
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  info: { flex: 1, marginRight: spacing.sm },
  titleRow: { flexDirection: "row", alignItems: "center" },
  title: { fontSize: 16, fontWeight: "600", color: colors.text, flexShrink: 1 },
  pendingIcon: { marginLeft: spacing.xs },
  subtitle: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  badgeRow: { marginTop: spacing.xs },
});
