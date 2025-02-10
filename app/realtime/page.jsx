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
  const [devices, setDevices] = useState([
    {
      id: "Modbus1",
      name: "온습도 센서 1",
      host: "192.168.10.205",
      data: { temperature: 0, humidity: 0 },
      history: [],
      showTable: false,
    },
  ]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newDevice, setNewDevice] = useState({
    deviceId: "",
    name: "",
    host: "",
    port: 502,
    startAddress: 10,
  });

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
        const data = JSON.parse(event.data);
        setDevices((prev) =>
          prev.map((device) => {
            if (data[device.id]) {
              const [rawTemperature, rawHumidity] = data[device.id];
              const temperature = rawTemperature / 10.0;
              const humidity = rawHumidity / 10.0;
              const now = new Date();
              const newHistory = [
                ...device.history,
                {
                  temperature,
                  humidity,
                  timestamp: now.toLocaleTimeString(),
                  fullTimestamp: now.getTime(),
                },
              ].filter(
                (item) => item.fullTimestamp >= now.getTime() - 60 * 60 * 1000
              );

              return {
                ...device,
                data: { temperature, humidity },
                history: newHistory,
              };
            }
            return device;
          })
        );
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

  // 장치 추가 핸들러
  const handleAddDevice = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch("http://localhost:8080/api/modbus/devices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newDevice),
      });

      if (!response.ok) {
        throw new Error("장치 추가 실패");
      }

      // 장치 목록에 추가
      setDevices((prev) => [
        ...prev,
        {
          id: newDevice.deviceId,
          name: newDevice.name,
          host: newDevice.host,
          data: { temperature: 0, humidity: 0 },
          history: [],
          showTable: false,
        },
      ]);

      // 폼 초기화
      setNewDevice({
        deviceId: "",
        name: "",
        host: "",
        port: 502,
        startAddress: 10,
      });
      setShowAddForm(false);
      setError(null);
    } catch (error) {
      setError(error.message);
    }
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

  return (
    <div className="realtime-container">
      <div className="header">
        <h1>온도, 습도 실시간 조회</h1>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="add-device-button"
        >
          <span>+</span> 장치 추가
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="devices-status">
        {devices.map((device) => (
          <div key={device.id} className="device-status">
            <span className="device-name">{device.name}</span>
            <span
              className={`status-badge ${
                connected ? "connected" : "disconnected"
              }`}
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
        ))}
      </div>

      {showAddForm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <form className="add-device-form" onSubmit={handleAddDevice}>
              <div className="form-header">
                <h3>새 장치 추가</h3>
                <button
                  type="button"
                  className="close-button"
                  onClick={() => setShowAddForm(false)}
                >
                  ×
                </button>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label>장치 ID</label>
                  <input
                    type="text"
                    placeholder="device1"
                    value={newDevice.deviceId}
                    onChange={(e) =>
                      setNewDevice({ ...newDevice, deviceId: e.target.value })
                    }
                    required
                  />
                  <small>고유한 식별자</small>
                </div>

                <div className="form-group">
                  <label>장치 이름</label>
                  <input
                    type="text"
                    placeholder="온습도 센서 1"
                    value={newDevice.name}
                    onChange={(e) =>
                      setNewDevice({ ...newDevice, name: e.target.value })
                    }
                    required
                  />
                  <small>표시될 이름</small>
                </div>

                <div className="form-group full-width">
                  <label>호스트 주소</label>
                  <input
                    type="text"
                    placeholder="192.168.0.100"
                    value={newDevice.host}
                    onChange={(e) =>
                      setNewDevice({ ...newDevice, host: e.target.value })
                    }
                    required
                  />
                  <small>장치의 IP 주소</small>
                </div>

                <div className="form-group">
                  <label>포트</label>
                  <input
                    type="number"
                    placeholder="502"
                    value={newDevice.port}
                    onChange={(e) =>
                      setNewDevice({
                        ...newDevice,
                        port: parseInt(e.target.value),
                      })
                    }
                    required
                  />
                  <small>기본값: 502</small>
                </div>

                <div className="form-group">
                  <label>시작 주소</label>
                  <input
                    type="number"
                    placeholder="10"
                    value={newDevice.startAddress}
                    onChange={(e) =>
                      setNewDevice({
                        ...newDevice,
                        startAddress: parseInt(e.target.value),
                      })
                    }
                    required
                  />
                  <small>기본값: 10</small>
                </div>
              </div>

              <div className="form-actions">
                <button type="submit" className="submit-button">
                  추가
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="cancel-button"
                >
                  취소
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {devices.map((device) => (
        <div key={device.id} className="sensor-section">
          <h2>
            {device.name} ({device.host})
          </h2>
          <div className="current-values">
            <div className="value-card">
              <h3>현재 기온</h3>
              <p className="value temperature">
                {device.data.temperature.toFixed(1)}°C
              </p>
            </div>
            <div className="value-card">
              <h3>현재 습도</h3>
              <p className="value humidity">
                {device.data.humidity.toFixed(1)}%
              </p>
            </div>
          </div>

          <div className="chart-wrapper">
            <Line
              data={{
                labels: device.history.map((item) => item.timestamp),
                datasets: [
                  {
                    label: `온도 (°C) - ${device.name}`,
                    data: device.history.map((item) => item.temperature),
                    borderColor: "#FF8787",
                    backgroundColor: "rgba(255, 135, 135, 0.1)",
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true,
                    pointRadius: 0,
                  },
                  {
                    label: `습도 (%) - ${device.name}`,
                    data: device.history.map((item) => item.humidity),
                    borderColor: "#74C0FC",
                    backgroundColor: "rgba(116, 192, 252, 0.1)",
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true,
                    pointRadius: 0,
                  },
                ],
              }}
              options={chartOptions}
            />
          </div>

          <button
            onClick={() => {
              setDevices((prev) =>
                prev.map((d) =>
                  d.id === device.id ? { ...d, showTable: !d.showTable } : d
                )
              );
            }}
            className="toggle-button"
          >
            {device.showTable ? "테이블 숨기기" : "테이블 보기"}
          </button>

          {device.showTable && (
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
                    {device.history.map((item, index) => (
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
      ))}
    </div>
  );
}
