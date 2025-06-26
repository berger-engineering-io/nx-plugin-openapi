import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import {
  addProjectConfiguration,
  formatFiles,
  logger,
  readProjectConfiguration,
  Tree,
} from '@nx/devkit';
import { addGenerateApiGenerator } from './generator';
import { AddGenerateApiSchema } from './schema';

jest.mock('@nx/devkit', () => ({
  ...jest.requireActual('@nx/devkit'),
  formatFiles: jest.fn(),
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('add-generate-api-target generator', () => {
  let tree: Tree;
  const mockedFormatFiles = formatFiles as jest.MockedFunction<
    typeof formatFiles
  >;
  const mockedLogger = logger as jest.Mocked<typeof logger>;

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

    const gitignoreContent = tree.read('.gitignore', 'utf-8');
    expect(gitignoreContent).toContain('libs/generated-api');
  });

  it('should not add to .gitignore when addToGitignore is false', async () => {
    const options: AddGenerateApiSchema = {
      project: 'test-app',
      inputSpec: 'swagger.json',
      outputPath: 'libs/generated-api',
      addToGitignore: false,
    };

    await addGenerateApiGenerator(tree, options);

    const gitignoreContent = tree.read('.gitignore', 'utf-8');
    expect(gitignoreContent).not.toContain('libs/generated-api');
  });

  it('should warn when .gitignore does not exist', async () => {
    tree.delete('.gitignore');

    const options: AddGenerateApiSchema = {
      project: 'test-app',
      inputSpec: 'swagger.json',
      outputPath: 'libs/api',
      addToGitignore: true,
    };

    await addGenerateApiGenerator(tree, options);

    expect(mockedLogger.warn).toHaveBeenCalledWith(
      "Couldn't find .gitignore file to update"
    );
  });

  it('should add to .prettierignore when it exists', async () => {
    tree.write('.prettierignore', 'coverage\n*.log\n');

    const options: AddGenerateApiSchema = {
      project: 'test-app',
      inputSpec: 'swagger.json',
      outputPath: 'libs/api-client',
      addToGitignore: true,
    };

    await addGenerateApiGenerator(tree, options);

    const prettierIgnoreContent = tree.read('.prettierignore', 'utf-8');
    expect(prettierIgnoreContent).toContain('libs/api-client');
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
});
