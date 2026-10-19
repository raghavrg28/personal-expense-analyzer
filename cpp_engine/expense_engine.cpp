#include <iostream>
#include <fstream>
#include <sstream>
#include <string>
#include <vector>
#include <unordered_map>
#include <queue>
#include <algorithm>
#include <cmath>
#include <iomanip>
#include <chrono>
#include <memory>

// ============================================================================
// OOP HELPER UTILITIES
// ============================================================================
class JsonHelper {
public:
    static std::string escape(const std::string& s) {
        std::ostringstream o;
        for (char c : s) {
            switch (c) {
                case '"': o << "\\\""; break;
                case '\\': o << "\\\\"; break;
                case '\b': o << "\\b"; break;
                case '\f': o << "\\f"; break;
                case '\n': o << "\\n"; break;
                case '\r': o << "\\r"; break;
                case '\t': o << "\\t"; break;
                default:
                    if ('\x00' <= c && c <= '\x1f') {
                        o << "\\u" << std::hex << std::setw(4) << std::setfill('0') << (int)c;
                    } else {
                        o << c;
                    }
            }
        }
        return o.str();
    }

    static std::string extractString(const std::string& obj, const std::string& key) {
        std::string search = "\"" + key + "\":";
        size_t pos = obj.find(search);
        if (pos == std::string::npos) return "";
        pos += search.length();
        while (pos < obj.length() && (obj[pos] == ' ' || obj[pos] == '\t' || obj[pos] == '\r' || obj[pos] == '\n')) pos++;
        if (pos < obj.length() && obj[pos] == '"') {
            size_t end = obj.find('"', pos + 1);
            if (end != std::string::npos) {
                return obj.substr(pos + 1, end - (pos + 1));
            }
        }
        return "";
    }

    static double extractDouble(const std::string& obj, const std::string& key) {
        std::string search = "\"" + key + "\":";
        size_t pos = obj.find(search);
        if (pos == std::string::npos) return 0.0;
        pos += search.length();
        while (pos < obj.length() && (obj[pos] == ' ' || obj[pos] == '\t' || obj[pos] == '\r' || obj[pos] == '\n')) pos++;
        size_t end = pos;
        while (end < obj.length() && (isdigit(obj[end]) || obj[end] == '.' || obj[end] == '-' || obj[end] == 'e' || obj[end] == 'E')) {
            end++;
        }
        std::string valStr = obj.substr(pos, end - pos);
        try {
            return std::stod(valStr);
        } catch (...) {
            return 0.0;
        }
    }

    static int extractInt(const std::string& obj, const std::string& key) {
        return static_cast<int>(extractDouble(obj, key));
    }

    static std::string extractArraySection(const std::string& json, const std::string& key) {
        std::string search = "\"" + key + "\":";
        size_t pos = json.find(search);
        if (pos == std::string::npos) return "";
        size_t arrStart = json.find('[', pos);
        if (arrStart == std::string::npos) return "";
        
        int depth = 0;
        size_t arrEnd = arrStart;
        for (; arrEnd < json.length(); ++arrEnd) {
            if (json[arrEnd] == '[') depth++;
            else if (json[arrEnd] == ']') {
                depth--;
                if (depth == 0) break;
            }
        }
        if (depth != 0) return "";
        return json.substr(arrStart + 1, arrEnd - arrStart - 1);
    }
};

// ============================================================================
// OOP PILLAR 1: ENCAPSULATION
// Domain Entity: Expense Model with private attributes & public accessors
// ============================================================================
class Expense {
private:
    int id;
    std::string title;
    double amount;
    std::string category;
    std::string date; // YYYY-MM-DD
    std::string payment_method;
    std::string notes;

public:
    Expense() : id(0), amount(0.0), category("Uncategorized"), payment_method("UPI") {}
    
    Expense(int id, const std::string& title, double amount, const std::string& category,
            const std::string& date, const std::string& payment_method, const std::string& notes)
        : id(id), title(title), amount(amount),
          category(category.empty() ? "Uncategorized" : category),
          date(date),
          payment_method(payment_method.empty() ? "UPI" : payment_method),
          notes(notes) {}

