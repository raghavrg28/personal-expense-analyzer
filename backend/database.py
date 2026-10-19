import sqlite3
import os
import json
import subprocess
import datetime
from typing import List, Dict, Any, Optional

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "expenses.db")
CPP_ENGINE_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "cpp_engine")
CPP_ENGINE_EXE = os.path.join(CPP_ENGINE_DIR, "expense_engine.exe")
CPP_ENGINE_SRC = os.path.join(CPP_ENGINE_DIR, "expense_engine.cpp")

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Create expenses table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS expenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        amount REAL NOT NULL,
        category TEXT NOT NULL,
        date TEXT NOT NULL,
        payment_method TEXT DEFAULT 'UPI',
        notes TEXT DEFAULT '',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)
    
    # Create budgets table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS budgets (
        category TEXT PRIMARY KEY,
        monthly_limit REAL NOT NULL,
        alert_threshold REAL DEFAULT 0.80
    );
    """)

    # SQL Indexes for high performance
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);")

    # Indian Context Default Budgets in INR
    cursor.execute("DELETE FROM budgets;")
    indian_budgets = [
        ("House Rent & Maintenance", 28000.0, 0.90),
        ("Groceries & Kirana", 14000.0, 0.80),
        ("Food & Dining (Swiggy/Zomato)", 9000.0, 0.80),
        ("Shopping & Tech", 12000.0, 0.75),
        ("Transportation & Fuel", 6000.0, 0.80),
        ("Utilities & Bills", 5500.0, 0.80),
        ("Entertainment & OTT", 3500.0, 0.80),
        ("Health & Medical", 4000.0, 0.85)
    ]
    cursor.executemany("INSERT INTO budgets (category, monthly_limit, alert_threshold) VALUES (?, ?, ?);", indian_budgets)

    conn.commit()
    conn.close()

def get_all_expenses(category: Optional[str] = None, search: Optional[str] = None, 
                     start_date: Optional[str] = None, end_date: Optional[str] = None) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    
    query = "SELECT id, title, amount, category, date, payment_method, notes FROM expenses WHERE 1=1"
    params = []
    
    if category and category != "All":
        query += " AND category = ?"
        params.append(category)
        
    if search:
        query += " AND (title LIKE ? OR notes LIKE ? OR category LIKE ?)"
        wildcard = f"%{search}%"
        params.extend([wildcard, wildcard, wildcard])
        
    if start_date:
        query += " AND date >= ?"
        params.append(start_date)
        
    if end_date:
        query += " AND date <= ?"
        params.append(end_date)
        
    query += " ORDER BY date DESC, id DESC;"
    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def add_expense(title: str, amount: float, category: str, date: str, payment_method: str = "UPI", notes: str = "") -> int:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO expenses (title, amount, category, date, payment_method, notes)
        VALUES (?, ?, ?, ?, ?, ?);
    """, (title.strip(), round(float(amount), 2), category.strip(), date.strip(), payment_method.strip(), notes.strip()))
    new_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return new_id

def update_expense(expense_id: int, title: str, amount: float, category: str, date: str, payment_method: str, notes: str) -> bool:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE expenses
        SET title = ?, amount = ?, category = ?, date = ?, payment_method = ?, notes = ?
        WHERE id = ?;
    """, (title.strip(), round(float(amount), 2), category.strip(), date.strip(), payment_method.strip(), notes.strip(), expense_id))
    affected = cursor.rowcount
    conn.commit()
    conn.close()
    return affected > 0

def delete_expense(expense_id: int) -> bool:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM expenses WHERE id = ?;", (expense_id,))
    affected = cursor.rowcount
    conn.commit()
    conn.close()
    return affected > 0

def get_budgets() -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT category, monthly_limit, alert_threshold FROM budgets ORDER BY monthly_limit DESC;")
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def set_budget(category: str, monthly_limit: float, alert_threshold: float = 0.80):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO budgets (category, monthly_limit, alert_threshold)
        VALUES (?, ?, ?)
        ON CONFLICT(category) DO UPDATE SET
            monthly_limit = excluded.monthly_limit,
            alert_threshold = excluded.alert_threshold;
    """, (category.strip(), round(float(monthly_limit), 2), round(float(alert_threshold), 2)))
    conn.commit()
    conn.close()

def clear_all_expenses():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM expenses;")
    conn.commit()
    conn.close()

