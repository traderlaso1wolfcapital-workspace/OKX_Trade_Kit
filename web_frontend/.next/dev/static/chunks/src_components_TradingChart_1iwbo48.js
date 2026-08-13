(globalThis["TURBOPACK"] || (globalThis["TURBOPACK"] = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/src/components/TradingChart.js [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>TradingChart
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lightweight$2d$charts$2f$dist$2f$lightweight$2d$charts$2e$development$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/lightweight-charts/dist/lightweight-charts.development.mjs [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
'use client';
;
;
// Hàm giả lập tạo dữ liệu nến chân thực
function generateData(amount) {
    const data = [];
    let time = new Date('2026-01-01').getTime();
    let price = 4000;
    for(let i = 0; i < amount; i++){
        time += 24 * 60 * 60 * 1000; // 1 day
        const open = price;
        const close = price + (Math.random() - 0.5) * 50;
        const high = Math.max(open, close) + Math.random() * 20;
        const low = Math.min(open, close) - Math.random() * 20;
        const volume = Math.floor(Math.random() * 1000) + 100;
        data.push({
            time: time / 1000,
            open: parseFloat(open.toFixed(2)),
            high: parseFloat(high.toFixed(2)),
            low: parseFloat(low.toFixed(2)),
            close: parseFloat(close.toFixed(2)),
            value: volume,
            color: close > open ? 'rgba(38, 166, 154, 0.4)' : 'rgba(239, 83, 80, 0.4)'
        });
        price = close;
    }
    return data;
}
// Hàm tính Moving Average
function calculateSMA(data, period) {
    const sma = [];
    for(let i = period - 1; i < data.length; i++){
        let sum = 0;
        for(let j = 0; j < period; j++){
            sum += data[i - j].close;
        }
        sma.push({
            time: data[i].time,
            value: sum / period
        });
    }
    return sma;
}
function TradingChart() {
    _s();
    const chartContainerRef = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRef"])(null);
    const [chart, setChart] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "TradingChart.useEffect": ()=>{
            if (!chartContainerRef.current) return;
            // Xóa chart cũ nếu component re-mount
            chartContainerRef.current.innerHTML = '';
            const newChart = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lightweight$2d$charts$2f$dist$2f$lightweight$2d$charts$2e$development$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createChart"])(chartContainerRef.current, {
                width: chartContainerRef.current.clientWidth,
                height: chartContainerRef.current.clientHeight,
                layout: {
                    background: {
                        type: 'solid',
                        color: '#131722'
                    },
                    textColor: '#d1d4dc'
                },
                grid: {
                    vertLines: {
                        color: '#2b2b43',
                        style: 1
                    },
                    horzLines: {
                        color: '#2b2b43',
                        style: 1
                    }
                },
                crosshair: {
                    mode: 1,
                    vertLine: {
                        width: 1,
                        color: '#758696',
                        style: 3,
                        labelBackgroundColor: '#758696'
                    },
                    horzLine: {
                        width: 1,
                        color: '#758696',
                        style: 3,
                        labelBackgroundColor: '#758696'
                    }
                },
                priceScale: {
                    borderColor: '#2b2b43',
                    autoScale: true
                },
                timeScale: {
                    borderColor: '#2b2b43',
                    timeVisible: true,
                    rightOffset: 12
                }
            });
            // 1. Candlestick Series
            const candlestickSeries = newChart.addSeries(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lightweight$2d$charts$2f$dist$2f$lightweight$2d$charts$2e$development$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CandlestickSeries"], {
                upColor: '#26a69a',
                downColor: '#ef5350',
                borderVisible: false,
                wickUpColor: '#26a69a',
                wickDownColor: '#ef5350',
                priceFormat: {
                    type: 'price',
                    precision: 2,
                    minMove: 0.01
                }
            });
            // 2. Volume Series
            const volumeSeries = newChart.addSeries(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lightweight$2d$charts$2f$dist$2f$lightweight$2d$charts$2e$development$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["HistogramSeries"], {
                color: '#26a69a',
                priceFormat: {
                    type: 'volume'
                },
                priceScaleId: ''
            });
            newChart.priceScale('').applyOptions({
                scaleMargins: {
                    top: 0.8,
                    bottom: 0
                }
            });
            // 3. EMA/SMA Series
            const smaSeries = newChart.addSeries(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lightweight$2d$charts$2f$dist$2f$lightweight$2d$charts$2e$development$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["LineSeries"], {
                color: '#f6c309',
                lineWidth: 2,
                crosshairMarkerVisible: false
            });
            const smaSeries2 = newChart.addSeries(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lightweight$2d$charts$2f$dist$2f$lightweight$2d$charts$2e$development$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["LineSeries"], {
                color: '#2962FF',
                lineWidth: 2,
                crosshairMarkerVisible: false
            });
            // Generate data
            const mockData = generateData(200);
            // Cấp dữ liệu cho các Series
            candlestickSeries.setData(mockData);
            volumeSeries.setData(mockData.map({
                "TradingChart.useEffect": (d)=>({
                        time: d.time,
                        value: d.value,
                        color: d.color
                    })
            }["TradingChart.useEffect"]));
            smaSeries.setData(calculateSMA(mockData, 9));
            smaSeries2.setData(calculateSMA(mockData, 21));
            setChart(newChart);
            const handleResize = {
                "TradingChart.useEffect.handleResize": ()=>{
                    if (chartContainerRef.current) {
                        newChart.applyOptions({
                            width: chartContainerRef.current.clientWidth,
                            height: chartContainerRef.current.clientHeight
                        });
                    }
                }
            }["TradingChart.useEffect.handleResize"];
            window.addEventListener('resize', handleResize);
            return ({
                "TradingChart.useEffect": ()=>{
                    window.removeEventListener('resize', handleResize);
                    newChart.remove();
                }
            })["TradingChart.useEffect"];
        }
    }["TradingChart.useEffect"], []);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "trading-chart-container",
        style: {
            position: 'relative',
            width: '100%',
            height: '100%'
        },
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
            ref: chartContainerRef,
            style: {
                width: '100%',
                height: '100%'
            }
        }, void 0, false, {
            fileName: "[project]/src/components/TradingChart.js",
            lineNumber: 154,
            columnNumber: 13
        }, this)
    }, void 0, false, {
        fileName: "[project]/src/components/TradingChart.js",
        lineNumber: 153,
        columnNumber: 9
    }, this);
}
_s(TradingChart, "7Kvgszy+Ube6+gSj5cFyKOvGhCk=");
_c = TradingChart;
var _c;
__turbopack_context__.k.register(_c, "TradingChart");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/TradingChart.js [app-client] (ecmascript, next/dynamic entry)", (function(__turbopack_context__){

__turbopack_context__.n(__turbopack_context__.i("[project]/src/components/TradingChart.js [app-client] (ecmascript)"));
}),
]);

//# sourceMappingURL=src_components_TradingChart_1iwbo48.js.map