    // Getters (Encapsulation)
    int getId() const { return id; }
    std::string getTitle() const { return title; }
    double getAmount() const { return amount; }
    std::string getCategory() const { return category; }
    std::string getDate() const { return date; }
    std::string getPaymentMethod() const { return payment_method; }
    std::string getNotes() const { return notes; }

    std::string getMonth() const {
        return (date.length() >= 7) ? date.substr(0, 7) : "Unknown";
    }

    std::string getNormalizedTitle() const {
        std::string key = title;
        std::transform(key.begin(), key.end(), key.begin(), ::tolower);
        return key;
    }

    // JSON Serialization
    std::string toJSON() const {
        std::ostringstream ss;
        ss << std::fixed << std::setprecision(2);
        ss << "{\"id\": " << id 
           << ", \"title\": \"" << JsonHelper::escape(title) << "\""
           << ", \"amount\": " << amount 
           << ", \"category\": \"" << JsonHelper::escape(category) << "\""
           << ", \"date\": \"" << date << "\""
           << ", \"payment_method\": \"" << JsonHelper::escape(payment_method) << "\"}";
        return ss.str();
    }
};

// ============================================================================
// Domain Entity: Budget Configuration
// ============================================================================
class Budget {
private:
    std::string category;
    double monthly_limit;
    double alert_threshold;

public:
    Budget() : monthly_limit(0.0), alert_threshold(0.80) {}
    Budget(const std::string& category, double limit, double threshold = 0.80)
        : category(category), monthly_limit(limit), alert_threshold(threshold <= 0 ? 0.80 : threshold) {}

    std::string getCategory() const { return category; }
    double getMonthlyLimit() const { return monthly_limit; }
    double getAlertThreshold() const { return alert_threshold; }
};

// ============================================================================
// Domain Entity: Category Alert Result
// ============================================================================
class CategoryAlert {
private:
    std::string category;
    double spent;
    double limit;
    double percentage;
    std::string status;
    double projected_total;
    bool projected_overrun;

public:
    CategoryAlert(const std::string& category, double spent, double limit, double threshold, int dayOfMonth)
        : category(category), spent(spent), limit(limit) {
        
        percentage = (limit > 0) ? (spent / limit) : 0.0;
        
        int safeDay = (dayOfMonth < 1) ? 1 : (dayOfMonth > 30 ? 30 : dayOfMonth);
        double daily_burn = spent / safeDay;
        projected_total = daily_burn * 30.0;
        projected_overrun = (projected_total > limit && spent > 0);

        if (percentage >= 1.0) {
            status = "EXCEEDED";
        } else if (percentage >= threshold) {
            status = "WARNING";
        } else {
            status = "OK";
        }
    }

    std::string getCategory() const { return category; }
    double getSpent() const { return spent; }
    double getLimit() const { return limit; }
    double getPercentage() const { return percentage; }
    std::string getStatus() const { return status; }
    double getProjectedTotal() const { return projected_total; }
    bool isProjectedOverrun() const { return projected_overrun; }

    std::string toJSON() const {
        std::ostringstream ss;
        ss << std::fixed << std::setprecision(2);
        ss << "{\"category\": \"" << JsonHelper::escape(category) << "\""
           << ", \"spent\": " << spent 
           << ", \"limit\": " << limit 
           << ", \"percentage\": " << (percentage * 100.0) 
           << ", \"status\": \"" << status << "\""
           << ", \"projected_total\": " << projected_total 
           << ", \"projected_overrun\": " << (projected_overrun ? "true" : "false") << "}";
        return ss.str();
    }
};

// ============================================================================
// OOP COMPARATOR FUNCTORS (Operator Overloading for Heaps)
// ============================================================================
struct MaxExpenseComparator {
    bool operator()(const Expense& a, const Expense& b) const {
        return a.getAmount() < b.getAmount(); // Max-heap: largest on top
    }
};

struct MinExpenseComparator {
    bool operator()(const Expense& a, const Expense& b) const {
        return a.getAmount() > b.getAmount(); // Min-heap: smallest on top
    }
};

struct AlertComparator {
    bool operator()(const CategoryAlert& a, const CategoryAlert& b) const {
        return a.getPercentage() < b.getPercentage(); // Max-heap: highest overrun on top
    }
};

