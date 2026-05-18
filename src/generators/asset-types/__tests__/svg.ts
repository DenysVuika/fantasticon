import * as _SVGIcons2SVGFontStream from 'svgicons2svgfont';
import { readFile } from 'fs/promises';
import { FontAssetType } from '../../../types/misc';
import { FontGeneratorOptions } from '../../../types/generator';
import { vi, it, describe, beforeEach, expect, Mock } from 'vitest';
import svgGen from '../svg';

const mockConstuctor = (
  _SVGIcons2SVGFontStream as unknown as {
    mockConstuctor: Mock;
  }
).mockConstuctor;

const readFileMock = readFile as unknown as Mock;

vi.mock('fs/promises', () => ({
  readFile: vi.fn((filepath: string) => Promise.resolve(`content->${filepath}`))
}));

vi.mock('svgicons2svgfont', () => {
  const { EventEmitter } = require('events');

  const mockConstuctor = vi.fn();

  class MockStream {
    public events = new EventEmitter();
    public content = '';
    private pendingWrites = 0;
    private endRequested = false;

    constructor(...args: any[]) {
      mockConstuctor(...args);
    }

    private flushIfDone() {
      if (this.endRequested && this.pendingWrites === 0) {
        this.events.emit('end');
      }
    }

    public write(chunk: any) {
      this.pendingWrites += 1;
      let content = '';

      chunk.on('data', (data: Buffer | string) => {
        content += Buffer.isBuffer(data) ? data.toString('utf8') : String(data);
      });

      chunk.on('end', () => {
        this.events.emit(
          'data',
          Buffer.from(
            `processed->${content}|${JSON.stringify(chunk.metadata)}$`
          )
        );
        this.pendingWrites -= 1;
        this.flushIfDone();
      });

      chunk.on('error', (error: Error) => {
        this.events.emit('error', error);
      });

      return this;
    }

    public on(event: string, callback: () => void) {
      this.events.on(event, callback);
      return this;
    }

    public end() {
      this.endRequested = true;
      this.flushIfDone();
      return this;
    }
  }

  return { SVGIcons2SVGFontStream: MockStream, mockConstuctor };
});

const mockOptions = (svgOptions = { __mock: 'options__' } as any) =>
  ({
    name: 'foo',
    fontHeight: 1,
    descent: 2,
    normalize: false,
    formatOptions: { [FontAssetType.SVG]: svgOptions },
    codepoints: { foo: 1, bar: 1 },
    assets: {
      foo: { id: 'foo', absolutePath: '/root/foo.svg' },
      bar: { id: 'bar', absolutePath: '/root/bar.svg' }
    }
  }) as unknown as FontGeneratorOptions;

describe('`SVG` font generator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    readFileMock.mockImplementation((filepath: any) =>
      Promise.resolve(`content->${filepath}`)
    );
  });

  it('resolves with the result of the completed `SVGIcons2SVGFontStream`', async () => {
    const result = await svgGen.generate(mockOptions(), null);

    expect(mockConstuctor).toHaveBeenCalledTimes(1);
    expect(mockConstuctor).toHaveBeenCalledWith({
      descent: 2,
      fontHeight: 1,
      fontName: 'foo',
      // log: expect.any(Function),
      normalize: false,
      __mock: 'options__'
    });

    expect(result).toMatchSnapshot();
  });

  it('passes correctly format options to `SVGIcons2SVGFontStream`', async () => {
    const log = () => null;
    const formatOptions = { descent: 5, fontHeight: 6, log };
    const result = await svgGen.generate(mockOptions(formatOptions), null);

    expect(result).toMatchSnapshot();

    expect(mockConstuctor).toHaveBeenCalledTimes(1);
    expect(mockConstuctor).toHaveBeenCalledWith({
      descent: 5,
      fontHeight: 6,
      fontName: 'foo',
      log,
      normalize: false
    });
  });

  it('supports 32-bit Unicode codepoints', async () => {
    const options = mockOptions();
    options.codepoints = { foo: 0x1f600, bar: 0x1f642 };

    const result = await svgGen.generate(options, null);

    expect(result).toContain('"unicode":["😀"]');
    expect(result).toContain('"unicode":["🙂"]');
  });

  it('throws for invalid codepoints', async () => {
    const options = mockOptions();
    options.codepoints = { foo: undefined as any, bar: 1 };

    await expect(svgGen.generate(options, null)).rejects.toThrow(
      "Invalid codepoint for icon 'foo'"
    );
  });

  it('sanitizes NaN tokens in SVG content before parsing', async () => {
    readFileMock.mockResolvedValueOnce('M10,NaN L20,30');

    const result = await svgGen.generate(mockOptions(), null);

    expect(result).toContain('M10,0 L20,30');
  });

  it('normalizes line-wrapped path data (svgicons2svgfont@16 / svg-pathdata@9 strictness)', async () => {
    // SVG editors like Inkscape wrap long `d` attributes across lines;
    // sax.js preserves the raw newlines, which svg-pathdata@9 rejects.
    const wrappedSvg =
      '<svg xmlns="http://www.w3.org/2000/svg">' +
      '<path d="M60.859,112.533c-6.853,0\n\t\t\t-6.853,10.646,0,10.646z"/>' +
      '</svg>';
    readFileMock.mockResolvedValueOnce(wrappedSvg);

    const result = await svgGen.generate(mockOptions(), null);

    // The newline+tabs should have been collapsed to a space so the path
    // reaches the mock stream without a parse error.
    expect(result).toContain('-6.853,10.646,0,10.646z');
  });
});
