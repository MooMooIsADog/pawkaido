"""Package one presentation-only map DLC without overwriting a prior archive."""
import argparse
from pathlib import Path
from zipfile import ZipFile, ZipInfo, ZIP_DEFLATED
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('pack',choices=['east-coast'])
parser.add_argument('output',type=Path)
args=parser.parse_args()
root=Path(__file__).resolve().parents[1]/'dist'/'map-packs'/args.pack
files=sorted(root.rglob('*'))
if any(p.is_symlink() for p in files):raise SystemExit('Symlinks are not supported')
args.output.parent.mkdir(parents=True,exist_ok=True)
with args.output.open('xb') as out:
 with ZipFile(out,'w',ZIP_DEFLATED) as archive:
  for p in files:
   if p.is_file():
    info=ZipInfo(f'{args.pack}/{p.relative_to(root).as_posix()}',date_time=(2026,1,1,0,0,0));info.compress_type=ZIP_DEFLATED;info.external_attr=0o100644<<16
    archive.writestr(info,p.read_bytes())
print(f'{args.output}: {args.output.stat().st_size} bytes')
