<?php
declare(strict_types=1);
function install_app(array $b): never {
 if(is_file(config_path()))json_response(['error'=>'Instalação já concluída'],409);
 $keyFile=__DIR__.'/setup-key.php';$key=is_file($keyFile)?require $keyFile:'';
 if(!is_string($key)||strlen($key)<16||str_contains($key,'SUBSTITUA')||!hash_equals($key,(string)($b['setupKey']??'')))json_response(['error'=>'Crie api/setup-key.php com seu código privado de instalação e informe o mesmo código aqui.'],403);
 if(!filter_var($b['email']??'',FILTER_VALIDATE_EMAIL)||!is_string($b['password']??null)||strlen($b['password'])<6||strlen($b['password'])>256)json_response(['error'=>'Informe e-mail válido e senha de pelo menos 6 caracteres.'],400);
 foreach(['host','name','user','password'] as $k)if(!is_string($b['db_'.$k]??null)||strlen($b['db_'.$k])>255)json_response(['error'=>'Configuração MySQL inválida'],400);
 if(!preg_match('/^[a-zA-Z0-9.:-]+$/D',$b['db_host'])||!preg_match('/^[a-zA-Z0-9_-]+$/D',$b['db_name']))json_response(['error'=>'Host ou nome do banco inválido'],400);
 $app=rtrim((string)($b['app_url']??''),'/');$u=parse_url($app);$origin=$_SERVER['HTTP_ORIGIN']??'';if($app!==$origin||!isset($u['host'])||!in_array($u['scheme']??'',['https','http'],true)||isset($u['path'])||isset($u['query'])||isset($u['user'])||isset($u['fragment']))json_response(['error'=>'URL deve ser a origem exata deste site, sem caminho.'],400);
 if(($u['scheme']??'')!=='https'&&!in_array($u['host'],['localhost','127.0.0.1'],true))json_response(['error'=>'Use HTTPS na hospedagem.'],400);
 $dir=dirname(config_path());if(!is_dir($dir)&&!mkdir($dir,0700,true))throw new RuntimeException('Não foi possível criar armazenamento privado');file_put_contents($dir.'/.htaccess',"Require all denied\n");$lock=fopen($dir.'/install.lock','c');if(!$lock||!flock($lock,LOCK_EX))throw new RuntimeException('Instalação ocupada');
 try{if(is_file(config_path()))json_response(['error'=>'Instalação já concluída'],409);
 $c=['app_url'=>$app,'db_host'=>$b['db_host'],'db_name'=>$b['db_name'],'db_user'=>$b['db_user'],'db_password'=>$b['db_password'],'admin_email'=>$b['email'],'admin_password_hash'=>password_hash($b['password'],PASSWORD_DEFAULT),'encryption_key'=>base64_encode(random_bytes(32))];
 $pdo=new PDO('mysql:host='.$c['db_host'].';dbname='.$c['db_name'].';charset=utf8mb4',$c['db_user'],$c['db_password'],[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_EMULATE_PREPARES=>false]);
 if($pdo->query('SHOW TABLES')->fetchColumn()!==false)throw new RuntimeException('Use um banco MySQL vazio e exclusivo para este integrador.');
 foreach(explode(';',file_get_contents(__DIR__.'/schema.sql')) as $statement)if(trim($statement)!=='')$pdo->exec($statement);
 $data='<?php return '.var_export($c,true).';';$f=fopen(config_path(),'x');if(!$f)throw new RuntimeException('Configuração já existe');chmod(config_path(),0600);fwrite($f,$data);fclose($f);
 seed();audit('installation.completed');$_SESSION=[];session_regenerate_id(true);$_SESSION['csrf']=bin2hex(random_bytes(32));json_response(['ok'=>true]);
 }finally{if(is_resource($lock)){flock($lock,LOCK_UN);fclose($lock);}}
}
