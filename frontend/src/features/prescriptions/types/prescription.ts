export interface PrescriptionItem {
  id: string;
  prescription_id: string;
  medicine_name: string;
  medicine_id?: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  quantity?: string;
  instructions?: string;
  created_at: string;
}

export interface Prescription {
  id: string;
  patient_id: string;
  doctor_name?: string;
  prescription_date?: string;
  valid_until?: string;
  diagnosis?: string;
  image_url?: string;
  notes?: string;
  status: 'Active' | 'Expired' | 'Fulfilled' | 'Cancelled';
  created_at: string;
  updated_at: string;
  items: PrescriptionItem[];
}

export interface PaginatedPrescriptions {
  total: number;
  items: Prescription[];
}

export interface PrescriptionItemCreate {
  medicine_name: string;
  medicine_id?: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  quantity?: string;
  instructions?: string;
}

export interface PrescriptionCreatePayload {
  patient_id: string;
  doctor_name?: string;
  prescription_date?: string;
  valid_until?: string;
  diagnosis?: string;
  image_url?: string;
  notes?: string;
  status?: string;
  items: PrescriptionItemCreate[];
}

export interface PrescriptionUpdatePayload extends Partial<PrescriptionCreatePayload> {}
