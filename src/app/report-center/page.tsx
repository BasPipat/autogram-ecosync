'use client';

import { useEffect, useState, useMemo } from 'react';
import SidebarLayout from '@/components/SidebarLayout';
import { 
  Download, FileText, Loader2, Table, FileBarChart, 
  ShieldCheck, Leaf, LayoutDashboard, Calendar, BarChart3,
  Truck, Route, Fuel, ChevronRight
} from 'lucide-react';

type FilterType = 'day' | 'month' | 'year';

type Row = {
  monthKey: string;
  totalTrips: number;
  totalDistanceKm: number;
  totalFuelLitersForecast: number;
  totalEmissionKgCo2e: number;
  totalTonKm?: number;
  totalWeightTon?: number;
};

type ActivityData = {
  label: string; // Date string
  tripId: string;
  originName: string;
  destinationName: string;
  weightTon: number;
  distanceKm: number;
  fuelForecastLiters: number;
  emissionKgCo2e: number;
};

// Helper function to format date (e.g., "2026-05-31" -> "31 May", "2026-05" -> "May '26")
const formatAxisDate = (dateStr: string) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  if (parts.length === 2) {
    const monthIdx = parseInt(parts[1], 10) - 1;
    const month = months[monthIdx] || '';
    const yearShort = parts[0].slice(-2);
    return `${month} '${yearShort}`;
  }
  if (parts.length < 3) return dateStr;
  const day = parts[2];
  const monthIdx = parseInt(parts[1], 10) - 1;
  const month = months[monthIdx] || '';
  return `${day} ${month}`;
};

// Helper function to get week range label (e.g., 01-07 May, 08-14 May, etc.)
const getWeekRangeLabel = (dateStr: string) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length < 3) return '';
  const dayNum = parseInt(parts[2], 10);
  const monthIdx = parseInt(parts[1], 10) - 1;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthName = months[monthIdx] || '';
  if (dayNum <= 7) return `01-07 ${monthName}`;
  if (dayNum <= 14) return `08-14 ${monthName}`;
  if (dayNum <= 21) return `15-21 ${monthName}`;
  if (dayNum <= 28) return `22-28 ${monthName}`;
  const year = parseInt(parts[0], 10);
  const lastDay = new Date(year, monthIdx + 1, 0).getDate();
  return `29-${lastDay} ${monthName}`;
};

