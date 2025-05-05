from flask import Flask, render_template, jsonify, request
import pandas as pd
import numpy as np
from datetime import datetime, timedelta

app = Flask(__name__)

DEFAULT_SYMBOL = "AXISBANK.NS"
PALETTE = ['#007bff', '#28a745', '#dc3545', '#ffc107', '#17a2b8', '#6610f2']
_stock_cache: pd.DataFrame | None = None

# ---------- helpers ---------------------------------------------------------

def load_data() -> pd.DataFrame:
    global _stock_cache
    if _stock_cache is None:
        df = pd.read_csv("stock.csv")
        df["Date"] = pd.to_datetime(df["Date"])
        _stock_cache = df
    return _stock_cache.copy()

def clean(df: pd.DataFrame):
    """NaN -> None so jsonify works."""
    return df.replace({np.nan: None}).to_dict(orient="records")

def filtered_df() -> pd.DataFrame:
    df = load_data()
    symbol = request.args.get("symbol", DEFAULT_SYMBOL)
    df = df[df["Symbol"] == symbol]

    s, e = request.args.get("start_date"), request.args.get("end_date")
    if s and e:
        try:
            s_dt, e_dt = datetime.strptime(s, "%Y-%m-%d"), datetime.strptime(e, "%Y-%m-%d")
            df = df[(df["Date"] >= s_dt) & (df["Date"] <= e_dt)]
        except ValueError:
            return pd.DataFrame()  # empty triggers 400
    return df

# ---------- routes ----------------------------------------------------------

@app.route("/")
def index():
    symbols = load_data()["Symbol"].unique().tolist()
    return render_template("index.html", symbols=symbols)

@app.route("/about")
def about_page():
    return render_template("about.html")

@app.route("/contact")
def contact_page():
    return render_template("contact.html")

@app.route("/price-history")
def price_history_page():
    symbols = load_data()["Symbol"].unique().tolist()
    return render_template("price-history.html", symbols=symbols)

@app.route("/daily-returns")
def daily_returns_page():
    symbols = load_data()["Symbol"].unique().tolist()
    return render_template("daily-returns.html", symbols=symbols)

@app.route("/volume-traded")
def volume_traded_page():
    symbols = load_data()["Symbol"].unique().tolist()
    return render_template("volume-traded.html", symbols=symbols)

@app.route("/indicator")
def indicator_page():
    symbols = load_data()["Symbol"].unique().tolist()
    return render_template("indicator.html", symbols=symbols)

@app.route("/signals")
def signals_page():
    symbols = load_data()["Symbol"].unique().tolist()
    return render_template("signals.html", symbols=symbols)

@app.route("/simulator")
def simulator_page():
    symbols = load_data()["Symbol"].unique().tolist()
    return render_template("simulator.html", symbols=symbols)

@app.route("/heatmap")
def heatmap_page():
    return render_template("heatmap.html")

@app.route("/volatility")
def volatility_page():
    return render_template("volatility.html")

@app.route("/bought")
def bought_page():
    symbols = load_data()["Symbol"].unique().tolist()
    return render_template("bought.html", symbols=symbols)

@app.route("/strength")
def strength_page():
    return render_template("strength.html")

@app.route("/weekday-returns")
def weekday_returns_page():
    symbols = load_data()["Symbol"].unique().tolist()
    return render_template("weekday-returns.html", symbols=symbols)

@app.route("/year-growth")
def year_growth_page():
    return render_template("year-growth.html")

@app.route("/result")
def result():
    df = filtered_df()
    if df.empty:
        return render_template("result.html", error="No data available for this selection")

    df["ReturnPct"] = df["Close"].pct_change() * 100
    data = {
        "stock_symbol": request.args.get("symbol", DEFAULT_SYMBOL),
        "avg_close": df["Close"].mean(),
        "highest_price": df["High"].max(),
        "lowest_price": df["Low"].min(),
        "avg_return": df["ReturnPct"].mean(),
        "start_date": request.args.get("start_date", "N/A"),
        "end_date": request.args.get("end_date", "N/A")
    }
    return render_template("result.html", **data)

@app.route("/api/stock-data")
def stock_data():
    df = filtered_df()
    if df.empty:
        return jsonify({"error": "Invalid symbol or date range"}), 400
    df["Volume_MA"] = df["Volume"].rolling(50, min_periods=1).mean()
    return jsonify(clean(df))

