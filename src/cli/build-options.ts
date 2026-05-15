import * as commander from 'commander';
import { removeUndefined } from '../utils/validation.js';

const parseTsQuotes = (value: any) => {
  if (typeof value === 'undefined') {
    return undefined;
  }

  if (value === 'single' || value === 'double') {
    return value;
  }

  throw new Error(`Invalid tsQuotes value: ${value}`);
};

export const buildOptions = async (
  cmd: commander.Command,
  loadedConfig = {}
) => {
  const [inputDir] = cmd.args;
  const opts = cmd.opts();
  const tsQuotes = parseTsQuotes(opts.tsQuotes);

  const formatOptions =
    typeof tsQuotes === 'undefined'
      ? undefined
      : {
          ...(loadedConfig as any).formatOptions,
          ts: {
            ...(loadedConfig as any).formatOptions?.ts,
            singleQuotes: tsQuotes === 'single'
          }
        };

  return {
    ...loadedConfig,
    ...removeUndefined({
      inputDir,
      outputDir: opts.output,
      name: opts.name,
      fontTypes: opts.fontTypes,
      assetTypes: opts.assetTypes,
      fontHeight: opts.fontHeight,
      descent: opts.descent,
      normalize: opts.normalize,
      round: opts.round,
      selector: opts.selector,
      tag: opts.tag,
      prefix: opts.prefix,
      fontsUrl: opts.fontsUrl
    }),
    ...(formatOptions ? { formatOptions } : {})
  };
};
