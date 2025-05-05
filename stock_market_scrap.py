
import requests, pandas as pd, time, os
from bs4 import BeautifulSoup
from datetime import datetime

headers = {"User-Agent": "Mozilla/5.0"}

symbols = [
    "TCS.NS","INFY.NS","RELIANCE.NS","WIPRO.NS","HDFCBANK.NS",
    "ICICIBANK.NS","SBIN.NS","LT.NS","BAJFINANCE.NS","AXISBANK.NS",
    "ITC.NS","HINDUNILVR.NS","MARUTI.NS","HCLTECH.NS","BHARTIARTL.NS"
]

def get_summary(symbol):
    # Try API first
    url_api = f"https://query2.finance.yahoo.com/v10/finance/quoteSummary/{symbol}?modules=defaultKeyStatistics"
    try:
        js = requests.get(url_api, headers=headers, timeout=20).json()
        res = js.get("quoteSummary", {}).get("result")
        if res:
            stats = res[0]["defaultKeyStatistics"]
            mcap = stats.get("marketCap", {}).get("fmt")
            pe = stats.get("trailingPE", {}).get("fmt")
            return mcap, pe
    except:
        pass  # fallback below if API fails

    # Fallback: Scrape using BeautifulSoup
    url_html = f"https://finance.yahoo.com/quote/{symbol}/key-statistics"
    r = requests.get(url_html, headers=headers, timeout=20)
    soup = BeautifulSoup(r.text, "html.parser")

    try:
        table = soup.find("section", {"data-test": "qsp-statistics"}).find_all("table")
        mcap, pe = None, None
        for t in table:
            for row in t.find_all("tr"):
                cells = row.find_all("td")
                if len(cells) == 2:
                    label = cells[0].text.strip()
                    value = cells[1].text.strip()
                    if "Market Cap" in label and not mcap:
                        mcap = value
                    elif "Trailing P/E" in label and not pe:
                        pe = value
        return mcap, pe
    except:
        return None, None

def scrape(symbol):
    print("Scraping", symbol)
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?range=5y&interval=1d"
    r = requests.get(url, headers=headers, timeout=20).json()["chart"]["result"][0]
    ts = r["timestamp"]
    q = r["indicators"]["quote"][0]

    df = pd.DataFrame({
        "Date": [datetime.fromtimestamp(t).strftime("%Y-%m-%d") for t in ts],
        "Day": [datetime.fromtimestamp(t).strftime("%A") for t in ts],
        "Open": q["open"], "High": q["high"], "Low": q["low"],
        "Close": q["close"], "Volume": q["volume"],
        "Symbol": symbol
    })

    # Add market cap and PE using get_summary
    mcap, pe = get_summary(symbol)
    df["MarketCap"] = mcap
    df["PERatio"] = pe

    fname = f"{symbol}_5year_history.csv"
    df.to_csv(fname, index=False)
    print(" saved", fname)
    return df

frames = []
for sym in symbols:
    frames.append(scrape(sym))
    time.sleep(1)

merged = pd.concat(frames, ignore_index=True)
merged.to_csv("stocks_market.csv", index=False)
print("Merged rows:", len(merged))
