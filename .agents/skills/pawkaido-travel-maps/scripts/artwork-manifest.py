#!/usr/bin/env python3
"""Pin NEW artwork archives, or verify an existing manifest without updating it."""
import argparse
import hashlib
import json
import stat
from pathlib import Path

NAME = 'ARTWORK.sha256.json'

def artwork(root, name):
    if not isinstance(name, str) or not name or Path(name).name != name or name in {'.', '..', NAME}:
        raise ValueError('Artwork must be a plain filename inside the archive')
    path = root / name
    if path.is_symlink() or not path.is_file():
        raise ValueError('Missing or symlink artwork: ' + name)
    return path

def digest(path):
    h = hashlib.sha256()
    with path.open('rb') as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            h.update(chunk)
    return h.hexdigest()

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('mode', choices=['seal', 'check'])
    parser.add_argument('directory', type=Path)
    parser.add_argument('files', nargs='*', help='Plain filenames; required for seal, forbidden for check')
    args = parser.parse_args()
    root = args.directory.resolve(strict=True)
    manifest = root / NAME
    if args.mode == 'seal':
        if not args.files or len(set(args.files)) != len(args.files):
            raise ValueError('Provide distinct artwork filenames')
        if manifest.exists() or manifest.is_symlink():
            raise ValueError('Manifest already exists; use check, never reseal changed originals')
        paths = [artwork(root, name) for name in args.files]
        payload = {'files': {p.name: digest(p) for p in paths}}
        with manifest.open('x', encoding='utf8') as out:
            json.dump(payload, out, ensure_ascii=False, indent=2)
            out.write('\n')
        for p in paths:
            p.chmod(stat.S_IMODE(p.stat().st_mode) & ~0o222)
        print(f'Sealed {len(paths)} original(s); keep this manifest and archive intact')
    else:
        if args.files:
            raise ValueError('check uses only the pinned manifest; do not supply new file names')
        if manifest.is_symlink():
            raise ValueError('Manifest cannot be a symlink')
        payload = json.loads(manifest.read_text(encoding='utf8'))
        files = payload.get('files')
        if not isinstance(files, dict) or not files:
            raise ValueError('Manifest needs a nonempty files mapping')
        for name, expected in files.items():
            p = artwork(root, name)
            if not isinstance(expected, str) or len(expected) != 64 or digest(p) != expected:
                raise ValueError('Original changed: ' + name)
            if p.stat().st_mode & 0o222:
                raise ValueError('Hash matches but artwork is writable: ' + name)
            print('OK ' + name + ' · hash unchanged · read-only')

if __name__ == '__main__':
    try:
        main()
    except (OSError, ValueError, TypeError) as error:
        raise SystemExit(str(error))
