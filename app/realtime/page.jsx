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
    const fetchDevices = async () => {
      try {
        const response = await fetch(
          "http://localhost:8080/api/modbus/device/list"
        );
        if (!response.ok) {
          throw new Error("디바이스 목록 조회 실패");
        }
        const data = await response.json();

        // 서버에서 받은 디바이스 데이터를 상태에 맞게 변환
        const formattedDevices = data.devices.map((device) => ({
          id: device.deviceId,
          name: device.name,
          host: device.host,
          port: device.port,
          slaveId: device.slaveId,
          startAddress: device.startAddress,
          length: device.length,
          data: { temperature: 0, humidity: 0 },
          history: [],
          showTable: false,
        }));

        setDevices(formattedDevices);
      } catch (error) {
        console.error("디바이스 목록 조회 중 오류:", error);
        setError("디바이스 목록을 불러오는데 실패했습니다.");
      }
    };

    fetchDevices();
  }, []);

  useEffect(() => {
    let socket = null;

    const connect = async () => {
      if (!socket || socket.readyState === WebSocket.CLOSED) {
        socket = new WebSocket("ws://localhost:8080/modbus");

        socket.onopen = async () => {
          console.log("WebSocket 연결됨");
          setConnected(true);
          setError(null);
          setIsConnecting(false);
          setWs(socket);

          // 장치 등록만 병렬로 처리
          const registrationPromises = devices.map(async (device) => {
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
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(deviceInfo),
              }
            );

            if (!response.ok) {
              throw new Error(`장치 등록 실패: ${device.id}`);
            }

            return { success: true, deviceId: device.id };
          });

          await Promise.all(registrationPromises);
        };

        socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);

            setDevices((prevDevices) =>
              prevDevices.map((device) => {
                if (device.id === data.deviceId) {
                  const newData = {
                    temperature: data.temperature,
                    humidity: data.humidity,
                    timestamp: new Date().toLocaleTimeString(),
                    fullTimestamp: Date.now(),
                  };

                  // **이전 데이터 가져오기**
                  const lastEntry = device.history[device.history.length - 1];

                  // **같은 시간(초 단위)이면 저장하지 않음**
                  if (lastEntry && lastEntry.timestamp === newData.timestamp) {
                    return device; // 같은 시간이라면 추가하지 않음
                  }

                  return {
                    ...device,
                    data: {
                      temperature: data.temperature,
                      humidity: data.humidity,
                    },
                    history: [...device.history, newData].filter(
                      (item) =>
                        item.fullTimestamp >= Date.now() - 60 * 60 * 1000
                    ),
                  };
                }
                return device;
              })
            );
          } catch (error) {
            console.error("데이터 처리 중 오류:", error);
          }
        };

        socket.onclose = (event) => {
          console.log("WebSocket 연결 종료");
          setConnected(false);
          if (!event.wasClean) {
            setTimeout(() => connect(), 5000);
          }
        };

        socket.onerror = (error) => {
          console.error("WebSocket 오류:", error);
          setError("연결 오류가 발생했습니다.");
          setIsConnecting(false);
        };
      }
    };

    connect();

    return () => {
      if (socket) {
        socket.close();
      }
    };
  }, [devices.length]);

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

  // 장치 삭제 핸들러
  const handleDeleteDevice = async (deviceId) => {
    if (!window.confirm("정말로 이 장치를 삭제하시겠습니까?")) {
      return;
    }

    try {
      const response = await fetch(
        `http://localhost:8080/api/modbus/device/${deviceId}`,
        {
          method: "DELETE",
        }
      );
      if (response.ok) {
        alert("장치 삭제 성공");
      } else {
        alert("장치 삭제 실패");
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "장치 삭제에 실패했습니다.");
      }

      setDevices((prevDevices) =>
        prevDevices.filter((device) => device.id !== deviceId)
      );
      setError(null);
    } catch (err) {
      console.error("장치 삭제 중 오류 발생:", err);
      setError(err.message);
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
  const getTemperatureStatus = (temp) => {
    if (temp >= 30) return "danger";
    if (temp >= 27) return "warning";
    if (temp <= 10) return "danger";
    if (temp <= 15) return "warning";
    return "normal";
  };

  const getHumidityStatus = (humidity) => {
    if (humidity >= 70) return 'danger';  // 🌫️ 매우 습함 (위험)
    if (humidity >= 60) return 'warning'; // 💦 다소 습함 (주의)
    if (humidity >= 40) return 'normal';  // ✅ 정상 (40~60% 범위)
    if (humidity >= 30) return 'warning'; // 🍂 조금 건조 (주의)
    return 'danger';  // 🌵 매우 건조 (위험)
  };
  

  const getStatusText = (status) => {
    switch (status) {
      case "normal":
        return "정상";
      case "warning":
        return "주의";
      case "danger":
        return "경고";
      default:
        return "알 수 없음";
    }
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
            <div className="device-info">
              <span className="device-name">{device.name}</span>
              <span
                className={`status-badge ${
                  connected ? "connected" : "disconnected"
                }`}
              >
                {connected ? "연결됨" : "연결 안됨"}
              </span>
            </div>
            <div className="device-actions">
              <button
                onClick={() => handleReconnect()}
                className="action-button reconnect-button"
                disabled={isConnecting}
              >
                {isConnecting ? "연결 중..." : "재연결"}
              </button>
              <button
                onClick={() => handleDeleteDevice(device.id)}
                className="action-button delete-button"
                disabled={isConnecting}
              >
                삭제
              </button>
            </div>
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
              <div className="value-container">
                <p className="value temperature">
                  {device.data.temperature.toFixed(1)}°C
                </p>
                <div
                  className={`status-dot ${getTemperatureStatus(device.data.temperature)}`}
                  title={`온도 상태: ${getStatusText(getTemperatureStatus(device.data.temperature))}`}
                />
              </div>
            </div>
            <div className="value-card">
              <h3>현재 습도</h3>
              <div className="value-container">
                <p className="value humidity">
                  {device.data.humidity.toFixed(1)}%
                </p>
                <div
                  className={`status-dot ${getHumidityStatus(device.data.humidity)}`}
                  title={`습도 상태: ${getStatusText(getHumidityStatus(device.data.humidity))}`}
                />
              </div>
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
