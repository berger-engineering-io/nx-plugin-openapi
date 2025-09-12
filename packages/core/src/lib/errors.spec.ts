import { 
  CoreError,
  PluginNotFoundError,
  PluginLoadError,
  ValidationError,
  ConfigurationError,
  FileSystemError,
  ExecutionError,
  InvalidPathError
} from './errors';

describe('Error Classes', () => {
  describe('CoreError', () => {
    it('should set the message and name correctly', () => {
      const error = new CoreError('Test error message');

      expect(error.message).toBe('Test error message');
      expect(error.name).toBe('CoreError');
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(CoreError);
    });

    it('should set the correct name for subclasses', () => {
      class CustomError extends CoreError {}
      const error = new CustomError('Custom error message');

      expect(error.message).toBe('Custom error message');
      expect(error.name).toBe('CustomError');
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(CoreError);
      expect(error).toBeInstanceOf(CustomError);
    });

    it('should store cause when provided', () => {
      const cause = new Error('Original error');
      const error = new CoreError('Wrapped error', cause);

      expect(error.message).toBe('Wrapped error');
      expect(error.cause).toBe(cause);
    });

    it('should have stack trace', () => {
      const error = new CoreError('Test');

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('CoreError');
    });
  });

  describe('PluginNotFoundError', () => {
    it('should create error without search paths', () => {
      const error = new PluginNotFoundError('my-plugin');

      expect(error.message).toBe('Generator plugin not found: my-plugin');
      expect(error.pluginName).toBe('my-plugin');
      expect(error.name).toBe('PluginNotFoundError');
    });

    it('should create error with search paths', () => {
      const error = new PluginNotFoundError('my-plugin', ['/path1', '/path2']);

      expect(error.message).toBe('Generator plugin not found: my-plugin. Searched in: /path1, /path2');
      expect(error.pluginName).toBe('my-plugin');
      expect(error.searchPaths).toEqual(['/path1', '/path2']);
    });

    it('should handle special characters in plugin name', () => {
      const error = new PluginNotFoundError('@scope/plugin-name');

      expect(error.pluginName).toBe('@scope/plugin-name');
      expect(error.message).toBe('Generator plugin not found: @scope/plugin-name');
    });
  });

  describe('PluginLoadError', () => {
    it('should create error with string cause', () => {
      const error = new PluginLoadError('my-plugin', 'Module not found');

      expect(error.message).toBe('Failed to load generator plugin: my-plugin. Reason: Module not found');
      expect(error.pluginName).toBe('my-plugin');
      expect(error.name).toBe('PluginLoadError');
    });

    it('should create error with Error cause', () => {
      const cause = new Error('Import failed');
      const error = new PluginLoadError('my-plugin', cause);

      expect(error.message).toBe('Failed to load generator plugin: my-plugin. Reason: Import failed');
      expect(error.cause).toBe(cause);
    });

    it('should handle non-Error cause', () => {
      const error = new PluginLoadError('my-plugin', { code: 'ERR_MODULE_NOT_FOUND' });

      expect(error.message).toContain('Failed to load generator plugin: my-plugin');
      expect(error.cause).toEqual({ code: 'ERR_MODULE_NOT_FOUND' });
    });
  });

  describe('ValidationError', () => {
    it('should create error without field', () => {
      const error = new ValidationError('Invalid value');

      expect(error.message).toBe('Validation error: Invalid value');
      expect(error.name).toBe('ValidationError');
    });

    it('should create error with field', () => {
      const error = new ValidationError('Must be a string', 'username', 123);

      expect(error.message).toBe("Validation error for field 'username': Must be a string");
      expect(error.field).toBe('username');
      expect(error.value).toBe(123);
    });

    it('should inherit from CoreError', () => {
      const error = new ValidationError('Test');

      expect(error.name).toBe('ValidationError');
      expect(error).toBeInstanceOf(CoreError);
    });
  });

  describe('ConfigurationError', () => {
    it('should create error without config path', () => {
      const error = new ConfigurationError('Invalid configuration');

      expect(error.message).toBe('Configuration error: Invalid configuration');
      expect(error.name).toBe('ConfigurationError');
    });

    it('should create error with config path', () => {
      const error = new ConfigurationError('Missing required field', 'config.json');

      expect(error.message).toBe('Configuration error in config.json: Missing required field');
      expect(error.configPath).toBe('config.json');
    });
  });

  describe('FileSystemError', () => {
    it('should create error for read operation', () => {
      const error = new FileSystemError('File not found', '/path/to/file', 'read');

      expect(error.message).toBe('File system error during read operation on /path/to/file: File not found');
      expect(error.path).toBe('/path/to/file');
      expect(error.operation).toBe('read');
      expect(error.name).toBe('FileSystemError');
    });

    it('should create error with cause', () => {
      const cause = new Error('Permission denied');
      const error = new FileSystemError('Cannot write', '/path/to/file', 'write', cause);

      expect(error.message).toBe('File system error during write operation on /path/to/file: Cannot write');
      expect(error.cause).toBe(cause);
    });

    it('should support different operations', () => {
      const readError = new FileSystemError('Error', '/file', 'read');
      const writeError = new FileSystemError('Error', '/file', 'write');
      const deleteError = new FileSystemError('Error', '/file', 'delete');
      const createError = new FileSystemError('Error', '/file', 'create');

      expect(readError.operation).toBe('read');
      expect(writeError.operation).toBe('write');
      expect(deleteError.operation).toBe('delete');
      expect(createError.operation).toBe('create');
    });
  });

  describe('ExecutionError', () => {
    it('should create error without exit code', () => {
      const error = new ExecutionError('Command failed', 'npm install');

      expect(error.message).toBe('Command failed');
      expect(error.command).toBe('npm install');
      expect(error.name).toBe('ExecutionError');
    });

    it('should create error with exit code', () => {
      const error = new ExecutionError('Command failed', 'npm test', 1);

      expect(error.message).toBe('Command failed (exit code: 1)');
      expect(error.command).toBe('npm test');
      expect(error.exitCode).toBe(1);
    });

    it('should handle zero exit code', () => {
      const error = new ExecutionError('Unexpected success', 'failing-command', 0);

      expect(error.message).toBe('Unexpected success (exit code: 0)');
      expect(error.exitCode).toBe(0);
    });
  });

  describe('InvalidPathError', () => {
    it('should create error with path details', () => {
      const error = new InvalidPathError('../outside', 'contains parent directory reference');

      expect(error.message).toBe("Validation error for field 'path': Invalid path '../outside': contains parent directory reference");
      expect(error.field).toBe('path');
      expect(error.value).toBe('../outside');
      expect(error.name).toBe('InvalidPathError');
    });

    it('should inherit from ValidationError', () => {
      const error = new InvalidPathError('/etc/passwd', 'absolute path not allowed');

      expect(error).toBeInstanceOf(ValidationError);
      expect(error).toBeInstanceOf(CoreError);
    });
  });

  describe('error inheritance', () => {
    it('should maintain proper prototype chain', () => {
      const coreError = new CoreError('core');
      const notFoundError = new PluginNotFoundError('plugin');
      const loadError = new PluginLoadError('plugin');
      const validationError = new ValidationError('validation');
      const configError = new ConfigurationError('config');
      const fsError = new FileSystemError('fs', '/path', 'read');
      const execError = new ExecutionError('exec', 'cmd');
      const pathError = new InvalidPathError('/bad', 'reason');

      // All should be instances of Error
      expect(coreError).toBeInstanceOf(Error);
      expect(notFoundError).toBeInstanceOf(Error);
      expect(loadError).toBeInstanceOf(Error);
      expect(validationError).toBeInstanceOf(Error);
      expect(configError).toBeInstanceOf(Error);
      expect(fsError).toBeInstanceOf(Error);
      expect(execError).toBeInstanceOf(Error);
      expect(pathError).toBeInstanceOf(Error);

      // All should be instances of CoreError
      expect(coreError).toBeInstanceOf(CoreError);
      expect(notFoundError).toBeInstanceOf(CoreError);
      expect(loadError).toBeInstanceOf(CoreError);
      expect(validationError).toBeInstanceOf(CoreError);
      expect(configError).toBeInstanceOf(CoreError);
      expect(fsError).toBeInstanceOf(CoreError);
      expect(execError).toBeInstanceOf(CoreError);
      expect(pathError).toBeInstanceOf(CoreError);

      // Each should be instance of its own class
      expect(notFoundError).toBeInstanceOf(PluginNotFoundError);
      expect(loadError).toBeInstanceOf(PluginLoadError);
      expect(validationError).toBeInstanceOf(ValidationError);
      expect(configError).toBeInstanceOf(ConfigurationError);
      expect(fsError).toBeInstanceOf(FileSystemError);
      expect(execError).toBeInstanceOf(ExecutionError);
      expect(pathError).toBeInstanceOf(InvalidPathError);

      // InvalidPathError should also be ValidationError
      expect(pathError).toBeInstanceOf(ValidationError);
    });

    it('should handle instanceof checks correctly', () => {
      const error = new PluginNotFoundError('test');

      expect(error instanceof Error).toBe(true);
      expect(error instanceof CoreError).toBe(true);
      expect(error instanceof PluginNotFoundError).toBe(true);
      expect(error instanceof PluginLoadError).toBe(false);
      expect(error instanceof ValidationError).toBe(false);
      expect(error instanceof ConfigurationError).toBe(false);
    });
  });
});