import type { DriverDocumentType } from '@/models/LineDriver';

export const DRIVER_DOCUMENT_LABELS: Record<DriverDocumentType, string> = {
  national_id: 'บัตรประชาชน',
  driving_license: 'ใบขับขี่',
  head_registration: 'ทะเบียนรถหัว',
  tail_registration: 'ทะเบียนรถหาง',
  vehicle_insurance: 'ประกันรถ',
  head_compulsory_insurance: 'พ.ร.บ. หัว',
  tail_compulsory_insurance: 'พ.ร.บ. หาง',
  cargo_insurance: 'ประกันสินค้า',
  phone_number: 'เบอร์โทรศัพท์',
  bank_account: 'บัญชีโอนเงิน',
  pod_image: 'รูปส่งงาน',
  delivery_documents_video: 'วิดีโอเอกสาร',
};

export const ONBOARDING_DOCUMENT_TYPES: DriverDocumentType[] = [
  'national_id',
  'driving_license',
  'head_registration',
  'tail_registration',
  'vehicle_insurance',
  'head_compulsory_insurance',
  'tail_compulsory_insurance',
  'cargo_insurance',
  'phone_number',
  'bank_account',
];

export function getDocumentLabel(type?: DriverDocumentType) {
  return type ? DRIVER_DOCUMENT_LABELS[type] : 'เอกสาร';
}

export function parseBankText(text: string) {
  const normalized = text.replace(/\s+/g, ' ').trim();
  const withoutPrefix = normalized.replace(/^บัญชี\s*/i, '');
  const parts = withoutPrefix.split(' ');
  return {
    bankName: parts[0] || '',
    bankAccountNumber: parts[1] || '',
    bankAccountName: parts.slice(2).join(' '),
  };
}
