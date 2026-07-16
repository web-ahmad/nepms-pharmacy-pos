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

  // Phase 9 CRM Fields
  preferred_branch_id?: string;
  preferred_language?: string;
  marketing_opt_in?: boolean;
  whatsapp_opt_in?: boolean;
  email_opt_in?: boolean;
  sms_opt_in?: boolean;
  anniversary?: string;
  occupation?: string;
  risk_score?: number;
  last_visit?: string;
  lifetime_value?: number;
  average_basket?: number;
  total_orders?: number;
  total_returns?: number;
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

// ── Phase 9 CRM Extensions ────────────────────────────────────────────────

export interface WalletTransaction {
  id: string;
  transaction_date: string;
  amount: number;
  transaction_type: string;
  opening_balance: number;
  closing_balance: number;
  notes?: string;
}

export interface CustomerWallet {
  id: string;
  balance: number;
  available_balance: number;
  pending_balance: number;
  currency: string;
  last_transaction_at?: string;
  transactions: WalletTransaction[];
}

export interface WalletTransactionCreate {
  amount: number;
  transaction_type: string;
  notes?: string;
  source_module?: string;
  source_id?: string;
}

export interface TimelineItem {
  date: string;
  type: string;
  title: string;
  description?: string;
  reference_id?: string;
  amount?: number;
  points?: number;
}

export interface CustomerSegment {
  segment_name: string;
  calculated_at: string;
}

export interface MarketingCampaign {
  id: string;
  name: string;
  channel: string;
  target_audience_type: string;
  target_segment?: string;
  target_loyalty_tier?: string;
  template_body: string;
  schedule_date?: string;
  status: string;
  campaign_code?: string;
  estimated_reach: number;
  sent_count: number;
  delivered_count: number;
  failed_count: number;
  opened_count: number;
  clicked_count: number;
  conversion_count: number;
  created_at: string;
}

export interface MarketingCampaignCreate {
  name: string;
  channel: string;
  target_audience_type: string;
  target_segment?: string;
  target_loyalty_tier?: string;
  template_body: string;
  schedule_date?: string;
  status?: string;
}

export interface CustomerReferral {
  id: string;
  referral_code: string;
  referred_id?: string;
  status: string;
  reward_issued: boolean;
  reward_date?: string;
}
