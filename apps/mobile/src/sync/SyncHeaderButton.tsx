import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { ActivityIndicator, Pressable, StyleSheet } from "react-native";

import { colors } from "../theme";
import { useSync } from "./SyncContext";

export default function SyncHeaderButton() {
  const { status, triggerSync } = useSync();

  if (status === "syncing") {
    return <ActivityIndicator style={styles.button} color={colors.primary} />;
  }

  const isPending = status === "pending";

  return (
    <Pressable
      onPress={() => triggerSync()}
      hitSlop={8}
      style={styles.button}
      accessibilityLabel={isPending ? "Sync pending changes" : "All changes synced"}
    >
      <Ionicons
        name={isPending ? "cloud-upload-outline" : "cloud-done-outline"}
        size={22}
        color={isPending ? colors.warning : colors.success}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { marginRight: 16 },
});
