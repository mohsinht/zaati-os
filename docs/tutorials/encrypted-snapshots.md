# Encrypted snapshot storage

This opt-in feature keeps plaintext snapshot files out of the repository and local snapshot directory. It uses a random 256-bit key and AES-256-GCM authenticated encryption.

## Fresh setup

Run `npm run setup` and answer yes to encrypted snapshots, or enable it manually:

```json
{
  "storage": {
    "snapshot_encryption": true
  }
}
```

Generate the ignored key:

```bash
npm run snapshot:keygen
```

The key is written with restrictive permissions to `.zaati/snapshot.key`. The command never prints the key.

## Ingest encrypted output

Pipe plaintext in memory and write ciphertext only:

```bash
your-flow | npm run snapshot:ingest -- --encrypt --output-dir data/snapshots
```

Encrypted files end in `.json.enc`. Zaati OS refuses mixed encrypted and plaintext storage for the same target.

## Deployment key

Add the key to the protected GitHub `production` environment without displaying it:

```bash
gh secret set ZAATI_SNAPSHOT_KEY < .zaati/snapshot.key
```

Set `storage.snapshot_encryption` to `true` inside the `ZAATI_INSTANCE_CONFIG_JSON` deployment secret. The deployment decrypts snapshots only in process memory for validation and build.

## Boundary and recovery

Encryption protects files at rest and detects modification. It does not replace Cloudflare Access or protect an authorized browser view. Back up the key in a secure password manager or secret vault. Losing it means losing access to the encrypted history.
