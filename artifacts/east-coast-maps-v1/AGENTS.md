# Preserved map originals

The user explicitly requires these four original PNG files to be kept forever without overwriting.

- Never overwrite, edit, re-encode, replace, rename, or delete the four PNG files in this directory.
- `ORIGINALS.sha256.json` pins their original bytes. Do not update hashes to bless a changed image.
- Keep originals read-only. Copy them into a new versioned directory for any future art revision.
- Runtime/compressed derivatives belong under `dist/map-packs/`, never at an original path.
- Run `node scripts/check-map-originals.mjs` from the project root after map-related work.
