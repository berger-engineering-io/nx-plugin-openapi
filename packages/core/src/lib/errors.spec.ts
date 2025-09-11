import {
  CoreError,
  PluginNotFoundError,
  PluginLoadError,
  ValidationError,
} from './errors';

describe('errors', () => {
  describe('CoreError', () => {
    it('should create error with message', () => {
      const error = new CoreError('Test error message');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(CoreError);
      expect(error.message).toBe('Test error message');
      expect(error.name).toBe('CoreError');
    });

    it('should set name to constructor name', () => {
      const error = new CoreError('Test');

      expect(error.name).toBe('CoreError');
    });

    it('should have stack trace', () => {
      const error = new CoreError('Test');

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('CoreError');
    });
  });

  describe('PluginNotFoundError', () => {
    it('should create error with plugin name', () => {
      const error = new PluginNotFoundError('test-plugin');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(CoreError);
      expect(error).toBeInstanceOf(PluginNotFoundError);
      expect(error.pluginName).toBe('test-plugin');
      expect(error.message).toBe('Generator plugin not found: test-plugin');
      expect(error.name).toBe('PluginNotFoundError');
    });

    it('should format message correctly', () => {
      const error = new PluginNotFoundError('my-custom-plugin');

      expect(error.message).toBe(
        'Generator plugin not found: my-custom-plugin'
      );
    });

    it('should store plugin name as property', () => {
      const error = new PluginNotFoundError('plugin-name');

      expect(error.pluginName).toBe('plugin-name');
    });

    it('should handle special characters in plugin name', () => {
      const error = new PluginNotFoundError('@scope/plugin-name');

      expect(error.pluginName).toBe('@scope/plugin-name');
      expect(error.message).toBe(
        'Generator plugin not found: @scope/plugin-name'
      );
    });
  });

  describe('PluginLoadError', () => {
    it('should create error with plugin name', () => {
      const error = new PluginLoadError('test-plugin');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(CoreError);
      expect(error).toBeInstanceOf(PluginLoadError);
      expect(error.pluginName).toBe('test-plugin');
      expect(error.message).toBe(
        'Failed to load generator plugin: test-plugin'
      );
      expect(error.name).toBe('PluginLoadError');
    });

    it('should store cause when provided', () => {
      const cause = new Error('Original error');
      const error = new PluginLoadError('test-plugin', cause);

      expect(error.cause).toBe(cause);
    });

    it('should work without cause', () => {
      const error = new PluginLoadError('test-plugin');

      expect(error.cause).toBeUndefined();
    });

    it('should accept any type as cause', () => {
      const error1 = new PluginLoadError('plugin1', 'string cause');
      const error2 = new PluginLoadError('plugin2', { error: 'object' });
      const error3 = new PluginLoadError('plugin3', 123);

      expect(error1.cause).toBe('string cause');
      expect(error2.cause).toEqual({ error: 'object' });
      expect(error3.cause).toBe(123);
    });

    it('should format message correctly', () => {
      const error = new PluginLoadError('my-plugin');

      expect(error.message).toBe('Failed to load generator plugin: my-plugin');
    });
  });

  describe('ValidationError', () => {
    it('should create error with message', () => {
      const error = new ValidationError('Validation failed');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(CoreError);
      expect(error).toBeInstanceOf(ValidationError);
      expect(error.message).toBe('Validation failed');
      expect(error.name).toBe('ValidationError');
    });

    it('should work with different messages', () => {
      const error1 = new ValidationError('Invalid input');
      const error2 = new ValidationError('Missing required field');

      expect(error1.message).toBe('Invalid input');
      expect(error2.message).toBe('Missing required field');
    });

    it('should inherit from CoreError', () => {
      const error = new ValidationError('Test');

      expect(error.name).toBe('ValidationError');
      expect(error).toBeInstanceOf(CoreError);
    });
  });

  describe('error inheritance', () => {
    it('should maintain proper prototype chain', () => {
      const coreError = new CoreError('core');
      const notFoundError = new PluginNotFoundError('plugin');
      const loadError = new PluginLoadError('plugin');
      const validationError = new ValidationError('validation');

      // All should be instances of Error
      expect(coreError).toBeInstanceOf(Error);
      expect(notFoundError).toBeInstanceOf(Error);
      expect(loadError).toBeInstanceOf(Error);
      expect(validationError).toBeInstanceOf(Error);

      // All should be instances of CoreError
      expect(coreError).toBeInstanceOf(CoreError);
      expect(notFoundError).toBeInstanceOf(CoreError);
      expect(loadError).toBeInstanceOf(CoreError);
      expect(validationError).toBeInstanceOf(CoreError);

      // Each should be instance of its own class
      expect(notFoundError).toBeInstanceOf(PluginNotFoundError);
      expect(loadError).toBeInstanceOf(PluginLoadError);
      expect(validationError).toBeInstanceOf(ValidationError);
    });

    it('should handle instanceof checks correctly', () => {
      const error = new PluginNotFoundError('test');

      expect(error instanceof Error).toBe(true);
      expect(error instanceof CoreError).toBe(true);
      expect(error instanceof PluginNotFoundError).toBe(true);
      expect(error instanceof PluginLoadError).toBe(false);
      expect(error instanceof ValidationError).toBe(false);
    });
  });
});