// ============================================================================
// OOP PILLAR 2 & 3: ABSTRACTION, INHERITANCE & POLYMORPHISM
// Base Abstract Class: PatternDetector
// ============================================================================
class PatternDetector {
public:
    virtual ~PatternDetector() = default;
    virtual void detect(const std::vector<Expense>& expenses) = 0; // Pure Virtual Function
    virtual std::string getDetectorName() const = 0;
};

// Derived Detector 1: Subscription & AutoPay Detector
struct RecurringPatternRecord {
    std::string merchant;
    std::string category;
    double avg_amount = 0.0;
    int occurrences = 0;
    std::string estimated_frequency;
    double annual_impact = 0.0;
};

class SubscriptionPatternDetector : public PatternDetector {
private:
    std::vector<RecurringPatternRecord> patterns;

public:
    std::string getDetectorName() const override {
        return "Polymorphic Subscription & AutoPay Pattern Detector";
    }

    void detect(const std::vector<Expense>& expenses) override {
        patterns.clear();
        std::unordered_map<std::string, std::vector<Expense>> merchant_map;
        
        for (const auto& exp : expenses) {
            merchant_map[exp.getNormalizedTitle()].push_back(exp);
        }

        for (const auto& entry : merchant_map) {
            const auto& recs = entry.second;
            if (recs.size() >= 2) {
                double sum = 0.0;
                for (const auto& r : recs) sum += r.getAmount();
                double avg = sum / recs.size();
                
                bool similar = true;
                for (const auto& r : recs) {
                    if (std::abs(r.getAmount() - avg) > (avg * 0.08) && std::abs(r.getAmount() - avg) > 50.0) {
                        similar = false;
                        break;
                    }
                }

                if (similar && avg >= 99.0) {
                    RecurringPatternRecord pat;
                    pat.merchant = recs[0].getTitle();
                    pat.category = recs[0].getCategory();
                    pat.avg_amount = avg;
                    pat.occurrences = static_cast<int>(recs.size());
                    pat.estimated_frequency = (recs.size() >= 4) ? "Weekly/Bi-Weekly" : "Monthly";
                    pat.annual_impact = (pat.estimated_frequency == "Monthly") ? (avg * 12.0) : (avg * 52.0);
                    patterns.push_back(pat);
                }
            }
        }
    }

    const std::vector<RecurringPatternRecord>& getPatterns() const {
        return patterns;
    }
};

// Derived Detector 2: Statistical Anomaly & Outlier Spike Detector
struct AnomalyRecord {
    int id;
    std::string title;
    double amount;
    std::string category;
    std::string date;
    double z_score;
};

class AnomalySpikeDetector : public PatternDetector {
private:
    std::vector<AnomalyRecord> anomalies;
    double mean = 0.0;
    double stdDev = 0.0;

public:
    std::string getDetectorName() const override {
        return "Polymorphic Anomaly & Outlier Spike Detector";
    }

    void detect(const std::vector<Expense>& expenses) override {
        anomalies.clear();
        if (expenses.empty()) return;

        double total = 0.0;
        std::vector<double> amounts;
        amounts.reserve(expenses.size());

        for (const auto& exp : expenses) {
            total += exp.getAmount();
            amounts.push_back(exp.getAmount());
        }

        mean = total / expenses.size();
        
        double variance_sum = 0.0;
        for (double amt : amounts) {
            variance_sum += (amt - mean) * (amt - mean);
        }
        stdDev = (expenses.size() > 1) ? std::sqrt(variance_sum / (expenses.size() - 1)) : 0.0;

        // Compute IQR for robust outlier fence
        std::sort(amounts.begin(), amounts.end());
        size_t n = amounts.size();
        double q1 = amounts[n / 4];
        double q3 = amounts[(3 * n) / 4];
        double iqr = q3 - q1;
        double outlier_iqr_fence = q3 + (1.5 * iqr);
        double zscore_threshold = mean + (2.0 * stdDev);

        for (const auto& exp : expenses) {
            if (exp.getAmount() > outlier_iqr_fence && exp.getAmount() > zscore_threshold && exp.getAmount() > 2000.0) {
                AnomalyRecord rec;
                rec.id = exp.getId();
                rec.title = exp.getTitle();
                rec.amount = exp.getAmount();
                rec.category = exp.getCategory();
                rec.date = exp.getDate();
                rec.z_score = (stdDev > 0) ? ((exp.getAmount() - mean) / stdDev) : 0.0;
                anomalies.push_back(rec);
            }
        }

        std::sort(anomalies.begin(), anomalies.end(), [](const AnomalyRecord& a, const AnomalyRecord& b) {
            return a.amount > b.amount;
        });
    }

