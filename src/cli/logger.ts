import { styleText } from 'node:util';
import { RunnerResults } from '../core/runner.js';
import { pluralize } from '../utils/string.js';

export const getLogger = (debug = false, silent = false) => ({
  error(error: Error | string) {
    const message = (error instanceof Error && error.message) || error;

    console.log(styleText('red', String(message)));

    if (debug && error instanceof Error) {
      console.log(styleText('red', error.stack));
    }
  },

  log(...values: any[]) {
    !silent && console.log(...values);
  },

  start(loadedConfigPath: string = null) {
    this.log(styleText('yellow', 'Generating font kit...'));

    if (loadedConfigPath) {
      this.log(
        styleText(
          'green',
          `✔ Using configuration file: ${styleText(['green', 'bold'], loadedConfigPath)}`
        )
      );
    }
  },

  results({ assetsIn, writeResults, options: { inputDir } }: RunnerResults) {
    const iconsCount = Object.values(assetsIn).length;

    this.log(
      styleText(
        'white',
        `✔ ${iconsCount} ${pluralize('SVG', iconsCount)} found in ${inputDir}`
      )
    );

    for (const { writePath } of writeResults) {
      this.log(
        styleText('blue', `✔ Generated ${styleText('cyanBright', writePath)}`)
      );
    }

    this.log(styleText(['green', 'bold'], 'Done'));
  }
});
