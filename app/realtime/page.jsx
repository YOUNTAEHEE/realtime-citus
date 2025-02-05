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
import { useEffect, useState } from "react";
import { Line } from "react-chartjs-2";
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

export default function RealtimePage() {
  const [data, setData] = useState({ temperature: 0, humidity: 0 });
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);
  const [showTable, setShowTable] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  // WebSocket 연결 함수 분리
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
        const processedData = {
          temperature: newData.temperature / 10,
          humidity: newData.humidity / 10,
        };
        setData(processedData);
        setHistory((prev) => {
          const now = new Date();
          const newHistory = [
            ...prev,
            {
              ...processedData,
              timestamp: now.toLocaleTimeString(),
              fullTimestamp: now.getTime(), // 밀리초 타임스탬프 저장
            },
          ];

          // 현재 시간으로부터 1시간 이전의 타임스탬프 계산
          const oneHourAgo = now.getTime() - 60 * 60 * 1000;

          // 1시간 이내의 데이터만 유지
          return newHistory.filter((item) => item.fullTimestamp >= oneHourAgo);
        });
      } catch (e) {
        console.error("데이터 파싱 오류:", e);
        setError("데이터 형식 오류");
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket 오류:", error);
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

  useEffect(() => {
    const ws = connectWebSocket();
    return () => {
      ws.close();
    };
  }, []);

  // 연결 재시도 핸들러
  const handleReconnect = () => {
    connectWebSocket();
  };

  // 차트 옵션 수정
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

  // 차트 데이터 스타일 수정
  const chartData = {
    labels: history.map((item) => item.timestamp),
    datasets: [
      {
        label: "온도 (°C)",
        data: history.map((item) => item.temperature),
        borderColor: "#FF8787",
        backgroundColor: "rgba(255, 135, 135, 0.1)",
        borderWidth: 2,
        tension: 0.4,
        fill: true,
        pointRadius: 0,
      },
      {
        label: "습도 (%)",
        data: history.map((item) => item.humidity),
        borderColor: "#74C0FC",
        backgroundColor: "rgba(116, 192, 252, 0.1)",
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

      <div className="current-values">
        <div className="value-card">
          <h2>현재 기온</h2>
          <p className="value temperature">{data.temperature}°C</p>
        </div>
        <div className="value-card">
          <h2>현재 습도</h2>
          <p className="value humidity">{data.humidity}%</p>
        </div>
      </div>

      <div className="chart-wrapper">
        <Line data={chartData} options={chartOptions} />
      </div>

      <button
        onClick={() => setShowTable(!showTable)}
        className="toggle-button"
      >
        {showTable ? "테이블 숨기기" : "테이블 보기"}
      </button>

      {showTable && (
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
                {history.map((item, index) => (
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
  );
}
