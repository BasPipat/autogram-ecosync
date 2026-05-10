# EcoSync Phase 2 — Implementation Plan
**Date:** 2026-05-10
**Scope:** Dashboard Charts, Report Center PDF/Excel Fix, API custom range

---

## สถานะหลังจาก Phase 1 (โปรแกรมเมอร์แก้แล้ว)

✅ BUG-01: N+1 Query fixed (batch $in query)
✅ BUG-02: podUrl field name mismatch fixed
✅ BUG-03: verifiedPODs now returns percentage
✅ SEC-02: MongoDB hardcoded fallback removed
✅ CC-01: ConfirmModal component extracted
✅ UX-01: Error state UI added
✅ UX-05: System Live badge now reflects real API status

---

## ปัญหาใหม่ที่พบจากโค้ดปัจจุบัน

### NEW-BUG-01 · API `filter=custom` ไม่มีอยู่จริง
**File:** `src/app/report-center/page.tsx` line 286
```
/api/carbon/activity?filter=custom&start=...&end=...
```
`src/app/api/carbon/activity/route.ts` รับแค่ `filter=day|month|year` เท่านั้น
`custom` จะ return ข้อมูลผิดหรือ empty array เงียบๆ

### NEW-BUG-02 · Excel ช่องว่าง + ตัวเลขไม่ถูก format
**File:** `src/app/report-center/page.tsx` lines 233–248
- `filter=month`: `Distance` และ `Emission` ไม่ได้ `.toFixed(2)` → เลขทศนิยมยาวมาก
- `filter=month` และ `filter=year`: ไม่มี column `Fuel Forecast (L)` ทั้งที่ข้อมูลมี

---

## Task 1 — แก้ API รองรับ `filter=custom`

**File:** `src/app/api/carbon/activity/route.ts`

เพิ่ม branch ใหม่:
```ts
if (filter === 'custom') {
  const start = searchParams.get('start'); // YYYY-MM-DD
  const end = searchParams.get('end');     // YYYY-MM-DD
  if (!start || !end) return NextResponse.json({ error: 'start and end required' }, { status: 400 });
  
  const trips = await Trip.find({
    createdAt: { $gte: new Date(start), $lte: new Date(end + 'T23:59:59.999Z') }
  }).lean();
  
  // Map to same chart format as filter=day
  const chart = trips.map(t => ({
    label: t.createdAt.toISOString().slice(0, 10),
    tripId: t.tripId,
    distanceKm: t.distance || 0,
    fuelForecastLiters: t.fuelForecastLiters || 0,
    emissionKgCo2e: t.emissionKgCo2e || 0,
  }));
  
  return NextResponse.json({ filter: 'custom', chart, setting: activeSetting });
}
```

---

## Task 2 — แก้ Excel Export

**File:** `src/app/report-center/page.tsx` — function `downloadExcel()`

### แก้ filter=month (lines 233–241)
```ts
// BEFORE (wrong):
dailyMap[a.label]['Distance'] += a.distanceKm;
dailyMap[a.label]['Emission'] += a.emissionKgCo2e;

// AFTER (correct):
data = Object.values(dailyMap).sort(...).map(d => ({
  'Date': d.Date,
  'Trips': d.Trips,
  'Distance (km)': parseFloat(d['Distance (km)'].toFixed(2)),
  'Fuel Forecast (L)': parseFloat(d['Fuel Forecast (L)'].toFixed(2)),
  'Emission (kgCO2e)': parseFloat(d['Emission (kgCO2e)'].toFixed(2)),
}));
```

### แก้ filter=year (lines 243–248)
```ts
// BEFORE (missing Fuel column):
data = rows.map(r => ({
  'Month': r.monthKey,
  'Trips': r.totalTrips,
  'Distance (km)': r.totalDistanceKm,
  'Emission (kgCO2e)': r.totalEmissionKgCo2e
}));

// AFTER (add Fuel column):
data = rows.map(r => ({
  'Month': r.monthKey,
  'Trips': r.totalTrips,
  'Distance (km)': r.totalDistanceKm,
  'Fuel Forecast (L)': parseFloat((r.totalFuelLitersForecast || 0).toFixed(2)),
  'Emission (kgCO2e)': parseFloat(r.totalEmissionKgCo2e.toFixed(2)),
}));
```

