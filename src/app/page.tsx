import { Suspense } from 'react';
import Workspace from './workspace';
export default function Page(){return <Suspense fallback={<div className='p-8'>正在加载本地工作台…</div>}><Workspace/></Suspense>}