// ── Clean & Bright PDF Export ──
async function downloadPdf(filter: FilterType, activities: ActivityData[], rows: Row[]) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF();
  
  const colors = {
    emerald: [16, 124, 65] as [number, number, number], // Elegant Forest/Emerald Green
    navy: [0, 32, 91] as [number, number, number], // Brand Deep Navy
    brandOrange: [255, 91, 0] as [number, number, number], // Brand Vibrant Orange
    slate: [15, 23, 42] as [number, number, number],
    blue: [59, 130, 246] as [number, number, number],
    orange: [245, 158, 11] as [number, number, number],
    gray: [100, 116, 139] as [number, number, number],
    lightGray: [248, 250, 252] as [number, number, number],
    white: [255, 255, 255] as [number, number, number],
  };

  // Load SVG Logo
  let logoDataUrl = '';
  try {
    logoDataUrl = await new Promise<string>((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = '/shif-logo-premium-transparent.svg';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || 470;
        canvas.height = img.naturalHeight || 235;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/png'));
        } else {
          resolve('');
        }
      };
      img.onerror = () => resolve('');
    });
  } catch (e) {
    console.error('Failed to load logo', e);
  }

  // ── Header (Bright & Clean) ──
  doc.setFillColor(...colors.white);
  doc.rect(0, 0, 210, 40, 'F');
  
  if (logoDataUrl) {
    // Draw Logo: width=24mm, height=12mm at x=14, y=9
    doc.addImage(logoDataUrl, 'PNG', 14, 9, 24, 12);
    
    // Draw co-branding text next to it (with 2mm gap -> x=40)
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colors.gray);
    doc.text('by AUTOGRAM', 40.0, 18.5);
    
    // Draw Tagline below logo
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colors.navy);
    doc.text('CARBON INTELLIGENCE PLATFORM', 15, 28);
  } else {
    // Fallback: Brand Accent Circle
    doc.setFillColor(...colors.brandOrange);
    doc.circle(18, 18, 4, 'F');
    
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colors.navy);
    doc.text('SHIF', 26, 20);
    
    const shifWidth = doc.getTextWidth('SHIF');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colors.gray);
    doc.text('by AUTOGRAM', 26 + shifWidth + 2, 20);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colors.navy);
    doc.text('CARBON INTELLIGENCE PLATFORM', 26, 26);
  }
  
  doc.setDrawColor(...colors.navy);
  doc.setLineWidth(0.5);
  doc.line(14, 32, 196, 32);

  // Dynamic Report Info (Right Aligned)
  let reportTitle = `REPORT: ${filter.toUpperCase()} SUSTAINABILITY VIEW`;
  if (filter === 'month' && activities.length > 0) {
    const parts = activities[0].label.split('-');
    if (parts.length >= 2) {
      const months = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
      const monthName = months[parseInt(parts[1], 10) - 1] || '';
      reportTitle = `REPORT: ${monthName} ${parts[0]} SUSTAINABILITY VIEW`;
    }
  }

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...colors.gray);
  doc.text(reportTitle, 196, 15, { align: 'right' });
  doc.text(`GENERATED: ${new Date().toLocaleString('th-TH')}`, 196, 20, { align: 'right' });

  // TGO Certified Badge (Top Right)
  const badgeX = 146;
  const badgeY = 24;
  doc.setFillColor(240, 253, 244); // light green bg
  doc.roundedRect(badgeX, badgeY, 50, 5, 0.8, 0.8, 'F');
  doc.setDrawColor(187, 247, 208); // light green border
  doc.setLineWidth(0.15);
  doc.roundedRect(badgeX, badgeY, 50, 5, 0.8, 0.8, 'S');
  
  doc.setFontSize(5.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...colors.emerald);
  doc.text('✓ TGO METHODOLOGY CERTIFIED', badgeX + 3.5, badgeY + 3.6);

  // ── Summary Metrics (KPI Cards) ──
  const totalEmission = filter === 'year'
    ? rows.reduce((s, r) => s + r.totalEmissionKgCo2e, 0)
    : activities.reduce((s, a) => s + a.emissionKgCo2e, 0);
  const totalTrips = filter === 'year'
    ? rows.reduce((s, r) => s + r.totalTrips, 0)
    : activities.length;
  const totalDist = filter === 'year'
    ? rows.reduce((s, r) => s + r.totalDistanceKm, 0)
    : activities.reduce((s, a) => s + a.distanceKm, 0);
  const avgEmission = totalEmission / Math.max(totalDist, 1);

  const drawCard = (x: number, y: number, label: string, value: string, unit: string, color: [number, number, number], bgColor: [number, number, number]) => {
    doc.setFillColor(...bgColor);
    doc.roundedRect(x, y, 58, 22, 2, 2, 'F');
    
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colors.gray);
    doc.text(label.toUpperCase(), x + 6, y + 7);
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...color);
    doc.text(value, x + 6, y + 16);
    
    const valueWidth = doc.getTextWidth(value);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...colors.gray);
    doc.text(` ${unit}`, x + 6 + valueWidth, y + 16);
  };

  // Three clean KPI cards with rounded corners and distinct hierarchy
  drawCard(14, 40, 'Total Distance', totalDist.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 'km', colors.slate, [248, 250, 252]);
  drawCard(76, 40, 'Total Emissions', totalEmission.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 'kgCO2e', colors.emerald, [240, 253, 244]);
  drawCard(138, 40, 'Avg. Emission Rate', avgEmission.toFixed(2), 'kg/km', colors.slate, [248, 250, 252]);

  // ── Visual Carbon Chart (Bar Chart with Y-Axis and Data Labels) ──
  let y = 72;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...colors.slate);
  doc.text('CARBON EMISSION PERFORMANCE TREND', 14, y);
  
  const chartX = 26; // Shifted right for Y-Axis labels
  const chartY = y + 35;
  const chartWidth = 170; // Adjusted width
  const chartHeight = 28; // Slightly taller
  
  // Group by week for monthly report, or by month for yearly report, or individual trips
  let chartPoints: { label: string; emissionKgCo2e: number; tripId?: string }[] = [];
  if (filter === 'month') {
    const weeklyMap: Record<string, { label: string; emissionKgCo2e: number }> = {};
    let monthName = '';
    if (activities.length > 0) {
      const parts = activities[0].label.split('-');
      if (parts.length >= 2) {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        monthName = months[parseInt(parts[1], 10) - 1] || '';
      }
    }
    if (!monthName) {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      monthName = months[new Date().getMonth()];
    }
    
    const weekLabels = [
      `01-07 ${monthName}`,
      `08-14 ${monthName}`,
      `15-21 ${monthName}`,
      `22-28 ${monthName}`,
      `29-31 ${monthName}`
    ];
    if (activities.length > 0) {
      const parts = activities[0].label.split('-');
      if (parts.length >= 3) {
        const year = parseInt(parts[0], 10);
        const monthIdx = parseInt(parts[1], 10) - 1;
        const lastDay = new Date(year, monthIdx + 1, 0).getDate();
        weekLabels[4] = `29-${lastDay} ${monthName}`;
      }
    }

    weekLabels.forEach(lbl => {
      weeklyMap[lbl] = { label: lbl, emissionKgCo2e: 0 };
    });
    
    activities.forEach(a => {
      const lbl = getWeekRangeLabel(a.label);
      if (lbl && weeklyMap[lbl]) {
        weeklyMap[lbl].emissionKgCo2e += a.emissionKgCo2e;
      }
    });
    chartPoints = Object.values(weeklyMap);
  } else if (filter === 'year') {
    chartPoints = rows.slice(0, 12).reverse().map(r => ({
      label: r.monthKey,
      emissionKgCo2e: r.totalEmissionKgCo2e
    }));
  } else {
    chartPoints = activities.slice(0, 15).map(a => ({
      label: a.label,
      emissionKgCo2e: a.emissionKgCo2e,
      tripId: a.tripId
    }));
  }

  const maxEmission = Math.max(...chartPoints.map(p => p.emissionKgCo2e), 1);

  // Draw Background Grid & Y-Axis Labels
  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...colors.gray);
  for (let i = 0; i <= 4; i++) {
    const gy = chartY - (i * (chartHeight / 4));
    const labelVal = (i * (maxEmission / 4)).toFixed(0);
    
    // Draw Y-Axis value
    doc.text(`${labelVal} kg`, chartX - 3, gy + 1.5, { align: 'right' });
    
    // Draw thin grid lines
    doc.setDrawColor(241, 245, 249);
    doc.setLineWidth(0.2);
    doc.line(chartX, gy, chartX + chartWidth, gy);
  }

  // Draw Y-Axis Line
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.4);
  doc.line(chartX, chartY, chartX, chartY - chartHeight);

  // Draw Bars, Data Labels and X-Axis Labels
  const barWidth = (chartWidth / Math.max(chartPoints.length, 1)) * 0.65;
  const spacing = (chartWidth / Math.max(chartPoints.length, 1));

  chartPoints.forEach((p, i) => {
    const bHeight = (p.emissionKgCo2e / maxEmission) * chartHeight;
    const bx = chartX + (i * spacing) + (spacing - barWidth) / 2;
    
    // Emerald Green Bar
    doc.setFillColor(...colors.emerald);
    doc.rect(bx, chartY - bHeight, barWidth, bHeight, 'F');
    
    // Data Label on top of the bar
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colors.slate);
    doc.text(`${p.emissionKgCo2e.toFixed(1)}`, bx + (barWidth / 2), chartY - bHeight - 2, { align: 'center' });
    
    // X Label (Human-readable date & Unique Suffix)
    doc.setFontSize(5.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...colors.gray);
    const xLabel = filter === 'day' 
      ? `${formatAxisDate(p.label)} #${p.tripId?.slice(-4) || ''}` 
      : (filter === 'month' ? p.label : formatAxisDate(p.label));
    doc.text(xLabel, bx + (barWidth / 2), chartY + 4, { align: 'center' });
  });

  // Base X-Axis Line
  doc.setDrawColor(...colors.slate);
  doc.setLineWidth(0.4);
  doc.line(chartX, chartY, chartX + chartWidth, chartY);

  // ── Main Content (Data Ledger Details Table) ──
  y = 120;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...colors.slate);
  doc.text('Data Ledger Details', 14, y);
  
  // Determine report rows & headers
  let reportRows: any[] = [];
  let headers: string[] = [];

  if (filter === 'day') {
    headers = ['Trip ID', 'Distance (km)', 'Weight (ton)', 'Emission (kg)'];
    reportRows = activities.map(a => ({
      c1: a.tripId,
      c2: a.distanceKm.toFixed(2),
      c3: a.weightTon.toFixed(1),
      c4: a.emissionKgCo2e.toFixed(2)
    }));
  } else if (filter === 'month') {
    headers = ['Date', 'Total Trips', 'Distance (km)', 'Emission (kgCO2e)'];
    const dailyMap: Record<string, any> = {};
    activities.forEach(a => {
      if (!dailyMap[a.label]) dailyMap[a.label] = { label: a.label, trips: 0, dist: 0, emission: 0 };
      dailyMap[a.label].trips += 1;
      dailyMap[a.label].dist += a.distanceKm;
      dailyMap[a.label].emission += a.emissionKgCo2e;
    });
    reportRows = Object.values(dailyMap).sort((a, b) => a.label.localeCompare(b.label)).map(d => ({
      c1: formatAxisDate(d.label),
      c2: String(d.trips),
      c3: d.dist.toFixed(2),
      c4: d.emission.toFixed(2)
    }));
  } else {
    headers = ['Month', 'Trips', 'Distance (km)', 'Emission (kgCO2e)'];
    reportRows = rows.map(r => ({
      c1: r.monthKey,
      c2: String(r.totalTrips),
      c3: r.totalDistanceKm.toLocaleString(),
      c4: r.totalEmissionKgCo2e.toFixed(2)
    }));
  }

  // Table Styling & Text Alignment
  y += 6;
  doc.setFillColor(241, 245, 249);
  doc.rect(14, y, 182, 8, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...colors.gray);
  
  // Alignment: Col 1 is Left-aligned at 18. Cols 2, 3, 4 are Right-aligned at 95, 145, 192.
  const colX = [18, 95, 145, 192];
  headers.forEach((h, i) => {
    if (i === 0) {
      doc.text(h, colX[i], y + 5.5, { align: 'left' });
    } else {
      doc.text(h, colX[i], y + 5.5, { align: 'right' });
    }
  });

  y += 8;
  reportRows.forEach((row, i) => {
    // Zebra Striping
    if (i % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(14, y, 182, 7, 'F');
    }
    
    // Column 1 (Left-aligned)
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...colors.slate);
    doc.text(row.c1, colX[0], y + 5, { align: 'left' });
    
    // Column 2 & 3 (Right-aligned)
    doc.setTextColor(...colors.gray);
    doc.text(row.c2, colX[1], y + 5, { align: 'right' });
    doc.text(row.c3, colX[2], y + 5, { align: 'right' });
    
    // Column 4 (Right-aligned & Emerald Bold Highlight)
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colors.emerald);
    doc.text(row.c4, colX[3], y + 5, { align: 'right' });
    
    y += 7;
    if (y > 275) { doc.addPage(); y = 20; }
  });

  // ── Footer ──
  const footerY = 285;
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.2);
  doc.line(14, footerY - 5, 196, footerY - 5);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...colors.gray);
  doc.text('Report verified via TGO activity-based methodology. All distances are GPS-verified.', 14, footerY);
  doc.text('© 2026 SHIF by AUTOGRAM', 196, footerY, { align: 'right' });

  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const reportType = filter === 'month' ? 'month' : (filter === 'year' ? 'year' : 'day');
  
  doc.save(`shif-${reportType}-report-${yyyy}-${mm}-${dd}.pdf`);
}

