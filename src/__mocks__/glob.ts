const MOCK_GLOBS: Record<string, string[]> = {
  './valid/**/*.svg': [
    '/project/valid/foo.svg',
    '/project/valid/bar.svg',
    '/project/valid/sub/nested.svg',
    '/project/valid/sub/sub/nested.svg'
  ],
  './empty/**/*.svg': []
};

export type GlobOptions = {
  windowsPathsNoEscape?: boolean;
  posix?: boolean;
};

let lastOptions: GlobOptions = {};

const glob = async (pattern: string, options: GlobOptions = {}) => {
  lastOptions = options;
  const paths = MOCK_GLOBS[pattern];

  if (!paths) {
    throw new Error(`Invalid glob: ${pattern}`);
  }

  return paths;
};

const getLastOptions = () => lastOptions;

export { glob, getLastOptions };
