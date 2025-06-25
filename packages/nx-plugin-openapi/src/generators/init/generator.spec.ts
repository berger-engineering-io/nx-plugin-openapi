import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { Tree, readNxJson, formatFiles, logger } from '@nx/devkit';
import { initGenerator } from './generator';
import { InitGeneratorSchema } from './schema';

jest.mock('@nx/devkit', () => ({
  ...jest.requireActual('@nx/devkit'),
  formatFiles: jest.fn(),
  logger: {
    info: jest.fn(),
  },
}));

describe('init generator', () => {
  let tree: Tree;
  const options: InitGeneratorSchema = {};
  const mockedFormatFiles = formatFiles as jest.MockedFunction<typeof formatFiles>;
  const mockedLogger = logger as jest.Mocked<typeof logger>;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
    jest.clearAllMocks();
  });

  it('should add target defaults to nx.json', async () => {
    await initGenerator(tree, options);
    
    const nxJson = readNxJson(tree);
    const targetDefaults = nxJson.targetDefaults['@lambda-solutions/nx-plugin-openapi:generate-api'];
    
    expect(targetDefaults).toBeDefined();
    expect(targetDefaults.cache).toBe(true);
    expect(targetDefaults.inputs).toEqual([
      '{projectRoot}/swagger.json',
      '{projectRoot}/openapitools.json'
    ]);
  });

  it('should skip formatting when skipFormat is true', async () => {
    await initGenerator(tree, { skipFormat: true });
    
    expect(mockedFormatFiles).not.toHaveBeenCalled();
  });

  it('should format files when skipFormat is false', async () => {
    await initGenerator(tree, { skipFormat: false });
    
    expect(mockedFormatFiles).toHaveBeenCalledWith(tree);
  });

  it('should format files by default', async () => {
    await initGenerator(tree, {});
    
    expect(mockedFormatFiles).toHaveBeenCalledWith(tree);
  });

  it('should log success message', async () => {
    await initGenerator(tree, options);
    
    expect(mockedLogger.info).toHaveBeenCalledWith(
      '[@lambda-solutions/nx-plugin-openapi]✨ Plugin initialized successfully!'
    );
  });
});