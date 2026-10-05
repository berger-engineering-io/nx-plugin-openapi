import { readNxJson, Tree, updateNxJson } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { initGenerator } from './generator';

const EXECUTOR = '@nx-plugin-openapi/core:generate-api';

describe('init generator', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
  });

  it('enables caching without hard-wired inputs', async () => {
    await initGenerator(tree, { skipFormat: true });

    expect(readNxJson(tree)?.targetDefaults?.[EXECUTOR]).toEqual({
      cache: true,
    });
  });

  it('keeps existing target defaults', async () => {
    const nxJson = readNxJson(tree) ?? {};
    nxJson.targetDefaults = {
      [EXECUTOR]: { cache: false, inputs: ['{projectRoot}/swagger.json'] },
    };
    updateNxJson(tree, nxJson);

    await initGenerator(tree, { skipFormat: true });

    expect(readNxJson(tree)?.targetDefaults?.[EXECUTOR]).toEqual({
      cache: false,
      inputs: ['{projectRoot}/swagger.json'],
    });
  });
});
