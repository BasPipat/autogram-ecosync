'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { 
  Calculator, 
  TrendingUp, 
  Truck, 
  Fuel, 
  DollarSign, 
  Info, 
  ChevronRight,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Loader2
} from 'lucide-react';

export default function ModelingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Inputs
  const [distance, setDistance] = useState<number>(300);
  const [fuelEfficiency, setFuelEfficiency] = useState<number>(4.0);
  const [fuelPrice, setFuelPrice] = useState<number>(32.94);
  const [expenses, setExpenses] = useState<number>(0);
  const [profitTarget, setProfitTarget] = useState<number>(5000);
  const [containerFee, setContainerFee] = useState<number>(3000);
  
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check access
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated' && session?.user?.role !== 'system_owner') {
      router.push('/dashboard');
    }

    // Fetch fuel price
    fetch('/api/external/fuel-prices')
      .then(r => r.json())
      .then(data => {
        if (data.diesel_b7) setFuelPrice(data.diesel_b7);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [status, session, router]);

  // Calculations based on Target Price Formula: P = ((D / FE) * G + E + Profit) / 0.9
  const fuelCost = (distance / fuelEfficiency) * fuelPrice;
  const targetPriceP = (fuelCost + expenses + profitTarget) / 0.9;
  const truckRunningCost = targetPriceP + containerFee;
  const myRevenue = (targetPriceP * 1.25) + containerFee;
  const grossMargin = myRevenue - truckRunningCost;
  const driverCommission = targetPriceP * 0.1;

  const getRecommendedProfit = (d: number) => {
    if (d <= 250) return { range: '2,500 - 3,500', label: 'ระยะสั้น', color: 'text-emerald-600' };
    if (d <= 450) return { range: '4,000 - 5,000', label: 'ระยะกลาง', color: 'text-blue-600' };
    return { range: '5,500 - 7,000', label: 'ระยะไกล', color: 'text-orange-600' };
  };

  const recommendation = getRecommendedProfit(distance);

  if (loading || status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-emerald-500" size={32} />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
            <Calculator className="text-emerald-500" />
            Financial Modeling
          </h1>
          <p className="text-slate-500 mt-1 font-medium">คำนวณโครงสร้างราคาและกำไรสุทธิ (Target Price Formula)</p>
        </div>
        <div className="px-4 py-2 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center gap-2">
          <Fuel size={16} className="text-emerald-600" />
          <span className="text-[13px] font-bold text-emerald-700">Diesel B7: {fuelPrice} THB/L</span>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_400px] gap-8">
        {/* Left: Inputs */}
        <div className="space-y-6">
          <section className="glass-card p-8">
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
              <Truck size={20} className="text-slate-400" />
              ข้อมูลการขนส่ง (Inputs)
            </h3>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">ระยะทาง (D - KM)</label>
                <input 
                  type="number" 
                  value={distance} 
                  onChange={e => setDistance(Number(e.target.value))}
                  className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border border-slate-100 outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 font-bold transition-all"
                />
                <div className="flex justify-between items-center px-1">
                  <span className={`text-[10px] font-bold ${recommendation.color}`}>{recommendation.label}</span>
                  <span className="text-[10px] font-bold text-slate-400">แนะนำ: {recommendation.range}</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">อัตราสิ้นเปลือง (FE - KM/L)</label>
                <input 
                  type="number" 
                  step="0.1"
                  value={fuelEfficiency} 
                  onChange={e => setFuelEfficiency(Number(e.target.value))}
                  className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border border-slate-100 outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 font-bold transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">ค่าใช้จ่ายพิเศษ (E - บาท)</label>
                <input 
                  type="number" 
                  value={expenses} 
                  onChange={e => setExpenses(Number(e.target.value))}
                  className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border border-slate-100 outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 font-bold transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">กำไรสุทธิที่ต้องการ (Profit - บาท)</label>
                <input 
                  type="number" 
                  value={profitTarget} 
                  onChange={e => setProfitTarget(Number(e.target.value))}
                  className="w-full px-5 py-3.5 rounded-2xl bg-emerald-50 border border-emerald-100 outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 font-bold text-emerald-700 transition-all"
                />
              </div>
            </div>
          </section>

          {/* Formula Breakdown Visualization */}
          <section className="glass-card p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <ShieldCheck size={120} />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
              <Info size={20} className="text-slate-400" />
              โครงสร้างต้นทุนและการแบ่งส่วน
            </h3>

            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm text-slate-400">
                    <Fuel size={18} />
                  </div>
                  <div>
                    <p className="text-[13px] font-bold text-slate-700">ต้นทุนน้ำมันเชื้อเพลิง</p>
                    <p className="text-[11px] text-slate-400 font-medium">(D / FE) * G</p>
                  </div>
                </div>
                <p className="text-lg font-black text-slate-800">{fuelCost.toLocaleString()} <span className="text-[10px] text-slate-400 ml-1">บาท</span></p>
              </div>

              <div className="flex justify-between items-center p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm text-emerald-500">
                    <TrendingUp size={18} />
                  </div>
                  <div>
                    <p className="text-[13px] font-bold text-emerald-700">กำไรสุทธิ (Target Profit)</p>
                    <p className="text-[11px] text-emerald-500 font-medium">Net Profit per Trip</p>
                  </div>
                </div>
                <p className="text-lg font-black text-emerald-700">{profitTarget.toLocaleString()} <span className="text-[10px] text-emerald-500 ml-1">บาท</span></p>
              </div>

              <div className="flex justify-between items-center p-4 bg-orange-50 rounded-2xl border border-orange-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm text-orange-500">
                    <ShieldCheck size={18} />
                  </div>
                  <div>
                    <p className="text-[13px] font-bold text-orange-700">ส่วนแบ่งคนขับ (Driver 10%)</p>
                    <p className="text-[11px] text-orange-400 font-medium">Included in Price / 0.9</p>
                  </div>
                </div>
                <p className="text-lg font-black text-orange-700">{driverCommission.toLocaleString(undefined, { maximumFractionDigits: 2 })} <span className="text-[10px] text-orange-400 ml-1">บาท</span></p>
              </div>
            </div>
          </section>
        </div>

        {/* Right: Summary Card */}
        <div className="space-y-6">
          <div className="glass-card p-8 bg-gradient-to-br from-slate-800 to-slate-900 text-white relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
            
            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 mb-8">Summary Calculation</h3>

            <div className="space-y-8">
              <div>
                <p className="text-[13px] font-bold text-slate-400 mb-1">ราคาเป้าหมายเสนอคู่ค้า (P)</p>
                <p className="text-4xl font-black tracking-tight">{targetPriceP.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                <div className="h-1 w-12 bg-emerald-500 mt-4 rounded-full"></div>
              </div>

              <div className="pt-8 border-t border-white/5 space-y-6">
                <div>
                  <div className="flex justify-between items-end mb-2">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">ค่าจ้างรถวิ่งงาน</p>
                    <p className="text-xl font-bold text-white">{truckRunningCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                  </div>
                  <p className="text-[10px] text-slate-500 font-medium">ราคา P + ค่ารับคืนตู้ {containerFee.toLocaleString()} บาท</p>
                </div>

                <div className="p-5 bg-emerald-500 rounded-3xl shadow-xl shadow-emerald-500/20">
                  <div className="flex justify-between items-end mb-1">
                    <p className="text-[11px] font-black text-emerald-950 uppercase tracking-widest">รายได้ของผม</p>
                    <p className="text-2xl font-black text-white">{myRevenue.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                  </div>
                  <p className="text-[10px] text-emerald-100 font-bold opacity-80">(P * 1.25) + 3,000</p>
                </div>

                <div className="flex justify-between items-center px-2">
                  <p className="text-[13px] font-bold text-emerald-400">กำไรส่วนต่าง (Margin)</p>
                  <p className="text-lg font-black text-white">+{grossMargin.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                </div>
              </div>
            </div>

            <button className="w-full mt-10 py-4 bg-white/5 hover:bg-white/10 rounded-2xl flex items-center justify-center gap-2 font-bold text-[13px] transition-all border border-white/10 group">
              บันทึกการจำลองนี้
              <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          {/* Guidelines */}
          <div className="glass-card p-6 bg-amber-50/30 border-amber-100">
            <h4 className="text-[13px] font-bold text-amber-800 mb-3 flex items-center gap-2">
              <AlertCircle size={16} />
              ข้อควรระวัง
            </h4>
            <ul className="space-y-2">
              <li className="text-[11px] text-amber-700/80 leading-relaxed font-medium flex gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1 flex-shrink-0"></div>
                ค่าตู้คอนเทนเนอร์ยังไม่จ่ายตอนนี้ ให้เบิกตามใบเสร็จจริงหลังจบงาน
              </li>
              <li className="text-[11px] text-amber-700/80 leading-relaxed font-medium flex gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1 flex-shrink-0"></div>
                ตัวหาร 0.9 คือการประกันส่วนแบ่งคนขับ 10% โดยไม่กระทบกำไรสุทธิ
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
