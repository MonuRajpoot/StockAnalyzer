document.addEventListener("DOMContentLoaded", function () {
  try {
    const page = document.body.dataset.page;
    console.log("Page loaded:", page); // Debug

    // Initialize based on page
    if (page === "home") {
      const form = document.getElementById("home-form");
      if (form) {
        form.addEventListener("submit", (e) => {
          e.preventDefault();
          console.log("Home form submitted"); // Debug
          loadHomeCharts();
        });
      } else {
        console.warn("Home form not found"); // Debug
      }
    } else if (page === "result") {
      loadResultPage();
    } else if (page === "price-history") loadPriceHistory();
    else if (page === "daily-returns") loadDailyReturns();
    else if (page === "volume-traded") loadVolumeTraded();
    else if (page === "indicators") loadIndicators();
    else if (page === "signals") loadSignals();
    else if (page === "simulator") loadSimulator();
    else if (page === "heatmap") loadHeatmap();
    else if (page === "volatility") loadVolatility();
    else if (page === "ifbought") loadIfBought();
    else if (page === "strength") loadStrength();
    else if (page === "weekday-returns") loadWeekdayReturns();
    else if (page === "year-growth") loadYearGrowth();

    // Form submission handlers
    const forms = {
      "price-history-form": loadPriceHistory,
      "daily-returns-form": loadDailyReturns,
      "volume-traded-form": loadVolumeTraded,
      "indicator-form": loadIndicators,
      "signals-form": loadSignals,
      "simulator-form": loadSimulator,
      "bought-form": loadIfBought,
      "weekday-returns-form": loadWeekdayReturns
    };

    Object.keys(forms).forEach(formId => {
      const form = document.getElementById(formId);
      if (form) {
        form.addEventListener("submit", (e) => {
          e.preventDefault();
          console.log(`Form submitted: ${formId}`); // Debug
          forms[formId]();
        });
      }
    });
  } catch (err) {
    console.error("Error in DOMContentLoaded handler:", err);
    displayError("Failed to initialize page: " + err.message);
  }
});

function fetchData(endpoint, params = {}) {
  try {
    const url = new URL(`/api/${endpoint}`, window.location.origin);
    Object.keys(params).forEach(k => url.searchParams.append(k, params[k]));
    console.log(`Fetching: ${url.toString()}`); // Debug
    return fetch(url)
      .then(res => {
        if (!res.ok) {
          throw new Error(`HTTP error ${res.status} for ${endpoint}`);
        }
        return res.json();
      })
      .then(data => {
        console.log(`Data received for ${endpoint}:`, data); // Debug
        return data;
      })
      .catch(err => {
        console.error(`Fetch error for ${endpoint}:`, err);
        throw err;
      });
  } catch (err) {
    console.error(`Error in fetchData for ${endpoint}:`, err);
    return Promise.reject(err);
  }
}

function displayError(message) {
  console.error(message.includes("Plotly.js library not loaded") 
    ? `${message}. Please check your network connection, browser settings, or disable ad blockers.`
    : message);
}

function getSelectedSymbol() {
  const el = document.getElementById("symbol-select");
  const symbol = el ? el.value : "AXISBANK.NS";
  console.log(`Selected symbol: ${symbol}`); // Debug
  return symbol;
}

function getSelectedDateRange() {
  const today = new Date("2025-05-05");
  const sixMonthsAgo = new Date(today);
  sixMonthsAgo.setMonth(today.getMonth() - 6);

  const formatDate = (date) => date.toISOString().split("T")[0];

  const start_date = document.getElementById("start-date")?.value || formatDate(sixMonthsAgo);
  const end_date = document.getElementById("end-date")?.value || formatDate(today);
  console.log(`Date range: ${start_date} to ${end_date}`); // Debug
  return { start_date, end_date };
}

