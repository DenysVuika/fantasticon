import { readFile } from 'fs/promises';
import { Readable } from 'stream';
import { SVGIcons2SVGFontStream } from 'svgicons2svgfont';
import { FontGenerator } from '../../types/generator.js';

type GglyphStream = NodeJS.ReadableStream & { metadata?: any };

const sanitizeSvg = (svg: string): string =>
  // normalize line-wrapped attribute values (sax.js doesn't per XML spec)
  svg
    .replace(/[\r\n\t]+/g, ' ')
    // strip trailing spaces inside attribute values — prevents trailing-space
    // in `points="... "` from producing NaN via parseFloat("") after split
    .replace(/ +"/g, '"')
    // replace any NaN tokens left by bad tooling
    .replace(/\bNaN\b/g, '0');

const createGlyphStream = async (
  absolutePath: string
): Promise<GglyphStream> => {
  const svg = await readFile(absolutePath, 'utf8');
  return Readable.from([sanitizeSvg(svg)]) as GglyphStream;
};

const patchGlyphPipe = (glyph: GglyphStream): void => {
  const source = glyph;

  if (typeof source.on !== 'function') {
    return;
  }

  glyph.pipe = ((
    destination: NodeJS.WritableStream,
    options?: { end?: boolean }
  ) => {
    source.on('data', chunk => {
      try {
        destination.write(chunk);
      } catch (error) {
        if (typeof (source as any).destroy === 'function') {
          (source as any).destroy(error as Error);
        }
      }
    });

    source.on('end', () => {
      if (options?.end !== false && typeof destination.end === 'function') {
        destination.end();
      }
    });

    source.on('error', error => {
      if (typeof (destination as any).emit === 'function') {
        (destination as any).emit('error', error);
      }
    });

    return destination;
  }) as typeof glyph.pipe;
};

const getUnicodeFromCodepoint = (id: string, codepoint?: number): string => {
  if (
    codepoint === undefined ||
    !Number.isInteger(codepoint) ||
    codepoint < 0 ||
    codepoint > 0x10ffff
  ) {
    throw new Error(
      `Invalid codepoint for icon '${id}': ${codepoint}. Expected an integer between 0 and 1114111.`
    );
  }

  return String.fromCodePoint(codepoint);
};

const generator: FontGenerator<void> = {
  generate: ({
    name: fontName,
    fontHeight,
    descent,
    normalize,
    assets,
    codepoints,
    formatOptions: { svg } = {}
  }) =>
    new Promise((resolve, reject) => {
      let font = Buffer.alloc(0);
      let settled = false;

      const onResolve = (value: string) => {
        if (!settled) {
          settled = true;
          resolve(value);
        }
      };

      const onReject = (error: unknown) => {
        if (!settled) {
          settled = true;
          reject(error);
        }
      };

      const fontStream = new SVGIcons2SVGFontStream({
        fontName,
        fontHeight,
        descent,
        normalize,
        // log: () => null,
        ...svg
      })
        .on('data', data => (font = Buffer.concat([font, Buffer.from(data)])))
        .on('end', () => onResolve(font.toString()))
        .on('error', onReject);

      void (async () => {
        try {
          for (const { id, absolutePath } of Object.values(assets)) {
            const glyph = await createGlyphStream(absolutePath);
            const unicode = getUnicodeFromCodepoint(id, codepoints?.[id]);

            glyph.metadata = { name: id, unicode: [unicode] };
            patchGlyphPipe(glyph);

            fontStream.write(glyph);
          }

          fontStream.end();
        } catch (error) {
          onReject(error);
        }
      })();
    })
};

export default generator;
