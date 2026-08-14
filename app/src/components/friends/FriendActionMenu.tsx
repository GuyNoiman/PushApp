/**
 * FriendActionMenu — the 3-dot overflow menu on a friend row (v14 mockup screen-09: "Friends —
 * bigger 3-dot, neutral menu"). It is now a thin wrapper over the shared
 * {@link ../ui/OverflowMenu}: the button + popover live there (the Journey detail screen needed the
 * same control), and this file keeps only what is friend-specific — the "more actions for {name}"
 * accessibility label from the `circle` namespace.
 *
 * Presentational only — it takes callbacks and reports taps; no social/business logic lives here
 * (Engineering Bible §19). The caller decides which items exist (`friendActions()` on the Friend
 * Profile), so the menu never renders a dead or misleading action — there is no direct-message item
 * until the Inbox ships (Friend_Profile_PRD §4.5, D29/D40).
 */
import { useTranslation } from 'react-i18next';

import { OverflowMenu, type OverflowMenuItem } from '@/components/ui/OverflowMenu';

export type FriendMenuItem = OverflowMenuItem;

export function FriendActionMenu({ friendName, items }: { friendName: string; items: FriendMenuItem[] }) {
  const { t } = useTranslation('circle');

  return <OverflowMenu a11yLabel={t('moreActionsA11y', { name: friendName })} items={items} />;
}
