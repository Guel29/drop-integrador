<?php
declare(strict_types=1);
/** Normal HTML login only: actual form action/fields, real CSRF fields, no password storage. */
function supplier_session_url(mixed $value): string { $url=supplier_link_url($value);$p=parse_url($value);if(isset($p['query']))$url.='?'.$p['query'];return $url; }
function supplier_session_redirect(string $base,string $value): string { if(str_starts_with($value,'https://')||str_starts_with($value,'http://'))return supplier_session_url($value);if(str_starts_with($value,'//'))return supplier_session_url('https:'.$value);$p=parse_url($base);$origin='https://'.$p['host'];if(str_starts_with($value,'/'))return supplier_session_url($origin.$value);if(str_starts_with($value,'?'))return supplier_session_url($origin.($p['path']??'/').$value);$resolved=supplier_link_redirect($base,$value);$query=parse_url($value,PHP_URL_QUERY);return supplier_session_url($resolved.($query!==null?'?'.$query:'')); }
class SupplierCookieState {public function __construct(public array $lines=[]){if(count($lines)>100)throw new SupplierLinkException('Sessão inválida.');foreach($lines as $line)if(!is_string($line)||strlen($line)>8192)throw new SupplierLinkException('Sessão inválida.');}}
function supplier_auth_fetch(string $url,SupplierCookieState $jar,?array $post=null,?callable $transport=null,?float $deadline=null): array {
 $transport??='supplier_link_transport';$deadline??=microtime(true)+20;$url=supplier_session_url($url);$seen=[];
 for($hop=0;$hop<4;$hop++){$visitKey=($post===null?'GET ':'POST ').$url;if(isset($seen[$visitKey]))throw new SupplierLinkException('O fornecedor repetiu um redirecionamento no login.');$seen[$visitKey]=true;$remaining=(int)floor($deadline-microtime(true));if($remaining<1)throw new SupplierLinkException('A conexão com o fornecedor excedeu o tempo permitido.');$r=$transport($url,min(8,$remaining),$post,$jar);$status=(int)($r['status']??0);
 if(in_array($status,[307,308],true)&&$post!==null)throw new SupplierLinkException('O formulário usa um redirecionamento de login não suportado. Nenhuma credencial foi reenviada.');
 if(in_array($status,[301,302,303,307,308],true)){$url=supplier_session_redirect($url,(string)($r['location']??''));$post=null;continue;}
 if(in_array($status,[401,403,429],true))throw new SupplierLinkException('O fornecedor recusou ou limitou a conexão. A autenticação não foi confirmada.');
 if($status!==200||!preg_match('~^(?:text/html|application/xhtml\+xml)(?:;|$)~i',(string)($r['contentType']??'')))throw new SupplierLinkException('O formulário de login não respondeu com HTML válido.');
 if(strlen((string)($r['body']??''))>2097152)throw new SupplierLinkException('Página de autenticação muito grande.');return ['url'=>$url,'body'=>(string)$r['body']];
 }throw new SupplierLinkException('O login excedeu o limite de redirecionamentos.');
}
function supplier_login_form(string $html,string $url): array {
 if(!class_exists('DOMDocument'))throw new SupplierLinkException('Ative DOM e libxml no PHP.');$prior=libxml_use_internal_errors(true);$doc=new DOMDocument();$doc->loadHTML('<?xml encoding="UTF-8">'.$html,LIBXML_NONET|LIBXML_NOERROR|LIBXML_NOWARNING);libxml_clear_errors();libxml_use_internal_errors($prior);$xp=new DOMXPath($doc);$matches=[];
 foreach($xp->query('//form') as $form){if(strtolower($form->getAttribute('method'))!=='post')continue;$enctype=strtolower($form->getAttribute('enctype'));if($enctype!==''&&$enctype!=='application/x-www-form-urlencoded')continue;$passwords=$xp->query('.//input[translate(@type,"PASSWORD","password")="password"]',$form);if($passwords->length!==1)continue;
 $submit=[];foreach($xp->query('.//button|.//input[translate(@type,"SUBMIT","submit")="submit"]',$form) as $b){$label=trim($b->textContent.' '.$b->getAttribute('value').' '.$b->getAttribute('name'));if(preg_match('/entrar|login|log\s*in|acessar|iniciar\s+sess[aã]o/iu',$label)&&!preg_match('/registr|cadastr|criar\s+conta/iu',$label))$submit[]=$b;}if(count($submit)!==1)continue;
 $username=[];$hidden=[];$special=false;foreach($xp->query('.//input',$form) as $input){$name=$input->getAttribute('name');$type=strtolower($input->getAttribute('type')?:'text');$autocomplete=strtolower($input->getAttribute('autocomplete'));
 if(preg_match('/captcha|otp|two.?factor|verification.?code|sms.?code/i',$name)||$autocomplete==='one-time-code')$special=true;
 if($name===''||strlen($name)>100)continue;if($type==='hidden'){$value=$input->getAttribute('value');if(strlen($value)>8192)throw new SupplierLinkException('Campo de segurança do formulário não suportado.');$hidden[$name]=$value;}
 if(in_array($type,['email','text'],true)&&($autocomplete==='username'||$type==='email'||preg_match('/user|email|login/i',$name)))$username[]=$input;
 }
 if($xp->query('.//iframe[contains(@src,"recaptcha") or contains(@src,"hcaptcha")]|.//*[contains(@class,"g-recaptcha") or contains(@class,"h-captcha") or contains(@class,"cf-turnstile")]',$form)->length)$special=true;
 if($special)throw new SupplierLinkException('O login exige uma verificação adicional não suportada. Não tentaremos contorná-la.');
 if(count($username)!==1||count($hidden)>30)continue;$passwordName=$passwords->item(0)->getAttribute('name');if($passwordName==='')continue;
 $action=trim($form->getAttribute('action'));$target=$action===''?$url:supplier_session_redirect($url,$action);$submitNode=$submit[0];$submitName=$submitNode->getAttribute('name');if($submitName!=='')$hidden[$submitName]=$submitNode->getAttribute('value')?:trim($submitNode->textContent);
 $matches[]=['action'=>$target,'usernameField'=>$username[0]->getAttribute('name'),'passwordField'=>$passwordName,'fields'=>$hidden];
 }
 if(count($matches)!==1)throw new SupplierLinkException('Não identifiquei um único formulário normal de login. O site pode exigir JavaScript ou outro método; nenhuma senha foi enviada.',['reason'=>'login_form_not_recognized','formCount'=>$xp->query('//form')->length,'passwordFieldCount'=>$xp->query('//input[translate(@type,"PASSWORD","password")="password"]')->length,'candidateCount'=>count($matches)]);return $matches[0];
}
function supplier_prepare_login(mixed $loginUrl,mixed $productUrl,?callable $transport=null): array {
 $login=supplier_session_url($loginUrl);$product=supplier_link_url($productUrl);$jar=new SupplierCookieState();try{$page=supplier_auth_fetch($login,$jar,null,$transport);$form=supplier_login_form($page['body'],$page['url']);$token=bin2hex(random_bytes(32));$_SESSION['supplier_login_pending']=encrypt_value(['form'=>$form,'cookies'=>$jar->lines,'verificationUrl'=>$product,'expires'=>time()+600,'tokenHash'=>hash('sha256',$token)]);return ['prepared'=>true,'pendingToken'=>$token,'loginUrl'=>supplier_source_url($page['url']),'submitUrl'=>supplier_source_url($form['action']),'expiresIn'=>600,'passwordStored'=>false];}finally{$jar->lines=[];}
}
function supplier_login_evidence(string $html,array $expected): bool {
 $old=libxml_use_internal_errors(true);$doc=new DOMDocument();$doc->loadHTML('<?xml encoding="UTF-8">'.$html,LIBXML_NONET|LIBXML_NOERROR|LIBXML_NOWARNING);libxml_clear_errors();libxml_use_internal_errors($old);$xp=new DOMXPath($doc);$logout=false;
 foreach($xp->query('//a|//button') as $el){$label=trim($el->textContent);$href=$el->getAttribute('href');if(preg_match('/^(?:sair|desconectar|log\s*out|logout)$/iu',$label)||preg_match('~(?:[/?&=_-])(?:customer-logout|logout|log-out)(?:[/?&=_-]|$)~i',$href)){$logout=true;break;}}
 if(!$logout)return false;
 foreach($xp->query('//form') as $form){$hasUser=false;$hasPass=false;foreach($xp->query('.//input[@name]',$form) as $input){if($input->getAttribute('name')===$expected['usernameField'])$hasUser=true;if($input->getAttribute('name')===$expected['passwordField']&&strtolower($input->getAttribute('type'))==='password')$hasPass=true;}if($hasUser&&$hasPass)return false;}
 return true;
}
function supplier_finish_login(array $data,?callable $transport=null): array {
 $pending=$_SESSION['supplier_login_pending']??null;unset($_SESSION['supplier_login_pending']);if(!$pending)throw new SupplierLinkException('Prepare o formulário novamente antes de entrar.');$p=decrypt_value($pending);
 if($p['expires']<time()||!hash_equals($p['tokenHash'],hash('sha256',(string)($data['pendingToken']??''))))throw new SupplierLinkException('A preparação expirou. Detecte o formulário novamente.');
 $username=$data['username']??null;$password=$data['password']??null;if(($data['confirmed']??false)!==true||!is_string($username)||!is_string($password)||trim($username)===''||$password===''||strlen($username)>255||strlen($password)>256)throw new InvalidArgumentException('Informe o acesso do fornecedor e confirme a autorização.');
 $bucket=hash_hmac('sha256','supplier-login:'.strtolower(trim($username)).':'.intdiv(time(),900),config()['encryption_key']);sql('DELETE FROM login_attempts WHERE expires_at<?',[time()]);sql('INSERT INTO login_attempts(bucket,expires_at) VALUES(?,?) ON DUPLICATE KEY UPDATE attempts=attempts+1',[$bucket,time()+1200]);if((int)sql('SELECT attempts FROM login_attempts WHERE bucket=?',[$bucket])->fetchColumn()>3)throw new SupplierLinkException('Limite de tentativas atingido. Aguarde 15 minutos antes de tentar novamente.');
 $jar=new SupplierCookieState($p['cookies']);$transport??='supplier_link_transport';$deadline=microtime(true)+22;
 try{$fields=$p['form']['fields'];$fields[$p['form']['usernameField']]=$username;$fields[$p['form']['passwordField']]=$password;$loginResponse=supplier_auth_fetch($p['form']['action'],$jar,$fields,$transport,$deadline);unset($fields,$password,$data['password']);
 if(!supplier_login_evidence($loginResponse['body'],$p['form']))throw new SupplierLinkException('O fornecedor não confirmou um login concluído no HTML. Confira o acesso ou uma eventual etapa adicional; nenhuma conexão foi marcada como validada.');
 $readTransport=function($url,$timeout)use($transport,$jar,$deadline){$remaining=(int)floor($deadline-microtime(true));if($remaining<1)throw new SupplierLinkException('O teste da sessão excedeu o tempo permitido.');return $transport($url,min(8,$timeout,$remaining),null,$jar);};
 $result=supplier_read_link($p['verificationUrl'],$readTransport);if(($result['partial']??false)||!array_filter($result['products'],fn($item)=>$item['cost']!==null))throw new SupplierLinkException('A sessão não foi validada: o preço continuou ausente. Confira o acesso ou uma eventual etapa adicional do fornecedor.');
 $cookies=$jar->lines;if(!$cookies)throw new SupplierLinkException('O fornecedor não criou uma sessão reutilizável. Nenhuma conexão foi marcada como validada.');
 set_setting('supplier_session',encrypt_value(['cookies'=>$cookies,'verifiedAt'=>gmdate('c'),'expires'=>time()+2592000,'verificationUrl'=>$p['verificationUrl']]));audit('supplier.session.verified',null,'price-read');return ['connected'=>true,'priceAccessVerified'=>true,'passwordStored'=>false,'verification'=>$result];
 }catch(SupplierLinkException $e){throw $e;}catch(Throwable){throw new SupplierLinkException('Não foi possível validar o login do fornecedor. Nenhuma conexão foi confirmada.');}finally{$jar->lines=[];}
}
function supplier_session_status(): array { $value=setting('supplier_session');if(!$value)return ['connected'=>false,'passwordStored'=>false];try{$s=decrypt_value($value);return ['connected'=>$s['expires']>time(),'verifiedAt'=>$s['verifiedAt'],'expiresAt'=>gmdate('c',$s['expires']),'passwordStored'=>false];}catch(Throwable){return ['connected'=>false,'passwordStored'=>false,'requiresReconnect'=>true];} }
function supplier_read_authenticated(mixed $url,?callable $transport=null): array {
 $transport??='supplier_link_transport';
 $saved=setting('supplier_session');if(!$saved){$r=supplier_read_link($url,$transport);$r['authenticatedSupplier']=false;return $r;}$s=decrypt_value($saved);if($s['expires']<time()){set_setting('supplier_session','');throw new SupplierLinkException('A sessão local do fornecedor expirou. Conecte novamente.');}$jar=new SupplierCookieState($s['cookies']);
 try{$r=supplier_read_link($url,fn($target,$timeout)=>$transport($target,$timeout,null,$jar));$r['authenticatedSupplier']=!($r['partial']??false);if($r['partial']??false)$r['warnings'][]='O preço não foi informado nesta sessão; pode ser necessário conectar novamente.';$s['cookies']=$jar->lines;if(!($r['partial']??false)){$s['expires']=time()+2592000;$s['lastPriceReadAt']=gmdate('c');}set_setting('supplier_session',encrypt_value($s));return $r;}finally{$jar->lines=[];}
}
