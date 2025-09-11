import { execSync } from 'node:child_process';

export type PackageManager = 'npm' | 'pnpm' | 'yarn';

export function detectCi(): boolean {
  return Boolean(process.env.CI);
}

export function detectPackageManager(): PackageManager {
  // Minimal heuristic; can be expanded later
  try {
    execSync('pnpm -v', { stdio: 'ignore' });
    return 'pnpm';
  } catch {}
  try {
    execSync('yarn -v', { stdio: 'ignore' });
    return 'yarn';
  } catch {}
  return 'npm';
}

export function installPackages(
  pkgs: string[],
  opts?: { dev?: boolean }
): void {
  const pm = detectPackageManager();
  const dev = opts?.dev ?? true;
  const devFlag = dev ? (pm === 'yarn' ? '-D' : '--save-dev') : '';
  const cmd =
    pm === 'pnpm'
      ? `pnpm add ${dev ? '-D ' : ''}${pkgs.join(' ')}`
      : pm === 'yarn'
      ? `yarn add ${dev ? '-D ' : ''}${pkgs.join(' ')}`
      : `npm install ${devFlag} ${pkgs.join(' ')}`;
  if (!detectCi()) {
    try {
      execSync(cmd, { stdio: 'inherit' });
    } catch (e) {
      // Non-fatal: leave it to the user
    }
  }
}
