import { currentAdmin } from '@/lib/auth';
import { simulation } from '@/lib/db';
import { redirect } from 'next/navigation';
import Workspace from '@/components/workspace';
export const dynamic = 'force-dynamic';
export default async function Home() { const admin = await currentAdmin(); if (!simulation() && !admin) redirect('/login'); return <Workspace mode={simulation() ? 'simulation' : 'live'} authenticated={!!admin} />; }