    const std::vector<AnomalyRecord>& getAnomalies() const {
        return anomalies;
    }
    double getMean() const { return mean; }
    double getStdDev() const { return stdDev; }
};

// ============================================================================
// OOP REPOSITORY & DATASET AGGREGATOR (Encapsulates DSA storage & queries)
// ============================================================================
class ExpenseDataset {
private:
    std::vector<Expense> expenses;
    std::vector<Budget> budgets;
    
    // DSA: Hash Maps
    std::unordered_map<std::string, double> category_totals;
    std::unordered_map<std::string, int> category_counts;
    std::unordered_map<std::string, double> monthly_totals;
    std::unordered_map<std::string, int> monthly_counts;
    std::unordered_map<std::string, double> payment_totals;
    std::unordered_map<std::string, double> daily_totals;

    // DSA: Chronologically sorted vector for Binary Search
    std::vector<Expense> sorted_by_date;

    // Summary statistics
    double grand_total = 0.0;
    double median = 0.0;
    double q1 = 0.0;
    double q3 = 0.0;
    double iqr = 0.0;

public:
    ExpenseDataset() = default;

    void load(const std::vector<Expense>& expList, const std::vector<Budget>& bgtList) {
        expenses = expList;
        budgets = bgtList;
        category_totals.clear();
        category_counts.clear();
        monthly_totals.clear();
        monthly_counts.clear();
        payment_totals.clear();
        daily_totals.clear();
        grand_total = 0.0;

        std::vector<double> amounts;
        amounts.reserve(expenses.size());

        for (const auto& exp : expenses) {
            grand_total += exp.getAmount();
            amounts.push_back(exp.getAmount());

            // Hash Map aggregations in O(1)
            category_totals[exp.getCategory()] += exp.getAmount();
            category_counts[exp.getCategory()]++;

            std::string month = exp.getMonth();
            monthly_totals[month] += exp.getAmount();
            monthly_counts[month]++;

            payment_totals[exp.getPaymentMethod()] += exp.getAmount();
            daily_totals[exp.getDate()] += exp.getAmount();
        }

        // Introsort for statistical quartiles
        std::sort(amounts.begin(), amounts.end());
        if (!amounts.empty()) {
            size_t n = amounts.size();
            median = (n % 2 == 1) ? amounts[n / 2] : (amounts[n / 2 - 1] + amounts[n / 2]) / 2.0;
            q1 = amounts[n / 4];
            q3 = amounts[(3 * n) / 4];
            iqr = q3 - q1;
        }

        // Introsort for Chronological Timeline & Binary Search
        sorted_by_date = expenses;
        std::sort(sorted_by_date.begin(), sorted_by_date.end(), [](const Expense& a, const Expense& b) {
            if (a.getDate() != b.getDate()) return a.getDate() < b.getDate();
            return a.getId() < b.getId();
        });
    }

    const std::vector<Expense>& getExpenses() const { return expenses; }
    const std::vector<Budget>& getBudgets() const { return budgets; }
    double getGrandTotal() const { return grand_total; }
    double getMedian() const { return median; }
    double getQ1() const { return q1; }
    double getQ3() const { return q3; }
    double getIQR() const { return iqr; }

    const std::unordered_map<std::string, double>& getCategoryTotals() const { return category_totals; }
    const std::unordered_map<std::string, int>& getCategoryCounts() const { return category_counts; }
    const std::unordered_map<std::string, double>& getMonthlyTotals() const { return monthly_totals; }
    const std::unordered_map<std::string, int>& getMonthlyCounts() const { return monthly_counts; }
    const std::unordered_map<std::string, double>& getPaymentTotals() const { return payment_totals; }

