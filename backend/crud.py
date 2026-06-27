import sqlite3
from database import DB_NAME

def get_conn():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    return conn

# --- CATEGORY ---
def create_category(name: str, color: str):
    with get_conn() as conn:
        cur = conn.execute("INSERT INTO category (name, color) VALUES (?, ?)", (name, color))
        return {"id": cur.lastrowid, "name": name, "color": color}

def update_category(cat_id: int, name: str, color: str):
    with get_conn() as conn:
        conn.execute("UPDATE category SET name=?, color=? WHERE id=?", (name, color, cat_id))
        return {"id": cat_id, "name": name, "color": color}

def delete_category(cat_id: int):
    with get_conn() as conn:
        conn.execute("DELETE FROM category WHERE id=?", (cat_id,))

# --- PAYMENT METHOD ---
def create_payment_method(type_: str, name: str):
    with get_conn() as conn:
        cur = conn.execute("INSERT INTO payment_method (type, name) VALUES (?, ?)", (type_, name))
        return {"id": cur.lastrowid, "type": type_, "name": name}

def update_payment_method(pm_id: int, type_: str, name: str):
    with get_conn() as conn:
        conn.execute("UPDATE payment_method SET type=?, name=? WHERE id=?", (type_, name, pm_id))
        return {"id": pm_id, "type": type_, "name": name}

def delete_payment_method(pm_id: int):
    with get_conn() as conn:
        conn.execute("DELETE FROM payment_method WHERE id=?", (pm_id,))

# --- SUBSCRIPTION ---
def create_subscription(name, icon_url, cost, period, next_payment_date, is_active, category_id, payment_method_id):
    with get_conn() as conn:
        cur = conn.execute(
            "INSERT INTO subscription (name, icon_url, cost, period, next_payment_date, is_active, category_id, payment_method_id) VALUES (?,?,?,?,?,?,?,?)",
            (name, icon_url, cost, period, next_payment_date, is_active, category_id, payment_method_id)
        )
        return {"id": cur.lastrowid}

def update_subscription(sub_id, **kwargs):
    fields = []
    values = []
    for k, v in kwargs.items():
        # Пустую строку для icon_url превращаем в None
        if k == 'icon_url' and v == '':
            v = None
        # Для icon_url разрешаем запись NULL, для остальных полей пропускаем None
        if k == 'icon_url' or v is not None:
            fields.append(f"{k}=?")
            values.append(v)
    values.append(sub_id)
    with get_conn() as conn:
        conn.execute(f"UPDATE subscription SET {','.join(fields)} WHERE id=?", values)

def delete_subscription(sub_id: int):
    with get_conn() as conn:
        conn.execute("DELETE FROM subscription WHERE id=?", (sub_id,))

# --- PAYMENT HISTORY ---
def create_payment(date, amount, subscription_id, status, payment_method_id):
    with get_conn() as conn:
        cur = conn.execute(
            "INSERT INTO payment_history (date, amount, subscription_id, status, payment_method_id) VALUES (?,?,?,?,?)",
            (date, amount, subscription_id, status, payment_method_id)
        )
        return {"id": cur.lastrowid}

def cancel_payment(payment_id: int):
    with get_conn() as conn:
        conn.execute("UPDATE payment_history SET status='cancelled' WHERE id=?", (payment_id,))

# --- GET ALL ---
def get_all_categories():
    with get_conn() as conn:
        return [dict(row) for row in conn.execute("SELECT * FROM category").fetchall()]

def get_all_payment_methods():
    with get_conn() as conn:
        return [dict(row) for row in conn.execute("SELECT * FROM payment_method").fetchall()]

def get_all_subscriptions():
    with get_conn() as conn:
        return [dict(row) for row in conn.execute("SELECT * FROM subscription").fetchall()]

def get_all_payments():
    with get_conn() as conn:
        return [dict(row) for row in conn.execute("SELECT * FROM payment_history").fetchall()]

# --- GET BY ID ---
def get_category(cat_id: int):
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM category WHERE id=?", (cat_id,)).fetchone()
        return dict(row) if row else None

def get_payment_method(pm_id: int):
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM payment_method WHERE id=?", (pm_id,)).fetchone()
        return dict(row) if row else None

def get_subscription(sub_id: int):
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM subscription WHERE id=?", (sub_id,)).fetchone()
        return dict(row) if row else None

def get_payment(payment_id: int):
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM payment_history WHERE id=?", (payment_id,)).fetchone()
        return dict(row) if row else None