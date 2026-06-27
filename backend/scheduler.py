import sqlite3
from datetime import date, timedelta
from database import DB_NAME
import crud


def _calc_next_date(current_date_str: str, period: str) -> str:
    d = date.fromisoformat(current_date_str)
    if period == 'month':
        month = d.month + 1
        year = d.year
        if month > 12:
            month = 1
            year += 1
        day = min(d.day, 28)
        return date(year, month, day).isoformat()
    elif period == 'year':
        return date(d.year + 1, d.month, min(d.day, 28)).isoformat()
    elif period == 'week':
        return (d + timedelta(days=7)).isoformat()
    return current_date_str


def check_and_create_payments():
    today = date.today().isoformat()
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    rows = conn.execute(
        "SELECT id, cost, period, next_payment_date FROM subscription WHERE is_active=1 AND next_payment_date<=?",
        (today,)
    ).fetchall()

    created = []
    for row in rows:
        payment = crud.create_payment(
            date=today,
            amount=row["cost"],
            subscription_id=row["id"],
            status="paid",
            payment_method_id=None
        )
        new_date = _calc_next_date(row["next_payment_date"], row["period"])
        conn.execute("UPDATE subscription SET next_payment_date=? WHERE id=?", (new_date, row["id"]))
        created.append(payment)

    conn.commit()
    conn.close()
    return {"checked": len(rows), "created_payments": created}