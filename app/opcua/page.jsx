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
    <h3>{title}</h3>
    <div className="value">
      {data !== undefined ? `${data} ${unit}` : "데이터 없음"}
    </div>
  </div>
);

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

  // 웹소켓 연결 설정
  useEffect(() => {
    setLoading(true);
    let socket = null;
    let reconnectTimeout = null;

    const connect = () => {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || window.location.origin;
      const wsUrl = apiUrl.replace(/^http/, "ws");
      socket = new WebSocket(`${wsUrl}/ws/opcua`);

      socket.onopen = () => {
        console.log("OPC UA 웹소켓 연결됨");
        setWsConnected(true);
        setError(null);
        setLoading(false);

        // 과거 데이터 요청 (24시간)
        socket.send(
          JSON.stringify({
            type: "getHistoricalData",
            hours: 24,
          })
        );
      };

      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log("OPC UA 데이터 수신:", message.type);

          if (message.type === "opcua") {
            // 실시간 데이터 처리
            processRealTimeData(message);
          } else if (message.type === "historicalData") {
            // 과거 데이터 처리
            processHistoricalData(message);
          } else if (message.type === "connection") {
            console.log("연결 상태:", message.status);
          } else if (message.type === "error") {
            console.error("서버 오류:", message.message);
            setError(message.message);
          }
        } catch (error) {
          console.error("메시지 처리 오류:", error);
        }
      };

      socket.onclose = (event) => {
        console.log("OPC UA 웹소켓 연결 종료:", event.code);
        setWsConnected(false);

        // 5초 후 재연결 시도
        reconnectTimeout = setTimeout(() => {
          console.log("OPC UA 웹소켓 재연결 시도...");
          connect();
        }, 5000);
      };

      socket.onerror = (error) => {
        console.error("OPC UA 웹소켓 오류:", error);
        setError("서버 연결에 실패했습니다. 서버가 실행 중인지 확인하세요.");
      };
    };

    connect();

    // 컴포넌트 언마운트 시 웹소켓 연결 및 타이머 정리
    return () => {
      if (socket) {
        socket.close();
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, []);

  // 실시간 데이터 처리
  const processRealTimeData = (message) => {
    if (!message.data) return;

    const timestamp = message.timestamp || new Date().toISOString();
    const newData = { timestamp };

    // 데이터 그룹화 및 저장
    setOpcuaData((prevData) => {
      const updatedData = { ...prevData };

      // Total 데이터 처리
      if (message.data.Common || message.data.Total) {
        const totalData = {
          ...prevData.Total.data,
          Filtered_Grid_Freq: message.data.Common?.Filtered_Grid_Freq || 0,
          T_Simul_P_REAL: message.data.Common?.T_Simul_P_REAL || 0,
          Total_TPWR_P_REAL: message.data.Total?.TPWR_P_REAL || 0,
          Total_TPWR_P_REF: message.data.Total?.TPWR_P_REF || 0,
        };

        // 히스토리에 데이터 추가 (24시간 데이터만 유지)
        const now = new Date();
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const newHistory = [
          ...prevData.Total.history,
          { ...totalData, timestamp },
        ].filter((item) => new Date(item.timestamp) >= oneDayAgo);

        updatedData.Total = {
          data: totalData,
          history: newHistory,
        };
      }

      // PCS1~4 데이터 처리
      ["PCS1", "PCS2", "PCS3", "PCS4"].forEach((pcs) => {
        if (message.data[pcs]) {
          const pcsData = {
            ...prevData[pcs].data,
            Filtered_Grid_Freq: message.data.Common?.Filtered_Grid_Freq || 0,
            TPWR_P_REAL: message.data[pcs]?.TPWR_P_REAL || 0,
            TPWR_P_REF: message.data[pcs]?.TPWR_P_REF || 0,
            SOC: message.data[pcs]?.SOC || 0,
          };

          const now = new Date();
          const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          const newHistory = [
            ...prevData[pcs].history,
            { ...pcsData, timestamp },
          ].filter((item) => new Date(item.timestamp) >= oneDayAgo);

          updatedData[pcs] = {
            data: pcsData,
            history: newHistory,
          };
        }
      });

      return updatedData;
    });
  };

  // 과거 데이터 처리
  const processHistoricalData = (message) => {
    if (
      !message.data ||
      !message.data.timeSeries ||
      message.data.timeSeries.length === 0
    ) {
      console.warn("과거 데이터가 없습니다");
      return;
    }

    const historicalData = message.data.timeSeries;

    // 데이터 그룹화 및 저장
    setOpcuaData((prevData) => {
      const updatedData = { ...prevData };

      // 그룹별 히스토리 데이터 초기화
      const groupHistory = {
        Total: [],
        PCS1: [],
        PCS2: [],
        PCS3: [],
        PCS4: [],
      };

      // 각 타임스탬프별 데이터를 그룹으로 분류
      historicalData.forEach((item) => {
        const timestamp = item.timestamp;

        // Total 데이터
        groupHistory.Total.push({
          timestamp,
          Filtered_Grid_Freq: item.Filtered_Grid_Freq || 0,
          T_Simul_P_REAL: item.T_Simul_P_REAL || 0,
          Total_TPWR_P_REAL: item.Total_TPWR_P_REAL || 0,
          Total_TPWR_P_REF: item.Total_TPWR_P_REF || 0,
        });

        // PCS 데이터
        ["PCS1", "PCS2", "PCS3", "PCS4"].forEach((pcs) => {
          groupHistory[pcs].push({
            timestamp,
            Filtered_Grid_Freq: item.Filtered_Grid_Freq || 0,
            TPWR_P_REAL: item[`${pcs}_TPWR_P_REAL`] || 0,
            TPWR_P_REF: item[`${pcs}_TPWR_P_REF`] || 0,
            SOC: item[`${pcs}_SOC`] || 0,
          });
        });
      });

      // 각 그룹별 데이터 업데이트
      Object.keys(groupHistory).forEach((group) => {
        if (groupHistory[group].length > 0) {
          const latestData =
            groupHistory[group][groupHistory[group].length - 1];
          updatedData[group] = {
            data: { ...latestData },
            history: groupHistory[group],
          };
        }
      });

      return updatedData;
    });
  };

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
        <div className="opcua-panel">
          <h2>{getTitleForGroup("Total")}</h2>
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

      {/* 차트 영역 (필요하면 추가) */}
      <div className="chart-container">
        <div className="chart-wrapper">
          <Plot
            data={[
              {
                type: "scatter",
                mode: "lines",
                name: "Total Power",
                x: opcuaData.Total.history.map(
                  (item) => new Date(item.timestamp)
                ),
                y: opcuaData.Total.history.map(
                  (item) => item.Total_TPWR_P_REAL
                ),
                line: { color: "#FF8787", width: 2 },
              },
              {
                type: "scatter",
                mode: "lines",
                name: "PCS1 Power",
                x: opcuaData.PCS1.history.map(
                  (item) => new Date(item.timestamp)
                ),
                y: opcuaData.PCS1.history.map((item) => item.TPWR_P_REAL),
                line: { color: "#74C0FC", width: 2 },
              },
              {
                type: "scatter",
                mode: "lines",
                name: "PCS2 Power",
                x: opcuaData.PCS2.history.map(
                  (item) => new Date(item.timestamp)
                ),
                y: opcuaData.PCS2.history.map((item) => item.TPWR_P_REAL),
                line: { color: "#B197FC", width: 2 },
              },
              {
                type: "scatter",
                mode: "lines",
                name: "PCS3 Power",
                x: opcuaData.PCS3.history.map(
                  (item) => new Date(item.timestamp)
                ),
                y: opcuaData.PCS3.history.map((item) => item.TPWR_P_REAL),
                line: { color: "#69DB7C", width: 2 },
              },
              {
                type: "scatter",
                mode: "lines",
                name: "PCS4 Power",
                x: opcuaData.PCS4.history.map(
                  (item) => new Date(item.timestamp)
                ),
                y: opcuaData.PCS4.history.map((item) => item.TPWR_P_REAL),
                line: { color: "#FAB005", width: 2 },
              },
            ]}
            layout={{
              title: "전력 출력 추이",
              uirevision: "true", // 차트 줌 상태 유지
              legend: {
                orientation: "h",
                y: -0.2,
              },
              xaxis: {
                title: "시간",
                autorange: true,
                type: "date",
                rangeslider: { visible: true },
              },
              yaxis: {
                title: "전력 (MW)",
                autorange: true,
              },
              height: 500,
              margin: { t: 50, r: 30, l: 60, b: 80 },
              paper_bgcolor: "rgba(0,0,0,0)",
              plot_bgcolor: "rgba(0,0,0,0)",
            }}
            useResizeHandler={true}
            style={{ width: "100%", height: "100%" }}
            config={{
              responsive: true,
              displayModeBar: true,
              displaylogo: false,
            }}
          />
        </div>
      </div>
    </div>
  );
}
