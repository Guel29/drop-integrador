from pathlib import Path
import zipfile,re,io,subprocess,tempfile,shutil
root=Path('php-hostinger')
out=Path('dist-hostinger/smartdrop-correcao-tela-branca.zip')
files=[root/'index.html',root/'.htaccess',*sorted((root/'assets').glob('*')),*sorted((root/'products').glob('*'))]
with zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED) as archive:
 for file in files:
  if not file.is_file(): continue
  item=zipfile.ZipInfo(str(file.relative_to(root)));item.external_attr=0o100644<<16;item.compress_type=zipfile.ZIP_DEFLATED;archive.writestr(item,file.read_bytes())
 archive.writestr('COMO-CORRIGIR.txt','CORREÇÃO VISUAL — SMART DROP PHP/MYSQL\nFaça backup e extraia TODO o conteúdo deste ZIP diretamente em public_html/drop.\nSubstitua index.html, .htaccess, assets/ e products/ quando solicitado. Não apague a pasta do site.\nNão reinstale, não altere o MySQL e não apague .private/ ou api/. O ZIP não contém esses dados.\nDepois limpe o cache do subdomínio no hPanel/CDN e abra o site em janela anônima.\nO pacote mantém letras maiores e inclui todo o JavaScript, CSS e imagens da interface.\nSe aparecer mensagem de carregamento, envie um print da mensagem, sem senhas ou configurações privadas.\n')
with zipfile.ZipFile(out) as archive:
 assert archive.testzip() is None
 names=set(archive.namelist())
 html=archive.read('index.html').decode()
 refs=re.findall(r'(?:src|href)="/(assets/[^"?]+)',html)
 assert len(refs)==2 and all(ref in names for ref in refs)
 assert not any(n.startswith(('.private/','api/')) for n in names)
 # Apply to the previous published package after simulating replacement of its assets folder.
 baseline=subprocess.check_output(['git','show','HEAD:dist-hostinger/smartdrop-hostinger-php.zip'])
 with tempfile.TemporaryDirectory(prefix='smartdrop-update-check-') as directory:
  with zipfile.ZipFile(io.BytesIO(baseline)) as old: old.extractall(directory)
  shutil.rmtree(Path(directory)/'assets')
  archive.extractall(directory)
  assert all((Path(directory)/ref).is_file() for ref in refs)
 print('Correção íntegra: todos os arquivos referenciados incluídos; atualização sobre versão anterior validada; sem API/configuração/banco.')

shutil.copyfile(out,Path('dist-hostinger/smartdrop-atualizacao-letras.zip'))
