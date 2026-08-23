/**
 * The media seam.
 *
 * The behaviour worth protecting is what happens when the answer is NO. A denied permission, a
 * cancelled picker and a build with no camera in it are all ordinary outcomes, and a screen built
 * against this must be able to carry on in every one of them. Nothing here throws.
 */
import {
  NullMediaGateway,
  getMediaGateway,
  setMediaGateway,
  type Attachment,
  type MediaGateway,
} from '../MediaGateway';

const photo: Attachment = {
  id: 'a1',
  kind: 'image',
  uri: 'file:///var/mobile/a.jpg',
  createdAt: 1_700_000_000_000,
};

describe('the null gateway is the truth for a build without the modules', () => {
  it('reports no capabilities rather than pretending', () => {
    expect(NullMediaGateway.capabilities).toEqual({ images: false, camera: false, audio: false });
  });

  it('answers "unavailable" to everything, and never throws', async () => {
    await expect(NullMediaGateway.pickImage()).resolves.toEqual({
      ok: false,
      reason: 'unavailable',
    });
    await expect(NullMediaGateway.captureImage()).resolves.toEqual({
      ok: false,
      reason: 'unavailable',
    });
    await expect(NullMediaGateway.startRecording()).resolves.toEqual({
      ok: false,
      reason: 'unavailable',
    });
    await expect(NullMediaGateway.discard(photo)).resolves.toBeUndefined();
  });
});

describe('the installed gateway', () => {
  afterEach(() => setMediaGateway(NullMediaGateway));

  it('is the null one until something installs a real one', () => {
    expect(getMediaGateway()).toBe(NullMediaGateway);
  });

  it('can be replaced, which is how every test stays free of native modules', () => {
    const fake: MediaGateway = {
      ...NullMediaGateway,
      capabilities: { images: true, camera: false, audio: true },
      pickImage: async () => ({ ok: true, attachment: photo }),
    };
    setMediaGateway(fake);

    expect(getMediaGateway().capabilities.images).toBe(true);
  });
});

describe('an attachment is a file on THIS device', () => {
  it('carries a local uri and nothing that suggests it was uploaded', () => {
    // No remote URL, no id from a server, no "uploadedAt". The day something needs to leave the
    // phone that is a review, not a new field here.
    expect(photo.uri.startsWith('file://')).toBe(true);
    expect(Object.keys(photo).sort()).toEqual(['createdAt', 'id', 'kind', 'uri']);
  });
});

describe('saying no is an ordinary answer', () => {
  afterEach(() => setMediaGateway(NullMediaGateway));

  it('a denial and a cancellation are different, and neither is an error', async () => {
    const gateway: MediaGateway = {
      ...NullMediaGateway,
      pickImage: async () => ({ ok: false, reason: 'denied' }),
      captureImage: async () => ({ ok: false, reason: 'cancelled' }),
    };
    setMediaGateway(gateway);

    // A screen has to be able to tell them apart: one deserves an explanation, the other deserves
    // nothing at all.
    await expect(getMediaGateway().pickImage()).resolves.toMatchObject({ reason: 'denied' });
    await expect(getMediaGateway().captureImage()).resolves.toMatchObject({ reason: 'cancelled' });
  });
});
