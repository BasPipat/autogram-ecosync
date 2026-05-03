'use client';
import SidebarLayout from '@/components/SidebarLayout';

export default function DashboardPage() {
  return (
    <SidebarLayout>
      <div className="p-8">
        {/* หัวข้อหน้าเว็บ */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-800">Autogram Eco-Sync</h1>
          <p className="text-sm text-slate-500">Sustainability Dashboard & Integrity Vault</p>
        </div>

        {/* สรุปตัวเลขสำคัญ (ตามแบบในรูปของบอสเป๊ะๆ) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex justify-between items-center">
            <div>
              <p className="text-sm text-slate-500 mb-1">ยอดคาร์บอนสะสม (kgCO2e)</p>
              <p className="text-3xl font-bold text-green-600">0.00</p>
            </div>
            <div className="p-3 bg-green-50 text-green-500 rounded-lg text-2xl">
              🍃
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex justify-between items-center">
            <div>
              <p className="text-sm text-slate-500 mb-1">เที่ยววิ่งทั้งหมด (Trips)</p>
              <p className="text-3xl font-bold text-slate-800">0</p>
            </div>
            <div className="p-3 bg-blue-50 text-blue-500 rounded-lg text-2xl">
              🚚
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex justify-between items-center">
            <div>
              <p className="text-sm text-slate-500 mb-1">POD ที่ตรวจสอบแล้ว</p>
              <p className="text-3xl font-bold text-slate-800">0</p>
            </div>
            <div className="p-3 bg-orange-50 text-orange-500 rounded-lg text-2xl">
              📄
            </div>
          </div>
        </div>

        {/* ตารางรายการเดินรถล่าสุด */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h2 className="font-bold text-slate-800">รายการเดินรถล่าสุด</h2>
          </div>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-sm border-b border-slate-100">
                <th className="p-4 font-medium">รหัสงาน (Trip ID)</th>
                <th className="p-4 font-medium">เส้นทาง</th>
                <th className="p-4 font-medium">คาร์บอน (kgCO2e)</th>
                <th className="p-4 font-medium">สถานะหลักฐาน (POD)</th>
                <th className="p-4 font-medium">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={5} className="p-12 text-center text-slate-400">
                  ยังไม่มีข้อมูล
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </SidebarLayout>
  );
}