    // DSA: Priority Queue Max-Heap extraction in O(N log K)
    std::vector<Expense> getTopExpensesMaxHeap(int k = 10) const {
        std::priority_queue<Expense, std::vector<Expense>, MaxExpenseComparator> maxHeap;
        for (const auto& exp : expenses) {
            maxHeap.push(exp);
        }
        std::vector<Expense> result;
        while (!maxHeap.empty() && k > 0) {
            result.push_back(maxHeap.top());
            maxHeap.pop();
            k--;
        }
        return result;
    }

    // DSA: Priority Queue Min-Heap extraction
    std::vector<Expense> getMicroExpensesMinHeap(int k = 5) const {
        std::priority_queue<Expense, std::vector<Expense>, MinExpenseComparator> minHeap;
        for (const auto& exp : expenses) {
            if (exp.getAmount() > 0) minHeap.push(exp);
        }
        std::vector<Expense> result;
        while (!minHeap.empty() && k > 0) {
            result.push_back(minHeap.top());
            minHeap.pop();
            k--;
        }
        return result;
    }

    // DSA: Binary Search over sorted timeline in O(log N)
    std::pair<int, double> queryDateRangeBinarySearch(const std::string& startDate, const std::string& endDate,
                                                     std::unordered_map<std::string, double>& rangeCategoryTotals) const {
        auto lower_it = std::lower_bound(sorted_by_date.begin(), sorted_by_date.end(), startDate,
            [](const Expense& exp, const std::string& val) {
                return exp.getDate() < val;
            });

        auto upper_it = std::upper_bound(sorted_by_date.begin(), sorted_by_date.end(), endDate,
            [](const std::string& val, const Expense& exp) {
                return val < exp.getDate();
            });

        int count = static_cast<int>(std::distance(lower_it, upper_it));
        double spend = 0.0;
        for (auto it = lower_it; it != upper_it; ++it) {
            spend += it->getAmount();
            rangeCategoryTotals[it->getCategory()] += it->getAmount();
        }
        return {count, spend};
    }

    std::string getLatestMonth() const {
        std::string latest = "";
        for (const auto& exp : sorted_by_date) {
            if (exp.getMonth() > latest && exp.getMonth() != "Unknown") {
                latest = exp.getMonth();
            }
        }
        return latest.empty() ? "2026-10" : latest;
    }

    int getLatestDayOfMonth() const {
        if (!sorted_by_date.empty()) {
            std::string last_date = sorted_by_date.back().getDate();
            if (last_date.length() >= 10) {
                try {
                    return std::stoi(last_date.substr(8, 2));
                } catch (...) {}
            }
        }
        return 16;
    }
};

// ============================================================================
// OOP MASTER CONTROLLER (Facade Pattern Orchestrator)
// ============================================================================
class ExpenseAnalysisEngine {
private:
    ExpenseDataset dataset;
    std::vector<std::unique_ptr<PatternDetector>> patternDetectors; // Polymorphic container

public:
    ExpenseAnalysisEngine() {
        // Register Polymorphic Detectors
        patternDetectors.push_back(std::make_unique<SubscriptionPatternDetector>());
        patternDetectors.push_back(std::make_unique<AnomalySpikeDetector>());
    }

