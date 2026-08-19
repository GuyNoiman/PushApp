/**
 * ViewShotCardShareGateway — sharing the completion card as an IMAGE (Open Work 1.3).
 *
 * The defect being closed is that Share sent plain text and threw the card's whole design away. What
 * these tests hold down is the shape of the fix rather than the pixels:
 *   · the card is captured as full-quality PNG, because the card is flat colour, type and glyphs —
 *     exactly what JPEG artefacts land on;
 *   · the image is shared under a NAMED file, since the filename is what the recipient sees;
 *   · the temp file never survives the call — it is a snapshot of the user's own record;
 *   · nothing here can ever throw. A failed capture, a failed share and an absent share sheet all
 *     resolve to a calm outcome, because Journey completion must not depend on any of them (PRD §7);
 *   · SAVING reports unavailable, and says so through its own capability flag, so the UI can decline
 *     to offer a button that could only answer "unavailable".
 *
 * The native module and the filesystem are mocked — that is the whole point of the gateway being the
 * only file that touches them.
 */
const mockCaptureRef = jest.fn();
jest.mock('react-native-view-shot', () => ({ captureRef: (...a: unknown[]) => mockCaptureRef(...a) }), {
  virtual: true,
});

const mockShareAsync = jest.fn();
const mockIsAvailable = jest.fn();
jest.mock('expo-sharing', () => ({
  isAvailableAsync: () => mockIsAvailable(),
  shareAsync: (...a: unknown[]) => mockShareAsync(...a),
}));

const mockDelete = jest.fn();
const mockMove = jest.fn();
// `mock`-prefixed so jest allows the factory below to close over it (its out-of-scope guard).
const mockFileState = { exists: false };
jest.mock('expo-file-system', () => ({
  Paths: { cache: 'file:///cache' },
  File: class {
    uri: string;
    constructor(...args: unknown[]) {
      this.uri = args.length > 1 ? `${String(args[0])}/${String(args[1])}` : String(args[0]);
    }
    get exists() {
      return mockFileState.exists;
    }
    delete() {
      mockDelete(this.uri);
    }
    move(target: { uri: string }) {
      mockMove(this.uri, target.uri);
    }
    create() {}
    write() {}
  },
}));

import { ViewShotCardShareGateway as gateway } from '../ViewShotCardShareGateway';

const ref = { current: { fake: 'view' } };

beforeEach(() => {
  jest.clearAllMocks();
  mockFileState.exists = false;
  mockIsAvailable.mockResolvedValue(true);
  mockCaptureRef.mockResolvedValue('file:///tmp/rn-view-shot-9f3a.png');
  mockShareAsync.mockResolvedValue(undefined);
});

describe('ViewShotCardShareGateway — capabilities', () => {
  it('reports image export as available when the native module is present', () => {
    expect(gateway.isImageExportAvailable()).toBe(true);
  });

  it('reports SAVING as unavailable — a different capability, asked separately', () => {
    expect(gateway.isImageSaveAvailable()).toBe(false);
  });
});

describe('ViewShotCardShareGateway — sharing the card as an image', () => {
  it('captures full-quality PNG and shares it under a named file', async () => {
    const outcome = await gateway.shareCardImage(ref, { dialogTitle: 'Share' });

    expect(outcome).toEqual({ status: 'success' });
    expect(mockCaptureRef).toHaveBeenCalledWith(ref.current, {
      format: 'png',
      quality: 1,
      result: 'tmpfile',
    });
    // The capture's random temp name is replaced by one the recipient can read.
    expect(mockMove).toHaveBeenCalledWith(
      'file:///tmp/rn-view-shot-9f3a.png',
      'file:///cache/pushapp-completion.png',
    );
    expect(mockShareAsync).toHaveBeenCalledWith(
      'file:///cache/pushapp-completion.png',
      expect.objectContaining({ mimeType: 'image/png', UTI: 'public.png', dialogTitle: 'Share' }),
    );
  });

  it('deletes the temp image afterwards — it is a snapshot of the user’s own record', async () => {
    mockFileState.exists = true;
    await gateway.shareCardImage(ref);
    expect(mockDelete).toHaveBeenCalledWith('file:///cache/pushapp-completion.png');
  });

  it('reports `unavailable` when there is no view to capture', async () => {
    const outcome = await gateway.shareCardImage({ current: null });
    expect(outcome).toEqual({ status: 'unavailable' });
    expect(mockCaptureRef).not.toHaveBeenCalled();
  });

  it('reports `unavailable` when the platform has no share sheet', async () => {
    mockIsAvailable.mockResolvedValue(false);
    expect(await gateway.shareCardImage(ref)).toEqual({ status: 'unavailable' });
  });

  it('resolves `failed` — never throws — when the capture itself fails', async () => {
    mockCaptureRef.mockRejectedValue(new Error('view not ready'));
    expect(await gateway.shareCardImage(ref)).toEqual({ status: 'failed' });
  });

  it('resolves `failed` — never throws — when the share sheet errors', async () => {
    mockShareAsync.mockRejectedValue(new Error('sheet blew up'));
    expect(await gateway.shareCardImage(ref)).toEqual({ status: 'failed' });
  });

  it('still cleans up after a failure', async () => {
    mockFileState.exists = true;
    mockShareAsync.mockRejectedValue(new Error('sheet blew up'));
    await gateway.shareCardImage(ref);
    expect(mockDelete).toHaveBeenCalledWith('file:///cache/pushapp-completion.png');
  });
});

describe('ViewShotCardShareGateway — saving', () => {
  it('resolves `unavailable` rather than pretending to have saved', async () => {
    expect(await gateway.saveCardImage(ref)).toEqual({ status: 'unavailable' });
  });
});
