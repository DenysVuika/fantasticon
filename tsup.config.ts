import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/cli/index.ts'],
  dts: true,
  format: ['esm', 'cjs'],
  esbuildOptions(options) {
    const logOverride = options.logOverride ?? {};
    logOverride['empty-import-meta'] = 'silent';
    options.logOverride = logOverride;
  }
});
