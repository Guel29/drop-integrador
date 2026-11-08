import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'Smart Drop Integrador | Sua operação, conectada', description: 'Centralize seu catálogo, vendas e operação de dropshipping em um só lugar.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="pt-BR"><body>{children}</body></html>; }
