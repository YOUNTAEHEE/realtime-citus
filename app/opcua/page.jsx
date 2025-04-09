"use client";

import dynamic from "next/dynamic";
import { memo, useEffect, useState } from "react";
import "./realtimeOpcua.scss";

// Plotly 컴포넌트를 동적으로 임포트 (메모이제이션)
const Plot = dynamic(
  () =>
    import("react-plotly.js").then((mod) => {
      // Plot 컴포넌트 메모이제이션
      return memo(mod.default);
    }),
  { ssr: false }
);

// 카드 컴포넌트 (각 PCS 및 Total에 사용)
const DataCard = ({ title, data, unit = "" }) => (
  <div className="opcua-card">
    <div className="card-content">
      <h3 className="card-title">{title}</h3>
      <div className="card-value">
        {data !== undefined ? (
          <>
            <span className="value-number">{data}</span>
            <span className="value-unit">{unit}</span>
          </>
        ) : (
          <span className="no-data">데이터 없음</span>
        )}
      </div>
    </div>
  </div>
);

// PCS1~4에 공통으로 적용할 차트 레이아웃 설정 - 시간 표시 형식 개선
const commonChartLayout = {
  xaxis: {
    title: "시간",
    type: "date",
    tickformat: "%H:%M:%S.%L<br>%Y-%m-%d", // 시:분:초.밀리초 형식으로 표시
    autorange: true,
    rangemode: "normal",
    gridcolor: "#e0e0e0",
    linecolor: "#cccccc",
    tickfont: { size: 10, family: "Pretendard, sans-serif" },
    titlefont: {
      size: 13,
      color: "#444",
      family: "Pretendard, sans-serif",
    },
    showgrid: true,
    zeroline: false,
  },
  yaxis: {
    title: "전력 (MW)",
    autorange: true,
    gridcolor: "#e0e0e0",
    linecolor: "#cccccc",
    tickfont: { size: 10, family: "Pretendard, sans-serif" },
    titlefont: {
      size: 13,
      color: "#444",
      family: "Pretendard, sans-serif",
    },
    showgrid: true,
    zeroline: false,
    rangemode: "normal",
  },
  height: 600,
  margin: { t: 50, r: 40, l: 60, b: 70 },
  paper_bgcolor: "#ffffff",
  plot_bgcolor: "#f8f9fa",
  font: {
    family:
      "Pretendard, -apple-system, BlinkMacSystemFont, system-ui, Roboto, sans-serif",
    size: 12,
    color: "#444",
  },
  title: {
    font: {
      size: 16,
      color: "#2d3748",
      family: "Pretendard, sans-serif",
      weight: 600,
    },
    y: 0.98,
  },
  legend: {
    orientation: "h",
    y: -0.18,
    x: 0.5,
    xanchor: "center",
    font: {
      size: 11,
      family: "Pretendard, sans-serif",
    },
    bgcolor: "#ffffff",
    bordercolor: "#e8e8e8",
    borderwidth: 1,
    itemsizing: "constant",
    itemwidth: 40,
    itemclick: false,
    itemdoubleclick: false,
  },
  modebar: {
    bgcolor: "rgba(255, 255, 255, 0.8)",
    color: "#2d3748",
    activecolor: "#3b82f6",
  },
  hovermode: "closest",
  hoverlabel: {
    bgcolor: "#ffffff",
    font: { size: 12, family: "Pretendard, sans-serif", color: "#2d3748" },
    bordercolor: "#e0e0e0",
  },
  dragmode: "zoom",
  selectdirection: "h",
  shapes: [],
  annotations: [],
};

