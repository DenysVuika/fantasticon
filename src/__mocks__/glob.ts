const MOCK_GLOBS: Record<string, string[]> = {
  './valid/**/*.svg': [
    '/project/valid/foo.svg',
    '/project/valid/bar.svg',
    '/project/valid/sub/nested.svg',
    '/project/valid/sub/sub/nested.svg'
  ],
  './unsorted/**/*.svg': [
    '/project/unsorted/zebra.svg',
    '/project/unsorted/apple.svg',
    '/project/unsorted/mango.svg'
  ],
  './empty/**/*.svg': []
};

const glob = async function* (pattern: string): AsyncIterableIterator<string> {
  const paths = MOCK_GLOBS[pattern];

  if (!paths) {
    throw new Error(`Invalid glob: ${pattern}`);
  }

  for (const path of paths) {
    yield path;
  }
};

export { glob };
