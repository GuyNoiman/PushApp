/**
 * ExpoMediaGateway — the real one, over `expo-image-picker` and `expo-audio`.
 *
 * THE MODULES ARE LOADED LAZILY, and that is not caution for its own sake: it is what lets a build
 * without them keep working. The same pattern as `core/auth/nativeIdentity` — a `require` inside a
 * try, a null on failure, and a capability flag the UI reads instead of guessing. A JS-only build,
 * Expo Go, and every jest run all end up on the Null gateway and none of them crash.
 *
 * **NOTHING HERE UPLOADS ANYTHING.** A picked photo and a recorded note are files on this device, and
 * the tools that use them are on-device-only (G1). The day something needs to leave the phone, that
 * is a security-privacy decision with a review — not a new parameter on a function in this file.
 *
 * A denied permission returns `'denied'` and a backed-out picker returns `'cancelled'`. Neither is an
 * exception, because neither is exceptional: somebody said no, or changed their mind.
 */
import {
  NullMediaGateway,
  type Attachment,
  type MediaGateway,
  type MediaResult,
  type Recording,
} from './MediaGateway';

/** Load a native module, or null when this build does not carry it. */
function load<T>(loader: () => T): T | null {
  try {
    return loader();
  } catch {
    return null;
  }
}

interface ImagePickerModule {
  requestMediaLibraryPermissionsAsync: () => Promise<{ granted: boolean }>;
  requestCameraPermissionsAsync: () => Promise<{ granted: boolean }>;
  launchImageLibraryAsync: (o?: object) => Promise<PickerResult>;
  launchCameraAsync: (o?: object) => Promise<PickerResult>;
}
interface PickerResult {
  canceled: boolean;
  assets?: { uri: string; fileSize?: number }[];
}

interface AudioModule {
  requestRecordingPermissionsAsync: () => Promise<{ granted: boolean }>;
  setAudioModeAsync: (mode: object) => Promise<void>;
  RecordingPresets: { HIGH_QUALITY: object };
  AudioRecorder: new (options: object) => NativeRecorder;
}
interface NativeRecorder {
  prepareToRecordAsync: () => Promise<void>;
  record: () => void;
  stop: () => Promise<void>;
  uri: string | null;
  currentTime?: number;
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const Picker = load<ImagePickerModule>(() => require('expo-image-picker'));
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Audio = load<AudioModule>(() => require('expo-audio'));

const id = (kind: string) => `${kind}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

function fromPicker(result: PickerResult, kind: 'image'): MediaResult {
  if (result.canceled) return { ok: false, reason: 'cancelled' };
  const asset = result.assets?.[0];
  if (!asset) return { ok: false, reason: 'failed' };
  const attachment: Attachment = {
    id: id(kind),
    kind,
    uri: asset.uri,
    ...(asset.fileSize !== undefined ? { bytes: asset.fileSize } : {}),
    createdAt: Date.now(),
  };
  return { ok: true, attachment };
}

export const ExpoMediaGateway: MediaGateway = {
  capabilities: { images: Picker !== null, camera: Picker !== null, audio: Audio !== null },

  async pickImage() {
    if (!Picker) return { ok: false, reason: 'unavailable' };
    const permission = await Picker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return { ok: false, reason: 'denied' };
    try {
      // No editing step: cropping a photo somebody chose is us deciding what the moment was.
      return fromPicker(await Picker.launchImageLibraryAsync({ quality: 0.8 }), 'image');
    } catch {
      return { ok: false, reason: 'failed' };
    }
  },

  async captureImage() {
    if (!Picker) return { ok: false, reason: 'unavailable' };
    const permission = await Picker.requestCameraPermissionsAsync();
    if (!permission.granted) return { ok: false, reason: 'denied' };
    try {
      return fromPicker(await Picker.launchCameraAsync({ quality: 0.8 }), 'image');
    } catch {
      return { ok: false, reason: 'failed' };
    }
  },

  async startRecording() {
    if (!Audio) return { ok: false, reason: 'unavailable' };
    const permission = await Audio.requestRecordingPermissionsAsync();
    if (!permission.granted) return { ok: false, reason: 'denied' };
    try {
      await Audio.setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      const recorder = new Audio.AudioRecorder(Audio.RecordingPresets.HIGH_QUALITY);
      await recorder.prepareToRecordAsync();
      const startedAt = Date.now();
      recorder.record();

      const recording: Recording = {
        stop: async () => {
          try {
            await recorder.stop();
            const uri = recorder.uri;
            if (!uri) return { ok: false, reason: 'failed' };
            return {
              ok: true,
              attachment: {
                id: id('audio'),
                kind: 'audio',
                uri,
                seconds: Math.round((Date.now() - startedAt) / 1000),
                createdAt: Date.now(),
              },
            };
          } catch {
            return { ok: false, reason: 'failed' };
          } finally {
            // Hand the audio session back, or every sound the phone makes afterwards is quiet.
            await Audio.setAudioModeAsync({ allowsRecording: false }).catch(() => {});
          }
        },
        cancel: async () => {
          await recorder.stop().catch(() => {});
          await Audio.setAudioModeAsync({ allowsRecording: false }).catch(() => {});
        },
      };
      return { ok: true, recording };
    } catch {
      return { ok: false, reason: 'failed' };
    }
  },

  async discard(attachment: Attachment) {
    // Deleting the file is deliberately delegated: `expo-file-system` is already a dependency and
    // the owner of a file's lifetime is whoever stored it. This gateway only produces attachments.
    void attachment;
  },
};

/** The gateway this build should use: the real one when the modules are here, the null one when not. */
export function resolveMediaGateway(): MediaGateway {
  return Picker || Audio ? ExpoMediaGateway : NullMediaGateway;
}