### เพิ่ม Excel column width auto-fit
```ts
const ws = XLSX.utils.json_to_sheet(data);
// Set column widths
const colWidths = Object.keys(data[0] || {}).map(k => ({ wch: Math.max(k.length, 15) }));
ws['!cols'] = colWidths;
```

---

## Task 3 — Report Center PDF: เพิ่ม Date Range Picker Modal

**File:** `src/app/report-center/page.tsx`

### เพิ่ม State
```ts
const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
const [pdfStartDate, setPdfStartDate] = useState(startDate);
const [pdfEndDate, setPdfEndDate] = useState(endDate);
```

### เปลี่ยนปุ่ม PDF
```tsx
// BEFORE:
<button onClick={() => downloadPdf(currentFilter, activities, rows)}>
  Executive PDF
</button>

// AFTER:
<button onClick={() => { setPdfStartDate(startDate); setPdfEndDate(endDate); setIsPdfModalOpen(true); }}>
  Executive PDF
</button>
```

### เพิ่ม PDF Modal
```tsx
{isPdfModalOpen && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
    <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl">
      <h3 className="text-xl font-black text-slate-800 mb-6">เลือกช่วงเวลา Report</h3>
      <div className="space-y-4">
        <div>
          <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">วันเริ่มต้น</label>
          <input type="date" value={pdfStartDate} onChange={e => setPdfStartDate(e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20" />
        </div>
        <div>
          <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">วันสิ้นสุด</label>
          <input type="date" value={pdfEndDate} onChange={e => setPdfEndDate(e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20" />
        </div>
      </div>
      <div className="flex gap-3 mt-6">
        <button onClick={() => setIsPdfModalOpen(false)}
          className="flex-1 py-3 rounded-xl text-sm font-bold text-slate-400 bg-slate-50 hover:bg-slate-100 transition-all">
          ยกเลิก
        </button>
        <button onClick={async () => {
            setIsPdfModalOpen(false);
            // Fetch data for selected range then download
            const res = await fetch(`/api/carbon/activity?filter=custom&start=${pdfStartDate}&end=${pdfEndDate}`, { cache: 'no-store' });
            const json = await res.json();
            await downloadPdf('day', json.chart || [], rows, pdfStartDate, pdfEndDate);
          }}
          className="flex-2 py-3 px-6 rounded-xl text-sm font-black text-white bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all">
          Download PDF
        </button>
      </div>
    </div>
  </div>
)}
```

### แก้ `downloadPdf()` signature
```ts
// BEFORE:
async function downloadPdf(filter: FilterType, activities: ActivityData[], rows: Row[])

// AFTER:
async function downloadPdf(
  filter: FilterType,
  activities: ActivityData[],
  rows: Row[],
  startDate?: string,
  endDate?: string
)
```

แก้ PDF header ให้แสดงช่วงวัน:
```ts
const periodLabel = startDate && endDate
  ? `${startDate} ถึง ${endDate}`
  : filter.toUpperCase();
doc.text(`REPORT PERIOD: ${periodLabel}`, 196, 23, { align: 'right' });
```

---

## Task 4 — Dashboard: เพิ่ม Charts (Recharts)

### ติดตั้ง
```bash
npm install recharts
npm install --save-dev @types/recharts
```

### แก้ API Response — `src/app/api/dashboard/route.ts`

