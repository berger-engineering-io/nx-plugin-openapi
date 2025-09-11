import { log } from './log';

export function getPackageVersion(packageEntry: Record<string, string>): {
  major: number;
  minor: number;
  patch: number;
  package: Record<string, string>;
} {
  if (Object.entries(packageEntry).length === 0) {
    throw new Error(log('No package entries provided'));
  }
  const [, versionString] = Object.entries(packageEntry)[0];
  const cleanVersion = versionString.replace(/^[\^~><=v\s]+/, '');
  const versionMatch = cleanVersion.match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!versionMatch) {
    throw new Error(`Invalid version format: ${versionString}`);
  }
  const [, major, minor, patch] = versionMatch;
  return {
    major: parseInt(major, 10),
    minor: parseInt(minor, 10),
    patch: parseInt(patch, 10),
    package: packageEntry,
  };
}