async function downloadExcel(filter: FilterType, activities: ActivityData[], rows: Row[]) {
  const XLSX = await import('xlsx');
  let data: Record<string, string | number>[] = [];

  if (filter === 'day') {
    data = activities.map(a => ({
      'Trip ID': a.tripId,
      'Origin': a.originName,
      'Destination': a.destinationName,
      'Weight (Ton)': a.weightTon,
      'Distance (km)': parseFloat(a.distanceKm.toFixed(2)),
      'Fuel Forecast (L)': parseFloat(a.fuelForecastLiters.toFixed(2)),
      'Emission (kgCO2e)': parseFloat(a.emissionKgCo2e.toFixed(2)),
    }));
  } else if (filter === 'month') {
    // Accumulate per-day totals with proper precision
    const dailyMap: Record<string, { Date: string; Trips: number; 'Distance (km)': number; 'Fuel Forecast (L)': number; 'Emission (kgCO2e)': number }> = {};
    activities.forEach(a => {
      if (!dailyMap[a.label]) {
        dailyMap[a.label] = { 'Date': a.label, 'Trips': 0, 'Distance (km)': 0, 'Fuel Forecast (L)': 0, 'Emission (kgCO2e)': 0 };
      }
      dailyMap[a.label]['Trips'] += 1;
      dailyMap[a.label]['Distance (km)'] += a.distanceKm;
      dailyMap[a.label]['Fuel Forecast (L)'] += a.fuelForecastLiters;
      dailyMap[a.label]['Emission (kgCO2e)'] += a.emissionKgCo2e;
    });
    // Round accumulated values to 2 decimal places
    data = Object.values(dailyMap)
      .sort((a, b) => a.Date.localeCompare(b.Date))
      .map(d => ({
        'Date': d.Date,
        'Trips': d.Trips,
        'Distance (km)': parseFloat(d['Distance (km)'].toFixed(2)),
        'Fuel Forecast (L)': parseFloat(d['Fuel Forecast (L)'].toFixed(2)),
        'Emission (kgCO2e)': parseFloat(d['Emission (kgCO2e)'].toFixed(2)),
      }));
  } else {
    // year filter — include Fuel Forecast column
    data = rows.map(r => ({
      'Month': r.monthKey,
      'Trips': r.totalTrips,
      'Distance (km)': r.totalDistanceKm,
      'Fuel Forecast (L)': parseFloat((r.totalFuelLitersForecast || 0).toFixed(2)),
      'Emission (kgCO2e)': parseFloat(r.totalEmissionKgCo2e.toFixed(2)),
    }));
  }

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);

  // Auto column width based on header length
  if (data.length > 0) {
    ws['!cols'] = Object.keys(data[0]).map(k => ({ wch: Math.max(k.length + 2, 14) }));
  }

  XLSX.utils.book_append_sheet(wb, ws, 'Carbon Report');
  XLSX.writeFile(wb, `shif-by-autogram-${filter}-report.xlsx`);
}

