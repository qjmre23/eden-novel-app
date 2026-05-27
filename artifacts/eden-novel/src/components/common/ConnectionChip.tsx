import React from 'react';
import { Wifi, WifiOff } from 'lucide-react';

export default function ConnectionChip({ connected }: { connected: boolean }) {
  return (
    <div className={`inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full ${connected ? 'bg-green-900/40 text-green-400' : 'bg-red-900/40 text-red-400'}`}>
      {connected ? <Wifi size={10} /> : <WifiOff size={10} />}
      {connected ? 'Connected' : 'Offline'}
    </div>
  );
}
