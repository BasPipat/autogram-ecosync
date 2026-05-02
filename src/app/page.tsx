"use client";

import React, { useEffect, useState } from 'react';
import { Leaf, Truck, FileCheck, ArrowRight, Loader2, UploadCloud, X, CheckCircle } from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState({ totalTrips: 0, totalCarbon: "0.00", verifiedPODs: 0 });
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // States สำหรับ Modal อัปโหลด
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState('');
  const [podUrl, setPodUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // States สำหรับ Modal ตรวจสอบ (Admin)
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [verifyTripId, setVerifyTripId] = useState('');
  const [verifyImageUrl, setVerifyImageUrl] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const fetchDashboardData = () => {
    fetch('/api/dashboard')
      .then(res => res.json())
      .then(data => {
        if (!data.error) {
          setStats(data.stats);
          setTrips(data.recentTrips);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Fetch error:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // ---------- ฟังก์ชันฝั่งอัปโหลด (คนขับ) ----------
  const handleOpenModal = (tripId: string) => {
    setSelectedTrip(tripId);
    setPodUrl(''); 
    setIsModalOpen(true);
  };

  const handleUploadPOD = async () => {
    if (!podUrl) return;
    setIsUploading(true);
    try {
      const response = await fetch('/api/vault/upload-pod', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tripId: selectedTrip, podImageUrl: podUrl })
      });
      if (response.ok) {
        setIsModalOpen(false);
        fetchDashboardData();
      } else {
        alert("อัปโหลดไม่สำเร็จ");
      }
    } catch (error) {
      console.error("Upload error:", error);
    } finally {
      setIsUploading(false);
    }
  };

  // ---------- ฟังก์ชันฝั่งอนุมัติ (แอดมิน) ----------
  const handleOpenVerifyModal = async (tripId: string) => {
    setVerifyTripId(tripId);
    setIsVerifyModalOpen(true);
    setVerifyImageUrl(''); // ล้างรูปเก่าก่อน
    
    // ดึงรูปจากฐานข้อมูล (ใช้ท่านี้แก้ขัดก่อน ปกติเราจะดึงมาพร้อม API Dashboard)
    try {
       const res = await fetch('/api/dashboard');
       const data = await res.json();
       const currentTrip = data.recentTrips.find((t: any) => t.id === tripId);
       
       // สมมติฐาน: ให้ฝั่งหลังบ้านส่ง imageUrl มาด้วยถ้ามี (ผมจะขอใช้โค้ดจำลองให้รูปขึ้นไปก่อนเพื่อให้บอสเทส flow)
       // ในของจริงเราจะดึง Base64 ขึ้นมาโชว์ครับ
       setVerifyImageUrl('https://placehold.co/600x800/e2e8f0/64748b?text=POD+Document'); 
    } catch (e) { console.error(e); }
  };

  const handleVerifyPOD = async () => {
    setIsVerifying(true);
    try {
      const response = await fetch('/api/vault/verify-pod', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tripId: verifyTripId })
      });
      if (response.ok) {
        setIsVerifyModalOpen(false);
        fetchDashboardData(); // รีเฟรชหน้าจอให้เลขขยับ
      } else {
        alert("อนุมัติไม่สำเร็จ");
      }
    } catch (error) {
      console.error("Verify error:", error);
    } finally {
      setIsVerifying(false);
    }
  };


  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-green-600"><Loader2 className="animate-spin w-10 h-10" /></div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8 font-sans">
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
            <Leaf className="text-green-600" size={32} /> Autogram Eco-Sync
          </h1>
          <p className="text-gray-500 mt-1">Sustainability Dashboard & Integrity Vault</p>
        </div>
        <div className="bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-200">
          <span className="text-sm text-gray-500">สถานะระบบ: </span>
          <span className="text-sm font-semibold text-green-600 flex items-center gap-1 inline-flex">
            <span className="w-2 h-2 rounded-full bg-green-600 animate-pulse"></span> Online
          </span>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-start justify-between">
          <div>
            <p className="text-sm text-gray-500 font-medium mb-1">ยอดคาร์บอนสะสม (kgCO2e)</p>
            <h2 className="text-3xl font-bold text-green-600">{stats.totalCarbon}</h2>
          </div>
          <div className="p-3 bg-green-50 rounded-lg"><Leaf className="text-green-600" size={24} /></div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-start justify-between">
          <div>
            <p className="text-sm text-gray-500 font-medium mb-1">เที่ยววิ่งทั้งหมด (Trips)</p>
            <h2 className="text-3xl font-bold text-gray-800">{stats.totalTrips}</h2>
          </div>
          <div className="p-3 bg-blue-50 rounded-lg"><Truck className="text-blue-600" size={24} /></div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-start justify-between">
          <div>
            <p className="text-sm text-gray-500 font-medium mb-1">POD ที่ตรวจสอบแล้ว</p>
            <h2 className="text-3xl font-bold text-gray-800">{stats.verifiedPODs}</h2>
          </div>
          <div className="p-3 bg-orange-50 rounded-lg"><FileCheck className="text-orange-600" size={24} /></div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-800">รายการเดินรถล่าสุด</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-sm">
                <th className="p-4">รหัสงาน (Trip ID)</th>
                <th className="p-4">เส้นทาง</th>
                <th className="p-4">คาร์บอน (kgCO2e)</th>
                <th className="p-4">สถานะหลักฐาน (POD)</th>
                <th className="p-4">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {trips.length === 0 ? (
                 <tr><td colSpan={5} className="p-8 text-center text-gray-400">ยังไม่มีข้อมูล</td></tr>
              ) : (
                trips.map((trip) => (
                  <tr key={trip.id} className="border-b border-gray-50">
                    <td className="p-4 font-medium">{trip.id}</td>
                    <td className="p-4 text-gray-600">{trip.origin} <ArrowRight size={14} className="inline mx-1" /> {trip.dest}</td>
                    <td className="p-4 text-gray-600">{trip.carbon}</td>
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        trip.status === 'Verified' ? 'bg-green-100 text-green-700' : 
                        trip.status === 'Pending' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {trip.status}
                      </span>
                    </td>
                    <td className="p-4">
                      {trip.status === 'No POD' ? (
                        <button onClick={() => handleOpenModal(trip.id)} className="text-sm bg-blue-50 text-blue-600 px-3 py-1 rounded">อัปโหลด</button>
                      ) : trip.status === 'Pending' ? (
                        <button onClick={() => handleOpenVerifyModal(trip.id)} className="text-sm bg-orange-50 text-orange-600 px-3 py-1 rounded font-medium">ตรวจสอบรูป</button>
                      ) : (
                        <span className="text-sm text-green-600 flex items-center gap-1"><CheckCircle size={16}/> อนุมัติแล้ว</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal อัปโหลด (ซ่อนไว้เพื่อประหยัดพื้นที่ แต่อยู่ครบตามเดิม) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-bold flex items-center gap-2 mb-4"><UploadCloud className="text-blue-600" /> อัปโหลดใบส่งของ</h3>
            {/* โค้ดส่วนอัปโหลดเหมือนเดิม */}
             <div className="mb-4">
              {podUrl ? (
                <div className="w-full h-48 bg-gray-100"><img src={podUrl} className="w-full h-full object-contain" /></div>
              ) : (
                <input type="file" accept="image/*" onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => setPodUrl(reader.result as string);
                    reader.readAsDataURL(file);
                  }
                }} />
              )}
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-gray-100 rounded">ยกเลิก</button>
              <button onClick={handleUploadPOD} className="px-4 py-2 bg-blue-600 text-white rounded">บันทึกหลักฐาน</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal ตรวจสอบ (ของ Admin) */}
      {isVerifyModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <FileCheck className="text-orange-600" /> ตรวจสอบความถูกต้อง
              </h3>
              <button onClick={() => setIsVerifyModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
            </div>
            
            <p className="text-sm text-gray-600 mb-2">รหัสงาน: <strong>{verifyTripId}</strong></p>
            
            {/* กรอบโชว์รูปภาพ */}
            <div className="flex-1 bg-gray-100 rounded-lg overflow-auto border border-gray-200 mb-4 min-h-[300px] flex items-center justify-center">
              {verifyImageUrl ? (
                <img src={verifyImageUrl} alt="POD Document" className="max-w-full h-auto object-contain" />
              ) : (
                <Loader2 className="animate-spin text-gray-400" />
              )}
            </div>

            <div className="flex justify-end gap-3 mt-auto">
              <button onClick={() => setIsVerifyModalOpen(false)} className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100">
                ปฏิเสธ (ไม่อนุมัติ)
              </button>
              <button 
                onClick={handleVerifyPOD} disabled={isVerifying}
                className="px-6 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 flex items-center gap-2"
              >
                {isVerifying ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={18} />}
                อนุมัติหลักฐาน
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}