@app.route("/api/price-history")
def price_history():
    df = filtered_df()
    if df.empty:
        return jsonify({"error": "Invalid symbol or date range"}), 400
    price_data = {
        "dates": df["Date"].dt.strftime("%Y-%m-%d").tolist(),
        "open": df["Open"].tolist(),
        "high": df["High"].tolist(),
        "low": df["Low"].tolist(),
        "close": df["Close"].tolist(),
    }
    return jsonify(price_data)

@app.route("/api/daily-returns")
def daily_returns():
    df = filtered_df()
    if df.empty:
        return jsonify({"error": "Invalid symbol or date range"}), 400
    df["ReturnPct"] = df["Close"].pct_change() * 100
    daily_return_data = {
        "dates": df["Date"].dt.strftime("%Y-%m-%d").tolist(),
        "returns": df["ReturnPct"].tolist(),
    }
    return jsonify(daily_return_data)

@app.route("/api/volume-traded")
def volume_traded():
    df = filtered_df()
    if df.empty:
        return jsonify({"error": "Invalid symbol or date range"}), 400
    volume_data = {
        "dates": df["Date"].dt.strftime("%Y-%m-%d").tolist(),
        "volume": df["Volume"].tolist(),
        "volume_ma": df["Volume"].rolling(50, min_periods=1).mean().tolist(),
    }
    return jsonify(volume_data)

@app.route("/api/returns-by-day")
def returns_by_day():
    df = filtered_df()
    if df.empty:
        return jsonify({d: 0 for d in ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]})
    df["Day"] = df["Date"].dt.day_name()
    df["ReturnPct"] = df["Close"].pct_change() * 100
    avg = (df.groupby("Day")["ReturnPct"].mean()
           .reindex(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], fill_value=0))
    return jsonify({d: (None if pd.isna(v) else round(v, 4)) for d, v in avg.items()})

@app.route("/api/year-wise-growth")
def year_growth():
    df = load_data()
    df["Year"] = df["Date"].dt.year
    df["ReturnPct"] = df["Close"].pct_change() * 100
    growth = df.groupby(["Year", "Symbol"])["ReturnPct"].mean().unstack(fill_value=0)
    datasets = [{"label": s,
                 "data": growth[s].tolist(),
                 "backgroundColor": PALETTE[i % len(PALETTE)]}
                for i, s in enumerate(growth.columns)]
    return jsonify({"years": growth.index.tolist(),
                    "datasets": datasets})

@app.route("/api/technical-indicators")
def technical_indicators():
    df = filtered_df()
    if df.empty:
        return jsonify({"error": "Invalid symbol or date range"}), 400
    
    df["SMA"] = df["Close"].rolling(window=14).mean()
    df["EMA"] = df["Close"].ewm(span=14, adjust=False).mean()
    df["EMA_12"] = df["Close"].ewm(span=12, adjust=False).mean()
    df["EMA_26"] = df["Close"].ewm(span=26, adjust=False).mean()
    df["MACD"] = df["EMA_12"] - df["EMA_26"]
    df["Signal_Line"] = df["MACD"].ewm(span=9, adjust=False).mean()

    technical_data = {
        "dates": df["Date"].dt.strftime("%Y-%m-%d").tolist(),
        "SMA": df["SMA"].tolist(),
        "EMA": df["EMA"].tolist(),
        "MACD": df["MACD"].tolist(),
        "Signal_Line": df["Signal_Line"].tolist(),
    }
    return jsonify(technical_data)

@app.route("/api/backtested-signals")
def backtested_signals():
    df = filtered_df()
    if df.empty:
        return jsonify({"error": "Invalid symbol or date range"}), 400
    
    df["EMA_12"] = df["Close"].ewm(span=12, adjust=False).mean()
    df["EMA_26"] = df["Close"].ewm(span=26, adjust=False).mean()
    df["MACD"] = df["EMA_12"] - df["EMA_26"]
    df["Signal_Line"] = df["MACD"].ewm(span=9, adjust=False).mean()
    df["Buy_Signal"] = (df["MACD"] > df["Signal_Line"]) & (df["MACD"].shift(1) <= df["Signal_Line"].shift(1))
    df["Sell_Signal"] = (df["MACD"] < df["Signal_Line"]) & (df["MACD"].shift(1) >= df["Signal_Line"].shift(1))
    
    signals_data = {
        "dates": df["Date"].dt.strftime("%Y-%m-%d").tolist(),
        "buy_signals": df["Buy_Signal"].astype(int).tolist(),
        "sell_signals": df["Sell_Signal"].astype(int).tolist(),
    }
    return jsonify(signals_data)

