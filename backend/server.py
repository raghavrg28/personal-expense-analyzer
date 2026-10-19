import http.server
import socketserver
import urllib.parse
import json
import os
import sys
import webbrowser
import threading
import csv
import io
import mimetypes

from database import (
    init_db, get_all_expenses, add_expense, update_expense, delete_expense,
    get_budgets, set_budget, clear_all_expenses, seed_sample_data, run_dsa_analysis
)

FRONTEND_DIST = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend", "dist")

class ExpenseAPIHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Enable CORS for local development & browser access
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def send_json(self, data, status=200):
        body = json.dumps(data, indent=2).encode('utf-8')
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def send_error_json(self, message, status=400):
        self.send_json({"error": message, "status": "error"}, status=status)

    def read_json_body(self):
        content_length = int(self.headers.get('Content-Length', 0))
        if content_length == 0:
            return {}
        raw = self.rfile.read(content_length).decode('utf-8')
        try:
            return json.loads(raw)
        except Exception:
            return {}

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        query = urllib.parse.parse_qs(parsed.query)

        # API Endpoints
        if path == "/api/expenses":
            category = query.get("category", [None])[0]
            search = query.get("search", [None])[0]
            start_date = query.get("start_date", [None])[0]
            end_date = query.get("end_date", [None])[0]
            expenses = get_all_expenses(category, search, start_date, end_date)
            self.send_json({"expenses": expenses, "count": len(expenses)})
            return

        elif path == "/api/budgets":
            budgets = get_budgets()
            self.send_json({"budgets": budgets})
            return

        elif path == "/api/analyze":
            try:
                analysis = run_dsa_analysis()
                self.send_json(analysis)
            except Exception as e:
                self.send_error_json(f"Analysis engine error: {str(e)}", 500)
            return

        elif path == "/api/export":
            expenses = get_all_expenses()
            output = io.StringIO()
            writer = csv.writer(output)
            writer.writerow(["ID", "Title", "Amount", "Category", "Date", "Payment Method", "Notes"])
            for e in expenses:
                writer.writerow([e["id"], e["title"], e["amount"], e["category"], e["date"], e["payment_method"], e["notes"]])
            csv_data = output.getvalue().encode('utf-8')
            self.send_response(200)
            self.send_header("Content-Type", "text/csv")
            self.send_header("Content-Disposition", 'attachment; filename="expenses_export.csv"')
            self.send_header("Content-Length", str(len(csv_data)))
            self.end_headers()
            self.wfile.write(csv_data)
            return

        # Static Frontend Serving
        if os.path.exists(FRONTEND_DIST):
            # Map request to file in dist
            req_path = path.lstrip('/')
            file_path = os.path.join(FRONTEND_DIST, req_path)
            
            if os.path.isdir(file_path) or not os.path.exists(file_path) or req_path == '':
                file_path = os.path.join(FRONTEND_DIST, "index.html")

            if os.path.exists(file_path):
                mime_type, _ = mimetypes.guess_type(file_path)
                if not mime_type:
                    mime_type = "application/octet-stream"
                try:
                    with open(file_path, 'rb') as f:
                        content = f.read()
                    self.send_response(200)
                    self.send_header("Content-Type", mime_type)
                    self.send_header("Content-Length", str(len(content)))
                    self.end_headers()
                    self.wfile.write(content)
                    return
                except Exception as e:
                    self.send_error_json(str(e), 500)
                    return

        # Fallback response if frontend not yet built
        fallback_html = """<!DOCTYPE html>
<html>
<head><title>Personal Expense Analyzer</title></head>
<body style="font-family:sans-serif;text-align:center;padding:50px;background:#0f172a;color:#f8fafc;">
    <h1>Personal Expense Analyzer</h1>
    <p>API Server is running! Building frontend...</p>
    <p><a href="/api/analyze" style="color:#38bdf8;">Click here to inspect C++ DSA Engine JSON output</a></p>
</body>
</html>""".encode('utf-8')
        self.send_response(200)
        self.send_header("Content-Type", "text/html")
        self.send_header("Content-Length", str(len(fallback_html)))
        self.end_headers()
        self.wfile.write(fallback_html)

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path == "/api/expenses":
            data = self.read_json_body()
            title = data.get("title")
            amount = data.get("amount")
            category = data.get("category", "General")
            date = data.get("date")
            payment_method = data.get("payment_method", "Credit Card")
            notes = data.get("notes", "")

            if not title or amount is None or not date:
                self.send_error_json("Fields 'title', 'amount', and 'date' are required.")
                return

            try:
                new_id = add_expense(title, float(amount), category, date, payment_method, notes)
                self.send_json({"id": new_id, "message": "Expense added successfully."}, 201)
            except Exception as e:
                self.send_error_json(str(e), 500)
            return

        elif path == "/api/budgets":
            data = self.read_json_body()
            category = data.get("category")
            monthly_limit = data.get("monthly_limit")
            alert_threshold = data.get("alert_threshold", 0.80)

            if not category or monthly_limit is None:
                self.send_error_json("Fields 'category' and 'monthly_limit' are required.")
                return

            try:
                set_budget(category, float(monthly_limit), float(alert_threshold))
                self.send_json({"message": f"Budget updated for {category}."})
            except Exception as e:
                self.send_error_json(str(e), 500)
            return

        elif path == "/api/seed":
            try:
                seed_sample_data()
                analysis = run_dsa_analysis()
                self.send_json({"message": "Sample data seeded successfully.", "analysis": analysis})
            except Exception as e:
                self.send_error_json(str(e), 500)
            return

        elif path == "/api/clear":
            try:
                clear_all_expenses()
                self.send_json({"message": "All expenses cleared."})
            except Exception as e:
                self.send_error_json(str(e), 500)
            return

        self.send_error_json(f"Endpoint {path} not found.", 404)

    def do_PUT(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path.startswith("/api/expenses/"):
            try:
                expense_id = int(path.split("/")[-1])
            except ValueError:
                self.send_error_json("Invalid expense ID.")
                return

            data = self.read_json_body()
            title = data.get("title")
            amount = data.get("amount")
            category = data.get("category", "General")
            date = data.get("date")
            payment_method = data.get("payment_method", "Credit Card")
            notes = data.get("notes", "")

            if not title or amount is None or not date:
                self.send_error_json("Missing required fields.")
                return

            success = update_expense(expense_id, title, float(amount), category, date, payment_method, notes)
            if success:
                self.send_json({"message": "Expense updated successfully."})
            else:
                self.send_error_json("Expense not found.", 404)
            return

        self.send_error_json("Endpoint not found.", 404)

    def do_DELETE(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path.startswith("/api/expenses/"):
            try:
                expense_id = int(path.split("/")[-1])
            except ValueError:
                self.send_error_json("Invalid expense ID.")
                return

            success = delete_expense(expense_id)
            if success:
                self.send_json({"message": "Expense deleted successfully."})
            else:
                self.send_error_json("Expense not found.", 404)
            return

        self.send_error_json("Endpoint not found.", 404)

def run_server(port=5000, auto_open=True):
    init_db()
    
    server_address = ("", port)
    
    # Try finding an available port starting from 5000
    current_port = port
    max_tries = 10
    httpd = None

    for i in range(max_tries):
        try:
            httpd = socketserver.TCPServer(("", current_port), ExpenseAPIHandler)
            httpd.allow_reuse_address = True
            break
        except OSError:
            current_port += 1

    if not httpd:
        print(f"Error: Could not bind to any port from {port} to {current_port}")
        sys.exit(1)

    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

    url = f"http://localhost:{current_port}"
    print("=" * 65)
    print(f"  [+] Personal Expense Analyzer Server is LIVE!")
    print(f"  [*] Web App: {url}")
    print(f"  [*] C++ DSA Engine + SQLite Database active")
    print(f"  [*] Press Ctrl+C to stop the server")
    print("=" * 65)

    if auto_open:
        def open_browser():
            import time
            time.sleep(0.8)
            webbrowser.open_new_tab(url)
        threading.Thread(target=open_browser, daemon=True).start()

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server...")
        httpd.shutdown()

if __name__ == "__main__":
    auto = "--no-open" not in sys.argv
    p = 5000
    for arg in sys.argv:
        if arg.startswith("--port="):
            p = int(arg.split("=")[1])
    run_server(port=p, auto_open=auto)
