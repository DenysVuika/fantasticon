import svg2ttf from 'svg2ttf';
import { compress } from 'wawoff2';
import { describe, it, expect, beforeAll } from 'vitest';
import { FontGeneratorOptions } from '../../../types/generator';
import woff2Gen from '../woff2';

// Magic bytes that every valid WOFF2 file must begin with: ASCII "wOF2"
const WOFF2_MAGIC = Buffer.from([0x77, 0x4f, 0x46, 0x32]);

// sfnt version for TrueType outlines: 0x00010000
const SFNT_VERSION_TRUETYPE = Buffer.from([0x00, 0x01, 0x00, 0x00]);

/**
 * A minimal but structurally valid SVG font with a single glyph.
 * Using a fixed timestamp (ts: 0) keeps the TTF — and therefore the
 * compressed WOFF2 — deterministic across runs.
 */
const MINIMAL_SVG_FONT = `<?xml version="1.0" standalone="no"?>
<svg xmlns="http://www.w3.org/2000/svg">
<defs>
<font id="test" horiz-adv-x="512">
<font-face font-family="test" units-per-em="512" ascent="448" descent="-64"/>
<missing-glyph horiz-adv-x="512"/>
<glyph unicode="&#xE001;" d="M0 0h512v512H0z" horiz-adv-x="512"/>
</font>
</defs>
</svg>`;

const mockOptions = () => ({}) as unknown as FontGeneratorOptions;

describe('`WOFF2` font generator – integration', () => {
  let ttf: Buffer;
  let result: Buffer;

  beforeAll(async () => {
    // Build a real TTF from the SVG font so we can feed genuine bytes
    // into the generator without committing a binary fixture file.
    ttf = Buffer.from(svg2ttf(MINIMAL_SVG_FONT, { ts: 0 }).buffer);
    result = (await woff2Gen.generate(mockOptions(), ttf)) as Buffer;
  });

  it('produces a Buffer', () => {
    expect(Buffer.isBuffer(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it('starts with the WOFF2 magic number ("wOF2")', () => {
    // Bytes 0–3 of every WOFF2 file must be 0x774F4632
    expect(result.subarray(0, 4)).toEqual(WOFF2_MAGIC);
  });

  it('embeds the correct sfnt version for TrueType outlines', () => {
    // Bytes 4–7 carry the original font's sfVersion (0x00010000 for TrueType)
    expect(result.subarray(4, 8)).toEqual(SFNT_VERSION_TRUETYPE);
  });

  it('length field in the WOFF2 header matches actual buffer length', () => {
    // Bytes 8–11 are the totalSfntSize — wait, actually bytes 8–11 in the
    // WOFF2 header are `length` (total size of the WOFF2 file in bytes).
    const reportedLength = result.readUInt32BE(8);
    expect(reportedLength).toBe(result.length);
  });

  it('is smaller than the input TTF (compression is happening)', () => {
    expect(result.length).toBeLessThan(ttf.length);
  });

  it('is deterministic: compressing the same TTF twice yields identical output', async () => {
    const result2 = (await woff2Gen.generate(mockOptions(), ttf)) as Buffer;
    expect(result2).toEqual(result);
  });

  it('matches the output of calling wawoff2.compress directly', async () => {
    // Ensures the generator is wiring through to wawoff2 without
    // accidentally dropping or mutating bytes.
    const direct = Buffer.from(await compress(ttf));
    expect(result).toEqual(direct);
  });
});
