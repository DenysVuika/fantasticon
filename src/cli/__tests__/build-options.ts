import { describe, expect, it } from 'vitest';
import { buildOptions } from '../build-options.js';

const createCommand = (args: string[], opts: Record<string, any>) =>
  ({
    args,
    opts: () => opts
  }) as any;

describe('CLI buildOptions', () => {
  it('keeps existing formatOptions when ts quotes are not provided', async () => {
    const loadedConfig = {
      formatOptions: { json: { indent: 2 }, ts: { enumName: 'Foo' } }
    };

    expect(
      await buildOptions(
        createCommand(['./icons'], { output: './dist' }),
        loadedConfig
      )
    ).toEqual({
      ...loadedConfig,
      inputDir: './icons',
      outputDir: './dist'
    });
  });

  it('merges ts single quotes into existing formatOptions', async () => {
    const loadedConfig = {
      formatOptions: { json: { indent: 2 }, ts: { enumName: 'Foo' } },
      prefix: 'icon'
    };

    expect(
      await buildOptions(
        createCommand(['./icons'], {
          output: './dist',
          tsQuotes: 'single',
          tag: 'div'
        }),
        loadedConfig
      )
    ).toEqual({
      ...loadedConfig,
      inputDir: './icons',
      outputDir: './dist',
      tag: 'div',
      formatOptions: {
        json: { indent: 2 },
        ts: { enumName: 'Foo', singleQuotes: true }
      }
    });
  });

  it('merges ts double quotes into existing formatOptions', async () => {
    const loadedConfig = {
      formatOptions: {
        json: { indent: 2 },
        ts: { enumName: 'Foo', singleQuotes: true }
      }
    };

    expect(
      await buildOptions(
        createCommand(['./icons'], {
          output: './dist',
          tsQuotes: 'double'
        }),
        loadedConfig
      )
    ).toEqual({
      ...loadedConfig,
      inputDir: './icons',
      outputDir: './dist',
      formatOptions: {
        json: { indent: 2 },
        ts: { enumName: 'Foo', singleQuotes: false }
      }
    });
  });

  it('rejects invalid ts quote values', async () => {
    await expect(
      buildOptions(
        createCommand(['./icons'], {
          output: './dist',
          tsQuotes: 'invalid'
        }),
        {}
      )
    ).rejects.toThrow('Invalid tsQuotes value: invalid');
  });
});
