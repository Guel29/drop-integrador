<?php
declare(strict_types=1);
/** Assisted imports are observations, not a live stock/purchase integration. */
function supplier_source_url(mixed $value): string {
 if(!is_string($value)||strlen($value)>2000)throw new InvalidArgumentException('Link do produto inválido.');
 $p=parse_url($value);if(!$p||($p['scheme']??'')!=='https'||!in_array(strtolower($p['host']??''),['meudropbrasil.com','www.meudropbrasil.com'],true)||isset($p['user'])||isset($p['pass'])||isset($p['port']))throw new InvalidArgumentException('Use um link HTTPS do MeuDropBrasil.');
 return 'https://'.strtolower($p['host']).($p['path']??'/');
}
function normalize_supplier_product(array $p): array {
 foreach(['sku','title'] as $key)if(!is_string($p[$key]??null)||trim($p[$key])===''||strlen($p[$key])>($key==='sku'?80:255)||preg_match('/[\x00-\x1F\x7F]/',$p[$key]))throw new InvalidArgumentException('Informe SKU e nome reais do produto.');
 $cost=$p['cost']??null;if(!is_int($cost)||$cost<1||$cost>100000000)throw new InvalidArgumentException('Confirme o custo em reais, informado em centavos.');
 $stock=$p['stock']??null;if($stock!==null&&(!is_int($stock)||$stock<0||$stock>1000000))throw new InvalidArgumentException('Estoque deve ser uma quantidade válida ou desconhecido.');
 $availability=$p['availability']??'unknown';if(!in_array($availability,['unknown','in_stock','out_of_stock'],true))throw new InvalidArgumentException('Disponibilidade inválida.');
 if(($stock===0&&$availability==='in_stock')||($stock!==null&&$stock>0&&$availability==='out_of_stock'))throw new InvalidArgumentException('Quantidade e disponibilidade estão em conflito.');
 $gtin=$p['gtin']??'';if(!is_string($gtin)||($gtin!==''&&!preg_match('/^(?:[0-9]{8}|[0-9]{12}|[0-9]{13}|[0-9]{14})$/D',$gtin)))throw new InvalidArgumentException('GTIN inválido; deixe vazio quando não informado.');
 $url=supplier_source_url($p['sourceUrl']??null);$sku=trim($p['sku']);return ['id'=>hash('sha256','meudropbrasil|'.$sku),'sku'=>$sku,'title'=>trim($p['title']),'cost'=>$cost,'stock'=>$stock,'availability'=>$availability,'gtin'=>$gtin,'sourceUrl'=>$url,'source'=>'assisted','supplierSku'=>($p['skuOrigin']??'supplier')==='internal'?null:$sku,'skuOrigin'=>($p['skuOrigin']??'supplier')==='internal'?'internal':'supplier','importedAt'=>gmdate('c')];
}
function supplier_catalog(): array { $raw=setting('supplier_catalog','[]');$items=json_decode($raw,true,32,JSON_THROW_ON_ERROR);return is_array($items)?array_values($items):[]; }
function import_supplier_catalog(array $incoming): array {
 if(!$incoming||count($incoming)>20)throw new InvalidArgumentException('Revise de 1 a 20 produtos por importação.');
 $validated=[];foreach($incoming as $p){if(!is_array($p))throw new InvalidArgumentException('Produto inválido.');$row=normalize_supplier_product($p);$validated[$row['id']]=$row;}
 return transaction(function()use($validated){sql("INSERT IGNORE INTO settings(name,value) VALUES('supplier_catalog','[]')");$raw=sql("SELECT value FROM settings WHERE name='supplier_catalog' FOR UPDATE")->fetchColumn();$current=json_decode((string)$raw,true,32,JSON_THROW_ON_ERROR);$indexed=[];foreach($current as $p)$indexed[$p['id']]=$p;$indexed=array_replace($indexed,$validated);if(count($indexed)>2000)throw new InvalidArgumentException('Limite de 2.000 produtos assistidos atingido.');set_setting('supplier_catalog',json_encode(array_values($indexed),JSON_THROW_ON_ERROR|JSON_UNESCAPED_UNICODE));audit('supplier.catalog.import',null,'reviewed');return ['imported'=>count($validated),'total'=>count($indexed),'automaticallyConnected'=>false];});
}
class CatalogSupplierAdapter implements SupplierAdapter {
 public function getProducts(): array { return supplier_catalog(); }
 private function product(string $sku): array {foreach($this->getProducts() as $p)if($p['sku']===$sku)return $p;throw new RuntimeException('SKU não importado');}
 public function getStock(string $sku): int {$p=$this->product($sku);if($p['stock']===null)throw new RuntimeException('Quantidade de estoque não informada pelo fornecedor');return $p['stock'];}
 public function getPrice(string $sku): int {return $this->product($sku)['cost'];}
 public function createOrder(array $order): array {throw new RuntimeException('Compra real não habilitada. Catálogo assistido não cria pedidos no fornecedor.');}
 public function getOrderStatus(string $orderId): string {throw new RuntimeException('Consulta de pedidos do fornecedor ainda não conectada.');}
 public function getTracking(string $orderId): array {throw new RuntimeException('Rastreamento do fornecedor ainda não conectado.');}
}