// ============== HOME ==============
function loadHomeCharts() {
  try {
    const symbol = getSelectedSymbol();
    const { start_date, end_date } = getSelectedDateRange();

    if (!symbol || !start_date || !end_date) {
      displayError("Please select a valid symbol and date range");
      return;
    }

    const url = new URL("/result", window.location.origin);
    url.searchParams.append("symbol", symbol);
    url.searchParams.append("start_date", start_date);
    url.searchParams.append("end_date", end_date);
    console.log(`Redirecting to: ${url.toString()}`); // Debug
    window.location.href = url.toString();
  } catch (err) {
    console.error("Error in loadHomeCharts:", err);
    displayError("Error in loadHomeCharts: " + err.message);
  }
}

// ============== RESULT PAGE ==============
function loadResultPage() {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const symbol = urlParams.get("symbol") || "AXISBANK.NS";
    const start_date = urlParams.get("start_date") || "2024-11-05";
    const end_date = urlParams.get("end_date") || "2025-05-05";
    console.log(`Result page params: ${symbol}, ${start_date} to ${end_date}`); // Debug

    let cachedData = {};

    const chartButtons = {
      "price-history-btn": () => {
        if (!cachedData["price-history"]) {
          return fetchData("price-history", { symbol, start_date, end_date })
            .then(data => {
              if (data.error) throw new Error(data.error);
              cachedData["price-history"] = data;
              renderLineChart("resultChart", data, ["open", "high", "low", "close"]);
            })
            .catch(err => displayError("Error loading price history: " + err.message));
        } else {
          renderLineChart("resultChart", cachedData["price-history"], ["open", "high", "low", "close"]);
        }
      },
      "daily-returns-btn": () => {
        if (!cachedData["daily-returns"]) {
          return fetchData("daily-returns", { symbol, start_date, end_date })
            .then(data => {
              if (data.error) throw new Error(data.error);
              cachedData["daily-returns"] = data;
              renderBarChart("resultChart", data.dates, data.returns, "Daily Returns (%)");
            })
            .catch(err => displayError("Error loading daily returns: " + err.message));
        } else {
          renderBarChart("resultChart", cachedData["daily-returns"].dates, cachedData["daily-returns"].returns, "Daily Returns (%)");
        }
      },
      "volume-traded-btn": () => {
        if (!cachedData["volume-traded"]) {
          return fetchData("volume-traded", { symbol, start_date, end_date })
            .then(data => {
              if (data.error) throw new Error(data.error);
              cachedData["volume-traded"] = data;
              renderLineChart("resultChart", data, ["volume", "volume_ma"]);
            })
            .catch(err => displayError("Error loading volume traded: " + err.message));
        } else {
          renderLineChart("resultChart", cachedData["volume-traded"], ["volume", "volume_ma"]);
        }
      }
    };

    Object.keys(chartButtons).forEach(btnId => {
      const btn = document.getElementById(btnId);
      if (btn) {
        btn.addEventListener("click", () => {
          console.log(`Chart button clicked: ${btnId}`); // Debug
          chartButtons[btnId]();
        });
      } else {
        console.warn(`Chart button not found: ${btnId}`); // Debug
      }
    });
  } catch (err) {
    console.error("Error in loadResultPage:", err);
    displayError("Error in loadResultPage: " + err.message);
  }
}

// ============== PRICE HISTORY ==============
function loadPriceHistory() {
  try {
    const symbol = getSelectedSymbol();
    const { start_date, end_date } = getSelectedDateRange();

    fetchData("price-history", { symbol, start_date, end_date })
      .then(data => {
        if (data.error) throw new Error(data.error);
        renderLineChart("priceChart", data, ["open", "high", "low", "close"]);
      })
      .catch(err => displayError("Error loading price history: " + err.message));
  } catch (err) {
    console.error("Error in loadPriceHistory:", err);
    displayError("Error in loadPriceHistory: " + err.message);
  }
}

// ============== DAILY RETURNS ==============
function loadDailyReturns() {
  try {
    const symbol = getSelectedSymbol();
    const { start_date, end_date } = getSelectedDateRange();

    fetchData("daily-returns", { symbol, start_date, end_date })
      .then(data => {
        if (data.error) throw new Error(data.error);
        renderBarChart("returnsChart", data.dates, data.returns, "Daily Returns (%)");
      })
      .catch(err => displayError("Error loading daily returns: " + err.message));
  } catch (err) {
    console.error("Error in loadDailyReturns:", err);
    displayError("Error in loadDailyReturns: " + err.message);
  }
}

