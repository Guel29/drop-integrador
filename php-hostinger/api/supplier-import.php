<?php
declare(strict_types=1);
/** The user's Import click authorizes this internal catalog write, never a purchase. */
function supplier_import_link(mixed $input,?callable $reader=null): array {
 $url=supplier_link_url($input);$canonical=fn($u)=>rtrim(str_replace('https://www.meudropbrasil.com','https://meudropbrasil.com',supplier_source_url($u)),'/');$reader??='supplier_read_authenticated';$result=$reader($url);$products=$result['products']??[];
 if(count($products)!==1)throw new SupplierLinkException('O link não identificou um único produto. Abra a página detalhada do item.',['reason'=>'ambiguous_product','productCount'=>count($products)]);
 $p=$products[0];if(!is_int($p['cost']??null)||$p['cost']<1)throw new SupplierLinkException('O preço não foi informado. Conecte e valide o acesso ao fornecedor antes de importar. Nenhum preço antigo foi reutilizado.',['reason'=>'price_required','sessionUsed'=>$result['authenticatedSupplier']??false]);
 if($canonical($p['sourceUrl']??$url)!==$canonical($url))throw new SupplierLinkException('Os dados recebidos apontam para outro produto. Confira o link antes de importar.',['reason'=>'source_mismatch']);
 if(trim((string)($p['sku']??''))===''){
  $known=array_values(array_filter(supplier_catalog(),fn($item)=>$canonical($item['sourceUrl'])===$canonical($url)));
  if(count($known)===1){$p['sku']=$known[0]['sku'];$p['skuOrigin']=$known[0]['skuOrigin']??'supplier';}
  else{$p['sku']='SD-'.strtoupper(substr(hash('sha256',$canonical($url)),0,12));$p['skuOrigin']='internal';}
 }
 $p['sourceUrl']=$url;$normalized=normalize_supplier_product($p);$saved=import_supplier_catalog([$p]);return ['imported'=>true,'product'=>$normalized,'total'=>$saved['total'],'authenticatedSupplier'=>$result['authenticatedSupplier']??false,'purchasingEnabled'=>false,'publishingEnabled'=>false];
}
