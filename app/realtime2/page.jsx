"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { IoMdSettings } from "react-icons/io";
import "./realtime.scss";

// Plotly 컴포넌트를 동적으로 임포트
const Plot = dynamic(
  () => import("react-plotly.js"),
  { ssr: false } // 서버 사이드 렌더링 비활성화
);

export default function RealtimePage() {
  const [editDevice, setEditDevice] = useState({
    deviceId: "",
    name: "",
    host: "",
    port: 502,
    slaveId: 1,
    startAddress: 10,
    length: 2,
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editingDeviceId, setEditingDeviceId] = useState(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [reconnectTrigger, setReconnectTrigger] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showSettingForm, setShowSettingForm] = useState(false);
  const [devices, setDevices] = useState([]);
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
    setLoading(true); // 로딩 시작
    const fetchDevices = async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/modbus/device/list`
        );
        if (!response.ok) {
          throw new Error("디바이스 목록 조회 실패");
        }
        const data = await response.json();

        // 서버에서 받은 디바이스 데이터를 상태에 맞게 변환
        const formattedDevices = data.devices.map((device) => ({
          deviceId: device.deviceId,
          name: device.name,
          host: device.host,
          port: device.port,
          slaveId: device.slaveId,
          startAddress: device.startAddress,
          length: device.length,
          data: { temperature: 0, humidity: 0 },
          history: device.history || [],
          showTable: false,
        }));

        setDevices(formattedDevices);
      } catch (error) {
        console.error("디바이스 목록 조회 중 오류:", error);
        setError("디바이스 목록을 불러오는데 실패했습니다.");
      } finally {
        setLoading(false); // 로딩 완료
      }
    };

    fetchDevices();
  }, []);

  const fetchSettings = async (retryCount = 0) => {
    setLoading(true);
    setError(null);
    try {
      console.log(`설정값 로드 시작 (시도: ${retryCount + 1})`);
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/modbus/get/settings`
      );

      console.log("서버 응답 상태:", response.status, response.statusText);

      if (!response.ok) {
        throw new Error(`설정값 로드 실패: ${response.status}`);
      }

      const text = await response.text(); // 먼저 텍스트로 받아서 로깅
      console.log("서버 응답 원본:", text);

      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.error("JSON 파싱 오류:", e);
        throw new Error("서버 응답을 처리할 수 없습니다.");
      }

      console.log("서버에서 받은 설정값:", data);

      // 데이터 구조 확인
      if (!data) {
        throw new Error("서버에서 데이터를 받지 못했습니다.");
      }

      setSettings({
        temperature: {
          warningLow: data?.temperature?.warningLow ?? 15,
          dangerLow: data?.temperature?.dangerLow ?? 10,
          normal: data?.temperature?.normal ?? 23,
          warningHigh: data?.temperature?.warningHigh ?? 27,
          dangerHigh: data?.temperature?.dangerHigh ?? 30,
        },
        humidity: {
          warningLow: data?.humidity?.warningLow ?? 30,
          dangerLow: data?.humidity?.dangerLow ?? 20,
          normal: data?.humidity?.normal ?? 50,
          warningHigh: data?.humidity?.warningHigh ?? 60,
          dangerHigh: data?.humidity?.dangerHigh ?? 70,
        },
      });

      console.log("설정값 업데이트 완료");
    } catch (err) {
      console.error("설정값 로드 중 오류:", err);
      setError(err.message);

      // 재시도 로직 추가 (최대 3번)
      if (retryCount < 3) {
        console.log(`${(retryCount + 1) * 2}초 후 재시도...`);
        setTimeout(
          () => fetchSettings(retryCount + 1),
          (retryCount + 1) * 2000
        );
        return;
      }

      // 재시도 실패 시 기본값 설정
      setSettings({
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

  // 컴포넌트 마운트 시 실행되는 useEffect를 다른 useEffect보다 먼저 정의
  useEffect(() => {
    console.log("설정값 로드 useEffect 실행");
    // 약간의 지연 시간을 주어 서버가 준비될 시간을 확보
    setTimeout(() => fetchSettings(), 1000);
  }, []);

  useEffect(() => {
    let socket = null;
    let lastDataTime = {}; // 장치별 마지막 데이터 수신 시간
    let checkInterval = null; // 데이터 수신 체크 인터벌
    let reconnectTimeout = null; // 재연결 타임아웃 변수 추가
    let isCleaning = false; // 클린업 중임을 표시하는 변수 추가

    const connect = async () => {
      if (!socket || socket.readyState === WebSocket.CLOSED) {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL.replace("http://", "");

        // 웹소켓 URL 로깅 추가
        console.log("모드버스 웹소켓 연결 시도: ", `ws://${apiUrl}/ws/modbus`);

        socket = new WebSocket(`ws://${apiUrl}/ws/modbus`);

        socket.onopen = async () => {
          console.log("WebSocket 연결됨");
          setWsConnected(true);
          setError(null);
          setIsConnecting(false);
          setWs(socket);

          // 웹소켓 연결 후 장치 등록 시도
          try {
            const registrationPromises = devices.map(async (device) => {
              console.log(`${device.deviceId} 장치 등록 시작`);

              // 장치 정보를 콘솔에 출력하여 확인
              console.log("장치 정보:", {
                deviceId: device.deviceId,
                name: device.name,
                host: device.host,
                port: device.port,
                startAddress: device.startAddress,
                length: device.length,
                slaveId: device.slaveId,
              });

              // 장치 등록 요청
              const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/api/modbus/device`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    deviceId: device.deviceId,
                    name: device.name,
                    host: device.host,
                    port: device.port,
                    startAddress: device.startAddress,
                    length: device.length,
                    slaveId: device.slaveId,
                  }),
                }
              );

              // 응답 상태 및 본문 확인
              const status = response.status;
              const text = await response.text();
              console.log(`장치 등록 응답: 상태=${status}, 내용=${text}`);

              const success = response.ok;
              if (!success) {
                console.error(
                  `장치 등록 실패: ${device.deviceId}, 응답:`,
                  text
                );
              } else {
                console.log(`${device.deviceId} 장치 등록 완료`);
              }

              return { success, deviceId: device.deviceId };
            });

            // 모든 장치 등록 완료 대기
            const results = await Promise.all(registrationPromises);
            console.log("모든 장치 등록 결과:", results);
          } catch (error) {
            console.error("장치 등록 중 오류 발생:", error);
            setError("장치 등록 중 오류가 발생했습니다.");
          }

          // 모드버스 데이터 수신 체크 인터벌 설정
          checkInterval = setInterval(() => {
            const now = Date.now();
            console.log("인터벌 체크 실행", lastDataTime); // 디버깅용 로그 추가

            devices.forEach((device) => {
              // 5초 이상 데이터가 수신되지 않으면 비활성으로 간주 (10초에서 5초로 변경)
              const isActive =
                lastDataTime[device.deviceId] &&
                now - lastDataTime[device.deviceId] < 10000;
              console.log(
                `장치 ${device.deviceIdid} 상태:`,
                isActive,
                "마지막 데이터:",
                lastDataTime[device.deviceId]
              ); // 디버깅용 로그 추가

              setModbusActive((prev) => {
                if (prev[device.deviceId] !== isActive) {
                  console.log(`장치 ${device.id} 상태 변경:`, isActive); // 디버깅용 로그 추가
                }
                return { ...prev, [device.deviceId]: isActive };
              });
            });
          }, 1000); // 2초에서 1초로 변경
        };

        // onmessage 처리 강화
        socket.onmessage = (event) => {
          try {
            // 원본 데이터 로깅 (문제 디버깅용)
            console.log("웹소켓 원본 데이터:", event.data.substring(0, 200));

            const data = JSON.parse(event.data);
            console.log(
              "웹소켓에서 받은 데이터 타입:",
              data.type,
              "데이터:",
              data
            );

            // 타입이 history인 경우 24시간 이전 데이터로 처리
            if (data.type === "history") {
              console.log(
                `${data.deviceId} 장치의 24시간 이전 데이터 수신 시도:`,
                data.data ? data.data.length : 0,
                "개의 데이터"
              );

              // 데이터가 없는 경우 처리
              if (
                !data.data ||
                !Array.isArray(data.data) ||
                data.data.length === 0
              ) {
                console.warn(
                  `${data.deviceId} 장치의 24시간 이전 데이터가 없습니다.`
                );
                return;
              }

              // 장치 ID 확인
              const deviceExists = devices.some(
                (d) => d.deviceId === data.deviceId
              );
              if (!deviceExists) {
                console.warn(
                  `장치 ID ${data.deviceId}가 현재 장치 목록에 없습니다.`
                );
                return;
              }

              // 데이터 형식 변환 및 저장
              const historyData = data.data.map((item) => {
                console.log("히스토리 아이템:", item); // 개별 항목 로깅
                return {
                  temperature:
                    typeof item.temperature === "number"
                      ? item.temperature
                      : parseFloat(item.temperature || 0),
                  humidity:
                    typeof item.humidity === "number"
                      ? item.humidity
                      : parseFloat(item.humidity || 0),
                  timestamp: item.timestamp
                    ? new Date(item.timestamp).toISOString()
                    : new Date().toISOString(),
                };
              });

              console.log(
                `${data.deviceId} 장치의 변환된 히스토리 데이터:`,
                historyData.length,
                "개"
              );

              // 해당 장치의 이력 데이터 업데이트
              setDevices((prevDevices) => {
                const updatedDevices = prevDevices.map((device) => {
                  if (device.deviceId === data.deviceId) {
                    console.log(
                      `${device.deviceId} 장치의 히스토리 데이터 업데이트 중:`,
                      historyData.length,
                      "개"
                    );
                    return {
                      ...device,
                      history: historyData,
                    };
                  }
                  return device;
                });
                return updatedDevices;
              });

              console.log(
                `${data.deviceId} 장치의 24시간 이전 데이터 처리 완료`
              );
              return; // 이력 데이터 처리 후 함수 종료
            }

            // 기존 실시간 데이터 처리 로직
            // 데이터 수신 시간 업데이트 및 상태 변경
            console.log("실시간 데이터 수신:", data.deviceId);
            lastDataTime[data.deviceId] = Date.now();

            // 상태 업데이트를 즉시 반영
            setModbusActive((prev) => {
              console.log("모드버스 상태 업데이트:", {
                ...prev,
                [data.deviceId]: true,
              });
              return { ...prev, [data.deviceId]: true };
            });

            setDevices((prevDevices) =>
              prevDevices.map((device) => {
                if (device.deviceId === data.deviceId) {
                  // 백엔드에서 받은 타임스탬프 사용 (없으면 현재 시간 사용)
                  const timestamp = new Date().toISOString();

                  const newData = {
                    temperature: data.temperature,
                    humidity: data.humidity,
                    timestamp: timestamp,
                  };

                  // 이전 데이터 가져오기
                  const lastEntry =
                    device?.history?.length > 0
                      ? device.history[device.history.length - 1]
                      : null;
                  // 기존 시간 기반 필터링 추가
                  const now = new Date();
                  const oneDayAgo = new Date(
                    now.getTime() - 24 * 60 * 60 * 1000
                  );
                  // 중복 체크 개선: 타임스탬프의 날짜, 시간, 분, 초까지 비교
                  if (lastEntry) {
                    const lastTime = new Date(lastEntry.timestamp);
                    const newTime = new Date(timestamp);

                    // 같은 날짜, 시간, 분, 초이고 온도와 습도가 동일하면 중복으로 간주
                    if (
                      lastTime.getFullYear() === newTime.getFullYear() &&
                      lastTime.getMonth() === newTime.getMonth() &&
                      lastTime.getDate() === newTime.getDate() &&
                      lastTime.getHours() === newTime.getHours() &&
                      lastTime.getMinutes() === newTime.getMinutes() &&
                      lastTime.getSeconds() === newTime.getSeconds() &&
                      lastEntry.temperature === newData.temperature &&
                      lastEntry.humidity === newData.humidity
                    ) {
                      // 중복 데이터는 추가하지 않고 기존 device 객체 반환
                      return device;
                    }
                  }
                  // 마지막 24시간 데이터만 유지
                  const filteredHistory = [
                    ...(device.history || []),
                    newData,
                  ].filter((item) => new Date(item.timestamp) >= oneDayAgo);
                  return {
                    ...device,
                    data: {
                      temperature: data.temperature,
                      humidity: data.humidity,
                    },
                    history: filteredHistory, // 정확히 24시간 데이터만 유지
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

          if (!event.wasClean && !isCleaning) {
            // 클린업 중이 아닐 때만 재연결 시도
            reconnectTimeout = setTimeout(() => connect(), 5000);
          }
        };

        socket.onerror = (error) => {
          console.error("WebSocket 오류:", error);
          setError("웹소켓 연결 중 오류가 발생했습니다.");
          setIsConnecting(false);
        };
      }
    };

    // 컴포넌트 마운트 시 연결 플래그 설정
    isCleaning = false;

    connect();

    // 클린업 함수 강화
    return () => {
      // 클린업 중임을 표시하여 재연결 방지
      isCleaning = true;
      console.log("모드버스 웹소켓 연결 정리 시작");

      // 웹소켓 상태 확인 후 종료
      if (socket) {
        // readyState 체크 추가
        if (
          socket.readyState === WebSocket.OPEN ||
          socket.readyState === WebSocket.CONNECTING
        ) {
          // 명시적으로 이벤트 리스너 제거 (메모리 누수 방지)
          socket.onopen = null;
          socket.onmessage = null;
          socket.onerror = null;
          socket.onclose = null;

          // 연결 종료
          socket.close();
        }
        // 참조 정리
        socket = null;
      }

      // 타이머 정리
      if (checkInterval) {
        clearInterval(checkInterval);
        checkInterval = null;
      }

      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
      }

      // 모드버스 서비스 중지 API 호출 추가
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || window.location.origin;
      fetch(`${apiUrl}/api/modbus/stop`, {
        method: "POST",
      }).catch((error) => console.error("모드버스 서비스 중지 오류:", error));

      // 상태 정리
      setWsConnected(false);
      setModbusActive({});
      setWs(null);

      console.log("모드버스 웹소켓 연결 정리 완료");
    };
  }, [devices.length, reconnectTrigger]);

  // 새 장치 추가 핸들러
  const handleAddDevice = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      // 등록 전 모든 연결 초기화 요청
      await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/modbus/reset-connections`,
        {
          method: "POST",
        }
      );

      if (!newDevice.deviceId || !newDevice.host || !newDevice.name) {
        setError("장치 ID, 이름 및 호스트 주소를 입력하세요.");
        return;
      }

      // 디바이스 목록이 비어있거나 조회에 실패한 경우에도 중복 검사를 건너뛰지 않고 진행
      const isDuplicate = devices.some(
        (device) => device.deviceId === newDevice.deviceId
      );
      if (isDuplicate) {
        setError("이미 존재하는 장치 ID입니다.");
        return;
      }

      // REST API로 새 장치 등록
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/modbus/device`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(newDevice),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "장치 등록에 실패했습니다.");
      }

      // 프론트엔드 상태 업데이트
      setDevices((prevDevices) => [
        ...prevDevices,
        {
          deviceId: newDevice.deviceId,
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
  const handleEditDevice = (editDevice) => {
    console.log("수정 요청된 장치 ID:", editDevice);
    const deviceToEdit = devices.find(
      (device) => device.deviceId === editDevice.deviceId
    );
    if (!deviceToEdit) return;
    setEditingDeviceId(deviceToEdit.deviceId);
    console.log("수정할 장치 정보:", deviceToEdit);

    setEditDevice({
      deviceId: editDevice.deviceId,
      name: editDevice.name,
      host: editDevice.host,
      port: editDevice.port,
      slaveId: editDevice.slaveId,
      startAddress: editDevice.startAddress,
      length: editDevice.length,
    });
    setShowEditForm(true);
  };

  const handleEditDeviceForm = async (e) => {
    e.preventDefault();

    try {
      setIsEditing(true);
      setLoading(true);
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/modbus/device/edit/${editDevice.deviceId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(editDevice),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `장치 업데이트 실패: ${response.status} ${errorData.message || ""}`
        );
      }

      // 성공 시 장치 목록 새로고침
      const updatedDeviceListResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/modbus/device/list`
      );

      if (!updatedDeviceListResponse.ok) {
        throw new Error("장치 목록 가져오기 실패");
      }

      const updatedDeviceData = await updatedDeviceListResponse.json();
      const updatedDeviceList = updatedDeviceData.devices.map((newDevice) => {
        const existingDevice = devices.find(
          (d) => d.deviceId === newDevice.deviceId
        );
        return {
          ...newDevice,
          data: existingDevice?.data || { temperature: 0, humidity: 0 },
          history: existingDevice?.history || [],
          showTable: false,
        };
      });

      setDevices(updatedDeviceList);
      setShowEditForm(false);
      setEditDevice({
        deviceId: "",
        name: "",
        host: "",
        port: 502,
        slaveId: 1,
        startAddress: 10,
        length: 2,
      }); // 폼 초기화
      alert("장치가 성공적으로 수정되었습니다.");

      // WebSocket 재연결 필요 시 명시적으로 호출
      // await handleReconnect();
      setReconnectTrigger((prev) => prev + 1);
    } catch (err) {
      console.error("장치 업데이트 중 오류:", err);
      setError(err.message);
    } finally {
      setLoading(false);
      setIsEditing(false);
    }
  };

  // 장치 삭제 핸들러
  const handleDeleteDevice = async (deviceId) => {
    if (!window.confirm("정말로 이 장치를 삭제하시겠습니까?")) {
      return;
    }

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/modbus/device/${deviceId}`,
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
        prevDevices.filter((device) => device.deviceId !== deviceId)
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
  const getTemperatureStatus = (temperature) => {
    if (temperature === undefined || temperature === null) {
      return "unknown";
    }

    // 기존 로직
    if (temperature <= settings?.temperature?.dangerLow) return "danger-low";
    if (temperature <= settings?.temperature?.warningLow) return "warning-low";
    if (temperature >= settings?.temperature?.dangerHigh) return "danger-high";
    if (temperature >= settings?.temperature?.warningHigh)
      return "warning-high";
    return "normal";
  };

  const getHumidityStatus = (humidity) => {
    // humidity가 undefined인 경우 처리
    if (humidity === undefined || humidity === null) {
      return "unknown";
    }

    // 기존 로직
    if (humidity <= settings?.humidity?.dangerLow) return "danger-low";
    if (humidity <= settings?.humidity?.warningLow) return "warning-low";
    if (humidity >= settings?.humidity?.dangerHigh) return "danger-high";
    if (humidity >= settings?.humidity?.warningHigh) return "warning-high";
    return "normal";
  };

  const getStatusText = (status) => {
    switch (status) {
      case "normal":
        return "정상";
      case "warning-low":
        return "저온/저습 주의";
      case "warning-high":
        return "고온/고습 주의";
      case "danger-low":
        return "저온/저습 위험";
      case "danger-high":
        return "고온/고습 위험";
      case "unknown":
        return "알 수 없음";
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
        `${process.env.NEXT_PUBLIC_API_URL}/api/modbus/settings`,
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
      await fetchSettings();
      setShowSettingForm(false);
      setError(null);
    } catch (err) {
      console.error("설정 저장 중 오류 발생:", err);
      setError(err.message);
    }
  };
  useEffect(() => {
    console.log("설정값 변경됨:", settings);
  }, [settings]);

  // 날짜 포맷팅 함수 추가
  const formatDateTime = (timestamp) => {
    if (!timestamp) return "";

    const date = new Date(timestamp);

    // 날짜와 시간 포맷팅
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
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
          <div key={device.deviceId} className="device-status">
            <div className="device-info">
              <span className="device-name">{device.name}</span>
              <div className="status-badges">
                <span
                  className={`status-badge ${wsConnected ? "connected" : "disconnected"}`}
                >
                  {wsConnected ? "웹소켓 연결됨" : "웹소켓 연결 안됨"}
                </span>
                <span
                  className={`status-badge ${modbusActive[device.deviceId] && !isConnecting ? "active" : "inactive"}`}
                >
                  {modbusActive[device.deviceId] && !isConnecting
                    ? "데이터 수신 중"
                    : "데이터 수신 안됨"}
                </span>
              </div>
            </div>
            <div className="device-actions">
              <button
                onClick={() => setReconnectTrigger((prev) => prev + 1)}
                className="action-button reconnect-button"
                disabled={isConnecting}
              >
                {isConnecting ? "연결 중..." : "재연결"}
              </button>
              <button
                onClick={() => handleEditDevice(device)}
                className="action-button edit-button"
                disabled={isConnecting}
              >
                수정
              </button>
              <button
                onClick={() => handleDeleteDevice(device.deviceId)}
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

      {showEditForm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <form className="add-device-form" onSubmit={handleEditDeviceForm}>
              <div className="form-header">
                <h3>장치 수정</h3>
                <button
                  type="button"
                  className="close-button"
                  onClick={() => setShowEditForm(false)}
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
                    value={editDevice.deviceId || ""}
                    // onChange={(e) =>
                    //   setEditDevice({ ...editDevice, deviceId: e.target.value })
                    // }
                    disabled
                    required
                  />
                  <small>고유한 식별자</small>
                </div>

                <div className="form-group">
                  <label>장치 이름</label>
                  <input
                    type="text"
                    placeholder="온습도 센서 1"
                    value={editDevice.name || ""}
                    onChange={(e) =>
                      setEditDevice({ ...editDevice, name: e.target.value })
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
                    value={editDevice.host || ""}
                    onChange={(e) =>
                      setEditDevice({ ...editDevice, host: e.target.value })
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
                    value={editDevice.port || ""}
                    onChange={(e) =>
                      setEditDevice({
                        ...editDevice,
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
                    value={editDevice.startAddress || ""}
                    onChange={(e) =>
                      setEditDevice({
                        ...editDevice,
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
                    value={editDevice.slaveId || ""}
                    onChange={(e) =>
                      setEditDevice({
                        ...editDevice,
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
                    value={editDevice.length || ""}
                    onChange={(e) =>
                      setEditDevice({
                        ...editDevice,
                        length: parseInt(e.target.value),
                      })
                    }
                    required
                  />
                  <small>기본값: 2</small>
                </div>
              </div>

              <div className="form-actions">
                <button
                  type="submit"
                  className="submit-button"
                  disabled={loading}
                >
                  {loading ? "처리 중..." : "수정"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowEditForm(false)}
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
                        value={settings?.temperature?.dangerLow}
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
                        value={settings?.temperature?.warningLow}
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
                        value={settings?.temperature?.normal}
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
                        value={settings?.temperature?.warningHigh}
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
                        value={settings?.temperature?.dangerHigh}
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
                        value={settings?.humidity?.dangerLow}
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
                        value={settings?.humidity?.warningLow}
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
                        value={settings?.humidity?.normal}
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
                        value={settings?.humidity?.warningHigh}
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
                        value={settings?.humidity?.dangerHigh}
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
        {devices.length === 0 ? (
          // 장치가 없을 때 보여줄 메시지
          <div className="no-devices-message">
            <p>등록된 장치가 없습니다.</p>
          </div>
        ) : (
          devices.map((device) => (
            <div key={device.deviceId} className="sensor-section">
              <h2>
                {device.name} ({device.host})
              </h2>
              <div className="current-values">
                <div className="value-card">
                  <h3>현재 기온</h3>
                  <div className="value-container">
                    <p className="value temperature">
                      {device?.data?.temperature?.toFixed(1)}°C
                    </p>
                    <div
                      className={`status-dot ${device?.data ? getTemperatureStatus(device.data.temperature) : "unknown"}`}
                      title={`온도 상태: ${device?.data ? getStatusText(getTemperatureStatus(device.data.temperature)) : "알 수 없음"}`}
                    />
                  </div>
                </div>
                <div className="value-card">
                  <h3>현재 습도</h3>
                  <div className="value-container">
                    <p className="value humidity">
                      {device?.data?.humidity?.toFixed(1)}%
                    </p>
                    <div
                      className={`status-dot ${device?.data ? getHumidityStatus(device.data.humidity) : "unknown"}`}
                      title={`습도 상태: ${device?.data ? getStatusText(getHumidityStatus(device.data.humidity)) : "알 수 없음"}`}
                    />
                  </div>
                </div>
              </div>

              <div className="chart-wrapper">
                {console.log("차트 데이터:", device.history)}{" "}
                {/* 차트 데이터 확인 */}
                <Plot
                  data={[
                    {
                      type: "scatter",
                      mode: "lines",
                      name: `온도 (°C) - ${device.name}`,
                      x:
                        device?.history?.map(
                          (item) => new Date(item.timestamp)
                        ) || [], // timestamp를 Date 객체로 변환
                      y: device?.history?.map((item) => item.temperature) || [],
                      line: {
                        color: "#FF8787",
                        width: 2,
                        shape: "spline",
                      },
                      fill: "tonexty",
                      fillcolor: "rgba(255, 135, 135, 0.1)",
                    },
                    {
                      type: "scatter",
                      mode: "lines",
                      name: `습도 (%) - ${device.name}`,
                      x:
                        device?.history?.map(
                          (item) => new Date(item.timestamp)
                        ) || [], // timestamp를 Date 객체로 변환
                      y: device?.history?.map((item) => item.humidity) || [],
                      line: {
                        color: "#74C0FC",
                        width: 2,
                        shape: "spline",
                      },
                      fill: "tonexty",
                      fillcolor: "rgba(116, 192, 252, 0.1)",
                    },
                  ]}
                  layout={{
                    title: {
                      text: `${device.name} 센서 데이터`,
                      font: { size: 16 },
                    },
                    uirevision: device.deviceId,
                    legend: {
                      orientation: "h", // 가로 방향으로 표시
                      yanchor: "bottom", // 기준점을 아래로
                      y: -0.8, // 차트 위에 배치
                      xanchor: "center", // 가운데 정렬 기준점
                      x: 0.5, // 가운데 위치
                    },
                    xaxis: {
                      autorange: true,
                      type: "date",
                      rangeselector: {
                        buttons: [
                          {
                            count: 15,
                            label: "15분",
                            step: "minute",
                            stepmode: "backward",
                          },
                          {
                            count: 1,
                            label: "1시간",
                            step: "hour",
                            stepmode: "backward",
                          },
                          { step: "all", label: "전체" },
                        ],
                        // 시간 선택 버튼을 그래프 아래쪽에 배치
                        y: 1.2, // 그래프 아래쪽에 배치
                        x: 0.5, // 가운데 정렬
                        xanchor: "center", // 가운데 정렬 기준점
                        yanchor: "top", // 기준점을 위로
                      },
                      rangeslider: { visible: true },
                    },
                    yaxis: {
                      autorange: true,
                      type: "linear",
                    },
                    height: 400,
                    margin: { t: 90, r: 50, l: 50, b: 50 },
                    paper_bgcolor: "rgba(0,0,0,0)",
                    plot_bgcolor: "rgba(0,0,0,0)",
                    font: { color: "#333" },
                  }}
                  useResizeHandler={true}
                  style={{ width: "100%", height: "100%" }}
                  config={{
                    responsive: true,
                    displayModeBar: true,
                    modeBarButtonsToRemove: ["lasso2d", "select2d"],
                    displaylogo: false,
                  }}
                />
              </div>

              <button
                onClick={() => {
                  setDevices((prev) =>
                    prev.map((d) =>
                      d.deviceId === device.deviceId
                        ? { ...d, showTable: !d.showTable }
                        : d
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
                            <td>{formatDateTime(item.timestamp)}</td>
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
          ))
        )}
      </div>
    </div>
  );
}
