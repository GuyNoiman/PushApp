/**
 * AttachmentStrip — add a photo or a voice note to something you are writing, and see what you added.
 *
 * ONE CONTROL, USED EVERYWHERE. The founder's point was that these capabilities are needed in several
 * places — a letter to a future self, a moment worth recording, a hard day, later a challenge's
 * proof. Four screens each rolling their own is four different permission stories and four places to
 * fix a bug, so this is the one.
 *
 * **IT OFFERS ONLY WHAT THE BUILD CAN DO.** The gateway reports its capabilities, and a build without
 * the native modules — a JS-only build, Expo Go, every test — renders nothing at all rather than
 * buttons that answer a tap with an apology.
 *
 * **A REFUSAL IS NOT AN ERROR.** Backing out of the picker says nothing; a denied permission says one
 * quiet line explaining that the phone's settings decide it. Neither takes over the screen, because
 * the writing is the point and the photo was optional.
 *
 * Presentational: it holds the recorder while one is running, and hands finished attachments up.
 */
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import {
  getMediaGateway,
  type Attachment,
  type MediaFailure,
  type MediaResult,
  type Recording,
} from '@/core/media/MediaGateway';
import { useTheme } from '@/hooks/use-theme';

export interface AttachmentStripProps {
  attachments: readonly Attachment[];
  onChange: (next: Attachment[]) => void;
}

export function AttachmentStrip({ attachments, onChange }: AttachmentStripProps) {
  const theme = useTheme();
  const { t } = useTranslation('tools');
  const media = getMediaGateway();
  const [recording, setRecording] = useState<Recording | null>(null);
  /** The last refusal worth explaining. A cancellation clears it and says nothing. */
  const [refusal, setRefusal] = useState<MediaFailure | null>(null);

  const take = useCallback(
    (result: MediaResult) => {
      if (result.ok) {
        setRefusal(null);
        onChange([...attachments, result.attachment]);
        return;
      }
      // Backing out of a picker is a decision, not a failure. It leaves nothing behind.
      setRefusal(result.reason === 'cancelled' ? null : result.reason);
    },
    [attachments, onChange],
  );

  const toggleRecording = useCallback(async () => {
    if (recording) {
      const result = await recording.stop();
      setRecording(null);
      take(result);
      return;
    }
    const started = await media.startRecording();
    if (!started.ok) {
      setRefusal(started.reason);
      return;
    }
    setRefusal(null);
    setRecording(started.recording);
  }, [recording, media, take]);

  const remove = (id: string) => {
    const gone = attachments.find((a) => a.id === id);
    if (gone) void media.discard(gone);
    onChange(attachments.filter((a) => a.id !== id));
  };

  const { images, camera, audio } = media.capabilities;
  // Nothing this build can do ⇒ nothing on screen. Never a button that apologises.
  if (!images && !camera && !audio) return null;

  return (
    <View style={styles.wrap}>
      {attachments.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
          {attachments.map((attachment) => (
            <View
              key={attachment.id}
              style={[styles.thumb, { borderColor: theme.hairline, backgroundColor: theme.backgroundSelected }]}>
              {attachment.kind === 'image' ? (
                <Image source={{ uri: attachment.uri }} style={styles.image} />
              ) : (
                <View style={styles.audio}>
                  <Ionicons name="mic" size={18} color={theme.tealStrong} />
                  <ThemedText type="small" style={{ color: theme.textSecondary }}>
                    {t('attach.seconds', { count: attachment.seconds ?? 0 })}
                  </ThemedText>
                </View>
              )}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('attach.remove')}
                onPress={() => remove(attachment.id)}
                hitSlop={8}
                style={[styles.removeButton, { backgroundColor: theme.background }]}>
                <Ionicons name="close" size={13} color={theme.text} />
              </Pressable>
            </View>
          ))}
        </ScrollView>
      ) : null}

      <View style={styles.buttons}>
        {images ? (
          <AddButton
            icon="image-outline"
            label={t('attach.photo')}
            onPress={() => void media.pickImage().then(take)}
          />
        ) : null}
        {camera ? (
          <AddButton
            icon="camera-outline"
            label={t('attach.camera')}
            onPress={() => void media.captureImage().then(take)}
          />
        ) : null}
        {audio ? (
          <AddButton
            icon={recording ? 'stop-circle' : 'mic-outline'}
            label={recording ? t('attach.stop') : t('attach.voice')}
            active={recording !== null}
            onPress={() => void toggleRecording()}
          />
        ) : null}
      </View>

      {refusal ? (
        <ThemedText type="small" style={{ color: theme.textMuted }}>
          {t(refusal === 'denied' ? 'attach.denied' : 'attach.failed')}
        </ThemedText>
      ) : null}
    </View>
  );
}

function AddButton({
  icon,
  label,
  onPress,
  active = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  active?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          borderColor: active ? theme.tint : theme.hairline,
          backgroundColor: active ? theme.tealTint : 'transparent',
        },
        pressed && styles.pressed,
      ]}>
      <Ionicons name={icon} size={16} color={active ? theme.tealStrong : theme.textSecondary} />
      <ThemedText type="small" style={{ color: active ? theme.tealStrong : theme.textSecondary }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.two, paddingTop: Spacing.two },
  rail: { gap: Spacing.two },
  thumb: {
    width: 84,
    height: 84,
    borderRadius: Radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  image: { width: '100%', height: '100%' },
  audio: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.one },
  removeButton: {
    position: 'absolute',
    top: 4,
    end: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttons: { flexDirection: 'row', gap: Spacing.two, flexWrap: 'wrap' },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  pressed: { opacity: 0.6 },
});
