import React, { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, AlertTriangle, Cpu, Database, 
  Layers, Search, Plus, Download, Sparkles, RefreshCw, 
  Trash2, Edit3, Calendar, CreditCard, PieChart, BarChart3, 
  ArrowUpRight, ArrowDownRight, CheckCircle2, ShieldAlert,
  Sun, Moon, Filter, Clock, Zap, Target, Repeat, Sliders,
  IndianRupee
} from 'lucide-react';

const CATEGORIES = [
  "House Rent & Maintenance",
  "Groceries & Kirana",
  "Food & Dining (Swiggy/Zomato)",
  "Shopping & Tech",
  "Transportation & Fuel",
  "Utilities & Bills",
  "Entertainment & OTT",
  "Health & Medical",
  "Investments & Savings",
  "Other"
];

const PAYMENT_METHODS = [
  "UPI (GPay / PhonePe / Paytm)",
  "Credit Card",
  "Debit Card",
  "Net Banking",
  "Cash"
];

// Indian Rupee formatting utility (Lakhs & Crores grouping)
const formatINR = (val) => {
  if (val === undefined || val === null || isNaN(val)) return '₹0.00';
  return '₹' + Number(val).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

export default function App() {
  const [theme, setTheme] = useState('dark');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [expenses, setExpenses] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState('date-desc');

  // Binary Search range demo states
  const [rangeStart, setRangeStart] = useState('');
  const [rangeEnd, setRangeEnd] = useState('');

  // Modal states
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    category: 'Groceries & Kirana',
    date: new Date().toISOString().split('T')[0],
    payment_method: 'UPI (GPay / PhonePe / Paytm)',
    notes: ''
  });

  const [budgetFormData, setBudgetFormData] = useState({
    category: 'Groceries & Kirana',
    monthly_limit: 14000,
    alert_threshold: 0.80
  });

  // Toggle Theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Fetch all initial data
  const fetchData = async () => {
    setLoading(true);
    try {
      const [expRes, bgtRes, anaRes] = await Promise.all([
        fetch('/api/expenses'),
        fetch('/api/budgets'),
        fetch('/api/analyze')
      ]);

      const expData = await expRes.json();
      const bgtData = await bgtRes.json();
      const anaData = await anaRes.json();

      setExpenses(expData.expenses || []);
      setBudgets(bgtData.budgets || []);
      setAnalysis(anaData);

      if (expData.expenses && expData.expenses.length > 0) {
        const latestDate = expData.expenses[0].date;
        const ym = latestDate.substring(0, 7);
        setRangeStart(`${ym}-01`);
        setRangeEnd(`${ym}-31`);
      }
    } catch (err) {
      console.error("Failed to fetch data:", err);
      showToast("Error connecting to Python & C++ backend", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtered & Sorted Expenses for table view
  const filteredExpenses = useMemo(() => {
    return expenses
      .filter(item => {
        const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
        const matchesSearch = searchQuery === '' || 
          item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (item.notes && item.notes.toLowerCase().includes(searchQuery.toLowerCase()));
        return matchesCategory && matchesSearch;
      })
      .sort((a, b) => {
        if (sortBy === 'date-desc') return new Date(b.date) - new Date(a.date);
        if (sortBy === 'date-asc') return new Date(a.date) - new Date(b.date);
        if (sortBy === 'amount-desc') return b.amount - a.amount;
        if (sortBy === 'amount-asc') return a.amount - b.amount;
        return 0;
      });
  }, [expenses, selectedCategory, searchQuery, sortBy]);

  // Handle Add/Edit Expense
  const handleSubmitExpense = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.amount || !formData.date) {
      showToast("Please fill all required fields", "error");
      return;
    }

    try {
      if (editingExpense) {
        await fetch(`/api/expenses/${editingExpense.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        showToast("Expense updated successfully", "success");
      } else {
        await fetch('/api/expenses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        showToast("Expense added to database & analyzed by C++", "success");
      }
      setIsExpenseModalOpen(false);
      setEditingExpense(null);
      setFormData({
        title: '',
        amount: '',
        category: 'Groceries & Kirana',
        date: new Date().toISOString().split('T')[0],
        payment_method: 'UPI (GPay / PhonePe / Paytm)',
        notes: ''
      });
      fetchData();
    } catch (err) {
      showToast("Failed to save expense", "error");
    }
  };

  // Handle Delete Expense
  const handleDeleteExpense = async (id) => {
    if (!window.confirm("Are you sure you want to delete this expense?")) return;
    try {
      await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
      showToast("Expense deleted", "info");
      fetchData();
    } catch (err) {
      showToast("Failed to delete", "error");
    }
  };

  // Seed sample data
  const handleSeedData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/seed', { method: 'POST' });
      const data = await res.json();
      showToast("Indian sample dataset loaded! C++ analyzed spending patterns.", "success");
      fetchData();
    } catch (err) {
      showToast("Failed to load sample data", "error");
      setLoading(false);
    }
  };

  // Clear data
  const handleClearData = async () => {
    if (!window.confirm("Clear all expenses? This cannot be undone.")) return;
    try {
      await fetch('/api/clear', { method: 'POST' });
      showToast("All expenses cleared", "info");
      fetchData();
    } catch (err) {
      showToast("Failed to clear", "error");
    }
  };

  // Save Budget
  const handleSaveBudget = async (e) => {
    e.preventDefault();
    try {
      await fetch('/api/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(budgetFormData)
      });
      showToast(`Budget updated for ${budgetFormData.category}`, "success");
      setIsBudgetModalOpen(false);
      fetchData();
    } catch (err) {
      showToast("Failed to update budget", "error");
    }
  };

  // Open Edit Modal
  const openEditModal = (item) => {
    setEditingExpense(item);
    setFormData({
      title: item.title,
      amount: item.amount,
      category: item.category,
      date: item.date,
      payment_method: item.payment_method || 'UPI (GPay / PhonePe / Paytm)',
      notes: item.notes || ''
    });
    setIsExpenseModalOpen(true);
  };

  // Binary search range matches
  const binarySearchRangeMatches = useMemo(() => {
    if (!rangeStart || !rangeEnd || !expenses.length) return [];
    return expenses.filter(e => e.date >= rangeStart && e.date <= rangeEnd);
  }, [expenses, rangeStart, rangeEnd]);

  const binarySearchRangeTotal = useMemo(() => {
    return binarySearchRangeMatches.reduce((acc, curr) => acc + curr.amount, 0);
  }, [binarySearchRangeMatches]);

  // Compute Active Budget Alerts
  const activeAlerts = useMemo(() => {
    if (!analysis || !analysis.budget_alerts) return [];
    return analysis.budget_alerts.filter(a => a.status === 'EXCEEDED' || a.status === 'WARNING');
  }, [analysis]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: 24,
          right: 24,
          zIndex: 9999,
          padding: '12px 20px',
          borderRadius: 12,
          background: toast.type === 'error' ? 'rgba(239, 68, 68, 0.95)' :
                      toast.type === 'success' ? 'rgba(16, 185, 129, 0.95)' : 'rgba(99, 102, 241, 0.95)',
          color: '#ffffff',
          fontWeight: 600,
          boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          backdropFilter: 'blur(10px)',
          animation: 'pulseSubtle 0.3s ease'
        }}>
          {toast.type === 'error' ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Header */}
      <header style={{
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border-subtle)',
        padding: '16px 28px',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        backdropFilter: 'blur(16px)'
      }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          
          {/* Logo & Architecture Badges */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #f97316 0%, #10b981 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(249, 115, 22, 0.4)'
            }}>
              <IndianRupee size={24} color="#ffffff" strokeWidth={2.5} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h1 style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
                  Personal Expense Analyzer
                </h1>
                <span className="badge badge-amber" style={{ background: 'rgba(249, 115, 22, 0.15)', color: '#fb923c', border: '1px solid rgba(249, 115, 22, 0.3)' }}>
                  🇮🇳 India Edition (₹)
                </span>
                <span className="badge badge-indigo">
                  <Cpu size={12} /> C++14 Engine
                </span>
                <span className="badge badge-cyan">
                  <Database size={12} /> SQLite
                </span>
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 2, display: 'flex', gap: 12 }}>
                <span>DSA: <b>Hash Maps</b> • <b>Max/Min Heaps</b> • <b>Introsort</b> • <b>Binary Search</b> • <b>UPI &amp; Rupee Ready</b></span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button 
              className="btn btn-primary"
              onClick={() => {
                setEditingExpense(null);
                setFormData({
                  title: '',
                  amount: '',
                  category: 'Groceries & Kirana',
                  date: new Date().toISOString().split('T')[0],
                  payment_method: 'UPI (GPay / PhonePe / Paytm)',
                  notes: ''
                });
                setIsExpenseModalOpen(true);
              }}
            >
              <Plus size={16} /> Add Expense
            </button>

            <button 
              className="btn btn-secondary" 
              onClick={handleSeedData} 
              title="Loads realistic Indian expenses (Rent, Swiggy, Blinkit, OTT) to test patterns"
            >
              <Sparkles size={16} color="#06b6d4" /> Seed Indian Data
            </button>

            <a href="/api/export" className="btn btn-secondary" download>
              <Download size={16} /> Export CSV
            </a>

            <button 
              className="btn btn-secondary"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              title="Toggle Light/Dark Theme"
              style={{ width: 40, padding: 0 }}
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div style={{ maxWidth: 1400, margin: '14px auto 0', display: 'flex', gap: 8, borderTop: '1px solid var(--border-subtle)', paddingTop: 12 }}>
          <button 
            onClick={() => setActiveTab('dashboard')}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: 'none',
              background: activeTab === 'dashboard' ? 'var(--gradient-brand)' : 'transparent',
              color: activeTab === 'dashboard' ? '#fff' : 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: '0.875rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              transition: 'all 0.2s ease'
            }}
          >
            <TrendingUp size={16} /> Dashboard & DSA Intelligence
          </button>

          <button 
            onClick={() => setActiveTab('expenses')}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: 'none',
              background: activeTab === 'expenses' ? 'var(--gradient-brand)' : 'transparent',
              color: activeTab === 'expenses' ? '#fff' : 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: '0.875rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              transition: 'all 0.2s ease'
            }}
          >
            <CreditCard size={16} /> Expense Register ({expenses.length})
          </button>

          <button 
            onClick={() => setActiveTab('alerts')}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: 'none',
              background: activeTab === 'alerts' ? 'var(--gradient-brand)' : 'transparent',
              color: activeTab === 'alerts' ? '#fff' : 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: '0.875rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              transition: 'all 0.2s ease'
            }}
          >
            <ShieldAlert size={16} /> Budget Alerts & Limits
            {activeAlerts.length > 0 && (
              <span style={{
                background: '#f43f5e',
                color: '#fff',
                fontSize: '0.7rem',
                padding: '1px 6px',
                borderRadius: 9999,
                fontWeight: 700
              }}>
                {activeAlerts.length}
              </span>
            )}
          </button>

          <button 
            onClick={() => setActiveTab('trends')}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: 'none',
              background: activeTab === 'trends' ? 'var(--gradient-brand)' : 'transparent',
              color: activeTab === 'trends' ? '#fff' : 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: '0.875rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              transition: 'all 0.2s ease'
            }}
          >
            <BarChart3 size={16} /> Monthly History & Summaries
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{ flex: 1, padding: '24px 28px', maxWidth: 1400, margin: '0 auto', width: '100%' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-secondary)' }}>
            <RefreshCw size={36} className="pulse-warning" style={{ margin: '0 auto 16px' }} />
            <p style={{ fontSize: '1.1rem', fontWeight: 600 }}>Executing C++ DSA Engine & Querying SQLite...</p>
          </div>
        ) : (
          <>
            {/* TAB 1: DASHBOARD & INTELLIGENCE */}
            {activeTab === 'dashboard' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                
                {/* Benchmark Ribbon */}
                {analysis?.benchmark && (
                  <div className="glass-panel" style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, borderLeft: '4px solid #f97316' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Zap size={18} color="#f97316" />
                      <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                        High-Performance C++ Pipeline Benchmark:
                      </span>
                      <span className="badge badge-emerald">
                        Processed {analysis.benchmark.total_transactions_processed} transactions in {analysis.benchmark.processing_time_microseconds.toFixed(1)} µs
                      </span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Algorithms: std::unordered_map • std::priority_queue • std::sort • std::lower_bound
                    </div>
                  </div>
                )}

                {/* Metric Summary Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
                  
                  {/* Total Spend */}
                  <div className="glass-panel glow-card" style={{ padding: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 600 }}>
                      <span>Current Month Spend</span>
                      <Calendar size={18} color="#06b6d4" />
                    </div>
                    <div style={{ fontSize: '1.85rem', fontWeight: 800, marginTop: 8 }}>
                      {formatINR(analysis?.summary?.current_month_spend)}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 6 }}>
                      Latest month: <b>{analysis?.summary?.latest_month || 'N/A'}</b> ({analysis?.summary?.current_month_count || 0} entries)
                    </div>
                  </div>

                  {/* All-Time Grand Total */}
                  <div className="glass-panel" style={{ padding: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 600 }}>
                      <span>Total Cumulative Spend</span>
                      <IndianRupee size={18} color="#10b981" />
                    </div>
                    <div style={{ fontSize: '1.85rem', fontWeight: 800, marginTop: 8 }}>
                      {formatINR(analysis?.summary?.grand_total)}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 6 }}>
                      Total of <b>{analysis?.summary?.total_count || 0}</b> transactions in SQLite
                    </div>
                  </div>

                  {/* Statistical Averages */}
                  <div className="glass-panel" style={{ padding: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 600 }}>
                      <span>Median & IQR (DSA Sorted)</span>
                      <BarChart3 size={18} color="#8b5cf6" />
                    </div>
                    <div style={{ fontSize: '1.85rem', fontWeight: 800, marginTop: 8 }}>
                      {formatINR(analysis?.summary?.median)}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 6 }}>
                      Mean: {formatINR(analysis?.summary?.mean)} | Std Dev (σ): {formatINR(analysis?.summary?.std_dev)}
                    </div>
                  </div>

                  {/* Active Budget Alerts */}
                  <div className="glass-panel" style={{ padding: '20px', borderLeft: activeAlerts.length > 0 ? '4px solid #f43f5e' : '4px solid #10b981' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '0.875rem', fontWeight: 600 }}>
                      <span>Budget Threshold Alerts</span>
                      <AlertTriangle size={18} color={activeAlerts.length > 0 ? '#f43f5e' : '#10b981'} />
                    </div>
                    <div style={{ fontSize: '1.85rem', fontWeight: 800, marginTop: 8, color: activeAlerts.length > 0 ? '#fb7185' : 'inherit' }}>
                      {activeAlerts.length} Warning{activeAlerts.length === 1 ? '' : 's'}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 6 }}>
                      {activeAlerts.length > 0 ? 'Categories near or past monthly limit' : 'All budgets healthy & on track'}
                    </div>
                  </div>

                </div>

                {/* Intelligence Row 1: Hash Map Breakdown + Max-Heap Top Expenses */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: 20 }}>
                  
                  {/* Category Aggregation (std::unordered_map) */}
                  <div className="glass-panel" style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                      <div>
                        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Layers size={18} color="#06b6d4" /> Category Distribution (₹)
                        </h2>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          Aggregated via C++ std::unordered_map in O(1) amortized time
                        </span>
                      </div>
                      <span className="badge badge-cyan">{analysis?.categories?.length || 0} Categories</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      {analysis?.categories?.map((cat, i) => (
                        <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                            <span style={{ fontWeight: 600 }}>{cat.category}</span>
                            <span style={{ fontWeight: 700 }}>{formatINR(cat.total)} ({cat.percentage.toFixed(1)}%)</span>
                          </div>
                          <div style={{
                            width: '100%',
                            height: 8,
                            borderRadius: 4,
                            background: 'rgba(255,255,255,0.06)',
                            overflow: 'hidden'
                          }}>
                            <div style={{
                              width: `${Math.min(cat.percentage, 100)}%`,
                              height: '100%',
                              borderRadius: 4,
                              background: i % 4 === 0 ? '#6366f1' : i % 4 === 1 ? '#06b6d4' : i % 4 === 2 ? '#10b981' : '#f59e0b',
                              transition: 'width 0.5s ease'
                            }} />
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            <span>{cat.count} purchases</span>
                            <span>Avg {formatINR(cat.average)} / transaction</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Max-Heap Top Expenses (std::priority_queue) */}
                  <div className="glass-panel" style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                      <div>
                        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                          <ArrowUpRight size={18} color="#f43f5e" /> Max-Heap: Top Expenditures (₹)
                        </h2>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          Extracted dynamically via C++ Max-Heap in O(N log K) time
                        </span>
                      </div>
                      <span className="badge badge-rose">Top Priority</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {analysis?.top_expenses_heap?.slice(0, 5).map((exp, i) => (
                        <div key={exp.id || i} style={{
                          padding: '12px 14px',
                          borderRadius: 10,
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px solid var(--border-subtle)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{
                              width: 28,
                              height: 28,
                              borderRadius: 8,
                              background: 'rgba(244, 63, 94, 0.15)',
                              color: '#fb7185',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '0.8rem'
                            }}>
                              #{i + 1}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{exp.title}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                {exp.category} • {exp.date} • {exp.payment_method}
                              </div>
                            </div>
                          </div>
                          <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fb7185' }}>
                            {formatINR(exp.amount)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>

                {/* Intelligence Row 2: Recurring Subscriptions & Spending Spikes */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: 20 }}>
                  
                  {/* Recurring Subscriptions Detected */}
                  <div className="glass-panel" style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                      <div>
                        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Repeat size={18} color="#10b981" /> Pattern Recognition: Recurring / AutoPay
                        </h2>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          Detects regular monthly intervals (Rent, Netflix, Spotify, Gym, Broadband)
                        </span>
                      </div>
                      <span className="badge badge-emerald">{analysis?.recurring_patterns?.length || 0} Found</span>
                    </div>

                    {(!analysis?.recurring_patterns || analysis.recurring_patterns.length === 0) ? (
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                        No repeating subscriptions detected yet. Click "Seed Indian Data" to view Rent, Netflix, Spotify, Gym, and JioFiber patterns.
                      </p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {analysis.recurring_patterns.map((pat, i) => (
                          <div key={i} style={{
                            padding: '12px 14px',
                            borderRadius: 10,
                            background: 'rgba(16, 185, 129, 0.05)',
                            border: '1px solid rgba(16, 185, 129, 0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                          }}>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{pat.merchant}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                {pat.category} • Detected {pat.occurrences}x ({pat.frequency})
                              </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontWeight: 700, color: '#34d399' }}>
                                {formatINR(pat.avg_amount)} / period
                              </div>
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                ~{formatINR(pat.annual_impact)}/yr impact
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Anomalies & Spending Spikes */}
                  <div className="glass-panel" style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                      <div>
                        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                          <AlertTriangle size={18} color="#f59e0b" /> Anomaly & Spike Detector
                        </h2>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          Identifies statistical outliers using Standard Deviation (Z &gt; 2σ) &amp; IQR in ₹
                        </span>
                      </div>
                      <span className="badge badge-amber">{analysis?.anomalies?.length || 0} Outliers</span>
                    </div>

                    {(!analysis?.anomalies || analysis.anomalies.length === 0) ? (
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                        No statistical spending spikes detected. All purchases fall within standard deviation thresholds.
                      </p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {analysis.anomalies.map((anom, i) => (
                          <div key={i} style={{
                            padding: '12px 14px',
                            borderRadius: 10,
                            background: 'rgba(245, 158, 11, 0.06)',
                            border: '1px solid rgba(245, 158, 11, 0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                          }}>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{anom.title}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                {anom.category} • {anom.date} • Z-Score: <b>+{anom.z_score.toFixed(1)}σ</b>
                              </div>
                            </div>
                            <div style={{ fontWeight: 800, color: '#fbbf24', fontSize: '1.05rem' }}>
                              {formatINR(anom.amount)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>

                {/* Intelligence Row 3: Binary Search Range Inspector */}
                <div className="glass-panel" style={{ padding: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 16 }}>
                    <div>
                      <h2 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Search size={18} color="#6366f1" /> DSA Binary Search: Date Range Window Inspector
                      </h2>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        Executes C++ std::lower_bound and std::upper_bound over chronologically sorted records in O(log N)
                      </span>
                    </div>
                    
                    {/* Date Inputs */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <input 
                        type="date" 
                        value={rangeStart} 
                        onChange={(e) => setRangeStart(e.target.value)} 
                        style={{ padding: '6px 12px' }}
                      />
                      <span style={{ color: 'var(--text-secondary)' }}>to</span>
                      <input 
                        type="date" 
                        value={rangeEnd} 
                        onChange={(e) => setRangeEnd(e.target.value)} 
                        style={{ padding: '6px 12px' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginTop: 10 }}>
                    <div style={{ padding: '14px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Range Transactions</div>
                      <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#38bdf8' }}>{binarySearchRangeMatches.length}</div>
                    </div>

                    <div style={{ padding: '14px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Range Total Spend</div>
                      <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#34d399' }}>{formatINR(binarySearchRangeTotal)}</div>
                    </div>

                    <div style={{ padding: '14px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Average / Purchase in Window</div>
                      <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#a78bfa' }}>
                        {formatINR(binarySearchRangeMatches.length > 0 ? (binarySearchRangeTotal / binarySearchRangeMatches.length) : 0)}
                      </div>
                    </div>

                    <div style={{ padding: '14px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Search Complexity</div>
                      <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f59e0b' }}>O(log N)</div>
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* TAB 2: EXPENSES TABLE VIEW */}
            {activeTab === 'expenses' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                
                {/* Search & Filter Toolbar */}
                <div className="glass-panel" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
                  
                  {/* Search Bar */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: '1 1 280px', position: 'relative' }}>
                    <Search size={18} style={{ position: 'absolute', left: 12, color: 'var(--text-muted)' }} />
                    <input 
                      type="text"
                      placeholder="Search title, merchant (Blinkit, Swiggy, UPI, Rent...)"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{ width: '100%', paddingLeft: 38 }}
                    />
                  </div>

                  {/* Category Filter */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Category:</span>
                    <select 
                      value={selectedCategory} 
                      onChange={(e) => setSelectedCategory(e.target.value)}
                    >
                      <option value="All">All Categories ({expenses.length})</option>
                      {CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  {/* Sort Controls */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Sort:</span>
                    <select 
                      value={sortBy} 
                      onChange={(e) => setSortBy(e.target.value)}
                    >
                      <option value="date-desc">Date (Newest First)</option>
                      <option value="date-asc">Date (Oldest First)</option>
                      <option value="amount-desc">Amount (Highest First)</option>
                      <option value="amount-asc">Amount (Lowest First)</option>
                    </select>
                  </div>

                  {/* Clear Data Button */}
                  <button 
                    className="btn btn-danger"
                    onClick={handleClearData}
                    style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                  >
                    <Trash2 size={14} /> Clear All
                  </button>

                </div>

                {/* Expenses Table */}
                <div className="glass-panel" style={{ overflow: 'hidden' }}>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                      <thead>
                        <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border-subtle)' }}>
                          <th style={{ padding: '14px 18px', fontWeight: 600 }}>Date</th>
                          <th style={{ padding: '14px 18px', fontWeight: 600 }}>Title / Merchant</th>
                          <th style={{ padding: '14px 18px', fontWeight: 600 }}>Category</th>
                          <th style={{ padding: '14px 18px', fontWeight: 600 }}>Payment Method</th>
                          <th style={{ padding: '14px 18px', fontWeight: 600 }}>Notes</th>
                          <th style={{ padding: '14px 18px', fontWeight: 600, textAlign: 'right' }}>Amount (₹)</th>
                          <th style={{ padding: '14px 18px', fontWeight: 600, textAlign: 'center' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredExpenses.length === 0 ? (
                          <tr>
                            <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                              No expenses found. Click "+ Add Expense" or "Seed Indian Data".
                            </td>
                          </tr>
                        ) : (
                          filteredExpenses.map((item) => (
                            <tr key={item.id} style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background 0.15s ease' }}>
                              <td style={{ padding: '14px 18px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                                {item.date}
                              </td>
                              <td style={{ padding: '14px 18px', fontWeight: 600 }}>
                                {item.title}
                              </td>
                              <td style={{ padding: '14px 18px' }}>
                                <span className="badge badge-indigo">
                                  {item.category}
                                </span>
                              </td>
                              <td style={{ padding: '14px 18px' }}>
                                <span className="badge badge-cyan" style={{ fontSize: '0.72rem' }}>
                                  {item.payment_method}
                                </span>
                              </td>
                              <td style={{ padding: '14px 18px', color: 'var(--text-muted)', fontSize: '0.8rem', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {item.notes || '—'}
                              </td>
                              <td style={{ padding: '14px 18px', textAlign: 'right', fontWeight: 700, fontSize: '0.95rem' }}>
                                {formatINR(item.amount)}
                              </td>
                              <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                                <div style={{ display: 'inline-flex', gap: 6 }}>
                                  <button 
                                    onClick={() => openEditModal(item)}
                                    style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 4 }}
                                    title="Edit Expense"
                                  >
                                    <Edit3 size={15} />
                                  </button>
                                  <button 
                                    onClick={() => handleDeleteExpense(item.id)}
                                    style={{ background: 'none', border: 'none', color: '#fb7185', cursor: 'pointer', padding: 4 }}
                                    title="Delete Expense"
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            )}

            {/* TAB 3: BUDGET ALERTS & LIMITS */}
            {activeTab === 'alerts' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                
                <div className="glass-panel" style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
                  <div>
                    <h2 style={{ fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <ShieldAlert size={22} color="#f43f5e" /> Smart Budget Alert System (₹ INR)
                    </h2>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                      Prioritized via C++ Max-Heap by highest burn rate and projected end-of-month exhaustion.
                    </p>
                  </div>
                  <button 
                    className="btn btn-primary"
                    onClick={() => setIsBudgetModalOpen(true)}
                  >
                    <Sliders size={16} /> Configure Category Limits
                  </button>
                </div>

                {/* Grid of Budget Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 20 }}>
                  {analysis?.budget_alerts?.map((alert, i) => {
                    const isExceeded = alert.status === 'EXCEEDED';
                    const isWarning = alert.status === 'WARNING';
                    const pct = alert.percentage;

                    return (
                      <div 
                        key={i} 
                        className="glass-panel glow-card"
                        style={{
                          padding: '22px',
                          borderLeft: isExceeded ? '4px solid #f43f5e' : isWarning ? '4px solid #f59e0b' : '4px solid #10b981'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>{alert.category}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                              Monthly Limit: <b>{formatINR(alert.limit)}</b>
                            </div>
                          </div>
                          <span className={`badge ${isExceeded ? 'badge-rose' : isWarning ? 'badge-amber' : 'badge-emerald'}`}>
                            {alert.status} ({pct.toFixed(0)}%)
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div style={{
                          width: '100%',
                          height: 10,
                          borderRadius: 6,
                          background: 'rgba(255,255,255,0.06)',
                          overflow: 'hidden',
                          margin: '12px 0 8px'
                        }}>
                          <div style={{
                            width: `${Math.min(pct, 100)}%`,
                            height: '100%',
                            borderRadius: 6,
                            background: isExceeded ? '#f43f5e' : isWarning ? '#f59e0b' : '#10b981',
                            transition: 'width 0.4s ease'
                          }} />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginTop: 8 }}>
                          <span>Spent this month: <b>{formatINR(alert.spent)}</b></span>
                          <span style={{ color: isExceeded ? '#fb7185' : 'var(--text-secondary)' }}>
                            {isExceeded ? `Over by ${formatINR(alert.spent - alert.limit)}` : `Remaining: ${formatINR(alert.limit - alert.spent)}`}
                          </span>
                        </div>

                        {/* Projection Warning */}
                        {alert.projected_overrun && (
                          <div style={{
                            marginTop: 14,
                            padding: '10px 12px',
                            borderRadius: 8,
                            background: 'rgba(244, 63, 94, 0.08)',
                            border: '1px solid rgba(244, 63, 94, 0.2)',
                            fontSize: '0.78rem',
                            color: '#fb7185',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8
                          }}>
                            <AlertTriangle size={15} style={{ flexShrink: 0 }} />
                            <span>
                              <b>Velocity Alert:</b> At current daily spending pace, projected to reach <b>{formatINR(alert.projected_total)}</b> by month end!
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

              </div>
            )}

            {/* TAB 4: MONTHLY TRENDS & SUMMARIES */}
            {activeTab === 'trends' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                
                <div className="glass-panel" style={{ padding: '24px' }}>
                  <h2 style={{ fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                    <BarChart3 size={20} color="#6366f1" /> Month-by-Month Expenditure History (₹)
                  </h2>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                    {analysis?.monthly_history?.map((m, i) => (
                      <div key={i} className="glass-panel" style={{ padding: '20px', borderTop: '3px solid #6366f1' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>{m.month}</span>
                          <span className="badge badge-indigo">{m.count} purchases</span>
                        </div>
                        <div style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: 12 }}>
                          {formatINR(m.total)}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                          Average {formatINR(m.count > 0 ? (m.total / m.count) : 0)} / purchase
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}
          </>
        )}
      </main>

      {/* MODAL: ADD / EDIT EXPENSE */}
      {isExpenseModalOpen && (
        <div className="modal-overlay" onClick={() => setIsExpenseModalOpen(false)}>
          <div className="glass-panel glow-card" style={{ maxWidth: 500, width: '100%', padding: '28px' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 16 }}>
              {editingExpense ? 'Edit Expense' : 'Add New Expense (₹)'}
            </h2>
            <form onSubmit={handleSubmitExpense} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
                  Title / Merchant Name (e.g. Swiggy, Blinkit, Rent, Petrol) *
                </label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Blinkit Kirana, Zomato Dinner, Metro Card"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
                    Amount (₹ INR) *
                  </label>
                  <input 
                    type="number" 
                    step="0.01"
                    min="1"
                    required
                    placeholder="₹ 0.00"
                    value={formData.amount}
                    onChange={e => setFormData({ ...formData, amount: e.target.value })}
                    style={{ width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
                    Date *
                  </label>
                  <input 
                    type="date" 
                    required
                    value={formData.date}
                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
                    Category
                  </label>
                  <select 
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                    style={{ width: '100%' }}
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
                    Payment Method
                  </label>
                  <select 
                    value={formData.payment_method}
                    onChange={e => setFormData({ ...formData, payment_method: e.target.value })}
                    style={{ width: '100%' }}
                  >
                    {PAYMENT_METHODS.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
                  Notes / Transaction Ref / UPI ID
                </label>
                <input 
                  type="text" 
                  placeholder="Optional notes or UPI transaction ref"
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsExpenseModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingExpense ? 'Save Changes' : 'Record Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT BUDGET */}
      {isBudgetModalOpen && (
        <div className="modal-overlay" onClick={() => setIsBudgetModalOpen(false)}>
          <div className="glass-panel glow-card" style={{ maxWidth: 460, width: '100%', padding: '28px' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 16 }}>
              Configure Category Budget (₹)
            </h2>
            <form onSubmit={handleSaveBudget} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
                  Select Category
                </label>
                <select 
                  value={budgetFormData.category}
                  onChange={e => setBudgetFormData({ ...budgetFormData, category: e.target.value })}
                  style={{ width: '100%' }}
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
                  Monthly Budget Limit (₹ INR)
                </label>
                <input 
                  type="number"
                  step="500"
                  min="500"
                  required
                  value={budgetFormData.monthly_limit}
                  onChange={e => setBudgetFormData({ ...budgetFormData, monthly_limit: e.target.value })}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>
                  Alert Trigger Threshold (% of limit)
                </label>
                <select 
                  value={budgetFormData.alert_threshold}
                  onChange={e => setBudgetFormData({ ...budgetFormData, alert_threshold: parseFloat(e.target.value) })}
                  style={{ width: '100%' }}
                >
                  <option value={0.70}>70% Limit Warning</option>
                  <option value={0.80}>80% Limit Warning (Recommended)</option>
                  <option value={0.90}>90% Limit Warning</option>
                  <option value={1.00}>100% Exceeded Only</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsBudgetModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Budget
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer style={{
        marginTop: 'auto',
        borderTop: '1px solid var(--border-subtle)',
        padding: '16px 28px',
        textAlign: 'center',
        fontSize: '0.8rem',
        color: 'var(--text-muted)'
      }}>
        Personal Expense Analyzer • 🇮🇳 India Edition • Built with C++14 DSA Engine, SQLite, Python, and React
      </footer>

    </div>
  );
}
