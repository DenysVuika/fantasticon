import * as commander from 'commander';
import { FontAssetType, OtherAssetType } from '../types/misc.js';
import { loadConfig, DEFAULT_FILEPATHS } from './config-loader.js';
import { DEFAULT_OPTIONS } from '../constants.js';
import { generateFonts } from '../core/runner.js';
import { getLogger } from './logger.js';
import { getPackageInfo } from '../utils/module.js';
import { buildOptions } from './build-options.js';

const packageInfo = getPackageInfo();

const getCommandName = () =>
  (packageInfo.bin && Object.keys(packageInfo.bin)[0]) || packageInfo.name;

const cli = async () => {
  config();
  const input = commander.program.parse(process.argv);
  const { debug, silent, config: configPath } = input.opts();
  const logger = getLogger(debug, silent);

  try {
    const { loadedConfig, loadedConfigPath } = await loadConfig(configPath);
    const results = await run(await buildOptions(input, loadedConfig));
    logger.start(loadedConfigPath);
    logger.results(results);
  } catch (error) {
    logger.error(error instanceof Error ? error : String(error));
    process.exitCode = 1;
  }
};

const printList = (available: { [key: string]: string }, defaults: string[]) =>
  ` (default: ${defaults.join(', ')}, available: ${Object.values(
    available
  ).join(', ')})`;

const printDefaultValue = (value: any) => {
  let printVal = String(value);

  if (typeof value === 'undefined') {
    return '';
  }

  return ` (default: ${printVal})`;
};

const printDefaultOption = (key: keyof typeof DEFAULT_OPTIONS) =>
  printDefaultValue(DEFAULT_OPTIONS[key]);

const printConfigPaths = () => DEFAULT_FILEPATHS.join(' | ');

const config = () => {
  commander.program
    .storeOptionsAsProperties(false)

    .name(getCommandName())

    .version(packageInfo.version)

    .arguments('[input-dir]')

    .option(
      '-c, --config <value>',
      `custom config path (default: ${printConfigPaths()})`
    )

    .option('-o, --output <value>', 'specify output directory')

    .option(
      '-n, --name <value>',
      'base name of the font set used both as default asset name' +
        printDefaultOption('name')
    )

    .option(
      '-t, --font-types <value...>',
      `specify font formats to generate` +
        printList(FontAssetType, DEFAULT_OPTIONS.fontTypes as string[])
    )

    .option(
      '-g --asset-types <value...>',
      `specify other asset types to generate` +
        printList(OtherAssetType, DEFAULT_OPTIONS.assetTypes as string[])
    )

    .option(
      '-h, --font-height <value>',
      'the output font height (icons will be scaled so the highest has this height)' +
        printDefaultOption('fontHeight')
    )

    .option(
      '--descent <value>',
      'the font descent' + printDefaultOption('descent' as any)
    )

    .option(
      '--normalize [bool]',
      'normalize icons by scaling them to the height of the highest icon' +
        printDefaultOption('normalize')
    )

    .option(
      '--ts-quotes <value>',
      'generate TypeScript strings with single or double quotes (default: double)'
    )

    .option('-r, --round [bool]', 'setup the SVG path rounding [10e12]')

    .option(
      '--selector <value>',
      "use a CSS selector instead of 'tag + prefix'" +
        printDefaultOption('selector')
    )

    .option(
      '-p, --prefix <value>',
      'CSS class prefix' + printDefaultOption('prefix')
    )

    .option(
      '--tag <value>',
      'CSS base tag for icons' + printDefaultOption('tag')
    )

    .option(
      '-u, --fonts-url <value>',
      'public URL to the fonts directory (used in the generated CSS)'
    )

    .option('--debug', 'display errors stack trace' + printDefaultValue(false))

    .option('--silent', 'run with no logs' + printDefaultValue(false));
};

const run = async (options: any) => await generateFonts(options, true);

cli();