function getDefaultValue(filter: FilterType) {
  const now = new Date();
  if (filter === 'day') return now.toISOString().slice(0, 10);
  if (filter === 'month') return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  return String(now.getUTCFullYear());
}

export default function CarbonIntelligencePage() {
  const [activeTab, setActiveTab] = useState<'analytics' | 'ledger'>('analytics');
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);
  const [activities, setActivities] = useState<ActivityData[]>([]);
  const [setting, setSetting] = useState<any>(null);

  // PDF Date Picker Modal state
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [pdfStartDate, setPdfStartDate] = useState(startDate);
  const [pdfEndDate, setPdfEndDate] = useState(endDate);
  const [isPdfLoading, setIsPdfLoading] = useState(false);

  // Month Picker Modal state (for Monthly Ledger tab)
  const [isMonthModalOpen, setIsMonthModalOpen] = useState(false);
  const [selectedReportMonth, setSelectedReportMonth] = useState('');
  const [isMonthReportLoading, setIsMonthReportLoading] = useState(false);

  const openMonthModal = () => {
    if (rows.length > 0) {
      setSelectedReportMonth(rows[0].monthKey);
    } else {
      setSelectedReportMonth(new Date().toISOString().slice(0, 7));
    }
    setIsMonthModalOpen(true);
  };

  const fetchUnifiedData = async (start: string, end: string) => {
    setLoading(true);
    try {
      // Use a custom query for range
      const actRes = await fetch(`/api/carbon/activity?filter=custom&start=${start}&end=${end}`, { cache: 'no-store' });
      const actJson = await actRes.json();
      setActivities(actJson.chart || []);
      setSetting(actJson.setting);
      
      // We can reuse the monthly ledger for the table if needed, or group activities
      const repRes = await fetch('/api/report-center/monthly', { cache: 'no-store' });
      const repJson = await repRes.json();
      setRows(repJson.rows || []);
    } finally { setLoading(false); }
  };

  useEffect(() => {
    fetchUnifiedData(startDate, endDate);
  }, []);

  const onApplyFilter = () => fetchUnifiedData(startDate, endDate);

  // Filter Monthly Ledger rows reactively to date pickers range
  const filteredRows = useMemo(() => {
    const startMonth = startDate.slice(0, 7); // "YYYY-MM"
    const endMonth = endDate.slice(0, 7); // "YYYY-MM"
    return rows.filter(r => r.monthKey >= startMonth && r.monthKey <= endMonth);
  }, [rows, startDate, endDate]);

  // Determine current filter for exports (Force 'year' if on Monthly Ledger tab)
  const currentFilter = useMemo(() => {
    if (activeTab === 'ledger') return 'year';
    const s = new Date(startDate);
    const e = new Date(endDate);
    const diffDays = Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays > 366) return 'year';
    if (diffDays > 31) return 'month';
    return 'day';
  }, [activeTab, startDate, endDate]);

  const totalStats = useMemo(() => {
    if (activeTab === 'ledger') {
      const dist = filteredRows.reduce((s, r) => s + r.totalDistanceKm, 0);
      const emission = filteredRows.reduce((s, r) => s + r.totalEmissionKgCo2e, 0);
      const trips = filteredRows.reduce((s, r) => s + r.totalTrips, 0);
      return { trips, distance: dist, emission };
    }
    const currentActivities = activities;
    return {
      trips: currentActivities.length,
      distance: currentActivities.reduce((s, a) => s + a.distanceKm, 0),
      emission: currentActivities.reduce((s, a) => s + a.emissionKgCo2e, 0),
    };
  }, [activeTab, activities, filteredRows]);

  const maxActivityEmission = useMemo(() => Math.max(...activities.map(a => a.emissionKgCo2e), 1), [activities]);

  return (
    <SidebarLayout>
      <div className="min-h-screen p-6 space-y-6" style={{ background: 'var(--bg-base)' }}>
        
        <div className="flex flex-wrap items-start justify-between gap-4 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}>
              <FileBarChart size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Carbon Intelligence</h1>
              <p className="text-[13px]" style={{ color: 'var(--text-tertiary)' }}>Unified Analytics & Dynamic ESG Reporting</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (activeTab === 'ledger') {
                  openMonthModal();
                } else {
                  downloadExcel(currentFilter, activities, filteredRows);
                }
              }}
              className="btn-secondary px-4 py-2 rounded-xl text-[13px] flex items-center gap-2"
            >
              <Table size={14} /> Export Excel
            </button>
            <button
              onClick={() => {
                if (activeTab === 'ledger') {
                  openMonthModal();
                } else {
                  setPdfStartDate(startDate);
                  setPdfEndDate(endDate);
                  setIsPdfModalOpen(true);
                }
              }}
              className="btn-primary px-4 py-2 rounded-xl text-[13px] flex items-center gap-2"
            >
              <FileText size={14} /> Executive PDF
            </button>
          </div>
        </div>

        <div className="card p-3 flex flex-col gap-3">
          <div className="flex bg-slate-100 p-1 rounded-xl w-full">
            <button onClick={() => setActiveTab('analytics')} className={`flex-1 px-4 py-2 rounded-lg text-[13px] font-bold transition-all ${activeTab === 'analytics' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}>Analytics</button>
            <button onClick={() => setActiveTab('ledger')} className={`flex-1 px-4 py-2 rounded-lg text-[13px] font-bold transition-all ${activeTab === 'ledger' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}>Monthly Ledger</button>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full">
            <input 
              type="date" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)} 
              className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-[13px] outline-none shadow-sm focus:ring-2 focus:ring-emerald-500/10 transition-all w-full" 
            />
            <span className="text-[13px] font-medium text-slate-500 text-center">ถึง</span>
            <input 
              type="date" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)} 
              className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-[13px] outline-none shadow-sm focus:ring-2 focus:ring-emerald-500/10 transition-all w-full" 
            />
            <button onClick={onApplyFilter} className="bg-slate-800 text-white px-5 py-2.5 rounded-xl text-[13px] font-bold hover:bg-slate-700 transition-all shadow-md active:scale-95 w-full sm:w-auto">ค้นหา</button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-in">
          {[
            { label: 'Selected Trips', value: totalStats.trips.toLocaleString(), icon: Truck, color: '#3B82F6', bg: '#EFF6FF' },
            { label: 'Selected Distance', value: `${totalStats.distance.toFixed(2)} km`, icon: Route, color: '#10B981', bg: '#ECFDF5' },
            { label: 'Selected Emission', value: `${totalStats.emission.toFixed(2)} kgCO₂e`, icon: Leaf, color: '#F59E0B', bg: '#FFF7ED' },
          ].map(card => (
            <div key={card.label} className="card p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: card.bg }}>
                <card.icon size={20} style={{ color: card.color }} />
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-400 uppercase">{card.label}</p>
                <p className="text-[20px] font-bold text-slate-800">{card.value}</p>
              </div>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="card flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-emerald-500 mr-2" />
            <span className="text-slate-400">Compiling Report Data...</span>
          </div>
        ) : (
          <div className="animate-fade-in">
            {activeTab === 'analytics' ? (
              <div className="card p-6">
                <div className="flex items-center gap-2 mb-6">
                  <BarChart3 size={18} className="text-emerald-500" />
                  <span className="text-[15px] font-bold text-slate-800">Visual Activity Breakdown</span>
                </div>
                {activities.length === 0 ? (
                  <div className="text-center py-20 text-slate-400 italic">No activity data found for selected criteria.</div>
                ) : (
                  <div className="space-y-4">
                    {activities.map((item) => (
                      <div key={`${item.tripId}-${item.label}`} className="flex items-center gap-2 md:gap-4">
                        <span className="text-[11px] font-bold text-slate-500 truncate w-[80px] md:w-[120px] flex-shrink-0">{item.tripId || item.label}</span>
                        <div className="h-3 bg-slate-50 rounded-full overflow-hidden border border-slate-100 flex-1">
                          <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full transition-all duration-1000" style={{ width: `${(item.emissionKgCo2e / maxActivityEmission) * 100}%` }} />
                        </div>
                        <span className="text-[11px] font-bold text-slate-700 text-right w-[70px] md:w-[100px] flex-shrink-0">{item.emissionKgCo2e.toLocaleString()} <span className="text-[9px] text-slate-400">kg</span></span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="card overflow-hidden">
                <div className="px-6 py-4 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
                  <span className="text-[13px] font-bold text-slate-700 uppercase tracking-wider">Historical Sustainability Ledger</span>
                  <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-600 font-bold uppercase">Certified Method</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[13px]">
                    <thead>
                      <tr className="bg-slate-50 text-slate-400 text-[10px] uppercase font-bold">
                        <th className="p-4">Period</th>
                        <th className="p-4">Count</th>
                        <th className="p-4">Distance (km)</th>
                        <th className="p-4">Emission (kgCO₂e)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRows.map((r, i) => (
                        <tr key={r.monthKey} className={`border-b border-slate-50 hover:bg-slate-50/50 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/20'}`}>
                          <td className="p-4 font-bold text-slate-700">{r.monthKey}</td>
                          <td className="p-4 text-slate-500">{r.totalTrips}</td>
                          <td className="p-4 text-slate-500">{r.totalDistanceKm.toLocaleString()}</td>
                          <td className="p-4 font-bold text-emerald-600">{r.totalEmissionKgCo2e.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-2 text-[11px] text-slate-400 italic">
          <ShieldCheck size={14} className="text-emerald-500" />
          ESG Reports generated based on activity-level precision.
        </div>
      </div>

      {/* PDF Date Range Picker Modal */}
      {isPdfModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[32px] p-8 w-full max-w-md shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-50">
                <FileText size={18} className="text-emerald-600" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-800 tracking-tight">เลือกช่วงเวลา Report</h3>
                <p className="text-[12px] text-slate-400">PDF จะครอบคลุมข้อมูลในช่วงที่เลือก</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  วันเริ่มต้น
                </label>
                <input
                  type="date"
                  value={pdfStartDate}
                  onChange={e => setPdfStartDate(e.target.value)}
                  className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-[14px] outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  วันสิ้นสุด
                </label>
                <input
                  type="date"
                  value={pdfEndDate}
                  min={pdfStartDate}
                  onChange={e => setPdfEndDate(e.target.value)}
                  className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-[14px] outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setIsPdfModalOpen(false)}
                className="flex-1 py-3 rounded-2xl text-[14px] font-bold text-slate-400 bg-slate-50 hover:bg-slate-100 transition-all"
              >
                ยกเลิก
              </button>
              <button
                disabled={isPdfLoading || !pdfStartDate || !pdfEndDate}
                onClick={async () => {
                  setIsPdfLoading(true);
                  try {
                    // Fetch data for the selected PDF date range
                    const res = await fetch(
                      `/api/carbon/activity?filter=custom&start=${pdfStartDate}&end=${pdfEndDate}`,
                      { cache: 'no-store' }
                    );
                    const json = await res.json();
                    const pdfActivities: ActivityData[] = json.chart || [];
                    // Determine filter granularity for PDF layout
                    const diffDays = Math.ceil(
                      (new Date(pdfEndDate).getTime() - new Date(pdfStartDate).getTime()) / (1000 * 60 * 60 * 24)
                    );
                    const pdfFilter: FilterType = diffDays > 366 ? 'year' : diffDays > 31 ? 'month' : 'day';
                    
                    const pdfStartMonth = pdfStartDate.slice(0, 7);
                    const pdfEndMonth = pdfEndDate.slice(0, 7);
                    const pdfRows = rows.filter(r => r.monthKey >= pdfStartMonth && r.monthKey <= pdfEndMonth);
                    
                    await downloadPdf(pdfFilter, pdfActivities, pdfRows);
                    setIsPdfModalOpen(false);
                  } finally {
                    setIsPdfLoading(false);
                  }
                }}
                className="flex-1 py-3 rounded-2xl text-[14px] font-black text-white bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-200 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {isPdfLoading ? (
                  <><Loader2 size={16} className="animate-spin" /> กำลังสร้าง...</>
                ) : (
                  <><FileText size={16} /> Download PDF</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Monthly Ledger Export Modal */}
      {isMonthModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[32px] p-8 w-full max-w-md shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-50">
                <Calendar size={18} className="text-emerald-600" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-800 tracking-tight">เลือกเดือนสำหรับรายงาน</h3>
                <p className="text-[12px] text-slate-400">ระบุเดือนเพื่อดาวน์โหลดรายงานสรุปรายสัปดาห์</p>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  เลือกเดือน
                </label>
                <select
                  value={selectedReportMonth || (rows.length > 0 ? rows[0].monthKey : '')}
                  onChange={e => setSelectedReportMonth(e.target.value)}
                  className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-[14px] bg-white outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all cursor-pointer"
                >
                  {rows.length > 0 ? (
                    rows.map(r => (
                      <option key={r.monthKey} value={r.monthKey}>
                        {formatAxisDate(r.monthKey)}
                      </option>
                    ))
                  ) : (
                    <option value={new Date().toISOString().slice(0, 7)}>
                      {formatAxisDate(new Date().toISOString().slice(0, 7))}
                    </option>
                  )}
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <button
                  disabled={isMonthReportLoading || (!selectedReportMonth && rows.length === 0)}
                  onClick={async () => {
                    const monthVal = selectedReportMonth || (rows.length > 0 ? rows[0].monthKey : '');
                    if (!monthVal) return;
                    setIsMonthReportLoading(true);
                    try {
                      const [year, month] = monthVal.split('-').map(Number);
                      const lastDay = new Date(year, month, 0).getDate();
                      const start = `${monthVal}-01`;
                      const end = `${monthVal}-${String(lastDay).padStart(2, '0')}`;
                      
                      const res = await fetch(
                        `/api/carbon/activity?filter=custom&start=${start}&end=${end}`,
                        { cache: 'no-store' }
                      );
                      const json = await res.json();
                      const pdfActivities: ActivityData[] = json.chart || [];
                      
                      await downloadExcel('month', pdfActivities, rows);
                      setIsMonthModalOpen(false);
                    } finally {
                      setIsMonthReportLoading(false);
                    }
                  }}
                  className="flex-1 py-3 border border-slate-200 hover:bg-slate-50 rounded-2xl text-[14px] font-bold text-slate-600 transition-all flex items-center justify-center gap-2"
                >
                  <Table size={16} /> Excel
                </button>
                <button
                  disabled={isMonthReportLoading || (!selectedReportMonth && rows.length === 0)}
                  onClick={async () => {
                    const monthVal = selectedReportMonth || (rows.length > 0 ? rows[0].monthKey : '');
                    if (!monthVal) return;
                    setIsMonthReportLoading(true);
                    try {
                      const [year, month] = monthVal.split('-').map(Number);
                      const lastDay = new Date(year, month, 0).getDate();
                      const start = `${monthVal}-01`;
                      const end = `${monthVal}-${String(lastDay).padStart(2, '0')}`;
                      
                      const res = await fetch(
                        `/api/carbon/activity?filter=custom&start=${start}&end=${end}`,
                        { cache: 'no-store' }
                      );
                      const json = await res.json();
                      const pdfActivities: ActivityData[] = json.chart || [];
                      
                      await downloadPdf('month', pdfActivities, rows);
                      setIsMonthModalOpen(false);
                    } finally {
                      setIsMonthReportLoading(false);
                    }
                  }}
                  className="flex-1 py-3 rounded-2xl text-[14px] font-black text-white bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all flex items-center justify-center gap-2"
                >
                  {isMonthReportLoading ? (
                    <><Loader2 size={16} className="animate-spin" /> Loading...</>
                  ) : (
                    <><FileText size={16} /> PDF</>
                  )}
                </button>
              </div>
              <button
                onClick={() => setIsMonthModalOpen(false)}
                className="w-full py-2.5 rounded-xl text-[12px] font-medium text-slate-400 hover:text-slate-500 transition-all"
              >
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}
    </SidebarLayout>
  );
}
