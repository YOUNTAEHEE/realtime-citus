"use client";

import {
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
} from "chart.js";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import "./realtime.scss";

// Chart.js 등록
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

// react-chartjs-2의 Line 컴포넌트를 동적 import (SSR 비활성화)
const Line = dynamic(() => import("react-chartjs-2").then((mod) => mod.Line), {
  ssr: false,
});

export default function RealtimePage() {
  const [data1, setData1] = useState({ temperature: 0, humidity: 0 });
  const [data2, setData2] = useState({ temperature: 0, humidity: 0 });
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);
  const [history1, setHistory1] = useState([]);
  const [history2, setHistory2] = useState([]);
  const [showTable1, setShowTable1] = useState(false);
  const [showTable2, setShowTable2] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    let ws = null;

    const connect = () => {
      ws = connectWebSocket();
    };

    connect(); // 초기 연결

    // cleanup function
    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, []); // 빈 dependency array

  const connectWebSocket = () => {
    setIsConnecting(true);
    const ws = new WebSocket("ws://localhost:8080/modbus");

    ws.onopen = () => {
      console.log("WebSocket 연결됨");
      setConnected(true);
      setError(null);
      setIsConnecting(false);
    };

    ws.onmessage = (event) => {
      try {
        const newData = JSON.parse(event.data);
        // sensor1 데이터 처리
        const processedData1 = {
          temperature: newData.sensor1.temperature / 10,
          humidity: newData.sensor1.humidity / 10,
        };
        setData1(processedData1);

        // sensor2 데이터 처리
        const processedData2 = {
          temperature: newData.sensor2.temperature / 10,
          humidity: newData.sensor2.humidity / 10,
        };
        setData2(processedData2);

        // sensor1 히스토리 업데이트
        setHistory1((prev) => {
          const now = new Date();
          const newHistory = [
            ...prev,
            {
              ...processedData1,
              timestamp: now.toLocaleTimeString(),
              fullTimestamp: now.getTime(),
            },
          ];
          const oneHourAgo = now.getTime() - 60 * 60 * 1000;
          return newHistory.filter((item) => item.fullTimestamp >= oneHourAgo);
        });

        // sensor2 히스토리 업데이트
        setHistory2((prev) => {
          const now = new Date();
          const newHistory = [
            ...prev,
            {
              ...processedData2,
              timestamp: now.toLocaleTimeString(),
              fullTimestamp: now.getTime(),
            },
          ];
          const oneHourAgo = now.getTime() - 60 * 60 * 1000;
          return newHistory.filter((item) => item.fullTimestamp >= oneHourAgo);
        });
      } catch (e) {
        console.error("데이터 파싱 오류:", e);
        setError("데이터 형식 오류");
      }
    };

    ws.onerror = (err) => {
      console.error("WebSocket 오류:", err);
      setError("연결 오류");
      setConnected(false);
      setIsConnecting(false);
    };

    ws.onclose = () => {
      console.log("WebSocket 연결 종료");
      setConnected(false);
      setIsConnecting(false);
    };

    return ws;
  };

  // 재연결 핸들러
  const handleReconnect = () => {
    connectWebSocket();
  };

  // 차트 옵션
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12,
          },
        },
      },
      title: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: "#f0f0f0",
        },
        ticks: {
          font: {
            size: 11,
          },
        },
      },
      x: {
        grid: {
          display: false,
        },
        ticks: {
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 12,
          font: {
            size: 11,
          },
        },
      },
    },
  };

  // 차트 데이터 - sensor1
  const chartData1 = {
    labels: history1.map((item) => item.timestamp),
    datasets: [
      {
        label: "온도 (°C) - 센서1",
        data: history1.map((item) => item.temperature),
        borderColor: "#FF8787",
        backgroundColor: "rgba(255, 135, 135, 0.1)",
        borderWidth: 2,
        tension: 0.4,
        fill: true,
        pointRadius: 0,
      },
      {
        label: "습도 (%) - 센서1",
        data: history1.map((item) => item.humidity),
        borderColor: "#74C0FC",
        backgroundColor: "rgba(116, 192, 252, 0.1)",
        borderWidth: 2,
        tension: 0.4,
        fill: true,
        pointRadius: 0,
      },
    ],
  };

  // 차트 데이터 - sensor2
  const chartData2 = {
    labels: history2.map((item) => item.timestamp),
    datasets: [
      {
        label: "온도 (°C) - 센서2",
        data: history2.map((item) => item.temperature),
        borderColor: "#FF9F87",
        backgroundColor: "rgba(255, 159, 135, 0.1)",
        borderWidth: 2,
        tension: 0.4,
        fill: true,
        pointRadius: 0,
      },
      {
        label: "습도 (%) - 센서2",
        data: history2.map((item) => item.humidity),
        borderColor: "#74E0FC",
        backgroundColor: "rgba(116, 224, 252, 0.1)",
        borderWidth: 2,
        tension: 0.4,
        fill: true,
        pointRadius: 0,
      },
    ],
  };

  return (
    <div className="realtime-container">
      <h1>온도, 습도 실시간 조회</h1>

      <div className="status-wrapper">
        <span className="status-label">연결 상태:</span>
        <span
          className={`status-badge ${connected ? "connected" : "disconnected"}`}
        >
          {connected ? "연결됨" : "연결 안됨"}
        </span>
        <button
          onClick={handleReconnect}
          className="reconnect-button"
          disabled={isConnecting}
        >
          {isConnecting ? "연결 중..." : "재연결"}
        </button>
      </div>

      {/* 센서1 섹션 */}
      <div className="sensor-section">
        <h2>센서 1 (192.168.10.205)</h2>
        <div className="current-values">
          <div className="value-card">
            <h3>현재 기온</h3>
            <p className="value temperature">{data1.temperature}°C</p>
          </div>
          <div className="value-card">
            <h3>현재 습도</h3>
            <p className="value humidity">{data1.humidity}%</p>
          </div>
        </div>

        <div className="chart-wrapper">
          <Line data={chartData1} options={chartOptions} />
        </div>

        <button
          onClick={() => setShowTable1(!showTable1)}
          className="toggle-button"
        >
          {showTable1 ? "테이블 숨기기" : "테이블 보기"}
        </button>

        {showTable1 && (
          <div className="table-container">
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>날짜/시간</th>
                    <th>기온 (°C)</th>
                    <th>습도 (%)</th>
                  </tr>
                </thead>
                <tbody>
                  {history1.map((item, index) => (
                    <tr key={index}>
                      <td>{item.timestamp}</td>
                      <td>{item.temperature}</td>
                      <td>{item.humidity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* 센서2 섹션 */}
      <div className="sensor-section">
        <h2>센서 2 (192.168.10.206)</h2>
        <div className="current-values">
          <div className="value-card">
            <h3>현재 기온</h3>
            <p className="value temperature">{data2.temperature}°C</p>
          </div>
          <div className="value-card">
            <h3>현재 습도</h3>
            <p className="value humidity">{data2.humidity}%</p>
          </div>
        </div>

        <div className="chart-wrapper">
          <Line data={chartData2} options={chartOptions} />
        </div>

        <button
          onClick={() => setShowTable2(!showTable2)}
          className="toggle-button"
        >
          {showTable2 ? "테이블 숨기기" : "테이블 보기"}
        </button>

        {showTable2 && (
          <div className="table-container">
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>날짜/시간</th>
                    <th>기온 (°C)</th>
                    <th>습도 (%)</th>
                  </tr>
                </thead>
                <tbody>
                  {history2.map((item, index) => (
                    <tr key={index}>
                      <td>{item.timestamp}</td>
                      <td>{item.temperature}</td>
                      <td>{item.humidity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