def ensure_cpp_engine() -> str:
    if not os.path.exists(CPP_ENGINE_EXE):
        os.makedirs(CPP_ENGINE_DIR, exist_ok=True)
        cmd = ["g++", "-std=c++14", "-O2", CPP_ENGINE_SRC, "-o", CPP_ENGINE_EXE]
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            raise RuntimeError(f"C++ Compilation failed: {result.stderr}")
    return CPP_ENGINE_EXE

def run_dsa_analysis() -> Dict[str, Any]:
    expenses = get_all_expenses()
    budgets = get_budgets()
    
    input_payload = {
        "expenses": expenses,
        "budgets": budgets
    }
    input_str = json.dumps(input_payload)
    
    exe_path = ensure_cpp_engine()
    proc = subprocess.Popen([exe_path], stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    stdout, stderr = proc.communicate(input=input_str)
    
    if proc.returncode != 0:
        raise RuntimeError(f"C++ Engine execution failed: {stderr}")
        
    try:
        analysis_data = json.loads(stdout)
        return analysis_data
    except Exception as e:
        raise ValueError(f"Failed to parse C++ engine JSON output: {stdout[:200]}") from e

def seed_sample_data():
    """Seeds realistic Indian expenses across multiple months with UPI, Swiggy, Zomato, Blinkit, Rent, and Subscriptions"""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM expenses;")
    
    now = datetime.date.today()
    curr_ym = now.strftime("%Y-%m")
    
    # Calculate previous months
    first_of_curr = now.replace(day=1)
    prev_month_date = (first_of_curr - datetime.timedelta(days=1)).replace(day=1)
    prev_ym = prev_month_date.strftime("%Y-%m")
    
    prev_prev_date = (prev_month_date - datetime.timedelta(days=1)).replace(day=1)
    prev2_ym = prev_prev_date.strftime("%Y-%m")

    sample_expenses = [
        # Current Month
        ("2BHK Apartment Rent & Maintenance", 26500.00, "House Rent & Maintenance", f"{curr_ym}-01", "Net Banking", "Monthly society rent transfer"),
        ("Netflix India 4K Premium", 649.00, "Entertainment & OTT", f"{curr_ym}-02", "Credit Card", "Monthly 4-screen streaming plan"),
        ("Spotify India Premium Individual", 119.00, "Entertainment & OTT", f"{curr_ym}-02", "UPI", "UPI AutoPay for music streaming"),
        ("Cult.fit Elite Gym Membership", 1999.00, "Health & Medical", f"{curr_ym}-03", "Credit Card", "Monthly gym and fitness pass"),
        ("Blinkit 10-Min Kirana & Veggies", 840.00, "Groceries & Kirana", f"{curr_ym}-04", "UPI", "Fresh vegetables, milk, bread, butter"),
        ("HPCL Petrol Refill (Bike / Car)", 2450.00, "Transportation & Fuel", f"{curr_ym}-05", "UPI", "Full tank petrol via PhonePe"),
        ("Local Chai & Samosa Stall", 70.00, "Food & Dining (Swiggy/Zomato)", f"{curr_ym}-06", "UPI", "Evening tea with team"),
        ("DMart Supermarket Monthly Haul", 7850.00, "Groceries & Kirana", f"{curr_ym}-07", "Debit Card", "Rice, oil, pulses, spices, cleaning supplies"),
        ("JioFiber 150 Mbps Broadband", 1179.00, "Utilities & Bills", f"{curr_ym}-08", "UPI", "Broadband + 14 OTT apps subscription"),
        ("Tata Power / State Electricity Bill", 2840.00, "Utilities & Bills", f"{curr_ym}-09", "UPI", "Monthly household electricity bill"),
        ("Zepto Quick Grocery Essentials", 490.00, "Groceries & Kirana", f"{curr_ym}-10", "UPI", "Curd, paneer, and snacks"),
        ("Swiggy Gourmet Biryani Feast", 890.00, "Food & Dining (Swiggy/Zomato)", f"{curr_ym}-11", "UPI", "Weekend family dinner order via Swiggy"),
        ("Namma Metro Smart Card Auto-Recharge", 600.00, "Transportation & Fuel", f"{curr_ym}-12", "UPI", "Metro commute card recharge"),
        ("Zomato Pizza & Burger Order", 760.00, "Food & Dining (Swiggy/Zomato)", f"{curr_ym}-13", "UPI", "Late night meal order"),
        ("Apollo Pharmacy Medicines", 1120.00, "Health & Medical", f"{curr_ym}-14", "UPI", "Multivitamins and first aid refill"),
        ("Myntra Fashion Festive Shopping", 4650.00, "Shopping & Tech", f"{curr_ym}-15", "Credit Card", "Kurta sets and footwear"),
        ("Amazon Great Indian Festival Shopping", 18999.00, "Shopping & Tech", f"{curr_ym}-16", "Credit Card", "Smartwatch & ANC Headphones - Statistical Spike!"),

        # Previous Month
        ("2BHK Apartment Rent & Maintenance", 26500.00, "House Rent & Maintenance", f"{prev_ym}-01", "Net Banking", "Monthly society rent transfer"),
        ("Netflix India 4K Premium", 649.00, "Entertainment & OTT", f"{prev_ym}-02", "Credit Card", "Monthly 4-screen streaming plan"),
        ("Spotify India Premium Individual", 119.00, "Entertainment & OTT", f"{prev_ym}-02", "UPI", "UPI AutoPay for music streaming"),
        ("Cult.fit Elite Gym Membership", 1999.00, "Health & Medical", f"{prev_ym}-03", "Credit Card", "Monthly gym pass"),
        ("Blinkit Fresh Vegetables", 760.00, "Groceries & Kirana", f"{prev_ym}-05", "UPI", "Weekly kitchen supplies"),
        ("Indian Oil Fuel", 2300.00, "Transportation & Fuel", f"{prev_ym}-07", "UPI", "Fuel refill"),
        ("JioFiber 150 Mbps Broadband", 1179.00, "Utilities & Bills", f"{prev_ym}-08", "UPI", "Broadband internet"),
        ("Tata Power / State Electricity Bill", 2650.00, "Utilities & Bills", f"{prev_ym}-09", "UPI", "Electricity charges"),
        ("DMart Bulk Kirana Haul", 6950.00, "Groceries & Kirana", f"{prev_ym}-12", "Debit Card", "Monthly groceries"),
        ("Barbeque Nation Dinner", 2400.00, "Food & Dining (Swiggy/Zomato)", f"{prev_ym}-18", "Credit Card", "Dinner buffet with friends"),
        ("Ola / Uber City Cabs", 950.00, "Transportation & Fuel", f"{prev_ym}-22", "UPI", "Airport commute cab"),

        # 2 Months Ago
        ("2BHK Apartment Rent & Maintenance", 26500.00, "House Rent & Maintenance", f"{prev2_ym}-01", "Net Banking", "Monthly society rent transfer"),
        ("Netflix India 4K Premium", 649.00, "Entertainment & OTT", f"{prev2_ym}-02", "Credit Card", "Monthly 4-screen streaming plan"),
        ("Spotify India Premium Individual", 119.00, "Entertainment & OTT", f"{prev2_ym}-02", "UPI", "UPI AutoPay for music streaming"),
        ("Cult.fit Elite Gym Membership", 1999.00, "Health & Medical", f"{prev2_ym}-03", "Credit Card", "Monthly gym pass"),
        ("JioFiber 150 Mbps Broadband", 1179.00, "Utilities & Bills", f"{prev2_ym}-08", "UPI", "Broadband internet"),
        ("DMart Bulk Kirana Haul", 7100.00, "Groceries & Kirana", f"{prev2_ym}-11", "Debit Card", "Monthly groceries"),
        ("IndiGo Flight Tickets - Home Visit", 6800.00, "Transportation & Fuel", f"{prev2_ym}-20", "Credit Card", "Diwali advance flight booking")
    ]

    cursor.executemany("""
        INSERT INTO expenses (title, amount, category, date, payment_method, notes)
        VALUES (?, ?, ?, ?, ?, ?);
    """, sample_expenses)

    conn.commit()
    conn.close()

if __name__ == "__main__":
    init_db()
    seed_sample_data()
    print("Database initialized & seeded with Indian context successfully.")
    res = run_dsa_analysis()
    print("DSA Analysis test run:")
    print(f"Total processed: {res['benchmark']['total_transactions_processed']} in {res['benchmark']['processing_time_microseconds']} us")
