'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { 
  MessageCircle, 
  X, 
  Send, 
  QrCode, 
  ExternalLink, 
  MessageSquare, 
  Headphones, 
  Sparkles, 
  User, 
  ChevronRight,
  ArrowRight
} from 'lucide-react';

type Message = {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  time: string;
};

export default function CustomerServiceChat() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const isDriver = session?.user?.role === 'driver' || pathname?.startsWith('/driver');

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'line'>('chat');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome-1',
      text: 'สวัสดีค่ะ ยินดีต้อนรับสู่ฝ่ายบริการลูกค้าของ SHIF 😊',
      sender: 'bot',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
    {
      id: 'welcome-2',
      text: 'หากมีคำถามเกี่ยวกับการใช้งาน หรือพบปัญหาทางเทคนิค สามารถพิมพ์คุยกับบอตจำลอง หรือสลับไปที่แท็บ "แอดไลน์" ด้านบน เพื่อติดต่อเจ้าหน้าที่ได้โดยตรงเลยค่ะ!',
      sender: 'bot',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping]);

  // Show a notification badge/toast after a few seconds of loading
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowNotification(true);
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  const handleSendMessage = (text: string) => {
    if (!text.trim()) return;

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      text: text,
      sender: 'user',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    // Simulate bot response
    setTimeout(() => {
      let botResponseText = '';
      const query = text.toLowerCase();

      if (query.includes('ราคา') || query.includes('เสนอราคา') || query.includes('ค่าใช้จ่าย')) {
        botResponseText = 'ระบบ SHIF มีราคาพิเศษสำหรับกลุ่มลูกค้าอุตสาหกรรม B2B ค่ะ หากต้องการใบเสนอราคาอย่างรวดเร็ว สามารถกรอกฟอร์มขอใบเสนอราคาบนหน้าแรก หรือ สลับแท็บด้านบนเพื่อแอดไลน์แอดส่งรายละเอียดให้เจ้าหน้าที่ได้เลยค่ะ 🚚';
      } else if (query.includes('ลงทะเบียน') || query.includes('สมัคร') || query.includes('เข้าสู่ระบบ') || query.includes('รหัสผ่าน')) {
        botResponseText = 'หากลูกค้าต้องการเริ่มใช้งาน สามารถกดสมัครบัญชีใหม่ได้ที่หน้าหลักค่ะ หรือหากเป็นพนักงานขับรถที่ได้รับการมอบหมายงาน ให้ตรวจเช็ก SMS ลิงก์เข้าสู่ระบบหรือขอการรีเซ็ตรหัสผ่านใหม่จากแอดมินบริษัทของคุณ หากยังมีปัญหาเพิ่มเติมสามารถแจ้งเราทาง Line ได้ค่ะ';
      } else if (query.includes('คาร์บอน') || query.includes('คำนวณ') || query.includes('tgo') || query.includes('carbon')) {
        botResponseText = 'แพลตฟอร์มของเราคำนวณ Carbon Emission อิงตามหลักการ Activity-based Approach ของ TGO (น้ำหนักบรรทุก x ระยะทางจริง x Emission Factor) ซึ่งให้ค่าที่แม่นยำและเป็นมาตรฐานสากลพร้อมตรวจสอบย้อนกลับได้ค่ะ 🌿';
      } else if (query.includes('พิกัด') || query.includes('gps') || query.includes('ติดตาม') || query.includes('รถ') || query.includes('เรียลไทม์')) {
        botResponseText = 'พิกัด GPS จะอัปเดตแบบเรียลไทม์เมื่อคนขับรถเริ่มออกเดินทางบนระบบขนส่งค่ะ โดยพิกัดจะดึงจากอุปกรณ์ GPS ของรถพ่วง/หัวลาก หรือผ่านแอปพลิเคชันมือถือของคนขับรถโดยอัตโนมัติค่ะ 📍';
      } else {
        botResponseText = 'ขอบคุณสำหรับคำถามนะคะ หากมีเรื่องด่วนแนะนำให้กดแอด Line ที่ปุ่ม "แอดไลน์ Line Support" ด้านบน หรือสแกน QR Code แอดไลน์ `@768lhrgq` ได้ตลอด 24 ชั่วโมง เพื่อให้เจ้าหน้าที่ฝ่ายช่วยเหลือแก้ปัญหาให้ท่านโดยตรงทันทีค่ะ! 💬';
      }

      const botMessage: Message = {
        id: `msg-${Date.now() + 1}`,
        text: botResponseText,
        sender: 'bot',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages(prev => [...prev, botMessage]);
      setIsTyping(false);
    }, 1500);
  };

  const handleSuggestionClick = (suggestion: string) => {
    handleSendMessage(suggestion);
  };

  const suggestions = [
    'สอบถามราคา & ขอใบเสนอราคา',
    'พบปัญหาการลงทะเบียน/เข้าสู่ระบบ',
    'สอบถามวิธีคำนวณ Carbon Emission',
    'ระบบ GPS ติดตามเที่ยววิ่ง Real-time'
  ];

  if (isDriver) return null;

  return (
    <>
      {/* ── Notification Toast ── */}
      {showNotification && !isOpen && (
        <div 
          className="fixed bottom-24 right-6 z-50 bg-white border border-[#E8ECF1] rounded-2xl shadow-lg p-4 max-w-xs animate-fade-in flex items-start gap-3 cursor-pointer"
          onClick={() => {
            setIsOpen(true);
            setShowNotification(false);
          }}
        >
          <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0 animate-pulse">
            <Headphones size={20} />
          </div>
          <div>
            <h5 className="text-[13px] font-bold text-slate-800">ต้องการความช่วยเหลือไหมคะ?</h5>
            <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">คลิกเพื่อสอบถามข้อมูลหรือขอรับความช่วยเหลือ และแอด Line ติดต่อเจ้าหน้าที่</p>
          </div>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setShowNotification(false);
            }}
            className="text-slate-400 hover:text-slate-600 flex-shrink-0"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── Floating Chat Button ── */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          setShowNotification(false);
        }}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center text-white transition-all duration-300 hover:scale-110 shadow-lg active:scale-95 cursor-pointer ${
          isOpen ? 'bg-slate-900 hover:bg-slate-800' : 'bg-emerald-600 hover:bg-emerald-500'
        }`}
        style={{
          boxShadow: isOpen ? '0 8px 30px rgba(15,23,42,0.3)' : '0 8px 30px rgba(16,185,129,0.3)',
        }}
      >
        {isOpen ? (
          <X size={24} className="animate-fade-in" />
        ) : (
          <div className="relative">
            <MessageCircle size={26} className="animate-fade-in" />
            <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-emerald-600 animate-ping" />
            <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-emerald-600" />
          </div>
        )}
      </button>

      {/* ── Chat Panel ── */}
      {isOpen && (
        <div 
          className="fixed bottom-24 right-6 z-50 w-[380px] max-w-[calc(100vw-2rem)] h-[560px] flex flex-col rounded-3xl overflow-hidden glass border border-white/40 shadow-2xl animate-fade-in"
          style={{
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.15)',
          }}
        >
          {/* Header */}
          <div className="p-5 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white relative">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-md">
                  <Headphones size={22} className="text-white" />
                </div>
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 rounded-full ring-2 ring-emerald-600" />
              </div>
              <div>
                <h4 className="text-[14px] font-bold">ฝ่ายบริการลูกค้า SHIF</h4>
                <p className="text-[11px] text-emerald-100 flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse-dot" />
                  ออนไลน์ • พร้อมช่วยเหลือคุณ
                </p>
              </div>
            </div>
            
            {/* Close Button Inside Header for Mobile convenience */}
            <button 
              onClick={() => setIsOpen(false)}
              className="absolute top-5 right-5 text-white/80 hover:text-white transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-100 bg-white/85 backdrop-blur-sm">
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex-1 py-3 text-[12px] font-bold flex items-center justify-center gap-1.5 border-b-2 transition-all cursor-pointer ${
                activeTab === 'chat' 
                  ? 'border-emerald-600 text-emerald-600 bg-emerald-50/20' 
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <MessageSquare size={14} />
              พูดคุยช่วยเหลือ
            </button>
            <button
              onClick={() => setActiveTab('line')}
              className={`flex-1 py-3 text-[12px] font-bold flex items-center justify-center gap-1.5 border-b-2 transition-all cursor-pointer ${
                activeTab === 'line' 
                  ? 'border-emerald-600 text-emerald-600 bg-emerald-50/20' 
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <QrCode size={14} />
              แอดไลน์ Line Support
            </button>
          </div>

          {/* Tab Content Area */}
          <div className="flex-1 overflow-y-auto bg-slate-50/90 p-4 flex flex-col min-h-0">
            {activeTab === 'chat' ? (
              <>
                {/* Chat Message Thread */}
                <div className="flex-1 flex flex-col gap-3 min-h-0 overflow-y-auto pr-1">
                  {messages.map((msg) => {
                    const isBot = msg.sender === 'bot';
                    return (
                      <div 
                        key={msg.id} 
                        className={`flex items-start gap-2.5 max-w-[85%] animate-fade-in ${
                          isBot ? 'self-start' : 'self-end flex-row-reverse'
                        }`}
                      >
                        <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] ${
                          isBot ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'
                        }`}>
                          {isBot ? <Sparkles size={12} /> : <User size={12} />}
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <div className={`px-4 py-2.5 rounded-[20px] text-[13px] leading-relaxed shadow-sm ${
                            isBot 
                              ? 'bg-white text-slate-800 rounded-tl-none' 
                              : 'bg-emerald-600 text-white rounded-tr-none'
                          }`}>
                            {msg.text}
                          </div>
                          <span className={`text-[9px] mt-0.5 ${isBot ? 'text-slate-400 pl-1' : 'text-slate-400 pr-1 text-right'}`}>
                            {msg.time}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                  
                  {/* Typing Indicator */}
                  {isTyping && (
                    <div className="flex items-start gap-2.5 max-w-[85%] self-start animate-fade-in">
                      <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] bg-emerald-100 text-emerald-700">
                        <Sparkles size={12} />
                      </div>
                      <div className="px-4 py-3 bg-white text-slate-500 rounded-[20px] rounded-tl-none shadow-sm flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Suggestions List */}
                <div className="mt-4 border-t border-slate-100 pt-3 pb-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">คำถามที่พบบ่อย (คลิกเพื่อถาม)</p>
                  <div className="flex flex-col gap-1.5">
                    {suggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="text-left px-3 py-1.5 rounded-xl border border-slate-100 bg-white hover:border-emerald-500/30 hover:bg-emerald-50/20 text-slate-700 hover:text-emerald-700 text-[12px] font-medium transition-all flex items-center justify-between group cursor-pointer"
                      >
                        {suggestion}
                        <ChevronRight size={12} className="text-slate-400 group-hover:text-emerald-600 transition-colors" />
                      </button>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              /* LINE QR Code Tab */
              <div className="flex-1 flex flex-col justify-between py-2 text-center items-center">
                <div className="w-full">
                  <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 mx-auto mb-3">
                    <QrCode size={24} />
                  </div>
                  <h5 className="text-[15px] font-bold text-slate-800">แอดเพื่อนทาง Line Official</h5>
                  <p className="text-[12px] text-slate-500 mt-1.5 px-4 leading-relaxed">
                    สแกน QR Code ด้านล่างนี้ หรือคลิกปุ่มแอดไลน์ เพื่อแชตติดต่อเจ้าหน้าที่ช่วยเหลือทางเทคนิค/ฝ่ายขายได้โดยตรงแบบเรียลไทม์
                  </p>
                </div>

                {/* QR Code Container */}
                <div className="my-4 p-3 bg-white border border-slate-100 rounded-2xl shadow-md inline-block relative group transition-transform hover:scale-102">
                  <img 
                    src="/line-qr.png" 
                    alt="Line Official QR Code" 
                    className="w-40 h-40 object-cover" 
                  />
                  <div className="absolute inset-0 bg-emerald-600/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl pointer-events-none" />
                </div>

                <div className="w-full px-2">
                  <a 
                    href="https://line.me/R/ti/p/%40768lhrgq" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 py-3 bg-[#06C755] hover:bg-[#05b54d] text-white rounded-xl text-[13px] font-bold transition-all shadow-lg active:scale-98 cursor-pointer"
                    style={{
                      boxShadow: '0 4px 15px rgba(6,199,85,0.25)',
                    }}
                  >
                    แอด Line Official (@768lhrgq)
                    <ExternalLink size={14} />
                  </a>
                  <p className="text-[10px] text-slate-400 mt-2">เปิดลิงก์อัตโนมัติในแอปพลิเคชัน Line ของคุณ</p>
                </div>
              </div>
            )}
          </div>

          {/* Footer Input Area (Only for chat tab) */}
          {activeTab === 'chat' && (
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage(inputValue);
              }}
              className="p-3 bg-white border-t border-slate-100 flex items-center gap-2"
            >
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="พิมพ์ข้อความที่นี่..."
                className="flex-1 px-4 py-2 text-[13px] rounded-xl border border-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/25 bg-slate-50/50 focus:bg-white transition-all text-slate-800"
              />
              <button
                type="submit"
                disabled={!inputValue.trim()}
                className="w-9 h-9 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white flex items-center justify-center transition-all cursor-pointer flex-shrink-0"
              >
                <Send size={15} />
              </button>
            </form>
          )}
        </div>
      )}
    </>
  );
}
