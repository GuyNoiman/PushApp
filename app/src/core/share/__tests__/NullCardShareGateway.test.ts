/**
 * NullCardShareGateway — the inert web / Expo Go card-share gateway (Completion Celebration, I1).
 * Verifies image export reports UNAVAILABLE, image ops resolve calmly (never throw), and text
 * sharing delegates to `expo-sharing` (mirroring the export flow in useAccountActions).
 */
import { NullCardShareGateway } from '../NullCardShareGateway';

// A minimal expo-sharing double — available by default; each test tweaks it. The `mock` prefix lets
// these be referenced inside the hoisted jest.mock factory.
const mockShareAsync = jest.fn(async () => undefined);
const mockIsAvailableAsync = jest.fn(async () => true);
jest.mock('expo-sharing', () => ({
  isAvailableAsync: () => mockIsAvailableAsync(),
  shareAsync: () => mockShareAsync(),
}));

// A minimal expo-file-system double — a throwaway cache file that no-ops its I/O.
jest.mock('expo-file-system', () => ({
  Paths: { cache: 'file:///cache' },
  File: class {
    exists = false;
    uri = 'file:///cache/pushapp-completion.txt';
    create() {}
    write(_text: string) {}
    delete() {}
  },
}));

const captureRef = { current: null };

beforeEach(() => {
  mockShareAsync.mockClear();
  mockIsAvailableAsync.mockClear();
  mockIsAvailableAsync.mockResolvedValue(true);
});

describe('NullCardShareGateway', () => {
  it('reports image export as unavailable', () => {
    expect(NullCardShareGateway.isImageExportAvailable()).toBe(false);
  });

  it('resolves image share to `unavailable` without throwing', async () => {
    await expect(NullCardShareGateway.shareCardImage(captureRef)).resolves.toEqual({
      status: 'unavailable',
    });
    // The share sheet must not be invoked for an image op on the null gateway.
    expect(mockShareAsync).not.toHaveBeenCalled();
  });

  it('resolves image save to `unavailable` without throwing', async () => {
    await expect(NullCardShareGateway.saveCardImage(captureRef)).resolves.toEqual({
      status: 'unavailable',
    });
    expect(mockShareAsync).not.toHaveBeenCalled();
  });

  it('delegates text share to expo-sharing and reports success', async () => {
    const outcome = await NullCardShareGateway.shareText('I finished my Journey', {
      dialogTitle: 'Share completion',
    });
    expect(outcome).toEqual({ status: 'success' });
    expect(mockShareAsync).toHaveBeenCalledTimes(1);
  });

  it('reports `unavailable` when no share sheet exists', async () => {
    mockIsAvailableAsync.mockResolvedValue(false);
    const outcome = await NullCardShareGateway.shareText('anything');
    expect(outcome).toEqual({ status: 'unavailable' });
    expect(mockShareAsync).not.toHaveBeenCalled();
  });

  it('reports `failed` (never throws) when the share sheet errors', async () => {
    mockShareAsync.mockRejectedValueOnce(new Error('share sheet blew up'));
    await expect(NullCardShareGateway.shareText('anything')).resolves.toEqual({
      status: 'failed',
    });
  });
});
