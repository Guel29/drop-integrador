from pathlib import Path
import os, zipfile, hashlib
root = Path('php-hostinger')
out = Path('dist-hostinger/smartdrop-hostinger-php.zip')
out.parent.mkdir(exist_ok=True)
with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as archive:
    for directory, folders, files in os.walk(root):
        folders[:] = sorted(d for d in folders if d not in {'.private', 'frontend', 'tests'})
        for name in sorted(files):
            path = Path(directory) / name
            relative = path.relative_to(root)
            if name == 'setup-key.php' or name.startswith('.env') or path.suffix == '.log':
                continue
            info = zipfile.ZipInfo(str(relative))
            info.external_attr = (0o100644 << 16)
            info.compress_type = zipfile.ZIP_DEFLATED
            archive.writestr(info, path.read_bytes())
with zipfile.ZipFile(out) as archive:
    assert archive.testzip() is None
    names = archive.namelist()
    assert {'index.html', '.htaccess', 'api/index.php', 'assets/app.js', 'COMO-INSTALAR.txt'} <= set(names)
    assert not any('.private/' in n or n == 'api/setup-key.php' for n in names)
    print(f'ZIP PHP validado: {len(names)} arquivos, {out.stat().st_size} bytes, arquivos diretamente na raiz.')
print('SHA256:', hashlib.sha256(out.read_bytes()).hexdigest())