    void loadData(const std::string& inputJson) {
        std::vector<Expense> expenses;
        std::string expSection = JsonHelper::extractArraySection(inputJson, "expenses");
        if (!expSection.empty()) {
            size_t i = 0;
            while (i < expSection.length()) {
                size_t objStart = expSection.find('{', i);
                if (objStart == std::string::npos) break;
                
                int depth = 0;
                size_t objEnd = objStart;
                for (; objEnd < expSection.length(); ++objEnd) {
                    if (expSection[objEnd] == '{') depth++;
                    else if (expSection[objEnd] == '}') {
                        depth--;
                        if (depth == 0) break;
                    }
                }
                if (depth != 0) break;
                
                std::string objStr = expSection.substr(objStart, objEnd - objStart + 1);
                int id = JsonHelper::extractInt(objStr, "id");
                std::string title = JsonHelper::extractString(objStr, "title");
                double amount = JsonHelper::extractDouble(objStr, "amount");
                std::string category = JsonHelper::extractString(objStr, "category");
                std::string date = JsonHelper::extractString(objStr, "date");
                std::string payment_method = JsonHelper::extractString(objStr, "payment_method");
                std::string notes = JsonHelper::extractString(objStr, "notes");

                if (!title.empty() || amount > 0) {
                    expenses.emplace_back(id, title, amount, category, date, payment_method, notes);
                }
                i = objEnd + 1;
            }
        }

        std::vector<Budget> budgets;
        std::string bgtSection = JsonHelper::extractArraySection(inputJson, "budgets");
        if (!bgtSection.empty()) {
            size_t i = 0;
            while (i < bgtSection.length()) {
                size_t objStart = bgtSection.find('{', i);
                if (objStart == std::string::npos) break;
                
                int depth = 0;
                size_t objEnd = objStart;
                for (; objEnd < bgtSection.length(); ++objEnd) {
                    if (bgtSection[objEnd] == '{') depth++;
                    else if (bgtSection[objEnd] == '}') {
                        depth--;
                        if (depth == 0) break;
                    }
                }
                if (depth != 0) break;
                
                std::string objStr = bgtSection.substr(objStart, objEnd - objStart + 1);
                std::string category = JsonHelper::extractString(objStr, "category");
                double limit = JsonHelper::extractDouble(objStr, "monthly_limit");
                double threshold = JsonHelper::extractDouble(objStr, "alert_threshold");

                if (!category.empty() && limit > 0) {
                    budgets.emplace_back(category, limit, threshold);
                }
                i = objEnd + 1;
            }
        }

        dataset.load(expenses, budgets);
    }

    void executeAnalysis() {
        // Run all registered polymorphic pattern detectors
        for (auto& detector : patternDetectors) {
            detector->detect(dataset.getExpenses());
        }
    }

