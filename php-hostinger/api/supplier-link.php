<?php
declare(strict_types=1);
class SupplierLinkException extends RuntimeException {}
function supplier_link_url(mixed $url): string {
 if(!is_string($url)||strlen($url)>2000||preg_match('/[\x00-\x20\x7f]/',$url))throw new InvalidArgumentException('Informe o link HTTPS de um produto do MeuDropBrasil.');
 return supplier_source_url($url);
}
function supplier_link_redirect(string $base,string $location): string {
 $location=trim($location);if($location===''||preg_match('/[\x00-\x20\x7f]/',$location))throw new SupplierLinkException('O fornecedor respondeu com um redirecionamento inválido.');
 if(str_starts_with($location,'https://')||str_starts_with($location,'http://'))return supplier_link_url($location);
 $p=parse_url($base);$origin='https://'.$p['host'];if(str_starts_with($location,'//'))return supplier_link_url('https:'.$location);
 if(str_starts_with($location,'/'))return supplier_link_url($origin.$location);
 if(str_starts_with($location,'?')||str_starts_with($location,'#'))return supplier_link_url($base);
 $path=substr($p['path']??'/',0,(int)strrpos($p['path']??'/','/')+1).$location;$parts=[];foreach(explode('/',$path) as $part){if($part==='..')array_pop($parts);elseif($part!=='.'&&$part!=='')$parts[]=$part;}return supplier_link_url($origin.'/'.implode('/',$parts));
}
function supplier_public_ip(string $ip): bool {return filter_var($ip,FILTER_VALIDATE_IP,FILTER_FLAG_NO_PRIV_RANGE|FILTER_FLAG_NO_RES_RANGE)!==false;}
function supplier_link_transport(string $url,int $timeout): array {
 if(!function_exists('curl_init'))throw new SupplierLinkException('Ative a extensão PHP cURL na hospedagem.');
 $url=supplier_link_url($url);$host=parse_url($url,PHP_URL_HOST);$records=function_exists('dns_get_record')?@dns_get_record($host,DNS_A|DNS_AAAA):[];$ips=[];
 foreach($records?:[] as $r){$ip=$r['ip']??$r['ipv6']??null;if($ip!==null){if(!supplier_public_ip($ip))throw new SupplierLinkException('O endereço do fornecedor não resolveu para um destino público permitido.');$ips[]=$ip;}}
 if(!$ips&&function_exists('gethostbynamel'))foreach(@gethostbynamel($host)?:[] as $ip){if(!supplier_public_ip($ip))throw new SupplierLinkException('O endereço do fornecedor não é um destino público permitido.');$ips[]=$ip;}
 if(!$ips)throw new SupplierLinkException('A hospedagem não conseguiu resolver o endereço do fornecedor.');
 usort($ips,fn($a,$b)=>str_contains($a,':')<=>str_contains($b,':'));$ip=$ips[0];$h=curl_init($url);$html='';$location='';$tooLarge=false;
 curl_setopt_array($h,[CURLOPT_HTTPGET=>true,CURLOPT_RETURNTRANSFER=>false,CURLOPT_FOLLOWLOCATION=>false,CURLOPT_CONNECTTIMEOUT=>min(5,$timeout),CURLOPT_TIMEOUT=>$timeout,CURLOPT_SSL_VERIFYPEER=>true,CURLOPT_SSL_VERIFYHOST=>2,CURLOPT_PROTOCOLS=>CURLPROTO_HTTPS,CURLOPT_RESOLVE=>[$host.':443:'.(str_contains($ip,':')?'['.$ip.']':$ip)],CURLOPT_USERAGENT=>'SmartDropIntegrador/0.3 (public product preview)',CURLOPT_HTTPHEADER=>['Accept: text/html,application/xhtml+xml','Accept-Language: pt-BR,pt;q=0.9'],CURLOPT_HEADERFUNCTION=>function($ch,$line)use(&$location){if(strncasecmp($line,'Location:',9)===0)$location=trim(substr($line,9));return strlen($line);},CURLOPT_WRITEFUNCTION=>function($ch,$chunk)use(&$html,&$tooLarge){if(strlen($html)+strlen($chunk)>2097152){$tooLarge=true;return 0;}$html.=$chunk;return strlen($chunk);}]);
 $ok=curl_exec($h);$status=(int)curl_getinfo($h,CURLINFO_RESPONSE_CODE);$type=(string)curl_getinfo($h,CURLINFO_CONTENT_TYPE);curl_close($h);
 if($tooLarge)throw new SupplierLinkException('A página do fornecedor excede o tamanho permitido para leitura.');
 if($ok===false)throw new SupplierLinkException('Não foi possível acessar o fornecedor pela hospedagem. Confira a liberação de conexões HTTPS de saída.');
 return ['status'=>$status,'contentType'=>$type,'location'=>$location,'body'=>$html];
}
function supplier_html_products(string $html,string $url): array {
 if(strlen($html)>2097152)throw new SupplierLinkException('Página muito grande para leitura.');
 if(!class_exists('DOMDocument'))throw new SupplierLinkException('Ative as extensões DOM e libxml do PHP na hospedagem.');
 $previous=libxml_use_internal_errors(true);$doc=new DOMDocument();$loaded=$doc->loadHTML('<?xml encoding="UTF-8">'.$html,LIBXML_NONET|LIBXML_NOERROR|LIBXML_NOWARNING);libxml_clear_errors();libxml_use_internal_errors($previous);if(!$loaded)throw new SupplierLinkException('O fornecedor não respondeu com uma página HTML válida.');$xp=new DOMXPath($doc);
 $clean=fn($v)=>is_string($v)?trim(preg_replace('/\s+/u',' ',$v)??''):'';
 $kind=fn($v)=>is_string($v)?preg_replace('~^.*[/#]~','',$v):'';
 $schemaPrice=function($v){if(!is_numeric($v)||!preg_match('/^(?:0|[1-9][0-9]*)(?:\.[0-9]{1,2})?$/D',(string)$v))return null;$c=(int)round((float)$v*100);return $c>0&&$c<=100000000?$c:null;};
 $localPrice=function(string $v){if(preg_match('/\b\d+\s*x\b|parcel|vezes|a partir/iu',$v))return null;preg_match_all('/R\$\s*([0-9]{1,3}(?:\.[0-9]{3})*,[0-9]{2}|[0-9]+,[0-9]{2})(?![0-9])/u',$v,$m);$prices=[];foreach($m[1] as $value){$c=(int)round((float)str_replace(',','.',str_replace('.','',$value))*100);if($c>0&&$c<=100000000)$prices[$c]=$c;}return count($prices)===1?array_values($prices)[0]:null;};
 $source=function($value)use($url){try{return supplier_link_url($value);}catch(Throwable){return $url;}};
 $product=function($p)use($url,$clean){return ['sku'=>$clean($p['sku']??''),'title'=>$clean($p['title']??''),'cost'=>$p['cost']??null,'stock'=>null,'availability'=>$p['availability']??'unknown','gtin'=>$clean($p['gtin']??''),'sourceUrl'=>$p['sourceUrl']??$url];};
 $roots=[];$graph=[];$visited=0;$index=function($node,$depth=0)use(&$index,&$graph,&$visited){if(!is_array($node)||$depth>12||++$visited>5000)return;if(is_string($node['@id']??null))$graph[$node['@id']]=$node;foreach($node as $child)if(is_array($child))$index($child,$depth+1);};
 foreach($xp->query('//script[@type="application/ld+json"]') as $script){if(strlen($script->textContent)>1000000)continue;try{$data=json_decode($script->textContent,true,32,JSON_THROW_ON_ERROR);if(is_array($data)){$roots[]=$data;$index($data);}}catch(Throwable){}}
 $products=[];$seen=[];$visited=0;$ambiguousPrice=false;
 $visit=function($node,$depth=0)use(&$visit,&$products,&$seen,&$visited,&$ambiguousPrice,$kind,$clean,$schemaPrice,$source,$product,$graph){if(!is_array($node)||$depth>12||++$visited>5000||count($products)>=20)return;$types=$node['@type']??[];if(!is_array($types))$types=[$types];$isProduct=false;foreach($types as $t)if($kind($t)==='Product')$isProduct=true;
 if($isProduct){$raw=$node['offers']??[];$offers=is_array($raw)?(array_is_list($raw)?$raw:[$raw]):[];$offer=count($offers)===1&&is_array($offers[0])?$offers[0]:null;if($offer&&isset($offer['@id'])&&!isset($offer['price']))$offer=$graph[$offer['@id']]??$offer;$aggregate=$kind($offer['@type']??'')==='AggregateOffer';if(count($offers)>1||$aggregate)$ambiguousPrice=true;$cost=$offer&&!$aggregate&&($offer['priceCurrency']??'')==='BRL'?$schemaPrice($offer['price']??null):null;$av=$kind($offer['availability']??'');$p=$product(['sku'=>$node['sku']??'','title'=>$node['name']??'','cost'=>$cost,'availability'=>$av==='InStock'?'in_stock':($av==='OutOfStock'?'out_of_stock':'unknown'),'gtin'=>$node['gtin13']??$node['gtin14']??$node['gtin12']??$node['gtin8']??$node['gtin']??'','sourceUrl'=>$source($node['url']??'')]);$key=$p['sku'].'|'.$p['title'].'|'.$p['sourceUrl'];if($p['title']!==''&&!isset($seen[$key])){$products[]=$p;$seen[$key]=true;}}
 foreach($node as $key=>$child)if($key!=='offers'&&is_array($child))$visit($child,$depth+1);};foreach($roots as $node)$visit($node);
 $method=$products?'json-ld':'none';
 $headings=$xp->query('//h1[not(ancestor::header) and not(ancestor::nav) and not(ancestor::footer)]');$heading=$headings->length===1?$headings->item(0):null;
 $ownProp=function(DOMElement $scope,string $name)use($xp,$clean){foreach($xp->query('.//*[@itemprop]',$scope) as $el){if(!in_array($name,preg_split('/\s+/',$el->getAttribute('itemprop')),true))continue;$parent=$el->parentNode;while($parent instanceof DOMElement&&!$parent->hasAttribute('itemscope'))$parent=$parent->parentNode;if($parent===$scope)return $clean($el->getAttribute('content')?:$el->getAttribute('href')?:$el->textContent);}return '';};
 if(!$products)foreach($xp->query('//*[@itemscope and @itemtype]') as $scope){$types=preg_split('/\s+/',$scope->getAttribute('itemtype'));if(!in_array('Product',array_map($kind,$types),true))continue;$offers=[];foreach($xp->query('.//*[@itemscope and @itemtype]',$scope) as $o)if(in_array('Offer',array_map($kind,preg_split('/\s+/',$o->getAttribute('itemtype'))),true))$offers[]=$o;$offer=count($offers)===1?$offers[0]:null;$cost=$offer&&$ownProp($offer,'priceCurrency')==='BRL'?$schemaPrice($ownProp($offer,'price')):null;$p=$product(['sku'=>$ownProp($scope,'sku'),'title'=>$ownProp($scope,'name'),'cost'=>$cost,'gtin'=>$ownProp($scope,'gtin13')?:$ownProp($scope,'gtin'),'sourceUrl'=>$source($ownProp($scope,'url'))]);if($p['title']){$products[]=$p;$method='microdata';}if(count($products)>=20)break;}
 $meta=function(string $name)use($xp,$clean){foreach($xp->query('//meta[@property or @name]') as $m)if($m->getAttribute('property')===$name||$m->getAttribute('name')===$name)return $clean($m->getAttribute('content'));return '';};
 if(!$products&&strtolower($meta('og:type'))==='product'&&$meta('og:title')){$products[]=$product(['title'=>$meta('og:title'),'cost'=>$meta('product:price:currency')==='BRL'?$schemaPrice($meta('product:price:amount')):null,'sourceUrl'=>$source($meta('og:url'))]);$method='open-graph';}
 $textNodes=function(DOMNode $scope)use($xp,$clean){$texts=[];foreach($xp->query('.//text()[not(ancestor::script) and not(ancestor::style) and not(ancestor::header) and not(ancestor::footer) and not(ancestor::nav) and not(ancestor::form) and not(ancestor::input) and not(ancestor::textarea) and not(ancestor::select) and not(ancestor::del) and not(ancestor::s)]',$scope) as $node){$s=$clean($node->nodeValue);if($s==='R$'){$parent=$node->parentNode;for($i=0;$parent&&$i<2;$i++,$parent=$parent->parentNode){$candidate=$clean($parent->textContent);if(strlen($candidate)<300&&preg_match('/R\$\s*[0-9]/u',$candidate)){$s=$candidate;break;}}}if($s!==''&&strlen($s)<500)$texts[]=$s;if(count($texts)>3000)break;}return $texts;};
 $visibleCost=null;if($heading){$region=$heading->parentNode;for($level=0;$region&&$level<4;$level++,$region=$region->parentNode){$values=[];foreach($textNodes($region) as $s){$c=$localPrice($s);if($c!==null)$values[$c]=$c;}if(count($values)===1){$visibleCost=array_values($values)[0];break;}if($region===$doc->documentElement)break;}}
 if(!$products&&$heading&&$visibleCost!==null){$products[]=$product(['title'=>$clean($heading->textContent),'cost'=>$visibleCost]);$method='page-text';}
 if(count($products)===1){if($products[0]['cost']===null&&!$ambiguousPrice)$products[0]['cost']=$visibleCost;foreach($xp->query('//li|//p|//dd|//span') as $el){if($xp->query('ancestor::form|ancestor::header|ancestor::footer|ancestor::nav|ancestor::script|ancestor::style',$el)->length)continue;$s=$clean($el->textContent);if(strlen($s)>300)continue;if($products[0]['sku']===''&&preg_match('/^(?:SKU|C[oó]digo(?:\s+do\s+produto)?)\s*[:#]\s*([\p{L}\p{N}._\/-]{1,80})$/u',$s,$m))$products[0]['sku']=$m[1];if($products[0]['gtin']===''&&preg_match('/(?:EAN(?:\s+Principal)?|GTIN|C[oó]digo\s+de\s+Barras)\s*[:#]\s*([0-9]{8,14})\b/iu',$s,$m)&&in_array(strlen($m[1]),[8,12,13,14],true))$products[0]['gtin']=$m[1];}}
 if(!$products&&$xp->query('//input[translate(@type,"PASSWORD","password")="password"]')->length)throw new SupplierLinkException('O fornecedor exige login. A leitura direta do site não tem acesso à sessão do seu navegador.');
 if(!$products)throw new SupplierLinkException('A página não informou dados públicos suficientes. Ela pode exigir login ou JavaScript; não é possível confirmar o produto somente pelo link público.');
 if(count($products)>1&&$heading){$h=$clean($heading->textContent);$matches=array_values(array_filter($products,fn($p)=>strcasecmp($p['title'],$h)===0));if(count($matches)===1)$products=$matches;}
 return ['products'=>$products,'method'=>$method,'sourceUrl'=>$url,'warnings'=>['Confira os dados antes de salvar. A leitura pública não confirma estoque atual nem conecta sua conta do fornecedor.']];
}
function supplier_read_link(mixed $input,?callable $transport=null): array {
 $url=supplier_link_url($input);$transport??='supplier_link_transport';$deadline=microtime(true)+20;$visited=[];
 for($hop=0;$hop<4;$hop++){if(isset($visited[$url]))throw new SupplierLinkException('O fornecedor redirecionou a página repetidamente.');$visited[$url]=true;$remaining=(int)floor($deadline-microtime(true));if($remaining<1)throw new SupplierLinkException('A leitura do fornecedor excedeu o tempo permitido.');$r=$transport($url,min(12,$remaining));$status=(int)($r['status']??0);
 if(in_array($status,[301,302,303,307,308],true)){$url=supplier_link_redirect($url,(string)($r['location']??''));continue;}
 if(in_array($status,[401,403],true))throw new SupplierLinkException('O fornecedor exige login ou bloqueou a leitura pelo servidor. Não é possível usar a sessão do seu navegador automaticamente.');
 if($status!==200)throw new SupplierLinkException('O fornecedor não disponibilizou essa página para leitura. Confira se o link é de um produto.');
 if(!preg_match('~^(?:text/html|application/xhtml\+xml)(?:;|$)~i',(string)($r['contentType']??'')))throw new SupplierLinkException('O link não respondeu com uma página HTML de produto.');
 return supplier_html_products((string)($r['body']??''),$url);
 }throw new SupplierLinkException('A página excedeu o limite de redirecionamentos.');
}
