import { getPackageVersion } from './check-package-version';

describe('getPackageVersion', () => {
  describe('standard version formats', () => {
    it('should parse a simple version', () => {
      const result = getPackageVersion({ '@angular/core': '2.0.0' });
      expect(result).toEqual({
        major: 2,
        minor: 0,
        patch: 0,
        package: { '@angular/core': '2.0.0' },
      });
    });

    it('should parse version with multiple digits', () => {
      const result = getPackageVersion({ 'some-package': '12.34.567' });
      expect(result).toEqual({ major: 12, minor: 34, patch: 567, package: { 'some-package': '12.34.567' } });
    });

    it('should parse version with pre-release suffix', () => {
      const result = getPackageVersion({ package: '1.2.3-alpha.1' });
      expect(result).toEqual({ major: 1, minor: 2, patch: 3, package: { package: '1.2.3-alpha.1' } });
    });

    it('should parse version with build metadata', () => {
      const result = getPackageVersion({ package: '1.2.3+build.123' });
      expect(result).toEqual({ major: 1, minor: 2, patch: 3, package: { package: '1.2.3+build.123' } });
    });

    it('should parse version with pre-release and build metadata', () => {
      const result = getPackageVersion({ package: '1.2.3-beta.2+build.456' });
      expect(result).toEqual({ major: 1, minor: 2, patch: 3, package: { package: '1.2.3-beta.2+build.456' } });
    });
  });

  describe('version with prefixes', () => {
    it('should handle caret (^) prefix', () => {
      const result = getPackageVersion({ '@angular/core': '^2.0.0' });
      expect(result).toEqual({ major: 2, minor: 0, patch: 0, package: { '@angular/core': '^2.0.0' } });
    });

    it('should handle tilde (~) prefix', () => {
      const result = getPackageVersion({ express: '~4.17.1' });
      expect(result).toEqual({ major: 4, minor: 17, patch: 1, package: { express: '~4.17.1' } });
    });

    it('should handle greater than (>) prefix', () => {
      const result = getPackageVersion({ lodash: '>4.0.0' });
      expect(result).toEqual({ major: 4, minor: 0, patch: 0, package: { lodash: '>4.0.0' } });
    });

    it('should handle greater than or equal (>=) prefix', () => {
      const result = getPackageVersion({ react: '>=16.8.0' });
      expect(result).toEqual({ major: 16, minor: 8, patch: 0, package: { react: '>=16.8.0' } });
    });

    it('should handle less than (<) prefix', () => {
      const result = getPackageVersion({ package: '<3.0.0' });
      expect(result).toEqual({ major: 3, minor: 0, patch: 0, package: { package: '<3.0.0' } });
    });

    it('should handle less than or equal (<=) prefix', () => {
      const result = getPackageVersion({ package: '<=2.5.0' });
      expect(result).toEqual({ major: 2, minor: 5, patch: 0, package: { package: '<=2.5.0' } });
    });

    it('should handle equal (=) prefix', () => {
      const result = getPackageVersion({ package: '=1.2.3' });
      expect(result).toEqual({ major: 1, minor: 2, patch: 3, package: { package: '=1.2.3' } });
    });

    it('should handle spaces after prefix', () => {
      const result = getPackageVersion({ package: '>= 1.2.3' });
      expect(result).toEqual({ major: 1, minor: 2, patch: 3, package: { package: '>= 1.2.3' } });
    });

    it('should handle multiple spaces', () => {
      const result = getPackageVersion({ package: '^  1.2.3' });
      expect(result).toEqual({ major: 1, minor: 2, patch: 3, package: { package: '^  1.2.3' } });
    });
  });

  describe('edge cases', () => {
    it('should handle version with v prefix', () => {
      const result = getPackageVersion({ package: 'v1.2.3' });
      expect(result).toEqual({ major: 1, minor: 2, patch: 3, package: { package: 'v1.2.3' } });
    });

    it('should handle complex version with prefix and suffixes', () => {
      const result = getPackageVersion({ package: '^1.2.3-rc.1+build.123' });
      expect(result).toEqual({ major: 1, minor: 2, patch: 3, package: { package: '^1.2.3-rc.1+build.123' } });
    });

    it('should handle version 0.0.0', () => {
      const result = getPackageVersion({ package: '0.0.0' });
      expect(result).toEqual({ major: 0, minor: 0, patch: 0, package: { package: '0.0.0' } });
    });

    it('should handle single package entry with scoped package', () => {
      const result = getPackageVersion({ '@scope/package': '1.2.3' });
      expect(result).toEqual({ major: 1, minor: 2, patch: 3, package: { '@scope/package': '1.2.3' } });
    });
  });

  describe('error cases', () => {
    it('should throw error for invalid version format', () => {
      expect(() => getPackageVersion({ package: 'invalid' })).toThrow(
        'Invalid version format: invalid'
      );
    });

    it('should throw error for incomplete version', () => {
      expect(() => getPackageVersion({ package: '1.2' })).toThrow(
        'Invalid version format: 1.2'
      );
    });

    it('should throw error for empty version', () => {
      expect(() => getPackageVersion({ package: '' })).toThrow(
        'Invalid version format: '
      );
    });

    it('should throw error for version with only prefix', () => {
      expect(() => getPackageVersion({ package: '^' })).toThrow(
        'Invalid version format: ^'
      );
    });

    it('should throw error for non-numeric version parts', () => {
      expect(() => getPackageVersion({ package: 'a.b.c' })).toThrow(
        'Invalid version format: a.b.c'
      );
    });
  });

  describe('first entry selection', () => {
    it('should only process the first entry when multiple are provided', () => {
      const result = getPackageVersion({
        package1: '1.0.0',
        package2: '2.0.0',
      });
      expect(result).toEqual({ major: 1, minor: 0, patch: 0, package: { package1: '1.0.0', package2: '2.0.0' } });
    });
  });
});
