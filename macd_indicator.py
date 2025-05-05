import pandas as pd

# Load the CSV file
df = pd.read_csv("stock_price.csv")

# Convert 'Date' to datetime format and sort the data
df['Date'] = pd.to_datetime(df['Date'], format='%d-%m-%Y')
df.sort_values('Date', inplace=True)

# Calculate 20-day Simple Moving Average (SMA)
df['SMA_20'] = df['Close'].rolling(window=20).mean()

# Calculate 12-day and 26-day Exponential Moving Averages (EMAs)
df['EMA_12'] = df['Close'].ewm(span=12, adjust=False).mean()
df['EMA_26'] = df['Close'].ewm(span=26, adjust=False).mean()

# Calculate MACD and Signal Line
df['MACD'] = df['EMA_12'] - df['EMA_26']
df['Signal_Line'] = df['MACD'].ewm(span=9, adjust=False).mean()

# Optional: Save the result to a new CSV
df.to_csv("stock_price_with_indicators.csv", index=False)

# Show the last few rows with indicators
print(df[['Date', 'Close', 'SMA_20', 'EMA_12', 'EMA_26', 'MACD', 'Signal_Line']].tail())
