import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { STATUS_LABELS, type Status } from "../../status";
import { colors, radius } from "../../theme";

const STATUS_COLORS: Record<Status, { background: string; text: string }> = {
  new: { background: colors.border, text: colors.textMuted },
  in_progress: { background: `${colors.warning}26`, text: colors.warning },
  complete: { background: `${colors.success}26`, text: colors.success },
};

export default function StatusBadge({ status }: { status: Status }) {
  const { background, text } = STATUS_COLORS[status];
  return (
    <View style={[styles.badge, { backgroundColor: background }]}>
      <Text style={[styles.label, { color: text }]}>{STATUS_LABELS[status]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  label: { fontSize: 11, fontWeight: "600" },
});
