import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { formatFiles, logger, readNxJson, Tree, addDependenciesToPackageJson, runTasksInSerial } from '@nx/devkit';
import { initGenerator } from './generator';
import { InitGeneratorSchema } from './schema';
import { getPackageVersion } from '../utils/check-package-version';

jest.mock('@nx/devkit', () => ({
  ...jest.requireActual('@nx/devkit'),
  formatFiles: jest.fn(),
  addDependenciesToPackageJson: jest.fn(),
  runTasksInSerial: jest.fn(),
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('../utils/check-package-version', () => ({
  getPackageVersion: jest.fn(),
}));

describe('init generator', () => {
  let tree: Tree;
  const options: InitGeneratorSchema = {};
  const mockedFormatFiles = formatFiles as jest.MockedFunction<
    typeof formatFiles
  >;
  const mockedLogger = logger as jest.Mocked<typeof logger>;
  const mockedAddDependenciesToPackageJson = addDependenciesToPackageJson as jest.MockedFunction<
    typeof addDependenciesToPackageJson
  >;
  const mockedRunTasksInSerial = runTasksInSerial as jest.MockedFunction<
    typeof runTasksInSerial
  >;
  const mockedGetPackageVersion = getPackageVersion as jest.MockedFunction<
    typeof getPackageVersion
  >;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
    jest.clearAllMocks();
    mockedAddDependenciesToPackageJson.mockReturnValue(() => {});
    mockedRunTasksInSerial.mockImplementation((...tasks) => {
      return () => {
        tasks.forEach(task => task?.());
      };
    });
  });

  it('should add target defaults to nx.json', async () => {
    await initGenerator(tree, options);

    const nxJson = readNxJson(tree);
    const targetDefaults =
      nxJson.targetDefaults['@lambda-solutions/nx-plugin-openapi:generate-api'];

    expect(targetDefaults).toBeDefined();
    expect(targetDefaults.cache).toBe(true);
    expect(targetDefaults.inputs).toEqual([
      '{projectRoot}/swagger.json',
      '{projectRoot}/openapitools.json',
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
      '[@lambda-solutions/nx-plugin-openapi] ✨ Plugin initialized successfully!'
    );
  });

  describe('package.json handling', () => {
    it('should handle missing package.json gracefully', async () => {
      tree.delete('package.json');
      
      await initGenerator(tree, options);
      
      expect(mockedLogger.error).toHaveBeenCalledWith(
        '[@lambda-solutions/nx-plugin-openapi] Could not find package.json. Please run this generator in a valid Nx workspace.'
      );
      expect(mockedAddDependenciesToPackageJson).not.toHaveBeenCalled();
    });
  });

  describe('openapi-generator-cli dependency', () => {
    it('should add openapi-generator-cli if not present', async () => {
      await initGenerator(tree, options);
      
      expect(mockedAddDependenciesToPackageJson).toHaveBeenCalledWith(
        tree,
        {},
        {
          '@openapitools/openapi-generator-cli': '^2.20.2',
        }
      );
      expect(mockedRunTasksInSerial).toHaveBeenCalled();
    });

    it('should not add openapi-generator-cli if already in dependencies', async () => {
      const packageJson = {
        dependencies: {
          '@openapitools/openapi-generator-cli': '2.19.0'
        }
      };
      tree.write('package.json', JSON.stringify(packageJson));
      mockedGetPackageVersion.mockReturnValue({ major: 2, minor: 19, patch: 0, package: { '@openapitools/openapi-generator-cli': '2.19.0' } });
      
      await initGenerator(tree, options);
      
      expect(mockedAddDependenciesToPackageJson).not.toHaveBeenCalled();
    });

    it('should not add openapi-generator-cli if already in devDependencies', async () => {
      const packageJson = {
        devDependencies: {
          '@openapitools/openapi-generator-cli': '2.19.0'
        }
      };
      tree.write('package.json', JSON.stringify(packageJson));
      mockedGetPackageVersion.mockReturnValue({ major: 2, minor: 19, patch: 0, package: { '@openapitools/openapi-generator-cli': '2.19.0' } });
      
      await initGenerator(tree, options);
      
      expect(mockedAddDependenciesToPackageJson).not.toHaveBeenCalled();
    });
  });

  describe('version checking', () => {
    it('should warn if openapi-generator-cli version is less than 2.0.0', async () => {
      const packageJson = {
        dependencies: {
          '@openapitools/openapi-generator-cli': '1.5.0'
        }
      };
      tree.write('package.json', JSON.stringify(packageJson));
      mockedGetPackageVersion.mockReturnValue({ major: 1, minor: 5, patch: 0, package: { '@openapitools/openapi-generator-cli': '1.5.0' } });
      
      await initGenerator(tree, options);
      
      expect(mockedLogger.warn).toHaveBeenCalledWith(
        '[@lambda-solutions/nx-plugin-openapi] You are using @openapitools/openapi-generator-cli version 1.5.0. It is recommended to use version 2.0.0 or above.'
      );
    });

    it('should log info if openapi-generator-cli version is 2.0.0 or above', async () => {
      const packageJson = {
        dependencies: {
          '@openapitools/openapi-generator-cli': '2.19.0'
        }
      };
      tree.write('package.json', JSON.stringify(packageJson));
      mockedGetPackageVersion.mockReturnValue({ major: 2, minor: 19, patch: 0, package: { '@openapitools/openapi-generator-cli': '2.19.0' } });
      
      await initGenerator(tree, options);
      
      expect(mockedLogger.info).toHaveBeenCalledWith(
        '[@lambda-solutions/nx-plugin-openapi] Using @openapitools/openapi-generator-cli version 2.19.0 which is compatible with this plugin.'
      );
    });

    it('should handle version with prefix correctly', async () => {
      const packageJson = {
        dependencies: {
          '@openapitools/openapi-generator-cli': '^2.19.0'
        }
      };
      tree.write('package.json', JSON.stringify(packageJson));
      mockedGetPackageVersion.mockReturnValue({ major: 2, minor: 19, patch: 0, package: { '@openapitools/openapi-generator-cli': '^2.19.0' } });
      
      await initGenerator(tree, options);
      
      expect(mockedGetPackageVersion).toHaveBeenCalledWith({ '@openapitools/openapi-generator-cli': '^2.19.0' });
      expect(mockedLogger.info).toHaveBeenCalledWith(
        '[@lambda-solutions/nx-plugin-openapi] Using @openapitools/openapi-generator-cli version ^2.19.0 which is compatible with this plugin.'
      );
    });
  });
});
