import { Logger, LogLevel } from './logger';

describe('Logger', () => {
  let logger: Logger;
  let consoleDebugSpy: jest.SpyInstance;
  let consoleInfoSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    Logger.reset();
    consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation();
    consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete process.env['NX_PLUGIN_LOG_LEVEL'];
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = Logger.getInstance();
      const instance2 = Logger.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should create new instance after reset', () => {
      const instance1 = Logger.getInstance();
      Logger.reset();
      const instance2 = Logger.getInstance();
      expect(instance1).not.toBe(instance2);
    });
  });

  describe('constructor', () => {
    it('should use default options', () => {
      logger = new Logger();
      expect(logger.getLevel()).toBe('info');
    });

    it('should use provided options', () => {
      logger = new Logger({ level: 'debug' });
      expect(logger.getLevel()).toBe('debug');
    });

    it('should use environment variable for log level', () => {
      process.env['NX_PLUGIN_LOG_LEVEL'] = 'debug';
      logger = new Logger();
      expect(logger.getLevel()).toBe('debug');
    });

    it('should prefer explicit option over environment variable', () => {
      process.env['NX_PLUGIN_LOG_LEVEL'] = 'debug';
      logger = new Logger({ level: 'error' });
      expect(logger.getLevel()).toBe('error');
    });
  });

  describe('log levels', () => {
    beforeEach(() => {
      logger = new Logger({ timestamp: false, prefix: '' });
    });

    it('should log debug messages when level is debug', () => {
      logger.setLevel('debug');
      logger.debug('debug message');
      expect(consoleDebugSpy).toHaveBeenCalledWith('[DEBUG] debug message');
    });

    it('should not log debug messages when level is info', () => {
      logger.setLevel('info');
      logger.debug('debug message');
      expect(consoleDebugSpy).not.toHaveBeenCalled();
    });

    it('should log info messages when level is info', () => {
      logger.setLevel('info');
      logger.info('info message');
      expect(consoleInfoSpy).toHaveBeenCalledWith('[INFO] info message');
    });

    it('should not log info messages when level is warn', () => {
      logger.setLevel('warn');
      logger.info('info message');
      expect(consoleInfoSpy).not.toHaveBeenCalled();
    });

    it('should log warn messages when level is warn', () => {
      logger.setLevel('warn');
      logger.warn('warning message');
      expect(consoleWarnSpy).toHaveBeenCalledWith('[WARN] warning message');
    });

    it('should not log warn messages when level is error', () => {
      logger.setLevel('error');
      logger.warn('warning message');
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it('should always log error messages', () => {
      const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
      for (const level of levels) {
        logger.setLevel(level);
        logger.error('error message');
        expect(consoleErrorSpy).toHaveBeenCalled();
        consoleErrorSpy.mockClear();
      }
    });
  });

  describe('message formatting', () => {
    it('should include prefix when provided', () => {
      logger = new Logger({ prefix: '[test]', timestamp: false });
      logger.info('message');
      expect(consoleInfoSpy).toHaveBeenCalledWith('[test] [INFO] message');
    });

    it('should include timestamp when enabled', () => {
      const dateSpy = jest.spyOn(Date.prototype, 'toISOString').mockReturnValue('2024-01-01T00:00:00.000Z');
      logger = new Logger({ timestamp: true, prefix: '' });
      logger.info('message');
      expect(consoleInfoSpy).toHaveBeenCalledWith('2024-01-01T00:00:00.000Z [INFO] message');
      dateSpy.mockRestore();
    });

    it('should format additional arguments', () => {
      logger = new Logger({ timestamp: false, prefix: '' });
      logger.info('message', 'arg1', 123);
      expect(consoleInfoSpy).toHaveBeenCalledWith('[INFO] message arg1 123');
    });

    it('should format objects as JSON', () => {
      logger = new Logger({ timestamp: false, prefix: '' });
      const obj = { key: 'value' };
      logger.info('message', obj);
      expect(consoleInfoSpy).toHaveBeenCalledWith('[INFO] message {\n  "key": "value"\n}');
    });

    it('should format errors with stack trace', () => {
      logger = new Logger({ timestamp: false, prefix: '' });
      const error = new Error('test error');
      error.stack = 'Error: test error\n  at test.js:1:1';
      logger.error('An error occurred:', error);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[ERROR] An error occurred: Error: test error\nError: test error\n  at test.js:1:1'
      );
    });

    it('should handle circular references in objects', () => {
      logger = new Logger({ timestamp: false, prefix: '' });
      const obj: Record<string, unknown> = { key: 'value' };
      obj.circular = obj;
      logger.info('message', obj);
      const call = consoleInfoSpy.mock.calls[0][0];
      expect(call).toContain('[INFO] message');
      expect(call).toContain('[object Object]');
    });
  });

  describe('utility methods', () => {
    beforeEach(() => {
      logger = new Logger({ level: 'debug', timestamp: false, prefix: '[test]' });
    });

    it('should support console.group', () => {
      const groupSpy = jest.spyOn(console, 'group').mockImplementation();
      logger.group('Group Label');
      expect(groupSpy).toHaveBeenCalledWith('[test] [DEBUG] Group Label');
      groupSpy.mockRestore();
    });

    it('should support console.groupEnd', () => {
      const groupEndSpy = jest.spyOn(console, 'groupEnd').mockImplementation();
      logger.groupEnd();
      expect(groupEndSpy).toHaveBeenCalled();
      groupEndSpy.mockRestore();
    });

    it('should support console.time', () => {
      const timeSpy = jest.spyOn(console, 'time').mockImplementation();
      logger.time('Timer');
      expect(timeSpy).toHaveBeenCalledWith('[test] Timer');
      timeSpy.mockRestore();
    });

    it('should support console.timeEnd', () => {
      const timeEndSpy = jest.spyOn(console, 'timeEnd').mockImplementation();
      logger.timeEnd('Timer');
      expect(timeEndSpy).toHaveBeenCalledWith('[test] Timer');
      timeEndSpy.mockRestore();
    });

    it('should not call utility methods when level is too high', () => {
      logger.setLevel('error');
      const groupSpy = jest.spyOn(console, 'group').mockImplementation();
      const timeSpy = jest.spyOn(console, 'time').mockImplementation();
      
      logger.group('Group');
      logger.time('Timer');
      
      expect(groupSpy).not.toHaveBeenCalled();
      expect(timeSpy).not.toHaveBeenCalled();
      
      groupSpy.mockRestore();
      timeSpy.mockRestore();
    });
  });

  describe('setLevel and getLevel', () => {
    it('should update log level', () => {
      logger = new Logger({ level: 'info' });
      expect(logger.getLevel()).toBe('info');
      
      logger.setLevel('debug');
      expect(logger.getLevel()).toBe('debug');
      
      logger.setLevel('error');
      expect(logger.getLevel()).toBe('error');
    });
  });
});