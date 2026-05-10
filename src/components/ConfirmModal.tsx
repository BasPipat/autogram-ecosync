import React from 'react';
import { X, Loader2, LucideIcon } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => void;
  title: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  loading: boolean;
  submitLabel: string;
  submitIcon: LucideIcon;
  submitColor?: string;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  title,
  label,
  placeholder,
  value,
  onChange,
  loading,
  submitLabel,
  submitIcon: SubmitIcon,
  submitColor = 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'
}) => {
  if (!isOpen) return null;

  const isValidUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const isSubmitDisabled = loading || !value.trim() || !isValidUrl(value);

  return (
    <div className="fixed inset-0 flex items-center justify-center z-[100] p-4 bg-slate-900/40 backdrop-blur-md">
      <div className="w-full max-w-md p-8 bg-white rounded-[40px] shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-300">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-black text-slate-800 tracking-tight">{title}</h3>
          <button 
            onClick={onClose} 
            className="w-10 h-10 flex items-center justify-center hover:bg-slate-50 rounded-2xl text-slate-300 transition-all"
          >
            <X size={20} />
          </button>
        </div>
        <div className="space-y-6">
          <div>
            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-1">
              {label}
            </label>
            <input
              type="url"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className={`w-full px-6 py-4 rounded-2xl text-[14px] border outline-none transition-all ${
                value && !isValidUrl(value) 
                  ? 'border-red-300 bg-red-50 focus:ring-red-500/10 focus:border-red-500' 
                  : 'border-slate-100 bg-slate-50 focus:ring-blue-500/10 focus:border-blue-500'
              }`}
              placeholder={placeholder}
            />
            {value && !isValidUrl(value) && (
              <p className="text-[10px] text-red-500 mt-2 ml-1 font-bold">Please enter a valid URL (e.g. https://...)</p>
            )}
          </div>
          <div className="flex gap-4">
            <button 
              onClick={onClose} 
              className="flex-1 px-6 py-4 rounded-2xl text-[14px] font-bold text-slate-400 bg-slate-50 hover:bg-slate-100 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={onSubmit}
              disabled={isSubmitDisabled}
              className={`flex-2 px-6 py-4 rounded-2xl text-[14px] font-black text-white disabled:opacity-50 transition-all flex items-center justify-center gap-3 shadow-xl ${submitColor}`}
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : <SubmitIcon size={18} />}
              {submitLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
