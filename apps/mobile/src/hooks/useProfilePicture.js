import { useState } from "react";
import * as ImagePicker from "expo-image-picker";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { supabase } from "../lib/supabase-client";

const MAX_DIMENSION = 512;
const JPEG_QUALITY = 0.7;
const CONTENT_TYPE = "image/jpeg";

// Caps dimensions and re-encodes as JPEG before upload — camera/library
// assets can otherwise be several MB at full resolution, which is wasted
// bandwidth and storage for something rendered at 84x84 (see ProfileView.js/
// ProfileSettingsView.js). Always normalizes to JPEG regardless of the
// source format, so the upload's content type is never in question.
async function resizeAndCompress(uri) {
  const image = await ImageManipulator.manipulate(uri).resize({ width: MAX_DIMENSION, height: MAX_DIMENSION }).renderAsync();
  return image.saveAsync({ compress: JPEG_QUALITY, format: SaveFormat.JPEG });
}

// supabase-js's FunctionsHttpError.message is always the generic "Edge
// Function returned a non-2xx status code" — the function's actual response
// body only lives on `.context`, the raw fetch Response, and has to be read
// out explicitly. See https://github.com/supabase/functions-js/issues/55.
async function callProfilePictureFunction(body) {
  const { data, error } = await supabase.functions.invoke("profile-picture", { body });
  if (error) {
    const bodyText = await error?.context?.text?.().catch(() => null);
    throw new Error(`profile-picture function: ${bodyText || error.message}`);
  }
  return data;
}

// Drives the whole "change profile picture" flow: pick (camera or library)
// -> resize/compress -> upload to S3 via the profile-picture Edge Function's
// presigned URL -> persist the result via the set_profile_picture_url()
// Postgres function (see supabase/schema.sql) -> update local state. Requires
// a signed-in session throughout, since both the Edge Function and the RPC
// need a JWT — callers (ChangeProfilePictureSheet, via ProfileSettingsView)
// are expected to only reach this once signed in, same as CloudBackupSection's
// own actions guard on `session`. ChangeProfilePictureSheet closes as soon as
// an option is tapped (the picker itself takes over the screen next), so
// failures surface as `error` state (rendered by the caller as an
// ErrorModal, matching the app's own styling rather than the OS Alert)
// instead of inline sheet UI.
export function useProfilePicture({ session, onUpdate }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null); // { title, message } | null

  const pick = async (source) => {
    if (!session || uploading) return;
    setError(null);

    const permission =
      source === "camera" ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError({
        title: "Permission needed",
        message:
          source === "camera" ? "Allow camera access to take a profile picture." : "Allow photo library access to choose a profile picture.",
      });
      return;
    }

    const launch = source === "camera" ? ImagePicker.launchCameraAsync : ImagePicker.launchImageLibraryAsync;
    const result = await launch({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.9 });
    if (result.canceled) return;

    setUploading(true);
    try {
      const resized = await resizeAndCompress(result.assets[0].uri);
      const blob = await (await fetch(resized.uri)).blob();

      const data = await callProfilePictureFunction({ mode: "upload", contentType: CONTENT_TYPE });

      const putResponse = await fetch(data.uploadUrl, { method: "PUT", headers: { "Content-Type": CONTENT_TYPE }, body: blob });
      if (!putResponse.ok) {
        const putBody = await putResponse.text().catch(() => "");
        throw new Error(`S3 upload (${putResponse.status}): ${putBody.slice(0, 300) || "no body"}`);
      }

      const { error: rpcError } = await supabase.rpc("set_profile_picture_url", { new_url: data.publicUrl });
      if (rpcError) throw new Error(`set_profile_picture_url: ${rpcError.message}`);

      onUpdate("pictureUrl", data.publicUrl);
    } catch (err) {
      setError({ title: "Couldn't upload photo", message: err?.message || "Something went wrong uploading your photo." });
    } finally {
      setUploading(false);
    }
  };

  const remove = async () => {
    if (!session || uploading) return;
    setError(null);
    setUploading(true);
    try {
      await callProfilePictureFunction({ mode: "remove" });

      const { error: rpcError } = await supabase.rpc("set_profile_picture_url", { new_url: "" });
      if (rpcError) throw new Error(`set_profile_picture_url: ${rpcError.message}`);

      onUpdate("pictureUrl", "");
    } catch (err) {
      setError({ title: "Couldn't remove photo", message: err?.message || "Something went wrong removing your photo." });
    } finally {
      setUploading(false);
    }
  };

  return {
    uploading,
    error,
    dismissError: () => setError(null),
    pickFromCamera: () => pick("camera"),
    pickFromLibrary: () => pick("library"),
    remove,
  };
}
