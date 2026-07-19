import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Toast from "react-native-toast-message";

import { colors, radius, spacing } from "../../theme";
import { captureImageFromCamera, pickImageFromLibrary } from "../../utils/pickImage";

type Props = {
  visible: boolean;
  onClose: () => void;
  onSubmit: (values: { description: string; pictureLocalUri: string | null }) => void;
};

export default function CreatePostModal({ visible, onClose, onSubmit }: Props) {
  const [description, setDescription] = useState("");
  const [pictureLocalUri, setPictureLocalUri] = useState<string | null>(null);
  const [isPicking, setIsPicking] = useState(false);

  const reset = () => {
    setDescription("");
    setPictureLocalUri(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = () => {
    onSubmit({ description: description.trim(), pictureLocalUri });
    reset();
  };

  const handlePick = async (source: "camera" | "library") => {
    setIsPicking(true);
    try {
      const uri =
        source === "camera" ? await captureImageFromCamera() : await pickImageFromLibrary();
      if (uri) setPictureLocalUri(uri);
    } catch (err) {
      Toast.show({
        type: "error",
        text1: "Couldn't add photo",
        text2: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setIsPicking(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>New post</Text>

          {pictureLocalUri ? (
            <View style={styles.previewWrapper}>
              <Image source={{ uri: pictureLocalUri }} style={styles.preview} contentFit="cover" />
              <Pressable
                style={styles.removeImageButton}
                onPress={() => setPictureLocalUri(null)}
                accessibilityLabel="Remove photo"
              >
                <Ionicons name="close-circle" size={24} color={colors.surface} />
              </Pressable>
            </View>
          ) : isPicking ? (
            <View style={[styles.preview, styles.previewPlaceholder]}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : (
            <View style={styles.pickerRow}>
              <Pressable
                style={styles.pickerButton}
                onPress={() => handlePick("camera")}
                disabled={isPicking}
              >
                <Ionicons name="camera-outline" size={20} color={colors.primary} />
                <Text style={styles.pickerButtonText}>Camera</Text>
              </Pressable>
              <Pressable
                style={styles.pickerButton}
                onPress={() => handlePick("library")}
                disabled={isPicking}
              >
                <Ionicons name="images-outline" size={20} color={colors.primary} />
                <Text style={styles.pickerButtonText}>Gallery</Text>
              </Pressable>
            </View>
          )}

          <TextInput
            style={styles.input}
            placeholder="Description (optional)"
            placeholderTextColor={colors.textMuted}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
          />

          <View style={styles.actions}>
            <Pressable style={styles.secondaryButton} onPress={handleClose}>
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </Pressable>
            <Pressable style={styles.primaryButton} onPress={handleSubmit}>
              <Text style={styles.primaryButtonText}>Add post</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(17, 24, 39, 0.4)",
    justifyContent: "flex-end",
  },
  card: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  title: { fontSize: 18, fontWeight: "700", color: colors.text, marginBottom: spacing.md },
  pickerRow: { flexDirection: "row", gap: spacing.md, marginBottom: spacing.md },
  pickerButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
  },
  pickerButtonText: { color: colors.primary, fontWeight: "600" },
  preview: { width: "100%", height: 180, borderRadius: radius.md, marginBottom: spacing.md },
  previewPlaceholder: {
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  previewWrapper: { position: "relative", marginBottom: spacing.md },
  removeImageButton: {
    position: "absolute",
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: "rgba(17, 24, 39, 0.55)",
    borderRadius: radius.full,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 15,
    color: colors.text,
    minHeight: 80,
    textAlignVertical: "top",
    marginBottom: spacing.lg,
  },
  actions: { flexDirection: "row", gap: spacing.sm },
  secondaryButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryButtonText: { color: colors.text, fontWeight: "600" },
  primaryButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: "center",
    backgroundColor: colors.primary,
  },
  primaryButtonText: { color: colors.primaryText, fontWeight: "600" },
});
