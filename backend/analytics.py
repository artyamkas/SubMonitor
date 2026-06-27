import sqlite3
from datetime import date, timedelta
from database import DB_NAME

def get_conn():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    return conn

def get_upcoming_payments(days: int = 7):
    today = date.today().isoformat()
    future = (date.today() + timedelta(days=days)).isoformat()
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT s.name, s.icon_url, s.cost, s.next_payment_date FROM subscription s WHERE s.is_active=1 AND s.next_payment_date BETWEEN ? AND ?",
            (today, future)
        ).fetchall()
        return [dict(r) for r in rows]

def get_total_spent():
    with get_conn() as conn:
        row = conn.execute("SELECT COALESCE(SUM(amount),0) as total FROM payment_history WHERE status='paid'").fetchone()
        return {"total_spent": row["total"]}

def get_monthly_yearly_estimate():
    with get_conn() as conn:
        rows = conn.execute("SELECT cost, period FROM subscription WHERE is_active=1").fetchall()
    
    monthly = 0.0
    for r in rows:
        cost = r["cost"]
        period = r["period"].lower()
        if period == "month":
            monthly += cost
        elif period == "year":
            monthly += cost / 12
        elif period == "week":
            monthly += cost * 4.33
    
    return {"monthly_estimate": round(monthly, 2), "yearly_estimate": round(monthly * 12, 2)}

def get_spent_by_category():
    with get_conn() as conn:
        rows = conn.execute("""
            SELECT c.name, c.color, COALESCE(SUM(ph.amount),0) as spent
            FROM category c
            LEFT JOIN subscription s ON s.category_id = c.id
            LEFT JOIN payment_history ph ON ph.subscription_id = s.id AND ph.status='paid'
            GROUP BY c.id
        """).fetchall()
        return [dict(r) for r in rows]

def get_subscription_stats(sub_id: int):
    with get_conn() as conn:
        sub = conn.execute("SELECT * FROM subscription WHERE id=?", (sub_id,)).fetchone()
        if not sub:
            return None
        payments = conn.execute(
            "SELECT COUNT(*) as count, COALESCE(SUM(amount),0) as spent FROM payment_history WHERE subscription_id=? AND status='paid'",
            (sub_id,)
        ).fetchone()
        return {
            "subscription": dict(sub),
            "total_payments": payments["count"],
            "total_spent": payments["spent"]
        }

def get_subscription_counts():
    with get_conn() as conn:
        active = conn.execute("SELECT COUNT(*) as cnt FROM subscription WHERE is_active=1").fetchone()["cnt"]
        inactive = conn.execute("SELECT COUNT(*) as cnt FROM subscription WHERE is_active=0").fetchone()["cnt"]
        return {"active": active, "inactive": inactive}