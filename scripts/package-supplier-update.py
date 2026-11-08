from pathlib import Path
import zipfile,os,hashlib
root=Path('php-hostinger');out=Path('dist-hostinger/smartdrop-atualizacao-fornecedor.zip')
files=[root/'index.html',root/'.htaccess',root/'cron.php']
for folder in ['api','assets','products','downloads']:
 for directory,dirs,names in os.walk(root/folder):
  dirs[:]=[d for d in dirs if d!='.private']
  for name in names:
   if name=='setup-key.php' or name.startswith('.env'):continue
   files.append(Path(directory)/name)
with zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED) as z:
 for p in sorted(files):
  item=zipfile.ZipInfo(str(p.relative_to(root)));item.external_attr=0o100644<<16;item.compress_type=zipfile.ZIP_DEFLATED;z.writestr(item,p.read_bytes())
 z.writestr('COMO-ATUALIZAR-FORNECEDOR.txt','ATUALIZAÇÃO — EXTENSÃO CHROME E CATÁLOGO ASSISTIDO\nFaça backup da pasta e do banco. Extraia TODO o conteúdo deste ZIP em public_html/drop, substituindo os arquivos.\nNão apague a pasta, não reinstale e preserve .private/ e seu banco. Não há migração de banco nesta atualização.\nLimpe o cache da Hostinger/CDN e abra o site em janela anônima.\nEntre normalmente > Integrações > Catálogo real e extensão Chrome. O endereço direto é https://drop.instara.com.br/fornecedor.\nUse o botão Baixar extensão. Extraia o ZIP baixado no computador e siga as instruções de instalação manual no Chrome mostradas na tela.\nSempre que acessar de outro computador ou perfil, o download estará disponível nessa mesma tela. Não instala automaticamente nem funciona como extensão no Chrome de celular.\nFaça login no próprio MeuDropBrasil, abra um produto e use a extensão para ler e enviar os dados para revisão. Nenhuma senha é pedida pela extensão.\nConfira SKU e custo antes de confirmar a importação; campos ausentes precisam de preenchimento manual.\nEsta é uma leitura assistida, sem conexão automática contínua, publicação de anúncios ou compras no fornecedor.\nTestada com páginas sintéticas; compatibilidade com a página real do fornecedor ainda requer validação. Se não houver metadados Product/Offer suficientes, use o cadastro manual e envie um print dos dados do produto, sem senhas.\n')
with zipfile.ZipFile(out) as z:
 assert z.testzip() is None
 assert not any('.private/' in n or n.endswith('/setup-key.php') for n in z.namelist())
 assert {'api/index.php','api/supplier-catalog.php','downloads/smartdrop-meudropbrasil-chrome.zip'}<=set(z.namelist())
 print('Atualização do fornecedor íntegra, com extensão baixável e sem configurações privadas.')
print(hashlib.sha256(out.read_bytes()).hexdigest())