// ============== VOLUME TRADED ==============
function loadVolumeTraded() {
  try {
    const symbol = getSelectedSymbol();
    const { start_date, end_date } = getSelectedDateRange();

    fetchData("volume-traded", { symbol, start_date, end_date })
      .then(data => {
        if (data.error) throw new Error(data.error);
        renderLineChart("volumeChart", data, ["volume", "volume_ma"]);
      })
      .catch(err => displayError("Error loading volume traded: " + err.message));
  } catch (err) {
    console.error("Error in loadVolumeTraded:", err);
    displayError("Error in loadVolumeTraded: " + err.message);
  }
}

// ============== INDICATORS ==============
function loadIndicators() {
  try {
    const symbol = getSelectedSymbol();
    const { start_date, end_date } = getSelectedDateRange();

    fetchData("technical-indicators", { symbol, start_date, end_date })
      .then(data => {
        if (data.error) throw new Error(data.error);
        renderLineChart("indicatorChart", data, ["SMA", "EMA", "MACD", "Signal_Line"]);
      })
      .catch(err => displayError("Error loading technical indicators: " + err.message));
  } catch (err) {
    console.error("Error in loadIndicators:", err);
    displayError("Error in loadIndicators: " + err.message);
  }
}

// ============== SIGNALS ==============
function loadSignals() {
  try {
    const symbol = getSelectedSymbol();
    const { start_date, end_date } = getSelectedDateRange();

    fetchData("backtested-signals", { symbol, start_date, end_date })
      .then(data => {
        if (data.error) throw new Error(data.error);
        renderSignalChart("signalChart", data);
      })
      .catch(err => displayError("Error loading backtested signals: " + err.message));
  } catch (err) {
    console.error("Error in loadSignals:", err);
    displayError("Error in loadSignals: " + err.message);
  }
}

// ============== SIMULATOR ==============
function loadSimulator() {
  try {
    const symbol = getSelectedSymbol();
    const start = document.getElementById("sim-start-date")?.value;
    const amount = parseFloat(document.getElementById("sim-amount")?.value);

    if (!start || isNaN(amount)) {
      document.getElementById("sim-result").innerText = "Please enter valid inputs.";
      return;
    }

    fetchData("simulate", { symbol, start_date: start, amount })
      .then(data => {
        if (data.error) throw new Error(data.error);
        document.getElementById("sim-result").innerText = `Final Value: ₹${data.final_value.toFixed(2)} (${data.return_pct.toFixed(2)}%)`;
      })
      .catch(err => {
        console.error("Error loading simulator:", err);
        document.getElementById("sim-result").innerText = "Error: " + err.message;
      });
  } catch (err) {
    console.error("Error in loadSimulator:", err);
    displayError("Error in loadSimulator: " + err.message);
  }
}

// ============== HEATMAP ==============
function loadHeatmap() {
  try {
    fetchData("macd-heatmap")
      .then(data => {
        if (data.error) throw new Error(data.error);
        renderHeatmap("heatmapChart", data.symbols, data.dates, data.matrix);
      })
      .catch(err => displayError("Error loading heatmap: " + err.message));
  } catch (err) {
    console.error("Error in loadHeatmap:", err);
    displayError("Error in loadHeatmap: " + err.message);
  }
}

// ============== VOLATILITY ==============
function loadVolatility() {
  try {
    fetchData("volatility")
      .then(data => {
        if (data.error) throw new Error(data.error);
        renderBarChart("volatilityChart", data.symbols, data.volatility, "Volatility (%)");
      })
      .catch(err => displayError("Error loading volatility: " + err.message));
  } catch (err) {
    console.error("Error in loadVolatility:", err);
    displayError("Error in loadVolatility: " + err.message);
  }
}

