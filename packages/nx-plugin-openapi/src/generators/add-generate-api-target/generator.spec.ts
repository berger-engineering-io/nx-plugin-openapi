import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import {
  addProjectConfiguration,
  formatFiles,
  logger,
  readProjectConfiguration,
  Tree,
  updateProjectConfiguration,
} from '@nx/devkit';
import { addGenerateApiGenerator } from './generator';
import { AddGenerateApiSchema } from './schema';
import { addGitIgnoreEntry } from '../utils/add-gitignore-entry';
import { addPrettierIgnoreEntry } from '../utils/add-prettier-ignore-entry';

jest.mock('@nx/devkit', () => ({
  ...jest.requireActual('@nx/devkit'),
  formatFiles: jest.fn(),
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

jest.mock('../utils/add-gitignore-entry', () => ({
  addGitIgnoreEntry: jest.fn(),
}));

jest.mock('../utils/add-prettier-ignore-entry', () => ({
  addPrettierIgnoreEntry: jest.fn(),
}));

describe('add-generate-api-target generator', () => {
  let tree: Tree;
  const mockedFormatFiles = formatFiles as jest.MockedFunction<
    typeof formatFiles
  >;
  const mockedLogger = logger as jest.Mocked<typeof logger>;
  const mockedAddGitIgnoreEntry = addGitIgnoreEntry as jest.MockedFunction<typeof addGitIgnoreEntry>;
  const mockedAddPrettierIgnoreEntry = addPrettierIgnoreEntry as jest.MockedFunction<typeof addPrettierIgnoreEntry>;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();

    // Add a test project
    addProjectConfiguration(tree, 'test-app', {
      root: 'apps/test-app',
      sourceRoot: 'apps/test-app/src',
      projectType: 'application',
      targets: {},
    });

    // Add .gitignore
    tree.write('.gitignore', 'node_modules\ndist\n');

    jest.clearAllMocks();
  });

  it('should add generate-api target to project', async () => {
    const options: AddGenerateApiSchema = {
      project: 'test-app',
      inputSpec: 'swagger.json',
      outputPath: 'libs/api-client',
      generatorType: 'typescript-angular',
    };

    await addGenerateApiGenerator(tree, options);

    const projectConfig = readProjectConfiguration(tree, 'test-app');
    const target = projectConfig.targets['generate-api'];

    expect(target).toBeDefined();
    expect(target.executor).toBe(
      '@lambda-solutions/nx-plugin-openapi:generate-api'
    );
    expect(target.options).toEqual({
      inputSpec: 'swagger.json',
      outputPath: 'libs/api-client',
    });
  });

  it('should include optional fields when provided', async () => {
    const options: AddGenerateApiSchema = {
      project: 'test-app',
      inputSpec: 'api.json',
      outputPath: 'libs/api',
      configFile: 'openapi-config.json',
      skipValidateSpec: true,
    };

    await addGenerateApiGenerator(tree, options);

    const projectConfig = readProjectConfiguration(tree, 'test-app');
    const target = projectConfig.targets['generate-api'];

    expect(target.options.configFile).toBe('openapi-config.json');
    expect(target.options.skipValidateSpec).toBe(true);
  });

  it('should add output path to .gitignore when requested', async () => {
    const options: AddGenerateApiSchema = {
      project: 'test-app',
      inputSpec: 'swagger.json',
      outputPath: 'libs/generated-api',
      addToGitignore: true,
    };

    await addGenerateApiGenerator(tree, options);

    expect(mockedAddGitIgnoreEntry).toHaveBeenCalledWith({
      tree,
      entry: 'libs/generated-api',
    });
  });

  it('should not add to .gitignore when addToGitignore is false', async () => {
    const options: AddGenerateApiSchema = {
      project: 'test-app',
      inputSpec: 'swagger.json',
      outputPath: 'libs/generated-api',
      addToGitignore: false,
    };

    await addGenerateApiGenerator(tree, options);

    expect(mockedAddGitIgnoreEntry).not.toHaveBeenCalled();
  });

  it('should call gitignore utility when addToGitignore is true', async () => {
    const options: AddGenerateApiSchema = {
      project: 'test-app',
      inputSpec: 'swagger.json',
      outputPath: 'libs/api',
      addToGitignore: true,
    };

    await addGenerateApiGenerator(tree, options);

    expect(mockedAddGitIgnoreEntry).toHaveBeenCalledWith({
      tree,
      entry: 'libs/api',
    });
  });

  it('should add to .prettierignore when addToGitignore is true', async () => {
    const options: AddGenerateApiSchema = {
      project: 'test-app',
      inputSpec: 'swagger.json',
      outputPath: 'libs/api-client',
      addToGitignore: true,
    };

    await addGenerateApiGenerator(tree, options);

    expect(mockedAddPrettierIgnoreEntry).toHaveBeenCalledWith({
      tree,
      entry: 'libs/api-client',
    });
  });

  it('should log info if target already exists', async () => {
    // Add existing target
    const projectConfig = readProjectConfiguration(tree, 'test-app');
    projectConfig.targets['generate-api'] = {
      executor: 'some-executor',
      options: {},
    };
    tree.write(
      'apps/test-app/project.json',
      JSON.stringify(projectConfig, null, 2)
    );

    const options: AddGenerateApiSchema = {
      project: 'test-app',
      inputSpec: 'swagger.json',
      outputPath: 'libs/api',
    };

    await addGenerateApiGenerator(tree, options);

    expect(mockedLogger.info).toHaveBeenCalledWith(
      '[@lambda-solutions/nx-plugin-openapi] Target "generate-api" already exists in project "test-app. We will skip now."'
    );
  });

  it('should format files', async () => {
    const options: AddGenerateApiSchema = {
      project: 'test-app',
      inputSpec: 'swagger.json',
      outputPath: 'libs/api',
    };

    await addGenerateApiGenerator(tree, options);

    expect(mockedFormatFiles).toHaveBeenCalledWith(tree);
  });

  it('should log success message', async () => {
    const options: AddGenerateApiSchema = {
      project: 'test-app',
      inputSpec: 'swagger.json',
      outputPath: 'libs/api',
    };

    await addGenerateApiGenerator(tree, options);

    expect(mockedLogger.info).toHaveBeenCalledWith(
      '[@lambda-solutions/nx-plugin-openapi] ✨ Successfully added generate-api target to test-app project'
    );
  });

  describe('custom target name', () => {
    it('should use custom target name when provided', async () => {
      const options: AddGenerateApiSchema = {
        project: 'test-app',
        inputSpec: 'swagger.json',
        outputPath: 'libs/api',
        targetName: 'generate-client',
      };

      await addGenerateApiGenerator(tree, options);

      const projectConfig = readProjectConfiguration(tree, 'test-app');
      const target = projectConfig.targets['generate-client'];

      expect(target).toBeDefined();
      expect(projectConfig.targets['generate-api']).toBeUndefined();
      expect(target.executor).toBe(
        '@lambda-solutions/nx-plugin-openapi:generate-api'
      );
    });

    it('should add custom target to build dependsOn', async () => {
      // Add build target
      const projectConfig = readProjectConfiguration(tree, 'test-app');
      projectConfig.targets['build'] = {
        executor: '@nx/webpack:build',
        options: {},
      };
      updateProjectConfiguration(tree, 'test-app', projectConfig);

      const options: AddGenerateApiSchema = {
        project: 'test-app',
        inputSpec: 'swagger.json',
        outputPath: 'libs/api',
        targetName: 'generate-client',
      };

      await addGenerateApiGenerator(tree, options);

      const updatedConfig = readProjectConfiguration(tree, 'test-app');
      expect(updatedConfig.targets['build'].dependsOn).toContain('generate-client');
    });

    it('should add default target name to build dependsOn when no custom name', async () => {
      // Add build target
      const projectConfig = readProjectConfiguration(tree, 'test-app');
      projectConfig.targets['build'] = {
        executor: '@nx/webpack:build',
        options: {},
      };
      updateProjectConfiguration(tree, 'test-app', projectConfig);

      const options: AddGenerateApiSchema = {
        project: 'test-app',
        inputSpec: 'swagger.json',
        outputPath: 'libs/api',
      };

      await addGenerateApiGenerator(tree, options);

      const updatedConfig = readProjectConfiguration(tree, 'test-app');
      expect(updatedConfig.targets['build'].dependsOn).toContain('generate-api');
    });

    it('should not duplicate target in build dependsOn', async () => {
      // Add build target with existing dependsOn
      const projectConfig = readProjectConfiguration(tree, 'test-app');
      projectConfig.targets['build'] = {
        executor: '@nx/webpack:build',
        options: {},
        dependsOn: ['generate-client'],
      };
      updateProjectConfiguration(tree, 'test-app', projectConfig);

      const options: AddGenerateApiSchema = {
        project: 'test-app',
        inputSpec: 'swagger.json',
        outputPath: 'libs/api',
        targetName: 'generate-client',
      };

      await addGenerateApiGenerator(tree, options);

      const updatedConfig = readProjectConfiguration(tree, 'test-app');
      expect(updatedConfig.targets['build'].dependsOn).toEqual(['generate-client']);
      expect(updatedConfig.targets['build'].dependsOn.length).toBe(1);
    });

    it('should log correct success message with custom target name', async () => {
      const options: AddGenerateApiSchema = {
        project: 'test-app',
        inputSpec: 'swagger.json',
        outputPath: 'libs/api',
        targetName: 'my-custom-api',
      };

      await addGenerateApiGenerator(tree, options);

      expect(mockedLogger.info).toHaveBeenCalledWith(
        '[@lambda-solutions/nx-plugin-openapi] ✨ Successfully added my-custom-api target to test-app project'
      );
    });
  });
});
