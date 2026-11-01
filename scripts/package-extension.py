"""Package one local first-party extension without shared assets or Git metadata."""
import argparse
from pathlib import Path
import re
import zipfile

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('extension', help='Directory name under dist/extensions')
parser.add_argument('output', type=Path, help='Destination ZIP file (must not already exist)')
args = parser.parse_args()
if not re.fullmatch(r'[a-z][a-z0-9-]*', args.extension):
    parser.error('Invalid extension ID')
root = Path(__file__).resolve().parent.parent
directory = root / 'dist/extensions' / args.extension
if not (directory / 'index.js').is_file():
    parser.error('Extension entry point is missing')
files = sorted(p for p in directory.rglob('*') if p.is_file())
if directory.is_symlink() or any(p.is_symlink() for p in directory.rglob('*')):
    parser.error('Extension packages must not contain symlinks')
if any(any(part.startswith('.') for part in p.relative_to(directory).parts) for p in files):
    parser.error('Remove hidden files before packaging')
if args.output.resolve().is_relative_to(directory.resolve()):
    parser.error('Output must be outside the extension directory')
with zipfile.ZipFile(args.output, 'x', compression=zipfile.ZIP_DEFLATED) as archive:
    for file in files:
        # Fixed metadata keeps repeated builds reproducible and omits local timestamps.
        entry = zipfile.ZipInfo(file.relative_to(root).as_posix(), (2026, 1, 1, 0, 0, 0))
        entry.compress_type = zipfile.ZIP_DEFLATED
        entry.external_attr = 0o644 << 16
        archive.writestr(entry, file.read_bytes())
print(f'{args.extension}: {len(files)} files, {args.output.stat().st_size} bytes')