// ============== IF BOUGHT ==============
function loadIfBought() {
  try {
    const symbol = getSelectedSymbol();
    const buyDate = document.getElementById("buy-date")?.value;
    const chartDiv = document.getElementById("ifBoughtChart");

    if (!buyDate) {
      displayError("Please enter a valid date.");
      return;
    }

    if (!chartDiv) {
      displayError("Chart container ifBoughtChart not found.");
      return;
    }

    fetchData("ifbought", { symbol, date: buyDate })
      .then(data => {
        if (data.error) throw new Error(data.error);
        renderLineChart("ifBoughtChart", data, ["investment_value"]);
      })
      .catch(err => displayError("Error loading if bought: " + err.message));
  } catch (err) {
    console.error("Error in loadIfBought:", err);
    displayError("Error in loadIfBought: " + err.message);
  }
}

// ============== STRENGTH SCORING ==============
function loadStrength() {
  try {
    fetchData("strength-score")
      .then(data => {
        if (data.error) throw new Error(data.error);
        renderBarChart("strengthChart", data.symbols, data.scores, "Strength Score");
      })
      .catch(err => displayError("Error loading strength score: " + err.message));
  } catch (err) {
    console.error("Error in loadStrength:", err);
    displayError("Error in loadStrength: " + err.message);
  }
}

// ============== WEEKDAY RETURNS ==============
function loadWeekdayReturns() {
  try {
    const symbol = getSelectedSymbol();

    fetchData("returns-by-day", { symbol })
      .then(data => {
        renderBarChart("dayReturnsChart", Object.keys(data), Object.values(data), "Avg Return by Day");
      })
      .catch(err => displayError("Error loading weekday returns: " + err.message));
  } catch (err) {
    console.error("Error in loadWeekdayReturns:", err);
    displayError("Error in loadWeekdayReturns: " + err.message);
  }
}

// ============== YEAR-WISE GROWTH ==============
function loadYearGrowth() {
  try {
    fetchData("year-wise-growth")
      .then(data => {
        if (data.error) throw new Error(data.error);
        renderGroupedBarChart("yearGrowthChart", data.years, data.datasets);
      })
      .catch(err => displayError("Error loading year-wise growth: " + err.message));
  } catch (err) {
    console.error("Error in loadYearGrowth:", err);
    displayError("Error in loadYearGrowth: " + err.message);
  }
}

// ============== CHART HELPERS ==============
function renderLineChart(divId, data, keys = []) {
  try {
    const chartDiv = document.getElementById(divId);
    if (!chartDiv) throw new Error(`Chart container ${divId} not found`);
    if (typeof Plotly === "undefined") {
      console.error("Plotly.js not loaded. Check network connection or CDN availability at https://cdn.plot.ly/plotly-2.35.2.min.js.");
      throw new Error("Plotly.js library not loaded");
    }

    console.log(`Rendering line chart for ${divId} with keys:`, keys); // Debug
    const traces = keys.map((k, i) => ({
      x: data.dates,
      y: data[k],
      name: k,
      type: 'scatter',
      mode: 'lines',
      line: { color: ["#007bff", "#28a745", "#dc3545", "#ffc107", "#17a2b8"][i % 5] }
    }));

    const layout = {
      title: '',
      xaxis: { title: 'Date' },
      yaxis: { title: 'Value' },
      margin: { t: 20 },
      height: 400
    };

    Plotly.newPlot(chartDiv, traces, layout, { responsive: true });
  } catch (err) {
    console.error(`Error in renderLineChart for ${divId}:`, err);
    displayError(`Error rendering line chart: ${err.message}`);
  }
}

function renderBarChart(divId, labels, data, title) {
  try {
    const chartDiv = document.getElementById(divId);
    if (!chartDiv) throw new Error(`Chart container ${divId} not found`);
    if (typeof Plotly === "undefined") {
      console.error("Plotly.js not loaded. Check network connection or CDN availability at https://cdn.plot.ly/plotly-2.35.2.min.js.");
      throw new Error("Plotly.js library not loaded");
    }

    console.log(`Rendering bar chart for ${divId} with title: ${title}`); // Debug
    const trace = {
      x: labels,
      y: data,
      type: 'bar',
      name: title,
      marker: { color: "#007bff" }
    };

    const layout = {
      title: '',
      xaxis: { title: 'Date' },
      yaxis: { title: title },
      margin: { t: 20 },
      height: 400
    };

    Plotly.newPlot(chartDiv, [trace], layout, { responsive: true });
  } catch (err) {
    console.error(`Error in renderBarChart for ${divId}:`, err);
    displayError(`Error rendering bar chart: ${err.message}`);
  }
}

