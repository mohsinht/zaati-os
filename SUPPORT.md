# Support

Use GitHub Issues for setup help, design ideas, and reproducible bugs with synthetic examples only. Report vulnerabilities privately through the process in `SECURITY.md`.

Never post snapshot files, provider exports, repository tokens, decryption keys, private deployment URLs, account identifiers, or screenshots containing real personal data. Maintainers should be able to reproduce every report with the synthetic tutorial.

Before opening an issue, run:

```bash
npm ci
npm run check
```

Include the operating system, Node version, failing command, and redacted error. The accessibility check also needs Chrome or Chromium, or `CHROME_PATH` set to its executable.
