<?php
declare(strict_types=1);
require dirname(__DIR__).'/api/lib.php';require dirname(__DIR__).'/api/mercado.php';
function check(bool $condition,string $label): void {if(!$condition)throw new RuntimeException('FAILED: '.$label);echo 'PASS '.$label.PHP_EOL;}
$supplier=new MockSupplierAdapter;
$a=['idempotencyKey'=>'unit-test-order','items'=>[['sku'=>'MDB-001','quantity'=>1]]];
check($supplier->createOrder($a)===$supplier->createOrder($a),'mock supplier idempotency');
foreach([['sku'=>'MDB-004','quantity'=>1],['sku'=>'MDB-001','quantity'=>0]] as $bad){$rejected=false;try{$supplier->createOrder(['idempotencyKey'=>'unit-test','items'=>[$bad]]);}catch(RuntimeException){$rejected=true;}check($rejected,'unavailable or invalid quantity rejected');}
$closed=false;try{(new MeuDropBrasilAdapter)->getProducts();}catch(RuntimeException){$closed=true;}check($closed,'undocumented supplier fails closed');
check(resource_valid('orders_v2','/orders/123456'),'official resource accepted');
foreach(['https://evil.example/orders/1','/orders/1?query=1','/orders/../users/me','/items/MLB1'] as $path)check(!resource_valid('orders_v2',$path),'untrusted resource rejected');
$hash=password_hash('654321',PASSWORD_DEFAULT);check(password_verify('654321',$hash)&&!password_verify('123456',$hash),'six digit password hashing');
