export const demoOrders = [
 { id: '2000010847291', product: 'Fone Bluetooth Headphone Pro', sku: 'MDB-001', image: '/products/headphones.svg', buyer: 'Mariana S.', date: 'Hoje, 14:32', value: 15990, status: 'Aguardando fornecedor', step: 1 },
 { id: '2000010847256', product: 'Smartwatch Série 9 · Preto', sku: 'MDB-002', image: '/products/watch.svg', buyer: 'Lucas A.', date: 'Hoje, 13:18', value: 18990, status: 'Pronto para envio', step: 3 },
 { id: '2000010847208', product: 'Caixa de Som Portátil Mini', sku: 'MDB-003', image: '/products/speaker.svg', buyer: 'Camila R.', date: 'Hoje, 12:45', value: 9990, status: 'Em transporte', step: 4 },
 { id: '2000010847194', product: 'Garrafa Térmica Inox 500ml', sku: 'MDB-004', image: '/products/bottle.svg', buyer: 'Pedro M.', date: 'Hoje, 11:09', value: 6990, status: 'Estoque insuficiente', step: 0 },
 { id: '2000010847142', product: 'Luminária de Mesa LED', sku: 'MDB-005', image: '/products/lamp.svg', buyer: 'Ana C.', date: 'Hoje, 10:24', value: 7990, status: 'Entregue', step: 5 },
];
export const money = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value / 100);
