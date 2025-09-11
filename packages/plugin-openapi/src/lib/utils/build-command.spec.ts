import { buildCommandArgs, OpenApiGeneratorOptions } from './build-command';

describe('buildCommandArgs', () => {
  describe('basic arguments', () => {
    it('should build basic command with required options', () => {
      const options: OpenApiGeneratorOptions = {
        inputSpec: 'api.yaml',
        outputPath: 'src/generated',
      };

      const result = buildCommandArgs(options);

      expect(result).toEqual([
        'generate',
        '-i',
        'api.yaml',
        '-g',
        'typescript-angular',
        '-o',
        'src/generated',
      ]);
    });

    it('should always use typescript-angular as generator', () => {
      const options: OpenApiGeneratorOptions = {
        inputSpec: 'spec.json',
        outputPath: 'output',
      };

      const result = buildCommandArgs(options);

      expect(result).toContain('-g');
      const gIndex = result.indexOf('-g');
      expect(result[gIndex + 1]).toBe('typescript-angular');
    });
  });

  describe('boolean flags', () => {
    it('should add boolean flags when true', () => {
      const options: OpenApiGeneratorOptions = {
        inputSpec: 'api.yaml',
        outputPath: 'output',
        skipValidateSpec: true,
        dryRun: true,
        enablePostProcessFile: true,
      };

      const result = buildCommandArgs(options);

      expect(result).toContain('--skip-validate-spec');
      expect(result).toContain('--dry-run');
      expect(result).toContain('--enable-post-process-file');
    });

    it('should not add boolean flags when false', () => {
      const options: OpenApiGeneratorOptions = {
        inputSpec: 'api.yaml',
        outputPath: 'output',
        skipValidateSpec: false,
        dryRun: false,
      };

      const result = buildCommandArgs(options);

      expect(result).not.toContain('--skip-validate-spec');
      expect(result).not.toContain('--dry-run');
    });

    it('should not add boolean flags when undefined', () => {
      const options: OpenApiGeneratorOptions = {
        inputSpec: 'api.yaml',
        outputPath: 'output',
      };

      const result = buildCommandArgs(options);

      expect(result).not.toContain('--skip-validate-spec');
      expect(result).not.toContain('--dry-run');
      expect(result).not.toContain('--minimal-update');
    });
  });

  describe('string flags', () => {
    it('should add string flags with values', () => {
      const options: OpenApiGeneratorOptions = {
        inputSpec: 'api.yaml',
        outputPath: 'output',
        auth: 'Bearer token123',
        apiNameSuffix: 'Api',
        packageName: 'my-api-client',
      };

      const result = buildCommandArgs(options);

      expect(result).toContain('--auth');
      expect(result[result.indexOf('--auth') + 1]).toBe('Bearer token123');

      expect(result).toContain('--api-name-suffix');
      expect(result[result.indexOf('--api-name-suffix') + 1]).toBe('Api');

      expect(result).toContain('--package-name');
      expect(result[result.indexOf('--package-name') + 1]).toBe(
        'my-api-client'
      );
    });

    it('should not add empty string flags', () => {
      const options: OpenApiGeneratorOptions = {
        inputSpec: 'api.yaml',
        outputPath: 'output',
        auth: '',
        packageName: '',
      };

      const result = buildCommandArgs(options);

      expect(result).not.toContain('--auth');
      expect(result).not.toContain('--package-name');
    });

    it('should handle special characters in string values', () => {
      const options: OpenApiGeneratorOptions = {
        inputSpec: 'api.yaml',
        outputPath: 'output',
        httpUserAgent: 'My App/1.0 (Linux)',
        releaseNote: 'Breaking changes: API v2.0',
      };

      const result = buildCommandArgs(options);

      expect(result).toContain('--http-user-agent');
      expect(result[result.indexOf('--http-user-agent') + 1]).toBe(
        'My App/1.0 (Linux)'
      );

      expect(result).toContain('--release-note');
      expect(result[result.indexOf('--release-note') + 1]).toBe(
        'Breaking changes: API v2.0'
      );
    });
  });

  describe('config file', () => {
    it('should add config file flag', () => {
      const options: OpenApiGeneratorOptions = {
        inputSpec: 'api.yaml',
        outputPath: 'output',
        configFile: 'openapi-config.json',
      };

      const result = buildCommandArgs(options);

      expect(result).toContain('-c');
      expect(result[result.indexOf('-c') + 1]).toBe('openapi-config.json');
    });
  });

  describe('globalProperties', () => {
    it('should add global properties', () => {
      const options: OpenApiGeneratorOptions = {
        inputSpec: 'api.yaml',
        outputPath: 'output',
        globalProperties: {
          models: 'User,Product',
          apis: 'UserApi',
          supportingFiles: 'false',
        },
      };

      const result = buildCommandArgs(options);

      expect(result).toContain('--global-property');
      expect(result).toContain('models=User,Product');
      expect(result).toContain('apis=UserApi');
      expect(result).toContain('supportingFiles=false');
    });

    it('should not add global properties when empty', () => {
      const options: OpenApiGeneratorOptions = {
        inputSpec: 'api.yaml',
        outputPath: 'output',
        globalProperties: {},
      };

      const result = buildCommandArgs(options);

      expect(result).not.toContain('--global-property');
    });

    it('should not add global properties when undefined', () => {
      const options: OpenApiGeneratorOptions = {
        inputSpec: 'api.yaml',
        outputPath: 'output',
      };

      const result = buildCommandArgs(options);

      expect(result).not.toContain('--global-property');
    });
  });

  describe('null and undefined handling', () => {
    it('should skip null values', () => {
      const options: OpenApiGeneratorOptions = {
        inputSpec: 'api.yaml',
        outputPath: 'output',
        auth: null as any,
        packageName: null as any,
      };

      const result = buildCommandArgs(options);

      expect(result).not.toContain('--auth');
      expect(result).not.toContain('--package-name');
    });

    it('should skip undefined values', () => {
      const options: OpenApiGeneratorOptions = {
        inputSpec: 'api.yaml',
        outputPath: 'output',
        auth: undefined,
        packageName: undefined,
      };

      const result = buildCommandArgs(options);

      expect(result).not.toContain('--auth');
      expect(result).not.toContain('--package-name');
    });
  });

  describe('all flag mappings', () => {
    it('should map all flags correctly', () => {
      const options: OpenApiGeneratorOptions = {
        inputSpec: 'api.yaml',
        outputPath: 'output',
        configFile: 'config.json',
        skipValidateSpec: true,
        auth: 'auth-token',
        apiNameSuffix: 'Api',
        apiPackage: 'com.api',
        artifactId: 'my-artifact',
        artifactVersion: '1.0.0',
        dryRun: true,
        enablePostProcessFile: true,
        gitHost: 'github.com',
        gitRepoId: 'repo',
        gitUserId: 'user',
        groupId: 'com.example',
        httpUserAgent: 'MyApp/1.0',
        ignoreFileOverride: '.openapi-ignore',
        inputSpecRootDirectory: '/specs',
        invokerPackage: 'com.invoker',
        logToStderr: true,
        minimalUpdate: true,
        modelNamePrefix: 'Model',
        modelNameSuffix: 'DTO',
        modelPackage: 'com.models',
        packageName: 'api-client',
        releaseNote: 'v1.0 release',
        removeOperationIdPrefix: true,
        skipOverwrite: true,
        skipOperationExample: true,
        strictSpec: true,
        templateDirectory: 'templates/',
      };

      const result = buildCommandArgs(options);

      // Check all mappings
      expect(result).toContain('-c');
      expect(result).toContain('--skip-validate-spec');
      expect(result).toContain('--auth');
      expect(result).toContain('--api-name-suffix');
      expect(result).toContain('--api-package');
      expect(result).toContain('--artifact-id');
      expect(result).toContain('--artifact-version');
      expect(result).toContain('--dry-run');
      expect(result).toContain('--enable-post-process-file');
      expect(result).toContain('--git-host');
      expect(result).toContain('--git-repo-id');
      expect(result).toContain('--git-user-id');
      expect(result).toContain('--group-id');
      expect(result).toContain('--http-user-agent');
      expect(result).toContain('--ignore-file-override');
      expect(result).toContain('--input-spec-root-directory');
      expect(result).toContain('--invoker-package');
      expect(result).toContain('--log-to-stderr');
      expect(result).toContain('--minimal-update');
      expect(result).toContain('--model-name-prefix');
      expect(result).toContain('--model-name-suffix');
      expect(result).toContain('--model-package');
      expect(result).toContain('--package-name');
      expect(result).toContain('--release-note');
      expect(result).toContain('--remove-operation-id-prefix');
      expect(result).toContain('--skip-overwrite');
      expect(result).toContain('--skip-operation-example');
      expect(result).toContain('--strict-spec');
      expect(result).toContain('--template-dir');
    });
  });

  describe('argument order', () => {
    it('should place generate command first', () => {
      const options: OpenApiGeneratorOptions = {
        inputSpec: 'api.yaml',
        outputPath: 'output',
      };

      const result = buildCommandArgs(options);

      expect(result[0]).toBe('generate');
    });

    it('should place input and output early in arguments', () => {
      const options: OpenApiGeneratorOptions = {
        inputSpec: 'api.yaml',
        outputPath: 'output',
        packageName: 'test',
        auth: 'token',
      };

      const result = buildCommandArgs(options);

      // First 7 args should be: generate -i api.yaml -g typescript-angular -o output
      expect(result.slice(0, 7)).toEqual([
        'generate',
        '-i',
        'api.yaml',
        '-g',
        'typescript-angular',
        '-o',
        'output',
      ]);
    });
  });
});
