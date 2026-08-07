'use client';
import { useEffect, useRef, useState } from 'react';
import { createChart, CandlestickSeries, HistogramSeries, LineSeries } from 'lightweight-charts';

// Hàm giả lập tạo dữ liệu nến chân thực
function generateData(amount) {
    const data = [];
    let time = new Date('2026-01-01').getTime();
    let price = 4000;
    for (let i = 0; i < amount; i++) {
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
    for (let i = period - 1; i < data.length; i++) {
        let sum = 0;
        for (let j = 0; j < period; j++) {
            sum += data[i - j].close;
        }
        sma.push({ time: data[i].time, value: sum / period });
    }
    return sma;
}

export default function TradingChart() {
    const chartContainerRef = useRef(null);
    const [chart, setChart] = useState(null);

    useEffect(() => {
        if (!chartContainerRef.current) return;

        // Xóa chart cũ nếu component re-mount
        chartContainerRef.current.innerHTML = '';

        const newChart = createChart(chartContainerRef.current, {
            width: chartContainerRef.current.clientWidth,
            height: chartContainerRef.current.clientHeight,
            layout: {
                background: { type: 'solid', color: '#131722' },
                textColor: '#d1d4dc',
            },
            grid: {
                vertLines: { color: '#2b2b43', style: 1 },
                horzLines: { color: '#2b2b43', style: 1 },
            },
            crosshair: {
                mode: 1, // Magnet mode
                vertLine: { width: 1, color: '#758696', style: 3, labelBackgroundColor: '#758696' },
                horzLine: { width: 1, color: '#758696', style: 3, labelBackgroundColor: '#758696' },
            },
            priceScale: {
                borderColor: '#2b2b43',
                autoScale: true,
            },
            timeScale: {
                borderColor: '#2b2b43',
                timeVisible: true,
                rightOffset: 12,
            },
        });

        // 1. Candlestick Series
        const candlestickSeries = newChart.addSeries(CandlestickSeries, {
            upColor: '#26a69a',
            downColor: '#ef5350',
            borderVisible: false,
            wickUpColor: '#26a69a',
            wickDownColor: '#ef5350',
            priceFormat: {
                type: 'price',
                precision: 2,
                minMove: 0.01,
            },
        });

        // 2. Volume Series
        const volumeSeries = newChart.addSeries(HistogramSeries, {
            color: '#26a69a',
            priceFormat: {
                type: 'volume',
            },
            priceScaleId: '', // Set as an overlay
        });
        
        newChart.priceScale('').applyOptions({
            scaleMargins: {
                top: 0.8, // leave top 80% for candles
                bottom: 0,
            },
        });

        // 3. EMA/SMA Series
        const smaSeries = newChart.addSeries(LineSeries, {
            color: '#f6c309',
            lineWidth: 2,
            crosshairMarkerVisible: false,
        });

        const smaSeries2 = newChart.addSeries(LineSeries, {
            color: '#2962FF',
            lineWidth: 2,
            crosshairMarkerVisible: false,
        });

        // Generate data
        const mockData = generateData(200);
        
        // Cấp dữ liệu cho các Series
        candlestickSeries.setData(mockData);
        volumeSeries.setData(mockData.map(d => ({ time: d.time, value: d.value, color: d.color })));
        smaSeries.setData(calculateSMA(mockData, 9));
        smaSeries2.setData(calculateSMA(mockData, 21));

        setChart(newChart);

        const handleResize = () => {
            if (chartContainerRef.current) {
                newChart.applyOptions({ 
                    width: chartContainerRef.current.clientWidth,
                    height: chartContainerRef.current.clientHeight
                });
            }
        };
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            newChart.remove();
        };
    }, []);

    return (
        <div className="trading-chart-container" style={{ position: 'relative', width: '100%', height: '100%' }}>
            <div ref={chartContainerRef} style={{ width: '100%', height: '100%' }} />
        </div>
    );
}