function renderGroupedBarChart(divId, labels, datasets) {
  try {
    const chartDiv = document.getElementById(divId);
    if (!chartDiv) throw new Error(`Chart container ${divId} not found`);
    if (typeof Plotly === "undefined") {
      console.error("Plotly.js not loaded. Check network connection or CDN availability at https://cdn.plot.ly/plotly-2.35.2.min.js.");
      throw new Error("Plotly.js library not loaded");
    }

    console.log(`Rendering grouped bar chart for ${divId}`); // Debug
    const traces = datasets.map((d, i) => ({
      x: labels,
      y: d.data,
      name: d.label,
      type: 'bar',
      marker: { color: d.backgroundColor }
    }));

    const layout = {
      title: '',
      xaxis: { title: 'Year' },
      yaxis: { title: 'Growth' },
      barmode: 'group',
      margin: { t: 20 },
      height: 400
    };

    Plotly.newPlot(chartDiv, traces, layout, { responsive: true });
  } catch (err) {
    console.error(`Error in renderGroupedBarChart for ${divId}:`, err);
    displayError(`Error rendering grouped bar chart: ${err.message}`);
  }
}

function renderSignalChart(divId, data) {
  try {
    const chartDiv = document.getElementById(divId);
    if (!chartDiv) throw new Error(`Chart container ${divId} not found`);
    if (typeof Plotly === "undefined") {
      console.error("Plotly.js not loaded. Check network connection or CDN availability at https://cdn.plot.ly/plotly-2.35.2.min.js.");
      throw new Error("Plotly.js library not loaded");
    }

    console.log(`Rendering signal chart for ${divId}`); // Debug
    const traces = [
      {
        x: data.dates,
        y: data.buy_signals.map(x => x * 1),
        name: 'Buy Signal',
        type: 'bar',
        marker: { color: 'green' }
      },
      {
        x: data.dates,
        y: data.sell_signals.map(x => x * -1),
        name: 'Sell Signal',
        type: 'bar',
        marker: { color: 'red' }
      }
    ];

    const layout = {
      title: '',
      xaxis: { title: 'Date' },
      yaxis: { title: 'Signal' },
      barmode: 'relative',
      margin: { t: 20 },
      height: 400
    };

    Plotly.newPlot(chartDiv, traces, layout, { responsive: true });
  } catch (err) {
    console.error(`Error in renderSignalChart for ${divId}:`, err);
    displayError(`Error rendering signal chart: ${err.message}`);
  }
}

function renderHeatmap(divId, symbols, dates, matrix) {
  try {
    const chartDiv = document.getElementById(divId);
    if (!chartDiv) throw new Error(`Chart container ${divId} not found`);
    if (typeof Plotly === "undefined") {
      console.error("Plotly.js not loaded. Check network connection or CDN availability at https://cdn.plot.ly/plotly-2.35.2.min.js.");
      throw new Error("Plotly.js library not loaded");
    }

    console.log(`Rendering heatmap for ${divId}`); // Debug
    const data = [{
      z: matrix,
      x: dates,
      y: symbols,
      type: 'heatmap',
      colorscale: [[0, '#dc3545'], [1, '#28a745']],
      showscale: false
    }];

    const layout = {
      title: '',
      xaxis: { title: 'Date' },
      yaxis: { title: 'Symbol' },
      margin: { t: 20 },
      height: 400
    };

    Plotly.newPlot(chartDiv, data, layout, { responsive: true });
  } catch (err) {
    console.error(`Error in renderHeatmap for ${divId}:`, err);
    displayError(`Error rendering heatmap: ${err.message}`);
  }
}