export default function OpcuaPage() {
  const [opcuaData, setOpcuaData] = useState({
    Total: { data: {}, history: [] },
    PCS1: { data: {}, history: [] },
    PCS2: { data: {}, history: [] },
    PCS3: { data: {}, history: [] },
    PCS4: { data: {}, history: [] },
  });
  const [wsConnected, setWsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTab, setSelectedTab] = useState("Total");

  // 웹소켓 연결 설정
  useEffect(() => {
    setLoading(true);
    let socket = null;
    let reconnectTimeout = null;
    let isCleaning = false;

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || window.location.origin;

     // 모드버스 서비스 중지 호출은 유지
     fetch(`${apiUrl}/api/modbus/stop`, {
      method: "POST",
    })
      .then((response) => {
        console.log("모드버스 서비스 중지 응답:", response.status);
        // 모드버스 중지 후 WebSocket 연결 시작
        connect();
      })
      .catch((error) => {
        console.error("모드버스 서비스 중지 중 오류:", error);
        // 오류가 발생해도 WebSocket 연결 시도
        connect();
      });

    const connect = () => {
      if (isCleaning) return; // 클린업 중이면 연결 시도하지 않음

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || window.location.origin;
      const wsUrl = apiUrl.replace(/^http/, "ws");
      socket = new WebSocket(`${wsUrl}/ws/opcua`);

      socket.onopen = () => {
        console.log("OPC UA 웹소켓 연결됨");
        setWsConnected(true);
        setError(null);
        setLoading(false);

        // 과거 데이터 요청 (1시간으로 변경)
        // socket.send(
        //   JSON.stringify({
        //     type: "getHistoricalData",
        //     hours: 1,
        //   })
        // );
      };

      socket.onmessage = (event) => {
        try {
          console.log(
            "원본 메시지 내용:",
            event.data.substring(0, 500) +
              (event.data.length > 500 ? "..." : "")
          );

          // 유효한 JSON인지 확인
          let message;
          try {
            message = JSON.parse(event.data);

            // 추가: historicalData 메시지 전체 구조 로깅
            // if (message.type === "historicalData") {
            //   console.log("과거 데이터 메시지 구조:", {
            //     type: message.type,
            //     count: message.count || 0,
            //     dataType: typeof message.data,
            //     isArray: Array.isArray(message.data),
            //     hasTimeSeries:
            //       message.data && message.data.timeSeries ? true : false,
            //   });
            // }
          } catch (jsonError) {
            console.error("유효하지 않은 JSON 데이터:", jsonError);
            setError("잘못된 데이터 형식을 받았습니다. 서버를 확인하세요.");
            return;
          }

          // console.log("메시지 타입:", message.type);

          if (message.type === "opcua") {
            // 데이터 구조 확인
            if (!message.data) {
              console.warn("데이터 없음:", message);
              return;
            }

            // 데이터 구조 상세 확인
            console.log(
              "데이터 구조:",
              JSON.stringify({
                hasOpcUa: !!message.data.OPC_UA,
                keys: message.data.OPC_UA
                  ? Object.keys(message.data.OPC_UA).slice(0, 5)
                  : null,
              })
            );

            // 실시간 데이터 처리
            processRealTimeData(message);
            // } else if (message.type === "historicalData") {
            //   // 과거 데이터 처리
            //   processHistoricalData(message);
          } else if (message.type === "connection") {
            console.log("연결 상태:", message.status);
          } else if (message.type === "error") {
            console.error("서버 오류:", message.message);
            setError(message.message);
          }
        } catch (error) {
          console.error("메시지 처리 중 예외 발생:", error);
          setError("메시지 처리 중 오류가 발생했습니다: " + error.message);
        }
      };

      socket.onclose = (event) => {
        console.log("OPC UA 웹소켓 연결 종료:", event.code);
        setWsConnected(false);

        // 클린업 중이 아닐 때만 재연결 시도
        if (!isCleaning) {
          reconnectTimeout = setTimeout(() => {
            console.log("OPC UA 웹소켓 재연결 시도...");
            connect();
          }, 5000);
        }
      };

      socket.onerror = (error) => {
        console.error("OPC UA 웹소켓 오류:", error);
        setError("서버 연결에 실패했습니다. 서버가 실행 중인지 확인하세요.");
      };
    };

    // 기존처럼 바로 웹소켓 연결 시작
    connect();

    // 클린업 함수에 서비스 중지 호출 추가
    return () => {
      console.log("OPC UA 웹소켓 연결 정리 시작");
      isCleaning = true;

      // 기존 웹소켓 정리 코드는 그대로 유지
      if (socket) {
        // 이벤트 리스너 제거
        socket.onopen = null;
        socket.onmessage = null;
        socket.onclose = null;
        socket.onerror = null;

        // readyState 체크 후 연결 종료
        if (
          socket.readyState === WebSocket.OPEN ||
          socket.readyState === WebSocket.CONNECTING
        ) {
          socket.close();
        }
        socket = null; // 참조 제거
      }

      // 타이머 정리
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
      }

      // OPC UA 서비스 중지 호출 추가
      fetch(`${apiUrl}/api/opcua/stop`, {
        method: "POST",
      }).catch((error) => console.error("OPC UA 서비스 중지 오류:", error));

      // 상태 정리
      setWsConnected(false);
      setLoading(false);

      console.log("OPC UA 웹소켓 연결 정리 완료");
    };
  }, []);

  // 실시간 데이터 처리
  const processRealTimeData = (message) => {
    try {
      // 기본 검사
      if (!message || !message.data) {
        console.warn("유효하지 않은 메시지 형식:", message);
        return;
      }

      const timestamp = message.timestamp || new Date().toISOString();

      // 안전한 데이터 접근
      if (!message.data.OPC_UA) {
        console.warn("OPC_UA 객체가 없습니다:", message.data);
        return;
      }

      const rawOpcData = message.data.OPC_UA || {};
      console.log(
        "원본 OPC_UA 데이터 키:",
        Object.keys(rawOpcData).slice(0, 5)
      );
      const opcData = rawOpcData;

      // 접두사 처리: OPC_UA_ 접두사 제거
      // const opcData = {};
      // for (const [key, value] of Object.entries(rawOpcData)) {
      //   // OPC_UA_ 접두사 제거
      //   const cleanKey = key.replace("OPC_UA_", "");
      //   opcData[cleanKey] = value;
      // }

      console.log("처리된 OPC_UA 데이터 키:", Object.keys(opcData).slice(0, 5));

      // PCS 필드 검사
      ["PCS1_TPWR_P_REAL", "PCS1_SOC", "Filtered_Grid_Freq"].forEach(
        (field) => {
          console.log(`${field} 값 확인:`, opcData[field]);
        }
      );

      // 데이터 업데이트 처리
      setOpcuaData((prevData) => {
        const updatedData = { ...prevData };

        // Total/Common 데이터
        updatedData.Total.data = {
          Filtered_Grid_Freq: parseFloat(opcData.Filtered_Grid_Freq) || 0,
          T_Simul_P_REAL: parseFloat(opcData.T_Simul_P_REAL) || 0,
          Total_TPWR_P_REAL: parseFloat(opcData.Total_TPWR_P_REAL) || 0,
          Total_TPWR_P_REF: parseFloat(opcData.Total_TPWR_P_REF) || 0,
        };

        // 히스토리에 추가 (24시간에서 1시간으로 변경)
        const now = new Date();
        const oneHourAgo = new Date(now.getTime() - 1 * 60 * 60 * 1000);
        updatedData.Total.history = [
          ...prevData.Total.history,
          { ...updatedData.Total.data, timestamp },
        ].filter((item) => new Date(item.timestamp) >= oneHourAgo);

        // PCS1~4 데이터
        ["PCS1", "PCS2", "PCS3", "PCS4"].forEach((pcs) => {
          updatedData[pcs].data = {
            Filtered_Grid_Freq: parseFloat(opcData.Filtered_Grid_Freq) || 0,
            TPWR_P_REAL: parseFloat(opcData[`${pcs}_TPWR_P_REAL`]) || 0,
            TPWR_P_REF: parseFloat(opcData[`${pcs}_TPWR_P_REF`]) || 0,
            SOC: parseFloat(opcData[`${pcs}_SOC`]) || 0,
          };

          // 디버깅: PCS 데이터 로깅
          if (pcs === "PCS1") {
            console.log("PCS1 데이터:", {
              original: {
                TPWR_P_REAL: opcData.PCS1_TPWR_P_REAL,
                TPWR_P_REF: opcData.PCS1_TPWR_P_REF,
                SOC: opcData.PCS1_SOC,
              },
              processed: updatedData.PCS1.data,
            });
          }

          updatedData[pcs].history = [
            ...prevData[pcs].history,
            { ...updatedData[pcs].data, timestamp },
          ].filter((item) => new Date(item.timestamp) >= oneHourAgo);
        });

        return updatedData;
      });

      // 마지막에 오류 초기화 추가
      setError(null); // 성공적으로 처리되면 오류 메시지 제거

      console.log("데이터 처리 완료");
    } catch (err) {
      console.error("데이터 처리 중 오류 발생:", err, err.stack);
    }
  };

  // 과거 데이터 처리 - 로직 단순화
  // const processHistoricalData = (message) => {
  //   console.log("과거 데이터 처리 시작", message);

  //   // 데이터 확인
  //   let historicalData = [];

  //   // 케이스 1: data.timeSeries 배열
  //   if (
  //     message.data &&
  //     message.data.timeSeries &&
  //     Array.isArray(message.data.timeSeries)
  //   ) {
  //     historicalData = message.data.timeSeries;
  //     console.log("timeSeries 배열 형식 감지:", historicalData.length);
  //   }
  //   // 케이스 2: data 자체가 배열
  //   else if (message.data && Array.isArray(message.data)) {
  //     historicalData = message.data;
  //     console.log("data 배열 형식 감지:", historicalData.length);
  //   }
  //   // 케이스 3: data가 비어있거나 없는 경우
  //   else {
  //     console.warn("사용 가능한 데이터 형식 없음:", message);
  //     return;
  //   }

  //   // 실제 레코드가 없는 경우
  //   if (historicalData.length === 0) {
  //     console.warn("과거 데이터가 없습니다 (빈 배열)");
  //     return;
  //   }

  //   // 예시 데이터 출력
  //   console.log(
  //     "첫 번째 데이터 포인트:",
  //     JSON.stringify(historicalData[0], null, 2)
  //   );

  //   // 기존 처리 로직 (간소화하여 유지)...
  //   setOpcuaData((prevData) => {
  //     const updatedData = { ...prevData };
  //     const groupHistory = {
  //       Total: [],
  //       PCS1: [],
  //       PCS2: [],
  //       PCS3: [],
  //       PCS4: [],
  //     };

  //     // 각 데이터 포인트 처리
  //     historicalData.forEach((item) => {
  //       if (!item || !item.timestamp) {
  //         console.warn("잘못된 데이터 포인트 무시:", item);
  //         return;
  //       }

  //       try {
  //         const timestamp = item.timestamp;

  //         // Total 데이터
  //         groupHistory.Total.push({
  //           timestamp,
  //           Filtered_Grid_Freq: item.Filtered_Grid_Freq || 0,
  //           T_Simul_P_REAL: item.T_Simul_P_REAL || 0,
  //           Total_TPWR_P_REAL: item.Total_TPWR_P_REAL || 0,
  //           Total_TPWR_P_REF: item.Total_TPWR_P_REF || 0,
  //         });

  //         // PCS 데이터
  //         ["PCS1", "PCS2", "PCS3", "PCS4"].forEach((pcs) => {
  //           groupHistory[pcs].push({
  //             timestamp,
  //             Filtered_Grid_Freq: item.Filtered_Grid_Freq || 0,
  //             TPWR_P_REAL: item[`${pcs}_TPWR_P_REAL`] || 0,
  //             TPWR_P_REF: item[`${pcs}_TPWR_P_REF`] || 0,
  //             SOC: item[`${pcs}_SOC`] || 0,
  //           });
  //         });
  //       } catch (err) {
  //         console.error("데이터 포인트 처리 중 오류:", err, item);
  //       }
  //     });

  //     // 각 그룹별 데이터 업데이트
  //     Object.keys(groupHistory).forEach((group) => {
  //       if (groupHistory[group].length > 0) {
  //         console.log(
  //           `${group} 그룹 데이터:`,
  //           groupHistory[group].length,
  //           "개"
  //         );
  //         const latestData =
  //           groupHistory[group][groupHistory[group].length - 1];
  //         updatedData[group] = {
  //           data: { ...latestData },
  //           history: groupHistory[group],
  //         };
  //       }
  //     });

  //     return updatedData;
  //   });

  //   console.log("과거 데이터 처리 완료");
  // };

  // 타이틀 구성 함수
  const getTitleForGroup = (group) => {
    switch (group) {
      case "Total":
        return "Total Trends (8MW)";
      case "PCS1":
        return "PCS1 (2MW)";
      case "PCS2":
        return "PCS2";
      case "PCS3":
        return "PCS3";
      case "PCS4":
        return "PCS4";
      default:
        return group;
    }
  };
  
  return (
    <div className="opcua-container">
      <div className="header">
        <h1>OPC UA 실시간 데이터</h1>
        <div className="status-badge-container">
          <span
            className={`status-badge ${wsConnected ? "connected" : "disconnected"}`}
          >
            {wsConnected ? "서버 연결됨" : "서버 연결 안됨"}
          </span>
          <span className="status-badge realtime">Real Time</span>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="opcua-grid">
        {/* Total 차트 패널 */}
        <div className="opcua-panel total-panel">
          <h2 className="panel-title">{getTitleForGroup("Total")}</h2>
          <div className="opcua-values">
            <DataCard
              title="- Filtered_Grid_Freq"
              data={opcuaData.Total.data.Filtered_Grid_Freq?.toFixed(2)}
            />
            <DataCard
              title="- T_Simul_P_REAL"
              data={opcuaData.Total.data.T_Simul_P_REAL?.toFixed(1)}
              unit="MW"
            />
            <DataCard
              title="- Total_TPWR_P_REAL"
              data={opcuaData.Total.data.Total_TPWR_P_REAL?.toFixed(1)}
              unit="MW"
            />
            <DataCard
              title="- Total_TPWR_P_REF"
              data={opcuaData.Total.data.Total_TPWR_P_REF?.toFixed(1)}
              unit="MW"
            />
          </div>
        </div>

        {/* PCS1 차트 패널 */}
        <div className="opcua-panel">
          <h2>{getTitleForGroup("PCS1")}</h2>
          <div className="opcua-values">
            <DataCard
              title="- Filtered_Grid_Freq"
              data={opcuaData.PCS1.data.Filtered_Grid_Freq?.toFixed(2)}
            />
            <DataCard
              title="- PCS1_TPWR_P_REAL"
              data={opcuaData.PCS1.data.TPWR_P_REAL?.toFixed(1)}
              unit="MW"
            />
            <DataCard
              title="- PCS1_TPWR_P_REF"
              data={opcuaData.PCS1.data.TPWR_P_REF?.toFixed(1)}
              unit="MW"
            />
            <DataCard
              title="- PCS1_SOC"
              data={opcuaData.PCS1.data.SOC?.toFixed(1)}
              unit="%"
            />
          </div>
        </div>

        {/* PCS2 차트 패널 */}
        <div className="opcua-panel">
          <h2>{getTitleForGroup("PCS2")}</h2>
          <div className="opcua-values">
            <DataCard
              title="- Filtered_Grid_Freq"
              data={opcuaData.PCS2.data.Filtered_Grid_Freq?.toFixed(2)}
            />
            <DataCard
              title="- PCS2_TPWR_P_REAL"
              data={opcuaData.PCS2.data.TPWR_P_REAL?.toFixed(1)}
              unit="MW"
            />
            <DataCard
              title="- PCS2_TPWR_P_REF"
              data={opcuaData.PCS2.data.TPWR_P_REF?.toFixed(1)}
              unit="MW"
            />
            <DataCard
              title="- PCS2_SOC"
              data={opcuaData.PCS2.data.SOC?.toFixed(1)}
              unit="%"
            />
          </div>
        </div>

        {/* PCS3 차트 패널 */}
        <div className="opcua-panel">
          <h2>{getTitleForGroup("PCS3")}</h2>
          <div className="opcua-values">
            <DataCard
              title="- Filtered_Grid_Freq"
              data={opcuaData.PCS3.data.Filtered_Grid_Freq?.toFixed(2)}
            />
            <DataCard
              title="- PCS3_TPWR_P_REAL"
              data={opcuaData.PCS3.data.TPWR_P_REAL?.toFixed(1)}
              unit="MW"
            />
            <DataCard
              title="- PCS3_TPWR_P_REF"
              data={opcuaData.PCS3.data.TPWR_P_REF?.toFixed(1)}
              unit="MW"
            />
            <DataCard
              title="- PCS3_SOC"
              data={opcuaData.PCS3.data.SOC?.toFixed(1)}
              unit="%"
            />
          </div>
        </div>

        {/* PCS4 차트 패널 */}
        <div className="opcua-panel">
          <h2>{getTitleForGroup("PCS4")}</h2>
          <div className="opcua-values">
            <DataCard
              title="- Filtered_Grid_Freq"
              data={opcuaData.PCS4.data.Filtered_Grid_Freq?.toFixed(2)}
            />
            <DataCard
              title="- PCS4_TPWR_P_REAL"
              data={opcuaData.PCS4.data.TPWR_P_REAL?.toFixed(1)}
              unit="MW"
            />
            <DataCard
              title="- PCS4_TPWR_P_REF"
              data={opcuaData.PCS4.data.TPWR_P_REF?.toFixed(1)}
              unit="MW"
            />
            <DataCard
              title="- PCS4_SOC"
              data={opcuaData.PCS4.data.SOC?.toFixed(1)}
              unit="%"
            />
          </div>
        </div>
      </div>

      {/* 차트 영역 - 탭 메뉴 디자인 개선 */}
      <div className="chart-section">
        <div className="chart-tabs">
          {["Total", "PCS1", "PCS2", "PCS3", "PCS4"].map((tab) => (
            <button
              key={tab}
              className={`tab-button ${selectedTab === tab ? "active" : ""}`}
              onClick={() => setSelectedTab(tab)}
              style={{
                background: selectedTab === tab ? "#ffffff" : "transparent",
                color: selectedTab === tab ? "#3366cc" : "#666666",
                borderBottom:
                  selectedTab === tab ? "3px solid #3366cc" : "none",
                borderTop: "none",
                borderLeft: "none",
                borderRight: "none",
                padding: "12px 20px",
                fontSize: "14px",
                fontWeight: selectedTab === tab ? "600" : "400",
                cursor: "pointer",
                transition: "all 0.3s ease",
                position: "relative",
                outline: "none",
              }}
            >
              {tab === "Total" ? "Total Trends" : tab}
            </button>
          ))}
        </div>

        <div className="chart-container">
          {selectedTab === "Total" && (
            <div className="chart-wrapper">
              <Plot
                data={[
                  {
                    type: "scatter",
                    mode: "lines",
                    name: "Filtered Grid Freq",
                    x: opcuaData.Total.history.map(
                      (item) => new Date(item.timestamp)
                    ),
                    y: opcuaData.Total.history.map((item) =>
                      item.Filtered_Grid_Freq === -1
                        ? null
                        : item.Filtered_Grid_Freq
                    ),
                    line: { color: "#74C0FC", width: 2 },
                    connectgaps: false,
                    hovertemplate:
                      "<b>데이터</b>: %{data.name}<br><b>시간</b>: %{x|%Y-%m-%d %H:%M:%S.%L}<br><b>값</b>: %{y:.3f}<extra></extra>",
                  },
                  {
                    type: "scatter",
                    mode: "lines",
                    name: "T Simul P REAL",
                    x: opcuaData.Total.history.map(
                      (item) => new Date(item.timestamp)
                    ),
                    y: opcuaData.Total.history.map((item) =>
                      item.T_Simul_P_REAL === -1 ? null : item.T_Simul_P_REAL
                    ),
                    line: { color: "#FF8787", width: 2 },
                    connectgaps: false,
                    hovertemplate:
                      "<b>데이터</b>: %{data.name}<br><b>시간</b>: %{x|%Y-%m-%d %H:%M:%S.%L}<br><b>값</b>: %{y:.3f}<extra></extra>",
                  },
                  {
                    type: "scatter",
                    mode: "lines",
                    name: "Total TPWR P REAL",
                    x: opcuaData.Total.history.map(
                      (item) => new Date(item.timestamp)
                    ),
                    y: opcuaData.Total.history.map((item) =>
                      item.Total_TPWR_P_REAL === -1
                        ? null
                        : item.Total_TPWR_P_REAL
                    ),
                    line: { color: "#69DB7C", width: 2 },
                    connectgaps: false,
                    hovertemplate:
                      "<b>데이터</b>: %{data.name}<br><b>시간</b>: %{x|%Y-%m-%d %H:%M:%S.%L}<br><b>값</b>: %{y:.3f}<extra></extra>",
                  },
                  {
                    type: "scatter",
                    mode: "lines",
                    name: "Total TPWR P REF",
                    x: opcuaData.Total.history.map(
                      (item) => new Date(item.timestamp)
                    ),
                    y: opcuaData.Total.history.map((item) =>
                      item.Total_TPWR_P_REF === -1
                        ? null
                        : item.Total_TPWR_P_REF
                    ),
                    line: { color: "#FAB005", width: 2 },
                    connectgaps: false,
                    hovertemplate:
                      "<b>데이터</b>: %{data.name}<br><b>시간</b>: %{x|%Y-%m-%d %H:%M:%S.%L}<br><b>값</b>: %{y:.3f}<extra></extra>",
                  },
                ]}
                layout={{
                  ...commonChartLayout,
                  title: "Total Trends (8MW)",
                  uirevision: "total",
                }}
                useResizeHandler={true}
                style={{ width: "100%", height: "100%" }}
                config={{
                  responsive: true,
                  displayModeBar: true,
                  displaylogo: false,
                  locale: "ko",
                  modeBarButtonsToRemove: ["lasso2d", "select2d"],
                }}
              />
            </div>
          )}

          {selectedTab === "PCS1" && (
            <div className="chart-wrapper">
              <Plot
                data={[
                  {
                    type: "scatter",
                    mode: "lines",
                    name: "Filtered Grid Freq",
                    x: opcuaData.PCS1.history.map(
                      (item) => new Date(item.timestamp)
                    ),
                    y: opcuaData.PCS1.history.map((item) =>
                      item.Filtered_Grid_Freq === -1
                        ? null
                        : item.Filtered_Grid_Freq
                    ),
                    line: { color: "#74C0FC", width: 2 },
                    connectgaps: false,
                    hovertemplate:
                      "<b>데이터</b>: %{data.name}<br><b>시간</b>: %{x|%Y-%m-%d %H:%M:%S.%L}<br><b>값</b>: %{y:.3f}<extra></extra>",
                  },
                  {
                    type: "scatter",
                    mode: "lines",
                    name: "TPWR P REAL",
                    x: opcuaData.PCS1.history.map(
                      (item) => new Date(item.timestamp)
                    ),
                    y: opcuaData.PCS1.history.map((item) =>
                      item.TPWR_P_REAL === -1 ? null : item.TPWR_P_REAL
                    ),
                    line: { color: "#FF8787", width: 2 },
                    connectgaps: false,
                    hovertemplate:
                      "<b>데이터</b>: %{data.name}<br><b>시간</b>: %{x|%Y-%m-%d %H:%M:%S.%L}<br><b>값</b>: %{y:.3f}<extra></extra>",
                  },
                  {
                    type: "scatter",
                    mode: "lines",
                    name: "TPWR P REF",
                    x: opcuaData.PCS1.history.map(
                      (item) => new Date(item.timestamp)
                    ),
                    y: opcuaData.PCS1.history.map((item) =>
                      item.TPWR_P_REF === -1 ? null : item.TPWR_P_REF
                    ),
                    line: { color: "#69DB7C", width: 2 },
                    connectgaps: false,
                    hovertemplate:
                      "<b>데이터</b>: %{data.name}<br><b>시간</b>: %{x|%Y-%m-%d %H:%M:%S.%L}<br><b>값</b>: %{y:.3f}<extra></extra>",
                  },
                  {
                    type: "scatter",
                    mode: "lines",
                    name: "SOC",
                    x: opcuaData.PCS1.history.map(
                      (item) => new Date(item.timestamp)
                    ),
                    y: opcuaData.PCS1.history.map((item) =>
                      item.SOC === -1 ? null : item.SOC
                    ),
                    line: { color: "#FAB005", width: 2 },
                    connectgaps: false,
                    hovertemplate:
                      "<b>데이터</b>: %{data.name}<br><b>시간</b>: %{x|%Y-%m-%d %H:%M:%S.%L}<br><b>값</b>: %{y:.3f}<extra></extra>",
                  },
                ]}
                layout={{
                  ...commonChartLayout,
                  title: "PCS1 (2MW)",
                  uirevision: "pcs1",
                }}
                useResizeHandler={true}
                style={{ width: "100%", height: "100%" }}
                config={{
                  responsive: true,
                  displayModeBar: true,
                  displaylogo: false,
                  locale: "ko",
                  modeBarButtonsToRemove: ["lasso2d", "select2d"],
                }}
              />
            </div>
          )}

          {selectedTab === "PCS2" && (
            <div className="chart-wrapper">
              <Plot
                data={[
                  {
                    type: "scatter",
                    mode: "lines",
                    name: "Filtered Grid Freq",
                    x: opcuaData.PCS2.history.map(
                      (item) => new Date(item.timestamp)
                    ),
                    y: opcuaData.PCS2.history.map((item) =>
                      item.Filtered_Grid_Freq === -1
                        ? null
                        : item.Filtered_Grid_Freq
                    ),
                    line: { color: "#74C0FC", width: 2 },
                    connectgaps: false,
                    hovertemplate:
                      "<b>데이터</b>: %{data.name}<br><b>시간</b>: %{x|%Y-%m-%d %H:%M:%S.%L}<br><b>값</b>: %{y:.3f}<extra></extra>",
                  },
                  {
                    type: "scatter",
                    mode: "lines",
                    name: "TPWR P REAL",
                    x: opcuaData.PCS2.history.map(
                      (item) => new Date(item.timestamp)
                    ),
                    y: opcuaData.PCS2.history.map((item) =>
                      item.TPWR_P_REAL === -1 ? null : item.TPWR_P_REAL
                    ),
                    line: { color: "#FF8787", width: 2 },
                    connectgaps: false,
                    hovertemplate:
                      "<b>데이터</b>: %{data.name}<br><b>시간</b>: %{x|%Y-%m-%d %H:%M:%S.%L}<br><b>값</b>: %{y:.3f}<extra></extra>",
                  },
                  {
                    type: "scatter",
                    mode: "lines",
                    name: "TPWR P REF",
                    x: opcuaData.PCS2.history.map(
                      (item) => new Date(item.timestamp)
                    ),
                    y: opcuaData.PCS2.history.map((item) =>
                      item.TPWR_P_REF === -1 ? null : item.TPWR_P_REF
                    ),
                    line: { color: "#69DB7C", width: 2 },
                    connectgaps: false,
                    hovertemplate:
                      "<b>데이터</b>: %{data.name}<br><b>시간</b>: %{x|%Y-%m-%d %H:%M:%S.%L}<br><b>값</b>: %{y:.3f}<extra></extra>",
                  },
                  {
                    type: "scatter",
                    mode: "lines",
                    name: "SOC",
                    x: opcuaData.PCS2.history.map(
                      (item) => new Date(item.timestamp)
                    ),
                    y: opcuaData.PCS2.history.map((item) =>
                      item.SOC === -1 ? null : item.SOC
                    ),
                    line: { color: "#FAB005", width: 2 },
                    connectgaps: false,
                    hovertemplate:
                      "<b>데이터</b>: %{data.name}<br><b>시간</b>: %{x|%Y-%m-%d %H:%M:%S.%L}<br><b>값</b>: %{y:.3f}<extra></extra>",
                  },
                ]}
                layout={{
                  ...commonChartLayout,
                  title: "PCS2",
                  uirevision: "pcs2",
                }}
                useResizeHandler={true}
                style={{ width: "100%", height: "100%" }}
                config={{
                  responsive: true,
                  displayModeBar: true,
                  displaylogo: false,
                  locale: "ko",
                  modeBarButtonsToRemove: ["lasso2d", "select2d"],
                }}
              />
            </div>
          )}

          {selectedTab === "PCS3" && (
            <div className="chart-wrapper">
              <Plot
                data={[
                  {
                    type: "scatter",
                    mode: "lines",
                    name: "Filtered Grid Freq",
                    x: opcuaData.PCS3.history.map(
                      (item) => new Date(item.timestamp)
                    ),
                    y: opcuaData.PCS3.history.map((item) =>
                      item.Filtered_Grid_Freq === -1
                        ? null
                        : item.Filtered_Grid_Freq
                    ),
                    line: { color: "#74C0FC", width: 2 },
                    connectgaps: false,
                    hovertemplate:
                      "<b>데이터</b>: %{data.name}<br><b>시간</b>: %{x|%Y-%m-%d %H:%M:%S.%L}<br><b>값</b>: %{y:.3f}<extra></extra>",
                  },
                  {
                    type: "scatter",
                    mode: "lines",
                    name: "TPWR P REAL",
                    x: opcuaData.PCS3.history.map(
                      (item) => new Date(item.timestamp)
                    ),
                    y: opcuaData.PCS3.history.map((item) =>
                      item.TPWR_P_REAL === -1 ? null : item.TPWR_P_REAL
                    ),
                    line: { color: "#FF8787", width: 2 },
                    connectgaps: false,
                    hovertemplate:
                      "<b>데이터</b>: %{data.name}<br><b>시간</b>: %{x|%Y-%m-%d %H:%M:%S.%L}<br><b>값</b>: %{y:.3f}<extra></extra>",
                  },
                  {
                    type: "scatter",
                    mode: "lines",
                    name: "TPWR P REF",
                    x: opcuaData.PCS3.history.map(
                      (item) => new Date(item.timestamp)
                    ),
                    y: opcuaData.PCS3.history.map((item) =>
                      item.TPWR_P_REF === -1 ? null : item.TPWR_P_REF
                    ),
                    line: { color: "#69DB7C", width: 2 },
                    connectgaps: false,
                    hovertemplate:
                      "<b>데이터</b>: %{data.name}<br><b>시간</b>: %{x|%Y-%m-%d %H:%M:%S.%L}<br><b>값</b>: %{y:.3f}<extra></extra>",
                  },
                  {
                    type: "scatter",
                    mode: "lines",
                    name: "SOC",
                    x: opcuaData.PCS3.history.map(
                      (item) => new Date(item.timestamp)
                    ),
                    y: opcuaData.PCS3.history.map((item) =>
                      item.SOC === -1 ? null : item.SOC
                    ),
                    line: { color: "#FAB005", width: 2 },
                    connectgaps: false,
                    hovertemplate:
                      "<b>데이터</b>: %{data.name}<br><b>시간</b>: %{x|%Y-%m-%d %H:%M:%S.%L}<br><b>값</b>: %{y:.3f}<extra></extra>",
                  },
                ]}
                layout={{
                  ...commonChartLayout,
                  title: "PCS3",
                  uirevision: "pcs3",
                }}
                useResizeHandler={true}
                style={{ width: "100%", height: "100%" }}
                config={{
                  responsive: true,
                  displayModeBar: true,
                  displaylogo: false,
                  locale: "ko",
                  modeBarButtonsToRemove: ["lasso2d", "select2d"],
                }}
              />
            </div>
          )}

          {selectedTab === "PCS4" && (
            <div className="chart-wrapper">
              <Plot
                data={[
                  {
                    type: "scatter",
                    mode: "lines",
                    name: "Filtered Grid Freq",
                    x: opcuaData.PCS4.history.map(
                      (item) => new Date(item.timestamp)
                    ),
                    y: opcuaData.PCS4.history.map((item) =>
                      item.Filtered_Grid_Freq === -1
                        ? null
                        : item.Filtered_Grid_Freq
                    ),
                    line: { color: "#74C0FC", width: 2 },
                    connectgaps: false,
                    hovertemplate:
                      "<b>데이터</b>: %{data.name}<br><b>시간</b>: %{x|%Y-%m-%d %H:%M:%S.%L}<br><b>값</b>: %{y:.3f}<extra></extra>",
                  },
                  {
                    type: "scatter",
                    mode: "lines",
                    name: "TPWR P REAL",
                    x: opcuaData.PCS4.history.map(
                      (item) => new Date(item.timestamp)
                    ),
                    y: opcuaData.PCS4.history.map((item) =>
                      item.TPWR_P_REAL === -1 ? null : item.TPWR_P_REAL
                    ),
                    line: { color: "#FF8787", width: 2 },
                    connectgaps: false,
                    hovertemplate:
                      "<b>데이터</b>: %{data.name}<br><b>시간</b>: %{x|%Y-%m-%d %H:%M:%S.%L}<br><b>값</b>: %{y:.3f}<extra></extra>",
                  },
                  {
                    type: "scatter",
                    mode: "lines",
                    name: "TPWR P REF",
                    x: opcuaData.PCS4.history.map(
                      (item) => new Date(item.timestamp)
                    ),
                    y: opcuaData.PCS4.history.map((item) =>
                      item.TPWR_P_REF === -1 ? null : item.TPWR_P_REF
                    ),
                    line: { color: "#69DB7C", width: 2 },
                    connectgaps: false,
                    hovertemplate:
                      "<b>데이터</b>: %{data.name}<br><b>시간</b>: %{x|%Y-%m-%d %H:%M:%S.%L}<br><b>값</b>: %{y:.3f}<extra></extra>",
                  },
                  {
                    type: "scatter",
                    mode: "lines",
                    name: "SOC",
                    x: opcuaData.PCS4.history.map(
                      (item) => new Date(item.timestamp)
                    ),
                    y: opcuaData.PCS4.history.map((item) =>
                      item.SOC === -1 ? null : item.SOC
                    ),
                    line: { color: "#FAB005", width: 2 },
                    connectgaps: false,
                    hovertemplate:
                      "<b>데이터</b>: %{data.name}<br><b>시간</b>: %{x|%Y-%m-%d %H:%M:%S.%L}<br><b>값</b>: %{y:.3f}<extra></extra>",
                  },
                ]}
                layout={{
                  ...commonChartLayout,
                  title: "PCS4",
                  uirevision: "pcs4",
                }}
                useResizeHandler={true}
                style={{ width: "100%", height: "100%" }}
                config={{
                  responsive: true,
                  displayModeBar: true,
                  displaylogo: false,
                  locale: "ko",
                  modeBarButtonsToRemove: ["lasso2d", "select2d"],
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
