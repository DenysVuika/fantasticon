import { createReadStream, ReadStream } from 'fs';
import { SVGIcons2SVGFontStream } from 'svgicons2svgfont';
import { FontGenerator } from '../../types/generator.js';

type GglyphStream = ReadStream & { metadata?: any };

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

      const fontStream = new SVGIcons2SVGFontStream({
        fontName,
        fontHeight,
        descent,
        normalize,
        // log: () => null,
        ...svg
      })
        .on('data', data => (font = Buffer.concat([font, Buffer.from(data)])))
        .on('end', () => resolve(font.toString()));

      try {
        for (const { id, absolutePath } of Object.values(assets)) {
          const glyph: GglyphStream = createReadStream(absolutePath);
          const unicode = getUnicodeFromCodepoint(id, codepoints?.[id]);

          glyph.metadata = { name: id, unicode: [unicode] };

          fontStream.write(glyph);
        }

        fontStream.end();
      } catch (error) {
        reject(error);
      }
    })
};

export default generator;
