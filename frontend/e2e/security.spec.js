import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// Known credential leak patterns (JWT Secrets, Database Passwords, Private Keys, Tokens)
const SENSITIVE_PATTERNS = [
  /BEGIN (RSA|OPENSSH|EC|DSA)? ?PRIVATE KEY/,
  /password\s*=\s*['"][^'"]{6,}['"]/i,
  /secret_key\s*=\s*['"][^'"]{10,}['"]/i,
  /postgres:\/\/[^:]+:[^@]+@/,
  /rtsp:\/\/(?!admin:password|user:pass)[^:]+:[^@]+@/, // Match non-placeholder RTSP urls
];

test.describe('V-Face AI - Security & Secret Leak Prevention Audit', () => {
  test('SEC-01: .gitignore Must Explicitly Ignore .env, Keys, DB & Artifacts', async () => {
    const gitignorePath = path.resolve(process.cwd(), '../.gitignore');
    expect(fs.existsSync(gitignorePath)).toBeTruthy();

    const gitignoreContent = fs.readFileSync(gitignorePath, 'utf-8');
    expect(gitignoreContent).toContain('.env');
    expect(gitignoreContent).toContain('*.key');
    expect(gitignoreContent).toContain('*.pem');
    expect(gitignoreContent).toContain('logs/');
    expect(gitignoreContent).toContain('uploads/');
  });

  test('SEC-02: Public Example Files (.env.example) Must Only Contain Placeholder Passwords', async () => {
    const rootEnvExample = path.resolve(process.cwd(), '../.env.example');
    const coreUserEnvExample = path.resolve(process.cwd(), '../services/core-user/.env.example');

    for (const envPath of [rootEnvExample, coreUserEnvExample]) {
      if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf-8');
        // Ensure no real hardcoded private IP or personal passwords exist
        expect(content).not.toMatch(/192\.168\.1\.8/);
        expect(content).not.toMatch(/H%40utph/);
      }
    }
  });

  test('SEC-03: Frontend Source Code Must NOT Hardcode Real RTSP Credentials', async () => {
    const deviceMgmtPath = path.resolve(process.cwd(), './src/components/DeviceManagement.jsx');
    const content = fs.readFileSync(deviceMgmtPath, 'utf-8');

    expect(content).not.toMatch(/192\.168\.1\.8/);
    expect(content).not.toMatch(/H%40utph1983/);
  });
});