@app.route("/api/simulate")
def simulate():
    symbol = request.args.get("symbol", DEFAULT_SYMBOL)
    start_date = request.args.get("start_date")
    amount = float(request.args.get("amount", 0))

    if not start_date or amount <= 0:
        return jsonify({"error": "Invalid start date or amount"}), 400

    df = load_data()
    df = df[df["Symbol"] == symbol]
    
    try:
        s_dt = datetime.strptime(start_date, "%Y-%m-%d")
        df = df[df["Date"] >= s_dt]
    except ValueError:
        return jsonify({"error": "Invalid date format"}), 400

    if df.empty:
        return jsonify({"error": "No data available for this selection"}), 404

    final_price = df["Close"].iloc[-1]
    initial_price = df["Close"].iloc[0]
    final_value = (amount / initial_price) * final_price
    return_pct = ((final_value - amount) / amount) * 100

    return jsonify({
        "final_value": round(final_value, 2),
        "return_pct": round(return_pct, 2)
    })

@app.route("/api/macd-heatmap")
def macd_heatmap():
    try:
        df = load_data()
        symbols = df["Symbol"].unique().tolist()
        max_date = df["Date"].max()
        min_date = max_date - timedelta(days=30)
        df = df[df["Date"] >= min_date]

        dates = df["Date"].unique()
        dates = np.sort(dates)[:30]  # Last 30 days
        matrix = []

        for sym in symbols:
            df_sym = df[df["Symbol"] == sym].copy()
            if df_sym.empty:
                matrix.append([0] * len(dates))
                continue

            df_sym["EMA_12"] = df_sym["Close"].ewm(span=12, adjust=False).mean()
            df_sym["EMA_26"] = df_sym["Close"].ewm(span=26, adjust=False).mean()
            df_sym["MACD"] = df_sym["EMA_12"] - df["EMA_26"]
            df_sym["Signal_Line"] = df_sym["MACD"].ewm(span=9, adjust=False).mean()
            df_sym["MACD_State"] = (df_sym["MACD"] > df_sym["Signal_Line"]).astype(int)

            state = df_sym[df_sym["Date"].isin(dates)]["MACD_State"].reindex(dates, fill_value=0).values
            matrix.append(state.tolist())

        return jsonify({
            "symbols": symbols,
            "dates": pd.Series(dates).dt.strftime("%Y-%m-%d").tolist(),
            "matrix": matrix
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/volatility")
def volatility():
    df = load_data()
    df["ReturnPct"] = df["Close"].pct_change() * 100
    volatility = df.groupby("Symbol")["ReturnPct"].std().fillna(0).tolist()
    symbols = df["Symbol"].unique().tolist()
    return jsonify({"symbols": symbols, "volatility": volatility})

@app.route("/api/ifbought")
def if_bought():
    symbol = request.args.get("symbol", DEFAULT_SYMBOL)
    buy_date = request.args.get("date")
    if not buy_date:
        return jsonify({"error": "No buy date provided"}), 400

    df = load_data()
    df = df[df["Symbol"] == symbol]
    
    try:
        buy_dt = datetime.strptime(buy_date, "%Y-%m-%d")
        df = df[df["Date"] >= buy_dt]
    except ValueError:
        return jsonify({"error": "Invalid date format"}), 400

    if df.empty:
        return jsonify({"error": "No data available for this selection"}), 404

    initial_price = df["Close"].iloc[0]
    investment_value = (df["Close"] / initial_price) * 1000  # Assume $1000 initial investment
    return jsonify({
        "dates": df["Date"].dt.strftime("%Y-%m-%d").tolist(),
        "investment_value": investment_value.tolist()
    })
@app.route('/learn')
def learn():
    return render_template('learn.html')

@app.route("/api/strength-score")
def strength_score():
    df = load_data()
    df["ReturnPct"] = df["Close"].pct_change() * 100
    df["SMA_50"] = df["Close"].rolling(window=50).mean()
    df["Strength"] = df["Close"] / df["SMA_50"]  # Simple strength metric
    scores = df.groupby("Symbol")["Strength"].mean().fillna(1).tolist()
    symbols = df["Symbol"].unique().tolist()
    return jsonify({"symbols": symbols, "scores": scores})

if __name__ == "__main__":
    app.run(debug=True)