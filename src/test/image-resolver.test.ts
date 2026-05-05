import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  _resetImageResolverCache,
  extractImageRefs,
  resolveImages,
} from '@/lib/typst/image-resolver';

const fetchImageBytesMock = vi.fn();

vi.mock('@/services/google-drive', () => ({
  fetchImageBytes: (id: string) => fetchImageBytesMock(id),
}));

beforeEach(() => {
  _resetImageResolverCache();
  fetchImageBytesMock.mockReset();
  globalThis.fetch = vi.fn() as unknown as typeof fetch;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('extractImageRefs', () => {
  it('finds Drive references in raw markup', () => {
    const refs = extractImageRefs('hello #image("/drive/abc.png") world');
    expect(refs).toEqual(['/drive/abc.png']);
  });

  it('finds bare image() calls inside Typst code blocks', () => {
    const refs = extractImageRefs('#{ let x = image("/drive/abc.png") }');
    expect(refs).toEqual(['/drive/abc.png']);
  });

  it('deduplicates identical references', () => {
    const refs = extractImageRefs(
      '#image("/drive/abc.png")\n#image("/drive/abc.png")\n#image("/drive/def.jpg")',
    );
    expect(refs).toEqual(['/drive/abc.png', '/drive/def.jpg']);
  });

  it('finds URL references', () => {
    const refs = extractImageRefs('#image("https://example.com/a.png")');
    expect(refs).toEqual(['https://example.com/a.png']);
  });

  it('returns empty for content with no image refs', () => {
    expect(extractImageRefs('= heading\nsome *bold* text')).toEqual([]);
  });

  it('does not match image.decode(...) — only string-literal calls', () => {
    expect(extractImageRefs('image.decode(bytes)')).toEqual([]);
  });
});

describe('resolveImages', () => {
  it('routes drive/<id>.<ext> paths through fetchImageBytes', async () => {
    fetchImageBytesMock.mockResolvedValueOnce({
      bytes: new Uint8Array([1, 2, 3]),
      mimeType: 'image/png',
    });
    const result = await resolveImages('#image("/drive/abc.png")');
    expect(fetchImageBytesMock).toHaveBeenCalledWith('abc');
    expect(result.errors).toEqual([]);
    expect(result.files).toHaveLength(1);
    expect(result.files[0].path).toBe('/drive/abc.png');
    expect(result.files[0].content).toBeInstanceOf(Uint8Array);
  });

  it('routes http(s) paths through fetch', async () => {
    const url = 'https://example.com/img.png';
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(new Uint8Array([9, 8, 7]).buffer),
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const result = await resolveImages(`#image("${url}")`);
    expect(fetchMock).toHaveBeenCalledWith(url);
    expect(result.errors).toEqual([]);
    expect(result.files).toHaveLength(1);
    expect(result.files[0].path).toBe(url);
  });

  it('emits an error for unrecognized path prefixes', async () => {
    const result = await resolveImages('#image("relative/path.png")');
    expect(result.files).toEqual([]);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).toMatch(/Unrecognized image path/);
    expect(result.errors[0].path).toBe('relative/path.png');
  });

  it('emits an error when the URL fetch returns non-ok', async () => {
    const url = 'https://example.com/missing.png';
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    }) as unknown as typeof fetch;
    const result = await resolveImages(`#image("${url}")`);
    expect(result.files).toEqual([]);
    expect(result.errors[0].message).toMatch(/HTTP 404/);
  });

  it('emits an error when fetchImageBytes throws', async () => {
    fetchImageBytesMock.mockRejectedValueOnce(new Error('Drive API 404'));
    const result = await resolveImages('#image("/drive/missing.png")');
    expect(result.files).toEqual([]);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).toBe('Drive API 404');
  });

  it('caches resolved files by path across calls', async () => {
    fetchImageBytesMock.mockResolvedValue({
      bytes: new Uint8Array([1, 2, 3]),
      mimeType: 'image/png',
    });
    await resolveImages('#image("/drive/abc.png")');
    await resolveImages('#image("/drive/abc.png")');
    expect(fetchImageBytesMock).toHaveBeenCalledTimes(1);
  });
});
