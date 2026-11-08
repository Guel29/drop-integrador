import {spawnSync} from 'node:child_process';
const result=spawnSync('python3',['-c',`from pathlib import Path
import zipfile, shutil
root=Path('browser-connector/meudropbrasil')
out=Path('php-hostinger/downloads/smartdrop-meudropbrasil-chrome.zip')
with zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED) as z:
 for p in sorted(root.iterdir()):
  if p.is_file():
   info=zipfile.ZipInfo(p.name);info.external_attr=0o100644<<16;info.compress_type=zipfile.ZIP_DEFLATED;z.writestr(info,p.read_bytes())
with zipfile.ZipFile(out) as z: assert z.testzip() is None
out.chmod(0o644)
print('Extensão empacotada sem credenciais.')
`],{stdio:'inherit'});if(result.status!==0)process.exit(result.status??1);
