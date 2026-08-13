/**
 * Completion ceremony — the big Journey-completion moment and its reusable share flow (Completion
 * Celebration PRD §2.2, §3, §4). A full-screen modal reached two ways:
 *
 *   FRESH   — auto-opened from Home the first foreground after a Journey completes. It reads the
 *             pending ceremony from AppCore, marks it shown ONCE, and plays the big celebration.
 *   REOPEN  — `?journeyId=…&mode=reopen` from the completed Journey's "Share completion" action
 *             (wired in a later slice). No celebratory animation — just the card + share.
 *
 * The big ceremony can NOT be disabled by the small-celebration toggle; only Reduce Motion softens
 * it (handled in BigCelebration). Closing sends nothing (PRD §4). Journey completion NEVER depends
 * on sharing/rendering/saving succeeding (PRD §7) — the share gateway resolves calm outcomes and the
 * completed Journey is untouched by a cancelled/failed share.
 *
 * Presentational only (Engineering Bible §19): the durable card + latch live in AppCore; the share
 * boundary is the CardShareGateway. This screen only renders and orchestrates already-built pieces.
 */
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BigCelebration } from '@/components/celebration/BigCelebration';
import { CaptionInput } from '@/components/celebration/CaptionInput';
import { CardSwiper } from '@/components/celebration/CardSwiper';
import { PrivacyPreview } from '@/components/celebration/PrivacyPreview';
import { ShareActionRow } from '@/components/celebration/ShareActionRow';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { CARD_TEMPLATE_VARIANTS, cardCopyKey } from '@/core/celebration/cardTemplates';
import { getCardShareGateway } from '@/core/share';
import { useTheme } from '@/hooks/use-theme';
import { useAddressedTranslation } from '@/i18n/useAddressedTranslation';
import { useApp } from '@/state/AppProvider';

