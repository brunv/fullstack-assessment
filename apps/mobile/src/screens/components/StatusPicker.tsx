import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { STATUS_LABELS, STATUS_VALUES, type Status } from "../../status";
import { colors, radius, spacing } from "../../theme";

type Props = {
  status: Status;
  onChange: (status: Status) => void;
  disabled?: boolean;
};

export default function StatusPicker({ status, onChange, disabled }: Props) {
  return (
    <View style={styles.row}>
      {STATUS_VALUES.map((value) => {
        const selected = value === status;
        return (
          <Pressable
            key={value}
            onPress={() => !disabled && !selected && onChange(value)}
            style={[styles.option, selected && styles.optionSelected]}
            accessibilityRole="button"
            accessibilityLabel={`Set status to ${STATUS_LABELS[value]}`}
            accessibilityState={{ selected }}
          >
            <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>
              {STATUS_LABELS[value]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: 4,
    gap: 4,
  },
  option: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    alignItems: "center",
  },
  optionSelected: { backgroundColor: colors.surface },
  optionLabel: { fontSize: 13, fontWeight: "600", color: colors.textMuted },
  optionLabelSelected: { color: colors.primary },
});
