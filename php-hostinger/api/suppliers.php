<?php
declare(strict_types=1);
interface SupplierAdapter {
 public function getProducts(): array;
 public function getStock(string $sku): int;
 public function getPrice(string $sku): int;
 public function createOrder(array $order): array;
 public function getOrderStatus(string $orderId): string;
 public function getTracking(string $orderId): array;
}
class MockSupplierAdapter implements SupplierAdapter {
 public function getProducts(): array { return [
 ['sku'=>'MDB-001','title'=>'Fone Bluetooth Headphone Pro','image'=>'/products/headphones.svg','cost'=>7590,'stock'=>48,'available'=>true],
 ['sku'=>'MDB-002','title'=>'Smartwatch Série 9 · Preto','image'=>'/products/watch.svg','cost'=>8990,'stock'=>32,'available'=>true],
 ['sku'=>'MDB-003','title'=>'Caixa de Som Portátil Mini','image'=>'/products/speaker.svg','cost'=>4590,'stock'=>7,'available'=>true],
 ['sku'=>'MDB-004','title'=>'Garrafa Térmica Inox 500ml','image'=>'/products/bottle.svg','cost'=>2990,'stock'=>0,'available'=>false],
 ['sku'=>'MDB-005','title'=>'Luminária de Mesa LED','image'=>'/products/lamp.svg','cost'=>3490,'stock'=>26,'available'=>true]]; }
 private function product(string $sku): array { foreach($this->getProducts() as $p) if($p['sku']===$sku)return $p; throw new RuntimeException('SKU desconhecido'); }
 public function getStock(string $sku): int { return $this->product($sku)['stock']; }
 public function getPrice(string $sku): int { return $this->product($sku)['cost']; }
 public function createOrder(array $order): array { if(empty($order['idempotencyKey']) || empty($order['items']))throw new RuntimeException('Pedido inválido'); foreach($order['items'] as $item){ if(!is_int($item['quantity']) || $item['quantity']<1 || $this->getStock($item['sku'])<$item['quantity'])throw new RuntimeException('Estoque insuficiente'); } return ['id'=>'SIM-'.substr(hash('sha256',$order['idempotencyKey']),0,16),'simulated'=>true]; }
 public function getOrderStatus(string $orderId): string { return 'simulated'; }
 public function getTracking(string $orderId): array { return ['code'=>null,'carrier'=>null]; }
}
class MeuDropBrasilAdapter implements SupplierAdapter {
 public function __construct(private ?SupplierAdapter $authorizedImplementation=null) {}
 private function adapter(): SupplierAdapter { if(!$this->authorizedImplementation)throw new RuntimeException('Integração MeuDropBrasil não documentada e não validada'); return $this->authorizedImplementation; }
 public function getProducts(): array { return $this->adapter()->getProducts(); }
 public function getStock(string $sku): int { return $this->adapter()->getStock($sku); }
 public function getPrice(string $sku): int { return $this->adapter()->getPrice($sku); }
 public function createOrder(array $order): array { return $this->adapter()->createOrder($order); }
 public function getOrderStatus(string $orderId): string { return $this->adapter()->getOrderStatus($orderId); }
 public function getTracking(string $orderId): array { return $this->adapter()->getTracking($orderId); }
}
