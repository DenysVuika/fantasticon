import { glob } from 'node:fs/promises';
import { resolve, relative, join } from 'path';
import { removeExtension, splitSegments } from '../utils/path.js';
import { writeFile } from './fs-async.js';
import { RunnerOptions } from '../types/runner.js';
import { GeneratedAssets } from '../generators/generate-assets.js';

export type WriteResult = { content: string | Buffer; writePath: string };

export type WriteResults = WriteResult[];

export interface IconAsset {
  id: string;
  absolutePath: string;
  relativePath: string;
}

export interface AssetsMap {
  [key: string]: IconAsset;
}

export const ASSETS_EXTENSION = 'svg';

export const loadPaths = async (dir: string): Promise<string[]> => {
  const globPath = join(dir, `**/*.${ASSETS_EXTENSION}`);
  const files = await Array.fromAsync(glob(globPath));

  if (!files.length) {
    throw new Error(`No SVGs found in ${dir}`);
  }

  // Keep icon generation deterministic across platforms/glob versions.
  return files.sort((a, b) => a.localeCompare(b));
};

const failForConflictingId = (
  { relativePath: pathA, id }: IconAsset,
  { relativePath: pathB }: IconAsset
): void => {
  throw new Error(
    `Conflicting result from 'getIconId': '${id}' - conflicting input files:\n` +
      [pathA, pathB].map(fpath => `  - ${fpath}`).join('\n')
  );
};

export const loadAssets = async ({
  inputDir,
  getIconId
}: RunnerOptions): Promise<AssetsMap> => {
  if (!inputDir) {
    throw new Error('inputDir is required');
  }
  if (!getIconId) {
    throw new Error('getIconId is required');
  }

  const paths = await loadPaths(inputDir);
  const out: AssetsMap = {};
  let index = 0;

  for (const path of paths) {
    const relativePath = relative(resolve(inputDir), resolve(path));
    const parts = splitSegments(relativePath);
    const lastPart = parts.pop();
    if (!lastPart) {
      throw new Error(`Invalid path: ${path}`);
    }
    const basename = removeExtension(lastPart);
    const absolutePath = resolve(path);
    const iconId = getIconId({
      basename,
      relativeDirPath: join(...parts),
      absoluteFilePath: absolutePath,
      relativeFilePath: relativePath,
      index
    });

    const result: IconAsset = { id: iconId, relativePath, absolutePath };

    if (out[iconId]) {
      failForConflictingId(out[iconId], result);
    }

    out[iconId] = result;

    index++;
  }

  return out;
};

export const writeAssets = async (
  assets: GeneratedAssets,
  { name, pathOptions = {}, outputDir }: RunnerOptions
) => {
  if (!name) {
    throw new Error('name is required');
  }
  if (!outputDir) {
    throw new Error('outputDir is required');
  }

  const results: WriteResults = [];

  for (const ext of Object.keys(assets)) {
    const filename = [name, ext].join('.');
    const assetType = ext as keyof typeof pathOptions;
    const writePath = pathOptions[assetType] || join(outputDir, filename);
    const content = assets[ext as keyof GeneratedAssets];
    if (content) {
      results.push({ content, writePath });
      await writeFile(writePath, content);
    }
  }

  return results;
};
