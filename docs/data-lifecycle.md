# Data lifecycle and key recovery

Decide this policy before the first real snapshot. Zaati OS cannot choose how long your personal history should exist.

## Retention

- Keep only the facts needed for the dashboard and trends you actually use.
- Choose a retention period per source. Money and review facts may need different windows than inbox attention.
- A normal Git deletion removes the current file but not its history. Hard deletion requires a reviewed history rewrite in the private repository and fresh clones afterward.
- Never test deletion with the only copy of encrypted data.

## Encryption key ownership

`npm run snapshot:keygen` creates an ignored 256-bit key. Back it up in a password manager or secrets vault before writing encrypted snapshots. The key never belongs in Git, an LLM prompt, a generated permission receipt, logs, or screenshots.

If the key is lost, encrypted snapshots are unrecoverable by design. Zaati OS has no recovery service or escrow copy.

## Rotation

1. Pause producers and deployment.
2. Back up the private repository and old key.
3. Decrypt and re-encrypt in a trusted local or protected CI environment using a newly generated key.
4. Validate every new envelope before replacing any old file.
5. Update the protected validator and deployment secrets together.
6. Deploy, verify the dashboard, then revoke the old key.

If a key may have leaked, rotate it and rewrite encrypted Git history. Re-encrypting only the current files does not remove old ciphertext from history.

## Source removal

Disable the source in instance configuration, remove its scheduled producer, delete current snapshot files, and decide whether history must also be rewritten. Rebuild and confirm the source is absent from the dashboard and generated payload.
