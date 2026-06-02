import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Alert } from 'react-native';
import { supabase } from '../supabase';

// Inline base64 → ArrayBuffer — no external package needed
function decodeBase64(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export function usePhotoUpload(onSuccess: (url: string) => void) {
  const [uploading, setUploading] = useState(false);

  const pickAndUpload = () => {
    Alert.alert('Change photo', 'Choose a source', [
      { text: 'Camera',              onPress: launchCamera  },
      { text: 'Choose from library', onPress: launchLibrary },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const launchCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow camera access in Settings.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.8,
    });
    if (!result.canceled) await upload(result.assets[0].uri);
  };

  const launchLibrary = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow photo library access in Settings.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.8,
    });
    if (!result.canceled) await upload(result.assets[0].uri);
  };

  const upload = async (uri: string) => {
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const path = `${user.id}/avatar.jpg`;

      // ✅ Read as base64 — use plain string 'base64' instead of EncodingType enum
      const base64 = await (FileSystem as any).readAsStringAsync(uri, {
        encoding: 'base64',
      });

      // ✅ Decode inline — no base64-arraybuffer needed
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, decodeBase64(base64), {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(path);

      const urlWithBust = `${publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ photo_url: urlWithBust })
        .eq('id', user.id);

      if (updateError) throw updateError;

      onSuccess(urlWithBust);
      Alert.alert('Photo updated', 'Your profile photo has been saved.');
    } catch (e: any) {
      Alert.alert('Upload failed', e?.message ?? 'Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return { pickAndUpload, uploading };
}