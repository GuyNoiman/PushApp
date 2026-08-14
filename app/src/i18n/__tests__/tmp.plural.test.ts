jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'en', languageTag: 'en-US', textDirection: 'ltr' }],
}));
import i18n from '@/i18n';

it('prints', async () => {
  await i18n.changeLanguage('he');
  for (const n of [1, 2, 3, 10]) {
    // eslint-disable-next-line no-console
    console.log(
      n,
      '|',
      i18n.t('detail.cancelConfirm.circleStops', { ns: 'journey', count: n }),
      '|',
      i18n.t('detail.cancelConfirm.invitesWithdrawn', { ns: 'journey', count: n }),
      '|',
      i18n.t('detail.cancelConfirm.removes', { ns: 'journey', count: n }),
    );
  }
  await i18n.changeLanguage('en');
  for (const n of [1, 2]) {
    // eslint-disable-next-line no-console
    console.log(n, '|', i18n.t('detail.cancelConfirm.circleStops', { ns: 'journey', count: n }));
  }
});
