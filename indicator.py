import pandas as pd
import yfinance as yf
from datetime import timedelta

# Read the CSV file
df = pd.read_csv("stock_price.csv")
df['Date'] = pd.to_datetime(df['Date'], dayfirst=True, errors='coerce')
df = df.dropna(subset=['Date'])

# Fix stock symbols (avoid double .NS)
df['YahooSymbol'] = df['Symbol'].str.replace('.NS', '', regex=False).str.upper() + ".NS"

# RSI calculation function
def compute_rsi(series, period=14):
    delta = series.diff()
    gain = delta.where(delta > 0, 0)
    loss = -delta.where(delta < 0, 0)
    avg_gain = gain.rolling(window=period).mean()
    avg_loss = loss.rolling(window=period).mean()
    rs = avg_gain / avg_loss
    rsi = 100 - (100 / (1 + rs))
    return rsi

# Collect results
rsi_data = []

for idx, row in df.iterrows():
    date = row['Date']
    symbol = row['YahooSymbol']
    print(f"📈 Processing {symbol} on {date.strftime('%Y-%m-%d')}")

    # Date range: need some history for RSI calculation
    start_date = date - timedelta(days=30)
    end_date = date + timedelta(days=1)

    try:
        data = yf.download(symbol, start=start_date.strftime('%Y-%m-%d'),
                           end=end_date.strftime('%Y-%m-%d'), progress=False, auto_adjust=True)

        if data.empty or 'Close' not in data.columns:
            print(f"⚠️ No data found for {symbol} around {date}")
            continue

        data['RSI'] = compute_rsi(data['Close'])

        date_str = date.strftime('%Y-%m-%d')
        if date_str in data.index.strftime('%Y-%m-%d').tolist():
            rsi_value = data.loc[data.index.strftime('%Y-%m-%d') == date_str, 'RSI'].values
            rsi_value = round(rsi_value[0], 2) if len(rsi_value) > 0 and pd.notnull(rsi_value[0]) else None
        else:
            rsi_value = None

        rsi_data.append({
            'Date': date.strftime('%d-%m-%Y'),
            'Stock': symbol.replace('.NS', ''),
            'RSI': rsi_value
        })

    except Exception as e:
        print(f"❌ Failed to fetch RSI for {symbol} on {date}: {e}")

# Save to CSV
rsi_df = pd.DataFrame(rsi_data)
rsi_df.to_csv("rsi_per_stock.csv", index=False)
print("✅ RSI values saved to rsi_per_stock.csv")
