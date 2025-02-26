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
import { IoMdSettings } from "react-icons/io";
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
  const [loading, setLoading] = useState(true);
  const [showSettingForm, setShowSettingForm] = useState(false);
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
  const [settings, setSettings] = useState({
    temperature: {
      warningLow: 15,
      dangerLow: 10,
      normal: 23,
      warningHigh: 27,
      dangerHigh: 30,
    },
    humidity: {
      warningLow: 30,
      dangerLow: 20,
      normal: 50,
      warningHigh: 60,
      dangerHigh: 70,
    },
  });
  const [wsConnected, setWsConnected] = useState(false);
  const [modbusActive, setModbusActive] = useState({}); // 장치별 모드버스 활성 상태

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
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("http://localhost:8080/api/modbus/settings");
      if (!response.ok) {
        throw new Error("설정값 로드 실패");
      }
      const data = await response.json();
      setSettings(
        data || {
          temperature: {
            warningLow: 15,
            dangerLow: 10,
            normal: 23,
            warningHigh: 27,
            dangerHigh: 30,
          },
          humidity: {
            warningLow: 30,
            dangerLow: 20,
            normal: 50,
            warningHigh: 60,
            dangerHigh: 70,
          },
        }
      );
    } catch (err) {
      console.error("설정값 로드 중 오류:", err);
      setError(err.message);
      setSettings({
        // 에러 발생 시 기본값 설정
        temperature: {
          warningLow: 15,
          dangerLow: 10,
          normal: 23,
          warningHigh: 27,
          dangerHigh: 30,
        },
        humidity: {
          warningLow: 30,
          dangerLow: 20,
          normal: 50,
          warningHigh: 60,
          dangerHigh: 70,
        },
      });
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    let socket = null;
    let lastDataTime = {}; // 장치별 마지막 데이터 수신 시간
    let checkInterval = null; // 데이터 수신 체크 인터벌

    const connect = async () => {
      if (!socket || socket.readyState === WebSocket.CLOSED) {
        socket = new WebSocket("ws://localhost:8080/modbus");

        socket.onopen = async () => {
          console.log("WebSocket 연결됨");
          setWsConnected(true);
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

          try {
            await Promise.all(registrationPromises);
          } catch (error) {
            console.error("장치 등록 중 오류:", error);
            setError("일부 장치 등록에 실패했습니다.");
          }

          // 모드버스 데이터 수신 체크 인터벌 설정
          checkInterval = setInterval(() => {
            const now = Date.now();
            console.log("인터벌 체크 실행", lastDataTime); // 디버깅용 로그 추가

            devices.forEach((device) => {
              // 5초 이상 데이터가 수신되지 않으면 비활성으로 간주 (10초에서 5초로 변경)
              const isActive =
                lastDataTime[device.id] && now - lastDataTime[device.id] < 5000;
              console.log(
                `장치 ${device.id} 상태:`,
                isActive,
                "마지막 데이터:",
                lastDataTime[device.id]
              ); // 디버깅용 로그 추가

              setModbusActive((prev) => {
                if (prev[device.id] !== isActive) {
                  console.log(`장치 ${device.id} 상태 변경:`, isActive); // 디버깅용 로그 추가
                }
                return { ...prev, [device.id]: isActive };
              });
            });
          }, 1000); // 2초에서 1초로 변경
        };

        socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);

            // 데이터 수신 시간 업데이트 및 상태 변경
            console.log("데이터 수신:", data.deviceId); // 디버깅용 로그 추가
            lastDataTime[data.deviceId] = Date.now();

            // 상태 업데이트를 즉시 반영
            setModbusActive((prev) => {
              console.log("모드버스 상태 업데이트:", {
                ...prev,
                [data.deviceId]: true,
              }); // 디버깅용 로그 추가
              return { ...prev, [data.deviceId]: true };
            });

            setDevices((prevDevices) =>
              prevDevices.map((device) => {
                if (device.id === data.deviceId) {
                  const newData = {
                    temperature: data.temperature,
                    humidity: data.humidity,
                    timestamp: new Date().toLocaleTimeString(),
                    fullTimestamp: Date.now(),
                  };

                  // 이전 데이터 가져오기
                  const lastEntry = device.history[device.history.length - 1];

                  // 같은 시간(초 단위)이면 저장하지 않음
                  if (lastEntry && lastEntry.timestamp === newData.timestamp) {
                    return device;
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
          setWsConnected(false);
          setModbusActive({}); // 모든 장치 비활성화

          if (checkInterval) {
            clearInterval(checkInterval);
            checkInterval = null;
          }

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
      if (checkInterval) {
        clearInterval(checkInterval);
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
        setWsConnected(true);
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
        setWsConnected(false);
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
    const temperature = settings?.temperature || {};

    if (temp >= temperature.dangerHigh) return "danger";
    if (temp >= temperature.warningHigh) return "warning";
    if (temp <= temperature.dangerLow) return "danger";
    if (temp <= temperature.warningLow) return "warning";

    // 명시적으로 normal 범위 정의
    if (temp > temperature.warningLow && temp < temperature.warningHigh)
      return "normal";

    return "unknown"; // 혹시 모를 예외 상황 대비
  };

  const getHumidityStatus = (humidity) => {
    const humiditySettings = settings?.humidity || {};

    if (humidity >= humiditySettings.dangerHigh) return "danger";
    if (humidity >= humiditySettings.warningHigh) return "warning";
    if (humidity <= humiditySettings.dangerLow) return "danger";
    if (humidity <= humiditySettings.warningLow) return "warning";

    // 명시적으로 normal 범위 정의
    if (
      humidity > humiditySettings.warningLow &&
      humidity < humiditySettings.warningHigh
    )
      return "normal";

    return "unknown"; // 혹시 모를 예외 상황 대비
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

  // 설정 변경 핸들러 추가
  const handleSettingChange = (type, level, value) => {
    setSettings((prev) => ({
      ...prev,
      [type]: {
        ...prev[type],
        [level]: Number(value),
      },
    }));
  };

  // 설정 저장 핸들러
  const handleSettingSave = async (e) => {
    e.preventDefault();
    // TODO: 설정 저장 API 호출
    try {
      const response = await fetch(
        "http://localhost:8080/api/modbus/settings",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(settings),
        }
      );

      if (!response.ok) {
        throw new Error("설정 저장 실패");
      }

      setShowSettingForm(false);
      setError(null);
    } catch (err) {
      console.error("설정 저장 중 오류 발생:", err);
      setError(err.message);
    }
  };

  return (
    <div className="realtime-container">
      <div className="header">
        <h1>온도, 습도 실시간 조회</h1>
        <div className="header-button-box">
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="add-device-button"
          >
            <span>+</span> 장치 추가
          </button>
          <button
            className="setting-button"
            onClick={() => setShowSettingForm(!showSettingForm)}
          >
            <IoMdSettings />
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="devices-status">
        {devices.map((device) => (
          <div key={device.id} className="device-status">
            <div className="device-info">
              <span className="device-name">{device.name}</span>
              <div className="status-badges">
                <span
                  className={`status-badge ${wsConnected ? "connected" : "disconnected"}`}
                >
                  {wsConnected ? "웹소켓 연결됨" : "웹소켓 연결 안됨"}
                </span>
                <span
                  className={`status-badge ${modbusActive[device.id] ? "active" : "inactive"}`}
                >
                  {modbusActive[device.id]
                    ? "데이터 수신 중"
                    : "데이터 수신 안됨"}
                </span>
              </div>
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

      {showSettingForm && (
        <div className="modal-overlay">
          <div className="modal-content settings-modal">
            <form className="settings-form" onSubmit={handleSettingSave}>
              <div className="form-header">
                <h3>경고 기준값 설정</h3>
                <button
                  type="button"
                  className="close-button"
                  onClick={() => setShowSettingForm(false)}
                >
                  ×
                </button>
              </div>

              <div className="settings-grid">
                <div className="settings-section">
                  <h4>온도 설정 (°C)</h4>
                  <div className="settings-inputs">
                    <div className="input-group danger">
                      <label>저온 위험</label>
                      <input
                        type="number"
                        value={settings.temperature.dangerLow}
                        onChange={(e) =>
                          handleSettingChange(
                            "temperature",
                            "dangerLow",
                            e.target.value
                          )
                        }
                        step="0.1"
                      />
                    </div>
                    <div className="input-group warning">
                      <label>저온 경고</label>
                      <input
                        type="number"
                        value={settings.temperature.warningLow}
                        onChange={(e) =>
                          handleSettingChange(
                            "temperature",
                            "warningLow",
                            e.target.value
                          )
                        }
                        step="0.1"
                      />
                    </div>
                    <div className="input-group normal">
                      <label>정상</label>
                      <input
                        type="number"
                        value={settings.temperature.normal}
                        onChange={(e) =>
                          handleSettingChange(
                            "temperature",
                            "normal",
                            e.target.value
                          )
                        }
                        step="0.1"
                      />
                    </div>
                    <div className="input-group warning">
                      <label>고온 경고</label>
                      <input
                        type="number"
                        value={settings.temperature.warningHigh}
                        onChange={(e) =>
                          handleSettingChange(
                            "temperature",
                            "warningHigh",
                            e.target.value
                          )
                        }
                        step="0.1"
                      />
                    </div>
                    <div className="input-group danger">
                      <label>고온 위험</label>
                      <input
                        type="number"
                        value={settings.temperature.dangerHigh}
                        onChange={(e) =>
                          handleSettingChange(
                            "temperature",
                            "dangerHigh",
                            e.target.value
                          )
                        }
                        step="0.1"
                      />
                    </div>
                  </div>
                </div>

                <div className="settings-section">
                  <h4>습도 설정 (%)</h4>
                  <div className="settings-inputs">
                    <div className="input-group danger">
                      <label>저습 위험</label>
                      <input
                        type="number"
                        value={settings.humidity.dangerLow}
                        onChange={(e) =>
                          handleSettingChange(
                            "humidity",
                            "dangerLow",
                            e.target.value
                          )
                        }
                        step="1"
                      />
                    </div>
                    <div className="input-group warning">
                      <label>저습 경고</label>
                      <input
                        type="number"
                        value={settings.humidity.warningLow}
                        onChange={(e) =>
                          handleSettingChange(
                            "humidity",
                            "warningLow",
                            e.target.value
                          )
                        }
                        step="1"
                      />
                    </div>
                    <div className="input-group normal">
                      <label>정상</label>
                      <input
                        type="number"
                        value={settings.humidity.normal}
                        onChange={(e) =>
                          handleSettingChange(
                            "humidity",
                            "normal",
                            e.target.value
                          )
                        }
                        step="1"
                      />
                    </div>
                    <div className="input-group warning">
                      <label>고습 경고</label>
                      <input
                        type="number"
                        value={settings.humidity.warningHigh}
                        onChange={(e) =>
                          handleSettingChange(
                            "humidity",
                            "warningHigh",
                            e.target.value
                          )
                        }
                        step="1"
                      />
                    </div>
                    <div className="input-group danger">
                      <label>고습 위험</label>
                      <input
                        type="number"
                        value={settings.humidity.dangerHigh}
                        onChange={(e) =>
                          handleSettingChange(
                            "humidity",
                            "dangerHigh",
                            e.target.value
                          )
                        }
                        step="1"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="form-actions">
                <button type="submit" className="submit-button">
                  저장
                </button>
                <button
                  type="button"
                  onClick={() => setShowSettingForm(false)}
                  className="cancel-button"
                >
                  취소
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <div className="sensor-container">
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
    </div>
  );
}
