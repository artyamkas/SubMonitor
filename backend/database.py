import sqlite3
import os

DB_NAME = os.getenv("DB_PATH")

def init_db():
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS category (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            color TEXT NOT NULL
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS payment_method (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            type TEXT NOT NULL CHECK(type IN ('bank', 'sbp', 'card')),
            name TEXT NOT NULL
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS subscription (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            icon_url TEXT,
            cost REAL NOT NULL,
            period TEXT NOT NULL,
            next_payment_date TEXT NOT NULL,
            is_active BOOLEAN NOT NULL DEFAULT 1,
            category_id INTEGER,
            payment_method_id INTEGER,
            FOREIGN KEY (category_id) REFERENCES category(id),
            FOREIGN KEY (payment_method_id) REFERENCES payment_method(id)
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS payment_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL,
            amount REAL NOT NULL,
            subscription_id INTEGER NOT NULL,
            status TEXT NOT NULL CHECK(status IN ('paid', 'cancelled')),
            payment_method_id INTEGER,
            FOREIGN KEY (subscription_id) REFERENCES subscription(id),
            FOREIGN KEY (payment_method_id) REFERENCES payment_method(id)
        )
    """)

    conn.commit()
    conn.close()