    std::string generateJSONReport(double executionTimeMicros) {
        std::ostringstream out;
        out << std::fixed << std::setprecision(2);

        out << "{\n";
        out << "  \"engine\": \"C++14 High-Performance Object-Oriented DSA Engine\",\n";
        out << "  \"architecture\": {\n";
        out << "    \"paradigm\": \"Object-Oriented Programming (OOP) + Data Structures & Algorithms\",\n";
        out << "    \"oops_pillars\": [\"Encapsulation (Classes & Accessors)\", \"Abstraction (Clean Interfaces)\", \"Inheritance (PatternDetector Base Class)\", \"Polymorphism (Virtual Detectors)\"],\n";
        out << "    \"design_patterns\": [\"Facade Pattern (ExpenseAnalysisEngine)\", \"Strategy/Polymorphic Detectors\", \"Repository/Dataset Aggregator\"]\n";
        out << "  },\n";
        out << "  \"benchmark\": {\n";
        out << "    \"processing_time_microseconds\": " << executionTimeMicros << ",\n";
        out << "    \"total_transactions_processed\": " << dataset.getExpenses().size() << ",\n";
        out << "    \"dsa_used\": [\"std::unordered_map (Hash Map)\", \"std::priority_queue (Max/Min Heaps)\", \"std::sort (Quicksort/Introsort)\", \"std::lower_bound (Binary Search)\"]\n";
        out << "  },\n";

        // Summary statistics
        std::string latestMonth = dataset.getLatestMonth();
        std::string rangeStart = latestMonth + "-01";
        std::string rangeEnd = latestMonth + "-31";
        std::unordered_map<std::string, double> currentMonthCategoryTotals;
        auto binarySearchResult = dataset.queryDateRangeBinarySearch(rangeStart, rangeEnd, currentMonthCategoryTotals);

        auto* anomalyDetector = dynamic_cast<AnomalySpikeDetector*>(patternDetectors[1].get());
        double mean = anomalyDetector ? anomalyDetector->getMean() : 0.0;
        double stdDev = anomalyDetector ? anomalyDetector->getStdDev() : 0.0;

        out << "  \"summary\": {\n";
        out << "    \"grand_total\": " << dataset.getGrandTotal() << ",\n";
        out << "    \"total_count\": " << dataset.getExpenses().size() << ",\n";
        out << "    \"mean\": " << mean << ",\n";
        out << "    \"median\": " << dataset.getMedian() << ",\n";
        out << "    \"q1\": " << dataset.getQ1() << ",\n";
        out << "    \"q3\": " << dataset.getQ3() << ",\n";
        out << "    \"iqr\": " << dataset.getIQR() << ",\n";
        out << "    \"std_dev\": " << stdDev << ",\n";
        out << "    \"latest_month\": \"" << JsonHelper::escape(latestMonth) << "\",\n";
        out << "    \"current_month_spend\": " << binarySearchResult.second << ",\n";
        out << "    \"current_month_count\": " << binarySearchResult.first << ",\n";
        out << "    \"binary_search_window\": {\"start\": \"" << rangeStart << "\", \"end\": \"" << rangeEnd << "\", \"matches\": " << binarySearchResult.first << "}\n";
        out << "  },\n";

        // Categories from Hash Map
        out << "  \"categories\": [\n";
        bool first = true;
        for (const auto& pair : dataset.getCategoryTotals()) {
            if (!first) out << ",\n";
            first = false;
            double pct = (dataset.getGrandTotal() > 0) ? (pair.second / dataset.getGrandTotal() * 100.0) : 0.0;
            int count = dataset.getCategoryCounts().at(pair.first);
            double avg = (count > 0) ? (pair.second / count) : 0.0;
            out << "    {\"category\": \"" << JsonHelper::escape(pair.first) << "\", \"total\": " << pair.second 
                << ", \"count\": " << count << ", \"percentage\": " << pct 
                << ", \"average\": " << avg << "}";
        }
        out << "\n  ],\n";

        // Payment Methods from Hash Map
        out << "  \"payment_methods\": [\n";
        first = true;
        for (const auto& pair : dataset.getPaymentTotals()) {
            if (!first) out << ",\n";
            first = false;
            double pct = (dataset.getGrandTotal() > 0) ? (pair.second / dataset.getGrandTotal() * 100.0) : 0.0;
            out << "    {\"method\": \"" << JsonHelper::escape(pair.first) << "\", \"total\": " << pair.second << ", \"percentage\": " << pct << "}";
        }
        out << "\n  ],\n";

        // Top Expenses from Max-Heap
        out << "  \"top_expenses_heap\": [\n";
        auto topExpenses = dataset.getTopExpensesMaxHeap(10);
        first = true;
        for (const auto& exp : topExpenses) {
            if (!first) out << ",\n";
            first = false;
            out << "    " << exp.toJSON();
        }
        out << "\n  ],\n";

        // Micro-Expenses from Min-Heap
        out << "  \"micro_expenses_heap\": [\n";
        auto microExpenses = dataset.getMicroExpensesMinHeap(5);
        first = true;
        for (const auto& exp : microExpenses) {
            if (!first) out << ",\n";
            first = false;
            out << "    {\"id\": " << exp.getId() << ", \"title\": \"" << JsonHelper::escape(exp.getTitle()) 
                << "\", \"amount\": " << exp.getAmount() << ", \"category\": \"" << JsonHelper::escape(exp.getCategory()) 
                << "\", \"date\": \"" << exp.getDate() << "\"}";
        }
        out << "\n  ],\n";

        // Anomalies from Polymorphic AnomalySpikeDetector
        out << "  \"anomalies\": [\n";
        first = true;
        if (anomalyDetector) {
            for (const auto& anom : anomalyDetector->getAnomalies()) {
                if (!first) out << ",\n";
                first = false;
                out << "    {\"id\": " << anom.id << ", \"title\": \"" << JsonHelper::escape(anom.title) 
                    << "\", \"amount\": " << anom.amount << ", \"category\": \"" << JsonHelper::escape(anom.category) 
                    << "\", \"date\": \"" << anom.date << "\", \"z_score\": " << anom.z_score << "}";
            }
        }
        out << "\n  ],\n";

        // Recurring Subscriptions from Polymorphic SubscriptionPatternDetector
        out << "  \"recurring_patterns\": [\n";
        first = true;
        auto* subDetector = dynamic_cast<SubscriptionPatternDetector*>(patternDetectors[0].get());
        if (subDetector) {
            for (const auto& pat : subDetector->getPatterns()) {
                if (!first) out << ",\n";
                first = false;
                out << "    {\"merchant\": \"" << JsonHelper::escape(pat.merchant) 
                    << "\", \"category\": \"" << JsonHelper::escape(pat.category) 
                    << "\", \"avg_amount\": " << pat.avg_amount 
                    << ", \"occurrences\": " << pat.occurrences 
                    << ", \"frequency\": \"" << pat.estimated_frequency 
                    << "\", \"annual_impact\": " << pat.annual_impact << "}";
            }
        }
        out << "\n  ],\n";

        // Budget Alerts with Max-Heap Prioritization
        std::priority_queue<CategoryAlert, std::vector<CategoryAlert>, AlertComparator> alertQueue;
        std::unordered_map<std::string, Budget> budgetMap;
        for (const auto& b : dataset.getBudgets()) {
            budgetMap[b.getCategory()] = b;
        }

        if (budgetMap.empty()) {
            budgetMap["House Rent & Maintenance"] = {"House Rent & Maintenance", 25000.0, 0.90};
            budgetMap["Groceries & Kirana"] = {"Groceries & Kirana", 12000.0, 0.80};
            budgetMap["Food & Dining (Swiggy/Zomato)"] = {"Food & Dining (Swiggy/Zomato)", 8000.0, 0.80};
            budgetMap["Shopping & Tech"] = {"Shopping & Tech", 10000.0, 0.75};
            budgetMap["Transportation & Fuel"] = {"Transportation & Fuel", 5000.0, 0.80};
            budgetMap["Utilities & Bills"] = {"Utilities & Bills", 4500.0, 0.80};
            budgetMap["Entertainment & OTT"] = {"Entertainment & OTT", 3000.0, 0.80};
            budgetMap["Health & Medical"] = {"Health & Medical", 3500.0, 0.85};
        }

        int dayOfMonth = dataset.getLatestDayOfMonth();
        for (const auto& pair : budgetMap) {
            const std::string& cat = pair.first;
            const Budget& b = pair.second;
            double spent = currentMonthCategoryTotals[cat];
            alertQueue.emplace(cat, spent, b.getMonthlyLimit(), b.getAlertThreshold(), dayOfMonth);
        }

        out << "  \"budget_alerts\": [\n";
        first = true;
        while (!alertQueue.empty()) {
            if (!first) out << ",\n";
            first = false;
            out << "    " << alertQueue.top().toJSON();
            alertQueue.pop();
        }
        out << "\n  ],\n";

        // Monthly History
        std::vector<std::string> allMonths;
        for (const auto& pair : dataset.getMonthlyTotals()) {
            if (pair.first != "Unknown") allMonths.push_back(pair.first);
        }
        std::sort(allMonths.begin(), allMonths.end());

        out << "  \"monthly_history\": [\n";
        first = true;
        for (const auto& m : allMonths) {
            if (!first) out << ",\n";
            first = false;
            out << "    {\"month\": \"" << m << "\", \"total\": " << dataset.getMonthlyTotals().at(m) 
                << ", \"count\": " << dataset.getMonthlyCounts().at(m) << "}";
        }
        out << "\n  ]\n";

        out << "}\n";
        return out.str();
    }
};

// ============================================================================
// MAIN ENTRY POINT
// ============================================================================
int main(int argc, char* argv[]) {
    std::ios_base::sync_with_stdio(false);
    std::cin.tie(NULL);

    std::string inputJson;
    if (argc > 1) {
        std::ifstream file(argv[1]);
        if (file) {
            std::stringstream buffer;
            buffer << file.rdbuf();
            inputJson = buffer.str();
        }
    }
    if (inputJson.empty()) {
        std::stringstream buffer;
        buffer << std::cin.rdbuf();
        inputJson = buffer.str();
    }

    if (inputJson.empty()) {
        std::cout << "{\"error\": \"Empty input JSON\"}\n";
        return 0;
    }

    auto startTime = std::chrono::high_resolution_clock::now();

    // OOP Engine Instantiation & Execution
    ExpenseAnalysisEngine engine;
    engine.loadData(inputJson);
    engine.executeAnalysis();

    auto endTime = std::chrono::high_resolution_clock::now();
    double execTimeMicros = std::chrono::duration<double, std::micro>(endTime - startTime).count();

    std::cout << engine.generateJSONReport(execTimeMicros);
    return 0;
}