เพิ่ม `statusBreakdown` และ `carbonChart` ใน response:
```ts
// Count by status
const verifiedCount = vaultRecords.filter(v => v.isVerified).length;
const pendingCount = vaultRecords.filter(v => !v.isVerified).length;
const noPodCount = recentTrips.length - vaultRecords.length;

return NextResponse.json({
  stats: { totalTrips, totalCarbon, verifiedPODs: podComplianceRate },
  recentTrips: tripsWithDetails,
  // NEW: chart data
  statusBreakdown: [
    { name: 'Verified', value: verifiedCount, color: '#10B981' },
    { name: 'Pending', value: pendingCount, color: '#F59E0B' },
    { name: 'No POD', value: noPodCount, color: '#94A3B8' },
  ],
  carbonChart: tripsWithDetails.map(t => ({
    name: t.id.slice(-6), // short trip ID
    carbon: parseFloat(t.carbon) || 0,
    status: t.status,
  })),
});
```

### เพิ่ม Charts ใน `src/app/dashboard/page.tsx`

เพิ่ม import:
```tsx
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
```

เพิ่ม state:
```tsx
const [statusBreakdown, setStatusBreakdown] = useState<{name:string;value:number;color:string}[]>([]);
const [carbonChart, setCarbonChart] = useState<{name:string;carbon:number;status:string}[]>([]);
```

อัปเดต `fetchDashboardData`:
```tsx
setStatusBreakdown(data.statusBreakdown || []);
setCarbonChart(data.carbonChart || []);
```

เพิ่ม Chart Section (ใต้ Stats Grid, เหนือ Trip List):
```tsx
{/* Charts Section */}
{(statusBreakdown.length > 0 || carbonChart.length > 0) && (
  <div className="px-8 mt-6 grid md:grid-cols-2 gap-6 animate-fade-in">
    
    {/* Pie Chart — POD Compliance */}
    <div className="bg-white rounded-[32px] p-7 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
      <h3 className="text-[13px] font-black text-slate-400 uppercase tracking-widest mb-1">POD Status</h3>
      <p className="text-[11px] text-slate-300 mb-4">Proof of Delivery Breakdown</p>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie data={statusBreakdown} cx="50%" cy="50%" innerRadius={55} outerRadius={80}
            paddingAngle={3} dataKey="value">
            {statusBreakdown.map((entry, index) => (
              <Cell key={index} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => [`${value} trips`, '']} />
          <Legend iconType="circle" iconSize={8}
            formatter={(value) => <span className="text-[12px] font-bold text-slate-600">{value}</span>} />
        </PieChart>
      </ResponsiveContainer>
    </div>

    {/* Bar Chart — Carbon per Trip */}
    <div className="bg-white rounded-[32px] p-7 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
      <h3 className="text-[13px] font-black text-slate-400 uppercase tracking-widest mb-1">Carbon per Trip</h3>
      <p className="text-[11px] text-slate-300 mb-4">kgCO₂e — 5 Latest Trips</p>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={carbonChart} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
          <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94A3B8', fontWeight: 700 }} />
          <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} />
          <Tooltip
            formatter={(value) => [`${value} kgCO₂e`, 'Carbon']}
            contentStyle={{ borderRadius: '12px', border: '1px solid #F1F5F9', fontSize: '12px' }}
          />
          <Bar dataKey="carbon" radius={[6, 6, 0, 0]}>
            {carbonChart.map((entry, index) => (
              <Cell key={index}
                fill={entry.status === 'Verified' ? '#10B981' : entry.status === 'Pending' ? '#F59E0B' : '#94A3B8'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  </div>
)}
```

---

## สรุป Priority สำหรับโปรแกรมเมอร์

| ลำดับ | งาน | ไฟล์ที่แก้ | ความยาก |
|---|---|---|---|
| 1 | แก้ API รองรับ `filter=custom` | `src/app/api/carbon/activity/route.ts` | ง่าย |
| 2 | แก้ Excel: precision + Fuel column | `src/app/report-center/page.tsx` | ง่าย |
| 3 | เพิ่ม PDF Date Picker Modal | `src/app/report-center/page.tsx` | ปานกลาง |
| 4 | เพิ่ม Dashboard Charts (Recharts) | `src/app/dashboard/page.tsx` + `src/app/api/dashboard/route.ts` | ปานกลาง |

**คำสั่งติดตั้งก่อนเริ่ม:**
```bash
npm install recharts
```

---

*Phase 2 Plan — Ready for implementation handoff.*
