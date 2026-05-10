'use client';

import { useState, useEffect, useCallback } from 'react';
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
  ShieldCheck,
  AlertCircle,
  Loader2,
  RefreshCcw,
  Edit3
} from 'lucide-react';
import SidebarLayout from '@/components/SidebarLayout';

export default function ModelingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Inputs
  const [distance, setDistance] = useState<number>(300);
  const [fuelEfficiency, setFuelEfficiency] = useState<number>(4.0);
  const [fuelPrice, setFuelPrice] = useState<number>(39.94);
  const [expenses, setExpenses] = useState<number>(0);
  const [profitTarget, setProfitTarget] = useState<number>(3500);
  const [ownerMargin, setOwnerMargin] = useState<number>(25); // 25% default
  const [containerFee, setContainerFee] = useState<number>(3000);
  
  const [loading, setLoading] = useState(true);
  const [isFuelPriceManual, setIsFuelPriceManual] = useState(false);
  const [trips, setTrips] = useState<any[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<string>('');

  // 1. Auto-calculate Driver Profit based on Distance (D) - Fixed Steps
  const calculateDriverProfit = useCallback((d: number) => {
    if (d <= 250) {
      return 2500; // ระยะสั้น
    } else if (d <= 450) {
      return 4000; // ระยะกลาง
    } else {
      return 5500; // ระยะไกล
    }
  }, []);

  // Update Profit whenever Distance changes
  useEffect(() => {
    setProfitTarget(calculateDriverProfit(distance));
  }, [distance, calculateDriverProfit]);

  const fetchFuelPrice = useCallback(async () => {
    try {
      setLoading(true);
      const r = await fetch('/api/external/fuel-prices');
      const data = await r.json();
      if (data.diesel_b7) setFuelPrice(data.diesel_b7);
    } catch (e) {
      console.error('Fetch error', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTrips = useCallback(async () => {
    try {
      const r = await fetch('/api/trips/modeling-list');
      const data = await r.json();
      if (Array.isArray(data)) setTrips(data);
    } catch (e) {
      console.error('Fetch trips error', e);
    }
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated' && session?.user?.role !== 'system_owner') {
      router.push('/dashboard');
    }
    fetchFuelPrice();
    fetchTrips();
  }, [status, session, router, fetchFuelPrice, fetchTrips]);

  const handleTripSelect = (tripId: string) => {
    const trip = trips.find(t => t.tripId === tripId);
    if (trip) {
      setSelectedTrip(tripId);
      if (trip.distance) setDistance(trip.distance);
      // Logic for FE calculation based on vehicle type and weight
      // Default: Trailer ~ 4.0, 10-Wheel ~ 5.0, 6-Wheel ~ 7.0
      let baseFE = 4.0;
      if (trip.vehicleType?.includes('10-Wheel')) baseFE = 5.0;
      if (trip.vehicleType?.includes('6-Wheel')) baseFE = 7.0;
      if (trip.vehicleType?.includes('Pickup')) baseFE = 12.0;
      
      // Rough weight adjustment: -0.05 per ton
      const adjustedFE = baseFE - (trip.weight ? (trip.weight * 0.05) : 0);
      setFuelEfficiency(Math.max(2.0, Number(adjustedFE.toFixed(1))));
    }
  };

  // Calculations based on Target Price Formula: P = ((D / FE) * G + E + Profit) / 0.9
  const fuelCost = (distance / fuelEfficiency) * fuelPrice;
  const targetPriceP = (fuelCost + expenses + profitTarget) / 0.9;
  const truckRunningCost = targetPriceP + containerFee;
  const myRevenue = (targetPriceP * (1 + ownerMargin/100)) + containerFee;
  const grossMargin = myRevenue - truckRunningCost;
  const driverCommission = targetPriceP * 0.1;

  const getRecommendedProfit = (d: number) => {
    if (d <= 250) return { range: '2,500', label: 'ระยะสั้น (Short)', color: 'text-emerald-600' };
    if (d <= 450) return { range: '4,000', label: 'ระยะกลาง (Medium)', color: 'text-blue-600' };
    return { range: '5,500', label: 'ระยะไกล (Long)', color: 'text-orange-600' };
  };

  const recommendation = getRecommendedProfit(distance);

  if (loading && fuelPrice === 39.94) {
    // Show spinner only on initial load if we don't have a default yet
  }

  const inputStyle = "w-full px-5 py-3.5 rounded-2xl bg-slate-50 border border-slate-100 outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 font-bold transition-all";

  return (
    <SidebarLayout>
      <div className="p-8 max-w-6xl mx-auto space-y-8 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
              <Calculator className="text-emerald-500" />
              Financial Modeling
            </h1>
            <p className="text-slate-500 mt-1 font-medium">คำนวณโครงสร้างราคาตามสูตร Target Price (P)</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="px-4 py-2 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center gap-2">
              <Fuel size={16} className="text-emerald-600" />
              <span className="text-[13px] font-bold text-emerald-700">Diesel B7: {fuelPrice.toFixed(2)} THB/L</span>
            </div>
            <button 
              onClick={() => { setIsFuelPriceManual(!isFuelPriceManual); if(!isFuelPriceManual) fetchFuelPrice(); }}
              className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-emerald-500 transition-colors shadow-sm"
              title="ปรับแก้ราคาน้ำมันเอง"
            >
              {isFuelPriceManual ? <RefreshCcw size={16} /> : <Edit3 size={16} />}
            </button>
          </div>
        </div>

        {/* Quick Load Trip */}
        <div className="glass-card p-6 border-l-4 border-l-emerald-500 bg-emerald-50/20">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="flex items-center gap-3 shrink-0">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                <RefreshCcw size={20} className={loading ? 'animate-spin' : ''} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-800">Quick Load from Existing Trip</h3>
                <p className="text-[11px] text-slate-500 font-medium">หยิบใบงานมาคำนวณระยะทางและ FE ทันที</p>
              </div>
            </div>
            <select 
              value={selectedTrip}
              onChange={(e) => handleTripSelect(e.target.value)}
              className="flex-1 w-full px-4 py-2.5 rounded-xl border border-emerald-100 bg-white text-sm font-bold text-slate-700 focus:ring-4 focus:ring-emerald-500/10 outline-none"
            >
              <option value="">เลือกใบงานล่าสุด...</option>
              {trips.map(t => (
                <option key={t.tripId} value={t.tripId}>
                  {t.tripId} | {t.origin} → {t.destination} ({t.distance} KM, {t.weight} Tons)
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid lg:grid-cols-[1fr_420px] gap-8">
          {/* Left: Inputs */}
          <div className="space-y-6">
            <section className="glass-card p-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Truck size={20} className="text-slate-400" />
                  ข้อมูลการขนส่ง (Inputs)
                </h3>
                <div className="flex items-center gap-2 px-3 py-1 bg-emerald-100/50 rounded-full">
                  <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Auto Driver Profit Enabled</span>
                </div>
              </div>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">ระยะทาง (D - KM)</label>
                  <input type="number" value={distance} onChange={e => setDistance(Number(e.target.value))} className={inputStyle} />
                  <div className="flex justify-between items-center px-1">
                    <span className={`text-[10px] font-bold ${recommendation.color}`}>{recommendation.label}</span>
                    <span className="text-[10px] font-bold text-slate-400">แนะนำ: {recommendation.range}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">อัตราสิ้นเปลือง (FE - KM/L)</label>
                  <input type="number" step="0.1" value={fuelEfficiency} onChange={e => setFuelEfficiency(Number(e.target.value))} className={inputStyle} />
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">ราคาน้ำมัน (G - THB/L)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={fuelPrice} 
                    onChange={e => setFuelPrice(Number(e.target.value))} 
                    disabled={!isFuelPriceManual}
                    className={`${inputStyle} ${!isFuelPriceManual ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-emerald-50/50 text-emerald-600'}`} 
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">กำไรสุทธิคนขับ (Auto-calculated)</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      value={profitTarget} 
                      readOnly
                      className={`${inputStyle} bg-emerald-50/30 text-emerald-700 border-emerald-100 cursor-default`} 
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 px-2 py-1 bg-emerald-500 rounded-lg text-[9px] font-black text-white">
                      <ShieldCheck size={10} />
                      FIXED BY D
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-black text-orange-600 uppercase tracking-widest ml-1">ค่าใช้จ่ายอื่นๆ (E - บาท)</label>
                  <input 
                    type="number" 
                    value={expenses} 
                    onChange={e => setExpenses(Number(e.target.value))} 
                    placeholder="เช่น ค่าทางด่วน..."
                    className={`${inputStyle} border-orange-100 focus:ring-orange-500/10 focus:border-orange-500`} 
                  />
                </div>
              </div>
            </section>

            {/* Owner Adjustment */}
            <section className="glass-card p-8 border-t-4 border-t-blue-500">
              <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                <DollarSign size={20} className="text-blue-500" />
                Owner Profit Adjustment (Margin)
              </h3>
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">My Profit Margin (%)</label>
                  <span className="text-2xl font-black text-blue-600">{ownerMargin}%</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  step="1" 
                  value={ownerMargin} 
                  onChange={e => setOwnerMargin(Number(e.target.value))}
                  className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600" 
                />
                <div className="grid grid-cols-3 gap-4">
                  {[15, 25, 35].map(m => (
                    <button 
                      key={m}
                      onClick={() => setOwnerMargin(m)}
                      className={`py-2 rounded-xl text-xs font-bold transition-all ${ownerMargin === m ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                    >
                      {m}% {m === 25 ? '(Default)' : ''}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {/* Cost Breakdown */}
            <section className="glass-card p-8">
              <h3 className="text-lg font-bold text-slate-800 mb-6">โครงสร้างต้นทุน (Cost Structure)</h3>
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">ต้นทุนน้ำมัน</p>
                  <p className="text-xl font-black text-slate-800">{fuelCost.toLocaleString(undefined, {maximumFractionDigits: 2})}</p>
                  <p className="text-[10px] text-slate-400 mt-1 font-medium">{(distance/fuelEfficiency).toFixed(1)} ลิตร</p>
                </div>
                <div className="p-5 bg-emerald-50 rounded-2xl border border-emerald-100">
                  <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2">กำไรคนขับ (สุทธิ)</p>
                  <p className="text-xl font-black text-emerald-700">{profitTarget.toLocaleString()}</p>
                  <p className="text-[10px] text-emerald-500 mt-1 font-medium">Net for Driver</p>
                </div>
                <div className="p-5 bg-orange-50 rounded-2xl border border-orange-100">
                  <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-2">ส่วนแบ่งคนขับ (10%)</p>
                  <p className="text-xl font-black text-orange-700">{driverCommission.toLocaleString(undefined, {maximumFractionDigits: 2})}</p>
                  <p className="text-[10px] text-orange-400 mt-1 font-medium">Extra Management Fee</p>
                </div>
              </div>
            </section>
          </div>

          {/* Right: Summary Card */}
          <div className="space-y-6">
            <div className="glass-card p-8 bg-slate-900 text-white shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
              
              <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 mb-10 flex items-center gap-2">
                <ShieldCheck size={14} className="text-emerald-500" />
                Final Summary
              </h3>

              <div className="space-y-10">
                <div className="relative z-10">
                  <p className="text-[13px] font-bold text-slate-400 mb-1">ราคาเป้าหมายเสนอคู่ค้า (P)</p>
                  <p className="text-5xl font-black tracking-tight text-white">{targetPriceP.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                  <p className="text-[11px] text-slate-500 mt-3 font-medium">P = (Fuel + Expenses + Profit) / 0.9</p>
                </div>

                <div className="pt-10 border-t border-white/10 space-y-8">
                  <div className="flex justify-between items-center group">
                    <div>
                      <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-1">ค่าจ้างรถวิ่งงาน</p>
                      <p className="text-2xl font-black text-slate-200 transition-colors group-hover:text-white">{truckRunningCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-slate-500 font-bold">P + 3,000</p>
                    </div>
                  </div>

                  <div className="p-6 bg-blue-600 rounded-[32px] shadow-2xl shadow-blue-500/20 transform transition-transform hover:scale-[1.02]">
                    <div className="flex justify-between items-center mb-1">
                      <p className="text-[11px] font-black text-blue-950 uppercase tracking-widest">รายได้ของผม (รวม Margin {ownerMargin}%)</p>
                      <p className="text-3xl font-black text-white">{myRevenue.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                    </div>
                    <div className="flex justify-between items-center opacity-80">
                      <p className="text-[10px] text-blue-100 font-bold">(P * {(1 + ownerMargin/100).toFixed(2)}) + 3,000</p>
                      <div className="flex items-center gap-1 text-[12px] font-black text-white">
                        <TrendingUp size={14} />
                        +{grossMargin.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center px-2 py-3 border border-white/5 rounded-2xl bg-white/5">
                    <p className="text-[13px] font-bold text-slate-400">กำไรส่วนต่าง (Margin)</p>
                    <p className="text-xl font-black text-blue-400">+{grossMargin.toLocaleString(undefined, { maximumFractionDigits: 2 })} <span className="text-[10px] ml-1">THB</span></p>
                  </div>
                </div>
              </div>
            </div>

            <div className="glass-card p-6 bg-blue-50/50 border-blue-100">
              <h4 className="text-[13px] font-bold text-blue-800 mb-3 flex items-center gap-2">
                <Info size={16} />
                Operation Notes
              </h4>
              <ul className="space-y-3">
                <li className="text-[11px] text-blue-700/80 leading-relaxed font-semibold flex gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 flex-shrink-0"></div>
                  ค่าตู้คอนเทนเนอร์ (3,000 บาท) ยังไม่จ่ายตอนนี้ ให้เบิกตามใบเสร็จจริง
                </li>
                <li className="text-[11px] text-blue-700/80 leading-relaxed font-semibold flex gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 flex-shrink-0"></div>
                  ระบบดึงราคาน้ำมัน Diesel B7 ล่าสุดจาก PTT Station อัตโนมัติ
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}