export default function CompletionScreen() {
  const { core } = useApp();
  const router = useRouter();
  const theme = useTheme();
  const { t } = useAddressedTranslation('celebration');
  const params = useLocalSearchParams<{ journeyId?: string; mode?: string }>();
  const reopen = params.mode === 'reopen';

  // Resolve the target Journey ONCE and hold it: marking the ceremony shown clears the "pending"
  // flag, so we must not re-read getPendingCompletionCeremony() on later renders. Reopen uses the
  // route param; the fresh path uses the pending ceremony's id.
  const [journeyId] = useState<string | null>(() =>
    reopen ? (params.journeyId ?? null) : (core.getPendingCompletionCeremony()?.id ?? null),
  );

  // REOPEN of a LEGACY completed Journey that predates the card (normally healed by migration) mints
  // one lazily so "Share completion" never opens on a blank card (PRD §6/§8). Kept OFF the render path
  // — it mutates state + notifies — so we do it once in an effect; the read below then picks it up.
  useEffect(() => {
    if (reopen && journeyId && !core.getCompletionCard(journeyId)) {
      core.getOrBuildCompletionCard(journeyId);
    }
  }, [reopen, journeyId, core]);

  // The durable card is keyed by id (survives markCompletionCeremonyShown), so it stays available.
  const card = journeyId ? core.getCompletionCard(journeyId) : undefined;

  // Mark the fresh ceremony SHOWN exactly once, so it auto-opens only on the first foreground after
  // completion; afterwards the reopen action is the entry point (PRD §2.2 / §6).
  const markedRef = useRef(false);
  useEffect(() => {
    if (!reopen && journeyId && !markedRef.current) {
      markedRef.current = true;
      core.markCompletionCeremonyShown(journeyId);
    }
  }, [reopen, journeyId, core]);

  const [index, setIndex] = useState(0);
  const [caption, setCaption] = useState('');
  const [busy, setBusy] = useState(false);
  const captureRef = useRef<View>(null);

  const gateway = useMemo(() => getCardShareGateway(), []);
  const imageAvailable = gateway.isImageExportAvailable();
  const variant = CARD_TEMPLATE_VARIANTS[index];

  const close = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }, [router]);

  // Text share (the degraded fallback) honours the selected variant's privacy: the name is included
  // only when the variant reveals it. The transient caption is appended, never persisted (PRD §3).
  const buildShareText = useCallback(() => {
    if (!card) return '';
    const headline = t(cardCopyKey(variant, 'headline'));
    const namePart = variant.revealsJourneyName ? card.journeyTitleSnapshot : '';
    return [headline, namePart, caption.trim()].filter(Boolean).join('\n');
  }, [card, variant, caption, t]);

  const notify = useCallback((message: string) => Alert.alert(message), []);

  const onShare = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      const dialogTitle = t('ceremony.share');
      const captionText = caption.trim() || undefined;
      const outcome = imageAvailable
        ? await gateway.shareCardImage(captureRef, { caption: captionText, dialogTitle })
        : await gateway.shareText(buildShareText(), { dialogTitle });
      // A cancelled/successful share needs no message; only a real problem is surfaced — and even
      // then the Journey stays complete (PRD §7).
      if (outcome.status === 'failed') notify(t('ceremony.shareFailed'));
      else if (outcome.status === 'unavailable') notify(t('ceremony.shareUnavailable'));
    } finally {
      setBusy(false);
    }
  }, [busy, caption, imageAvailable, gateway, buildShareText, notify, t]);

  const onSave = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      const outcome = await gateway.saveCardImage(captureRef, { dialogTitle: t('ceremony.saveImage') });
      if (outcome.status === 'failed') notify(t('ceremony.shareFailed'));
      else if (outcome.status === 'unavailable') notify(t('ceremony.shareUnavailable'));
    } finally {
      setBusy(false);
    }
  }, [busy, gateway, notify, t]);

  // A deleted / missing / not-yet-built card has nothing to show (PRD §8 stale-target). Degrade to a
  // calm note + close rather than a blank screen.
  if (!card) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
          <View style={styles.missing}>
            <ThemedText type="default" themeColor="textSecondary" style={styles.missingText}>
              {t('ceremony.missing')}
            </ThemedText>
            <Pressable accessibilityRole="button" onPress={close} hitSlop={8}>
              <ThemedText type="smallBold" style={{ color: theme.tint }}>
                {t('ceremony.close')}
              </ThemedText>
            </Pressable>
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={[styles.header, { borderBottomColor: theme.hairline }]}>
          <ThemedText type="title">{reopen ? t('ceremony.reopenTitle') : t('ceremony.title')}</ThemedText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('ceremony.close')}
            onPress={close}
            hitSlop={8}>
            <ThemedText type="smallBold" style={{ color: theme.textMuted }}>
              {t('ceremony.close')}
            </ThemedText>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Browse the fixed card variants (name-revealing + name-omitting). */}
          <CardSwiper
            card={card}
            variants={CARD_TEMPLATE_VARIANTS}
            index={index}
            onIndexChange={setIndex}
            captureRef={captureRef}
          />

          {/* Exact privacy level of the SELECTED variant — shown before any share (PRD §4). */}
          <PrivacyPreview revealsJourneyName={variant.revealsJourneyName} />

          {/* Transient personal caption — passed to the destination, never stored (PRD §3). */}
          <CaptionInput value={caption} onChange={setCaption} />

          {/* Share / save. On web / Expo Go image export is off, so this degrades to text share. */}
          <ShareActionRow
            imageAvailable={imageAvailable}
            busy={busy}
            onShare={() => void onShare()}
            onSave={() => void onSave()}
          />
        </ScrollView>

        {/* The big celebration burst — fresh path only; reduce-motion softens it (PRD §2.2). */}
        <BigCelebration play={!reopen} />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  safeArea: {
    flex: 1,
    maxWidth: MaxContentWidth,
    alignSelf: 'stretch',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.three,
    borderBottomWidth: 1,
  },
  content: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.five,
    gap: Spacing.four,
  },
  missing: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
  },
  missingText: {
    textAlign: 'center',
  },
});
