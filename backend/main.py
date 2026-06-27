from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from database import init_db
from schemas import (
    CategoryCreate, CategoryUpdate, CategoryResponse,
    PaymentMethodCreate, PaymentMethodUpdate, PaymentMethodResponse,
    SubscriptionCreate, SubscriptionUpdate, SubscriptionResponse,
    PaymentCreate, PaymentResponse
)
import crud
from apscheduler.schedulers.background import BackgroundScheduler
from scheduler import check_and_create_payments
import analytics

app = FastAPI(title="Subscription Monitor API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup():
    init_db()

@app.get("/health")
def health_check():
    return {"status": "ok"}

# --- Categories ---
@app.post("/categories", response_model=CategoryResponse)
def create_category(data: CategoryCreate):
    return crud.create_category(data.name, data.color)

@app.get("/categories", response_model=list[CategoryResponse])
def get_categories():
    return crud.get_all_categories()

@app.put("/categories/{cat_id}", response_model=CategoryResponse)
def update_category(cat_id: int, data: CategoryUpdate):
    if not crud.get_category(cat_id):
        raise HTTPException(404, "Category not found")
    return crud.update_category(cat_id, data.name, data.color)

@app.delete("/categories/{cat_id}")
def delete_category(cat_id: int):
    if not crud.get_category(cat_id):
        raise HTTPException(404, "Category not found")
    crud.delete_category(cat_id)
    return {"ok": True}

# --- Payment Methods ---
@app.post("/payment-methods", response_model=PaymentMethodResponse)
def create_payment_method(data: PaymentMethodCreate):
    return crud.create_payment_method(data.type, data.name)

@app.get("/payment-methods", response_model=list[PaymentMethodResponse])
def get_payment_methods():
    return crud.get_all_payment_methods()

@app.put("/payment-methods/{pm_id}", response_model=PaymentMethodResponse)
def update_payment_method(pm_id: int, data: PaymentMethodUpdate):
    if not crud.get_payment_method(pm_id):
        raise HTTPException(404, "Payment method not found")
    return crud.update_payment_method(pm_id, data.type, data.name)

@app.delete("/payment-methods/{pm_id}")
def delete_payment_method(pm_id: int):
    if not crud.get_payment_method(pm_id):
        raise HTTPException(404, "Payment method not found")
    crud.delete_payment_method(pm_id)
    return {"ok": True}

# --- Subscriptions ---
@app.post("/subscriptions", response_model=SubscriptionResponse)
def create_subscription(data: SubscriptionCreate):
    result = crud.create_subscription(**data.model_dump())
    return crud.get_subscription(result["id"])

@app.get("/subscriptions", response_model=list[SubscriptionResponse])
def get_subscriptions():
    return crud.get_all_subscriptions()

@app.put("/subscriptions/{sub_id}", response_model=SubscriptionResponse)
def update_subscription(sub_id: int, data: SubscriptionUpdate):
    if not crud.get_subscription(sub_id):
        raise HTTPException(404, "Subscription not found")
    crud.update_subscription(sub_id, **data.model_dump(exclude_unset=True))
    return crud.get_subscription(sub_id)

@app.delete("/subscriptions/{sub_id}")
def delete_subscription(sub_id: int):
    if not crud.get_subscription(sub_id):
        raise HTTPException(404, "Subscription not found")
    crud.delete_subscription(sub_id)
    return {"ok": True}

# --- Payments ---
@app.post("/payments", response_model=PaymentResponse)
def create_payment(data: PaymentCreate):
    return crud.create_payment(**data.model_dump())

@app.get("/payments", response_model=list[PaymentResponse])
def get_payments():
    return crud.get_all_payments()

@app.patch("/payments/{payment_id}/cancel")
def cancel_payment(payment_id: int):
    if not crud.get_payment(payment_id):
        raise HTTPException(404, "Payment not found")
    crud.cancel_payment(payment_id)
    return {"ok": True}

# Ручной запуск через API
@app.post("/check-payments")
def manual_check_payments():
    return check_and_create_payments()

# Расписание (APS)
scheduler = BackgroundScheduler()
scheduler.add_job(check_and_create_payments, "cron", hour=1, minute=0)

@app.on_event("startup")
def start_scheduler():
    scheduler.start()

@app.get("/analytics/upcoming")
def upcoming_payments(days: int = 7):
    return analytics.get_upcoming_payments(days)

@app.get("/analytics/total-spent")
def total_spent():
    return analytics.get_total_spent()

@app.get("/analytics/estimates")
def monthly_yearly_estimates():
    return analytics.get_monthly_yearly_estimate()

@app.get("/analytics/by-category")
def spent_by_category():
    return analytics.get_spent_by_category()

@app.get("/analytics/subscriptions/count")
def subscription_counts():
    return analytics.get_subscription_counts()

@app.get("/analytics/subscriptions/{sub_id}")
def subscription_stats(sub_id: int):
    result = analytics.get_subscription_stats(sub_id)
    if not result:
        raise HTTPException(404, "Subscription not found")
    return result