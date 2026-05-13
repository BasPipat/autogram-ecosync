import { Loader2 } from 'lucide-react';

export default function TripHubLoading() {
  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="h-14 w-14 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 flex items-center justify-center">
          <Loader2 className="animate-spin text-emerald-300" size={26} />
        </div>
        <p className="text-xs font-bold uppercase tracking-[0.28em] text-slate-400">Loading Trip Hub</p>
      </div>
    </div>
  );
}
