from pydantic import BaseModel
from typing import Optional

# --- Category ---
class CategoryBase(BaseModel):
    name: str
    color: str

class CategoryCreate(CategoryBase):
    pass

class CategoryUpdate(CategoryBase):
    pass

# --- Payment Method ---
class PaymentMethodBase(BaseModel):
    type: str  # bank, sbp, card
    name: str

class PaymentMethodCreate(PaymentMethodBase):
    pass

class PaymentMethodUpdate(PaymentMethodBase):
    pass

# --- Subscription ---
class SubscriptionBase(BaseModel):
    name: str
    icon_url: Optional[str] = None
    cost: float
    period: str
    next_payment_date: str
    is_active: bool = True
    category_id: Optional[int] = None
    payment_method_id: Optional[int] = None

class SubscriptionCreate(SubscriptionBase):
    pass

class SubscriptionUpdate(BaseModel):
    name: Optional[str] = None
    icon_url: Optional[str] = None
    cost: Optional[float] = None
    period: Optional[str] = None
    next_payment_date: Optional[str] = None
    is_active: Optional[bool] = None
    category_id: Optional[int] = None
    payment_method_id: Optional[int] = None
    
# --- Payment History ---
class PaymentCreate(BaseModel):
    date: str
    amount: float
    subscription_id: int
    status: str = "paid"  # paid or cancelled
    payment_method_id: Optional[int] = None

# --- Response Schemas ---
class CategoryResponse(CategoryBase):
    id: int

class PaymentMethodResponse(PaymentMethodBase):
    id: int

class SubscriptionResponse(SubscriptionBase):
    id: int

class PaymentResponse(PaymentCreate):
    id: int