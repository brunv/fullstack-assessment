import { File, Paths } from "expo-file-system";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";

/** Resizes/compresses the picked image and copies it into the app's
 * persistent document directory. `expo-image-picker`/camera results land in
 * a cache directory the OS can purge under storage pressure — a picture
 * captured offline and not yet synced could otherwise vanish before ever
 * uploading. */
async function persistToDocuments(sourceUri: string): Promise<string> {
  const manipulated = await ImageManipulator.manipulateAsync(
    sourceUri,
    [{ resize: { width: 1600 } }],
    { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG },
  );

  const destination = new File(
    Paths.document,
    `post-${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`,
  );
  new File(manipulated.uri).copy(destination);
  return destination.uri;
}

export async function pickImageFromLibrary(): Promise<string | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    quality: 0.9,
  });
  if (result.canceled || !result.assets[0]) return null;

  return persistToDocuments(result.assets[0].uri);
}

export async function captureImageFromCamera(): Promise<string | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) return null;

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ["images"],
    quality: 0.9,
  });
  if (result.canceled || !result.assets[0]) return null;

  return persistToDocuments(result.assets[0].uri);
}
