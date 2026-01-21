import { execSync } from 'node:child_process';
import {
  detectPackageManager as nxDetectPackageManager,
  getPackageManagerCommand,
  type PackageManager,
} from '@nx/devkit';

export type { PackageManager };

export function detectCi(): boolean {
  return Boolean(process.env['CI']);
}

/**
 * Detects the package manager used by the project.
 * Uses @nx/devkit which properly checks lock files (pnpm-lock.yaml, yarn.lock, package-lock.json)
 * and the packageManager field in package.json.
 */
export function detectPackageManager(): PackageManager {
  return nxDetectPackageManager();
}

export function installPackages(
  pkgs: string[],
  opts?: { dev?: boolean }
): void {
  if (pkgs.length === 0) return;

  const pmc = getPackageManagerCommand();
  const dev = opts?.dev ?? true;
  const cmd = `${dev ? pmc.addDev : pmc.add} ${pkgs.join(' ')}`;

  if (!detectCi()) {
    try {
      execSync(cmd, { stdio: 'inherit' });
    } catch {
      /* Non-fatal: leave it to the user */
    }
  }
}
