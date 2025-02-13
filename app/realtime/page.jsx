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
      port: 502,
      slaveId: 1,
      startAddress: 10,
      length: 2,
      data: { temperature: 0, humidity: 0 },
      history: [],
      showTable: false,
    },
  ]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [ws, setWs] = useState(null);
  const [newDevice, setNewDevice] = useState({
    deviceId: "",
    name: "",
    host: "",
    port: 502,
    startAddress: 10,
    length: 2,
    slaveId: 1,
  });
  useEffect(() => {
    let socket = null;

    const connect = async () => {
      if (!socket || socket.readyState === WebSocket.CLOSED) {
        // 1. WebSocket 연결
        socket = new WebSocket("ws://localhost:8080/modbus");

        socket.onopen = async () => {
          console.log("WebSocket 연결됨");
          setConnected(true);
          setError(null);
          setIsConnecting(false);
          setWs(socket);

          // 2. 연결 성공 후 장치 정보 REST API로 전송
          for (const device of devices) {
            try {
              const deviceInfo = {
                deviceId: device.id,
                name: device.name,
                host: device.host,
                port: device.port,
                startAddress: device.startAddress,
                length: device.length,
                slaveId: device.slaveId,
              };

              const response = await fetch(
                "http://localhost:8080/api/modbus/device",
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify(deviceInfo),
                }
              );

              if (!response.ok) {
                throw new Error(`장치 등록 실패: ${device.id}`);
              }

              console.log(`장치 등록 성공: ${device.id}`);
            } catch (error) {
              console.error("장치 정보 전송 실패:", error);
              setError(`장치 ${device.id} 등록 실패: ${error.message}`);
            }
          }
        };

        socket.onclose = (event) => {
          console.log(`WebSocket 연결 종료: ${event.code} - ${event.reason}`);
          setConnected(false);

          if (!event.wasClean) {
            console.log("비정상 종료. 5초 후 재연결...");
            setTimeout(() => {
              connect();
            }, 5000);
          }
        };

        socket.onerror = (error) => {
          console.error("WebSocket 오류:", error);
          setError("WebSocket 연결 오류가 발생했습니다.");
          setIsConnecting(false);
        };

        socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log("서버로부터 받은 데이터:", data);

            if (data.error) {
              setError(data.error);
              return;
            }

            setDevices((prev) =>
              prev.map((device) => {
                if (device.id === data.deviceId) {
                  return {
                    ...device,
                    data: {
                      temperature: data.temperature,
                      humidity: data.humidity,
                    },
                    history: [
                      ...device.history,
                      {
                        temperature: data.temperature,
                        humidity: data.humidity,
                        timestamp: new Date().toLocaleTimeString(),
                        fullTimestamp: Date.now(),
                      },
                    ].filter(
                      (item) =>
                        item.fullTimestamp >= Date.now() - 60 * 60 * 1000
                    ),
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
      }
    };

    connect();

    return () => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        console.log("컴포넌트 언마운트: WebSocket 연결 정상 종료");
        socket.close(1000, "정상 종료");
      }
    };
  }, []);

  // 새 장치 추가 핸들러
  const handleAddDevice = async (e) => {
    e.preventDefault();

    if (!newDevice.deviceId || !newDevice.host || !newDevice.name) {
      setError("장치 ID, 이름 및 호스트 주소를 입력하세요.");
      return;
    }

    const isDuplicate = devices.some(
      (device) => device.id === newDevice.deviceId
    );
    if (isDuplicate) {
      setError("이미 존재하는 장치 ID입니다.");
      return;
    }

    try {
      // REST API로 새 장치 등록
      const response = await fetch("http://localhost:8080/api/modbus/device", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newDevice),
      });

      if (!response.ok) {
        throw new Error("장치 등록에 실패했습니다.");
      }

      // 프론트엔드 상태 업데이트
      setDevices((prevDevices) => [
        ...prevDevices,
        {
          id: newDevice.deviceId,
          name: newDevice.name,
          host: newDevice.host,
          port: newDevice.port,
          startAddress: newDevice.startAddress,
          length: newDevice.length,
          slaveId: newDevice.slaveId,
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
        length: 2,
        slaveId: 1,
      });

      setShowAddForm(false);
      setError(null);
    } catch (err) {
      console.error("장치 추가 중 오류 발생:", err);
      setError(err.message);
    }
  };

  const handleReconnect = async () => {
    try {
      setIsConnecting(true);
      setError(null);

      // 기존 웹소켓 연결이 있다면 종료
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
      }

      // 새로운 웹소켓 연결 시도
      const socket = new WebSocket("ws://localhost:8080/modbus");

      socket.onopen = async () => {
        console.log("WebSocket 재연결 성공");
        setConnected(true);
        setWs(socket);
        setError(null);

        // 장치 정보 다시 등록
        for (const device of devices) {
          try {
            const response = await fetch(
              "http://localhost:8080/api/modbus/device",
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  deviceId: device.id,
                  name: device.name,
                  host: device.host,
                  port: device.port,
                  startAddress: device.startAddress,
                  length: device.length,
                  slaveId: device.slaveId,
                }),
              }
            );

            if (!response.ok) {
              throw new Error(`장치 재등록 실패: ${device.id}`);
            }
          } catch (error) {
            console.error("장치 재등록 실패:", error);
            setError(`장치 ${device.id} 재등록 실패: ${error.message}`);
          }
        }

        setIsConnecting(false);
      };

      socket.onclose = (event) => {
        console.log("WebSocket 재연결 실패");
        setConnected(false);
        setIsConnecting(false);
        if (!event.wasClean) {
          setError("연결이 비정상적으로 종료되었습니다.");
        }
      };

      socket.onerror = (error) => {
        console.error("WebSocket 재연결 오류:", error);
        setError("연결 중 오류가 발생했습니다.");
        setIsConnecting(false);
      };
    } catch (error) {
      console.error("재연결 시도 중 오류:", error);
      setError("재연결 시도 중 오류가 발생했습니다.");
      setIsConnecting(false);
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

                <div className="form-group">
                  <label>슬레이브 ID</label>
                  <input
                    type="number"
                    placeholder="1"
                    value={newDevice.slaveId}
                    onChange={(e) =>
                      setNewDevice({
                        ...newDevice,
                        slaveId: parseInt(e.target.value),
                      })
                    }
                    required
                  />
                  <small>기본값: 1</small>
                </div>

                <div className="form-group">
                  <label>데이터 길이</label>
                  <input
                    type="number"
                    placeholder="2"
                    value={newDevice.length}
                    onChange={(e) =>
                      setNewDevice({
                        ...newDevice,
                        length: parseInt(e.target.value),
                      })
                    }
                    required
                  />
                  <small>기본값: 2</small>
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
