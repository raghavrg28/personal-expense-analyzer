# Personal Expense Analyzer — 🇮🇳 India Edition

An ultra-fast, local personal expense tracker and spending pattern analyzer engineered specifically for **India** with **C++14**, **SQLite**, **Python**, and **React**.

Designed for zero-friction local usage: **no deployment or publishing required — double-click to launch in one click!**

---

## 🚀 One-Click Launch

Simply double-click **`start.bat`** (or **`run.bat`**):

1. Verifies and compiles the C++ DSA Engine if needed.
2. Starts the local SQLite database and Python API server.
3. **Automatically opens your web browser** to `http://localhost:5000` with the complete React dashboard.

> **Optional**: Double-click `create_desktop_shortcut.bat` to place a **"Personal Expense Analyzer"** shortcut directly on your Windows Desktop!

---

## 🇮🇳 India-Specific Customizations

- **Currency**: Native Indian Rupee (**₹ INR**) with Indian numerical formatting (Lakhs & Crores grouping, e.g. `₹1,26,450.00`).
- **Payment Methods**:
  - **UPI** (Google Pay, PhonePe, Paytm, BHIM)
  - **Credit Card**
  - **Debit Card**
  - **Net Banking** (NEFT / RTGS / IMPS)
  - **Cash**
- **Indian Expense Categories**:
  - **House Rent & Maintenance** (Society maintenance, flat rent, PG)
  - **Groceries & Kirana** (Blinkit, Zepto, Instamart, DMart, local Kirana)
  - **Food & Dining** (Swiggy, Zomato, Chai Point, dining out)
  - **Shopping & Tech** (Amazon Great Indian Festival, Flipkart, Myntra)
  - **Transportation & Fuel** (Petrol / Fuel, Namma Metro / Delhi Metro, Ola, Uber, Auto)
  - **Utilities & Bills** (Tata Power / State Electricity, LPG cylinder, JioFiber / Airtel broadband, Mobile recharge)
  - **Entertainment & OTT** (Netflix India, Hotstar / JioCinema, Spotify Premium, BookMyShow)
  - **Health & Medical** (Cult.fit gym pass, Apollo Pharmacy, 1mg, clinic visits)
  - **Investments & Savings** (SIP, Mutual Funds, PPF, RD)
- **Preset Realistic Sample Dataset**: Includes 3 months of typical Indian household and tech expenses, recurring AutoPay subscriptions, and festive shopping spikes.

---

## 🧱 Object-Oriented Programming (OOP) & DSA Architecture

The core analytical engine in **`cpp_engine/expense_engine.cpp`** is designed around **all 4 Pillars of Object-Oriented Programming**:

1. **Encapsulation**: Domain models (`class Expense`, `class Budget`, `class CategoryAlert`) encapsulate data with private members and public getters/accessors.
2. **Abstraction**: High-level interfaces (`class ExpenseDataset`, `class ExpenseAnalysisEngine`) hide mathematical, heap, and binary search operations behind clean member functions.
3. **Inheritance**: An abstract base class `class PatternDetector` provides common contracts for derived detectors (`SubscriptionPatternDetector`, `AnomalySpikeDetector`).
4. **Polymorphism**: Runtime polymorphism via pure virtual functions (`virtual void detect(...) = 0`) allowing the engine to execute dynamic analytical pipelines.
5. **Operator Overloading / Functors**: Custom comparator structs (`operator()`) governing `std::priority_queue` heap orders.

### 🧠 Data Structures & Algorithms (DSA) Implementation

The analytical engine in **`cpp_engine/expense_engine.cpp`** processes transactions in **under 1.0 ms**:

| DSA Component | C++ Implementation | Purpose & Feature |
|---|---|---|
| **Hash Maps** | `std::unordered_map` | $O(1)$ constant time aggregation for category totals, payment methods, and monthly buckets. |
| **Priority Queue (Max-Heap)** | `std::priority_queue` (Max-Heap) | Extracts the **Top-K highest expenditures** in $O(N \log K)$ time to spotlight major expenses (e.g., Rent, Festival Shopping). |
| **Priority Queue (Min-Heap)** | `std::priority_queue` (Min-Heap) | Pinpoints nominal micro-expenses and small recurring charges (e.g., local tea/snacks, nominal digital subscriptions). |
| **Quicksort / Introsort** | `std::sort` | Multi-field sorting: chronological timeline ordering and statistical quartiles ($Q_1$, Median, $Q_3$, and $IQR$). |
| **Binary Search** | `std::lower_bound` & `std::upper_bound` | Rapid $O(\log N)$ date-range window querying across sorted expense timelines. |
| **Pattern Recognition** | Statistical Outlier & Frequency Analysis | Detects **recurring subscriptions** (Rent, Netflix, Spotify, JioFiber, Cult.fit) with annual impact, plus **spending spikes** ($Z > 2\sigma$ and $Q_3 + 1.5 \times IQR$). |

---

## 🛠️ Architecture & Tech Stack

```mermaid
graph LR
    UI["React Glassmorphic Dashboard (₹ INR)"] <--> |REST API / JSON| PY["Python Local Server (backend/server.py)"]
    PY <--> |SQL Queries & Prepared Statements| DB[("SQLite Database (expenses.db)")]
    PY <--> |JSON IPC Pipeline (<1 ms)| CPP["C++14 Engine (cpp_engine/expense_engine.exe)"]
    CPP --> |Hash Maps, Heaps, Binary Search, Pattern Detector| PY
```

- **C++ Core (`cpp_engine/`)**: High-performance engine for heavy analytics, priority queues, and sorting.
- **SQL Layer (`backend/database.py`)**: SQLite relational database with indexed queries on `date` and `category`.
- **Python Bridge (`backend/server.py`)**: Zero-dependency HTTP server with REST endpoints and auto-browser launcher.
- **React Frontend (`frontend/`)**: Modern glassmorphic interface with real-time search, filters, visual budget progress bars, and spending trend charts.

---

## ✨ Features

- **⚡ Real-Time Tracking**: Add, edit, delete, search, and filter expenses instantly with UPI ID / transaction notes support.
- **🛡️ Smart Budget Alerts**: Category spending meters with color-coded alerts (Green, Warning Amber, Exceeded Crimson) and end-of-month velocity projections.
- **🔄 Recurring Subscription Detection**: Automatically identifies monthly/weekly recurring subscriptions and computes their annual financial impact.
- **📊 Statistical Anomaly Spikes**: Flags unusual purchases that exceed statistical thresholds.
- **📥 CSV Export**: One-click download of all transactions for spreadsheets.
- **🧪 Seed Realistic Indian Demo Data**: Includes pre-loaded multi-month expenses to immediately demonstrate all charts, heaps, and pattern detections.
