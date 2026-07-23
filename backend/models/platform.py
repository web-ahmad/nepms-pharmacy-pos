from sqlalchemy import Column, String, Boolean, ForeignKey, Numeric, DateTime, JSON, Text, Integer
from sqlalchemy.orm import relationship
from .base import BaseModel


class PlatformCoupon(BaseModel):
    __tablename__ = "platform_coupons"

    code = Column(String(50), nullable=False, unique=True, index=True)
    description = Column(String(255), nullable=True)
    discount_type = Column(String(20), nullable=False, default="percentage")  # percentage, fixed
    discount_value = Column(Numeric(10, 2), nullable=False, default=0)
    max_redemptions = Column(Integer, nullable=True)
    times_redeemed = Column(Integer, nullable=False, default=0)
    valid_from = Column(DateTime, nullable=True)
    valid_until = Column(DateTime, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)


class PlatformCurrency(BaseModel):
    __tablename__ = "platform_currencies"

    code = Column(String(3), nullable=False, unique=True, index=True)  # e.g. PKR, USD
    name = Column(String(100), nullable=False)
    symbol = Column(String(10), nullable=False)
    exchange_rate = Column(Numeric(18, 6), nullable=False, default=1)  # relative to base currency
    is_base = Column(Boolean, nullable=False, default=False)
    is_active = Column(Boolean, nullable=False, default=True)


class ReferralProgramSettings(BaseModel):
    __tablename__ = "referral_program_settings"

    reward_type = Column(String(20), nullable=False, default="percentage")  # percentage, fixed
    reward_value = Column(Numeric(10, 2), nullable=False, default=0)
    reward_duration_months = Column(Integer, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    terms = Column(Text, nullable=True)


class PharmacyReferral(BaseModel):
    __tablename__ = "pharmacy_referrals"

    referrer_pharmacy_id = Column(String(36), ForeignKey("pharmacies.id"), nullable=False)
    referred_pharmacy_id = Column(String(36), ForeignKey("pharmacies.id"), nullable=True)
    referral_code = Column(String(50), nullable=False, unique=True, index=True)
    status = Column(String(20), nullable=False, default="pending")  # pending, converted, rewarded
    reward_amount = Column(Numeric(10, 2), nullable=True)
    rewarded_at = Column(DateTime, nullable=True)

    referrer_pharmacy = relationship("Pharmacy", foreign_keys=[referrer_pharmacy_id])
    referred_pharmacy = relationship("Pharmacy", foreign_keys=[referred_pharmacy_id])


class MediaAsset(BaseModel):
    __tablename__ = "media_assets"

    filename = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=False)
    url = Column(String(500), nullable=False)
    mime_type = Column(String(100), nullable=True)
    size_bytes = Column(Integer, nullable=False, default=0)
    folder = Column(String(100), nullable=False, default="general")


class PlatformSettings(BaseModel):
    __tablename__ = "platform_settings"

    platform_name = Column(String(150), nullable=False, default="NEPMS")
    support_email = Column(String(150), nullable=True)
    support_phone = Column(String(50), nullable=True)
    default_currency_code = Column(String(3), nullable=True)
    maintenance_mode = Column(Boolean, nullable=False, default=False)
    maintenance_message = Column(Text, nullable=True)
    feature_flags = Column(JSON, nullable=True)
