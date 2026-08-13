/**
 * ReturnJourneyList — the grouped Journey list on the inactivity return screen (Account Inactivity
 * Freeze, J5). Three clearly-separated, LABELED sections so the user is never confused about what a
 * tap does:
 *
 *   AWAY-FROZEN  — Journeys the app paused while the user was away (freezeReason `account_inactivity`).
 *                  The ONLY resumable set: each row offers Resume + Keep paused.
 *   FUTURE       — Journeys scheduled to begin later; informational only (untouched by the sweep).
 *   MANUAL       — Journeys the user had already paused themselves; shown LABELED and NOT preselected,
 *                  with no resume control here (they resume from the Journey itself).
 *
 * Presentational only (Engineering Bible §19): it renders already-resolved rows and calls back; all
 * state lives in AppCore. RTL-safe via the shared themed primitives.
 */
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface ReturnJourneyRow {
  id: string;
  title: string;
}

export function ReturnJourneyList({
  away,
  future,
  manual,
  onResume,
  onKeepPaused,
}: {
  away: ReturnJourneyRow[];
  future: ReturnJourneyRow[];
  manual: ReturnJourneyRow[];
  onResume: (id: string) => void;
  onKeepPaused: (id: string) => void;
}) {
  const { t } = useTranslation('inactivity');
  const theme = useTheme();

  if (away.length === 0 && future.length === 0 && manual.length === 0) {
    return (
      <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
        {t('return.empty')}
      </ThemedText>
    );
  }

  return (
    <View style={styles.container}>
      {away.length > 0 ? (
        <Section heading={t('return.sections.away')} hint={t('return.sections.awayHint')}>
          {away.map((row) => (
            <View
              key={row.id}
              style={[styles.row, { backgroundColor: theme.backgroundElement, borderColor: theme.hairline }]}>
              <ThemedText type="smallBold" style={[styles.rowTitle, { color: theme.text }]}>
                {row.title}
              </ThemedText>
              <View style={styles.actions}>
                <ThemedText
                  type="smallBold"
                  accessibilityRole="button"
                  onPress={() => onResume(row.id)}
                  style={{ color: theme.tint }}>
                  {t('return.resume')}
                </ThemedText>
                <ThemedText
                  type="small"
                  accessibilityRole="button"
                  onPress={() => onKeepPaused(row.id)}
                  themeColor="textMuted">
                  {t('return.keepPaused')}
                </ThemedText>
              </View>
            </View>
          ))}
        </Section>
      ) : null}

      {future.length > 0 ? (
        <Section heading={t('return.sections.future')} hint={t('return.sections.futureHint')}>
          {future.map((row) => (
            <InfoRow key={row.id} title={row.title} />
          ))}
        </Section>
      ) : null}

      {manual.length > 0 ? (
        <Section heading={t('return.sections.manual')} hint={t('return.sections.manualHint')}>
          {manual.map((row) => (
            <InfoRow key={row.id} title={row.title} />
          ))}
        </Section>
      ) : null}
    </View>
  );
}

function Section({
  heading,
  hint,
  children,
}: {
  heading: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <ThemedText type="smallBold" themeColor="textMuted" style={styles.sectionHeading}>
        {heading}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {hint}
      </ThemedText>
      <View style={styles.rows}>{children}</View>
    </View>
  );
}

/** A non-actionable row (Future / manual sections) — labeled context, no controls. */
function InfoRow({ title }: { title: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.row, { backgroundColor: theme.backgroundElement, borderColor: theme.hairline }]}>
      <ThemedText type="small" style={[styles.rowTitle, { color: theme.textSecondary }]}>
        {title}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.four,
  },
  empty: {
    textAlign: 'center',
    paddingVertical: Spacing.four,
  },
  section: {
    gap: Spacing.one,
  },
  sectionHeading: {
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  rows: {
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.card,
    borderWidth: 1,
  },
  rowTitle: {
    flex: 1,
    minWidth: 0,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
});
