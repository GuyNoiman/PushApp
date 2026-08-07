/**
 * Tabs layout — the mature 4-tab bar (Home · Journeys · Coach · Circle) lives
 * here so sibling routes such as the Journey-creation wizard can be presented
 * over the tabs by the root Stack.
 */
import AppTabs from '@/components/app-tabs';

export default function TabsLayout() {
  return <AppTabs />;
}
