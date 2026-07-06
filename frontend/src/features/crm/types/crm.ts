export interface Customer {
  id: string;
  full_name: string;
  phone?: string;
  cnic?: string;
  whatsapp?: string;
  email?: string;
  dob?: string;
  gender?: string;
  address?: string;
  blood_group?: string;
  medical_history?: string;
  allergies?: string;
  credit_limit: number;
  current_balance: number;
  loyalty_points: number;
  loyalty_tier: string;
  is_active?: boolean;
  created_at: string;
  updated_at: string;
}

export interface CustomerLedger {
  id: string;
  transaction_date: string;
  transaction_type: string;
  reference_id: string;
  debit: number;
  credit: number;
  balance_after: number;
  notes?: string;
}

export interface LoyaltyTransaction {
  id: string;
  customer_id: string;
  sale_id?: string;
  transaction_date: string;
  points: number;
  transaction_type: string;
  reason?: string;
}

export interface CustomerPayment {
  id: string;
  customer_id: string;
  amount: number;
  payment_method: string;
  payment_date: string;
}

// Payloads
export interface CreateCustomerPayload {
  full_name: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  dob?: string;
  gender?: string;
  address?: string;
  blood_group?: string;
  medical_history?: string;
  allergies?: string;
  credit_limit: number;
  is_active?: boolean;
}

export interface CustomerPaymentPayload {
  amount: number;
  payment_method: string;
  reference_number?: string;
  notes?: string;
  sale_id?: string;
}

export interface LoyaltyRedeemPayload {
  points_to_redeem: number;
  reason?: string;
}
