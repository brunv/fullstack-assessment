import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { STATUS_LABELS, STATUS_VALUES, type Status } from "../../status";
import { colors, radius, spacing } from "../../theme";

type Props = {
  status: Status;
  onChange: (status: Status) => void;
  disabled?: boolean;
};

// A bottom sheet rather than StatusPicker's 3-segment control — that control
// is reserved for Home's filter tabs (see apps/mobile/CLAUDE.md's "Status"
// section); reusing it here to *edit* a single record's status looked
// identical to filtering a list, which was confusing.
export default function StatusDropdown({ status, onChange, disabled }: Props) {
  const [open, setOpen] = useState(false);

  const handleSelect = (value: Status) => {
    setOpen(false);
    if (value !== status) onChange(value);
  };

  return (
    <>
      <Pressable
        style={styles.trigger}
        onPress={() => setOpen(true)}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={`Status: ${STATUS_LABELS[status]}`}
      >
        <Text style={styles.triggerLabel}>{STATUS_LABELS[status]}</Text>
        <Ionicons name="chevron-down" size={16} color={colors.primary} />
      </Pressable>

      <Modal visible={open} animationType="fade" transparent onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            {STATUS_VALUES.map((value) => {
              const selected = value === status;
              return (
                <Pressable
                  key={value}
                  style={styles.option}
                  onPress={() => handleSelect(value)}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                >
                  <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>
                    {STATUS_LABELS[value]}
                  </Text>
                  {selected && <Ionicons name="checkmark" size={18} color={colors.primary} />}
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    alignSelf: "flex-start",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  triggerLabel: { fontSize: 14, fontWeight: "600", color: colors.text },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(17, 24, 39, 0.4)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingVertical: spacing.sm,
    paddingBottom: spacing.xl,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  optionLabel: { fontSize: 16, color: colors.text },
  optionLabelSelected: { color: colors.primary, fontWeight: "600" },
});
