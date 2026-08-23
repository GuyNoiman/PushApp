/**
 * LoadMosaic — a hundred tiles in ten rows, filled in area order, for "What Am I Carrying Right
 * Now?".
 *
 * TAPPING IS AN ALTERNATIVE, NEVER THE ONLY WAY. Tapping an empty tile gives one tile to the
 * selected area and tapping a filled one takes it back, but every area also has plus and minus
 * controls and a spoken number beside it (its PRD §11 and §12). Nobody has to be able to hit a
 * twelve-point square to describe their week, and nothing here requires a drag.
 *
 * COLOUR IS NOT THE ONLY CUE. The mosaic is a summary; the list under it names every area with its
 * count, so the picture is readable without distinguishing eight hues.
 *
 * Presentational only (Engineering Bible §19).
 */
import { Pressable, StyleSheet, View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { TOTAL_UNITS, type CategoryCode, type LoadAllocation } from '@/core/tools/currentLoad/model';
import { useTheme } from '@/hooks/use-theme';

export interface LoadMosaicProps {
  allocations: readonly LoadAllocation[];
  /** The colour each area wears. Areas missing from the map fall back to the muted tint. */
  colorFor: (code: CategoryCode) => string;
  /** The area a tap currently gives a tile to. */
  selected: CategoryCode | null;
  onGive: () => void;
  onTakeBack: (code: CategoryCode) => void;
  /** Announced for the whole grid, since a hundred separate tiles would be unreadable aloud. */
  accessibilityLabel: string;
}

export function LoadMosaic({
  allocations,
  colorFor,
  selected,
  onGive,
  onTakeBack,
  accessibilityLabel,
}: LoadMosaicProps) {
  const theme = useTheme();

  // Fill the grid in area order, so each area is a contiguous block and a changed number moves one
  // boundary rather than rearranging the whole picture.
  const owners: (CategoryCode | null)[] = [];
  for (const allocation of allocations) {
    for (let i = 0; i < allocation.units; i += 1) owners.push(allocation.code);
  }
  while (owners.length < TOTAL_UNITS) owners.push(null);

  return (
    <View style={styles.grid} accessibilityLabel={accessibilityLabel}>
      {owners.slice(0, TOTAL_UNITS).map((owner, index) => (
        <Pressable
          key={index}
          accessible={false}
          importantForAccessibility="no"
          disabled={owner === null && selected === null}
          onPress={() => (owner === null ? onGive() : onTakeBack(owner))}
          style={({ pressed }) => [
            styles.tile,
            {
              backgroundColor: owner ? colorFor(owner) : theme.backgroundElement,
              borderColor: theme.hairline,
            },
            pressed && styles.pressed,
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 3, justifyContent: 'center' },
  tile: { width: '8%', aspectRatio: 1, borderRadius: Radius.chip / 2, borderWidth: StyleSheet.hairlineWidth },
  pressed: { opacity: 0.6 },
});
export const MOSAIC_GAP = Spacing.one;
