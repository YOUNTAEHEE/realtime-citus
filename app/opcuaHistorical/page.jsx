"use client";

import dynamic from "next/dynamic";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import "../opcua/realtimeOpcua.scss";
import "./opcuaHistorical.scss";

const Plot = dynamic(
  () =>
    import("react-plotly.js").then((mod) => {
      return memo(mod.default);
    }),
  { ssr: false }
);

// const CSVLink = dynamic(() => import("react-csv").then((mod) => mod.CSVLink), {
//   ssr: false,
// });

// FixedSizeList 동적 import (ssr: false 적용)
const FixedSizeList = dynamic(
  () => import("react-window").then((mod) => mod.FixedSizeList),
  { ssr: false }
);

// 차트 레이아웃 설정 (기존과 동일)
const commonChartLayout = {
  xaxis: {
    title: "시간",
    type: "date",
    tickformat: "%H:%M:%S.%L<br>%Y-%m-%d",
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
  height: "auto",
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
    itemclick: "toggle", // ✅ 클릭하면 숨기기/보이기
    itemdoubleclick: "toggleothers", // ✅ 더블클릭하면 나머지 다 숨기고 이것만 보기
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

// getFilteredChartData 함수 (기존과 동일)
const getFilteredChartData = (historyData, selectedTab) => {
  if (!historyData || historyData.length === 0) return [];

  const firstItem = historyData[0];

  // timestamp 제외 + 현재 탭(selectedTab)과 관련된 필드만 필터링
  const keys = Object.keys(firstItem).filter((key) => {
    if (key === "timestamp" || typeof firstItem[key] === "object") return false;
    // Total은 특수 케이스로 prefix 없이도 필드명에 포함되도록 허용
    if (selectedTab === "Total") {
      return (
        key.includes("Total") ||
        key.includes("Filtered_Grid_Freq") ||
        key.includes("T_Simul_P_REAL")
      );
    }
    return key.includes(selectedTab); // ex) "PCS1_SOC"은 selectedTab === "PCS1"일 때만 허용
  });

  const colors = [
    "#74C0FC",
    "#FF8787",
    "#69DB7C",
    "#FAB005",
    "#D0BFFF",
    "#FFA8A8",
    "#63E6BE",
  ];
  console.log("🟢 차트에 표시될 필드 목록:", keys);

  return keys
    .map((fieldName, index) => {
      const hasData = historyData.some(
        (item) => item[fieldName] !== undefined && item[fieldName] !== -1
      );

      return {
        type: "scattergl", //gpu사용
        mode: "lines",
        name: fieldName,
        x: historyData.map((item) => new Date(item.timestamp)),
        y: historyData.map((item) =>
          item[fieldName] === undefined || item[fieldName] === -1
            ? null
            : item[fieldName]
        ),
        line: { color: colors[index % colors.length], width: 2 },
        connectgaps: false,
        hovertemplate:
          "<b>데이터</b>: %{data.name}<br><b>시간</b>: %{x|%Y-%m-%d %H:%M:%S.%L}<br><b>값</b>: %{y:.3f}<extra></extra>",
      };
    })
    .filter((series) => series.y.some((val) => val !== null));
};

// DataTable 컴포넌트 정의
const DataTable = ({ historyData, isLoading, error, selectedTab }) => {
  // --- 로깅: 컴포넌트 시작 시 받는 props 확인 (디버깅 완료 후 제거 가능) ---
  console.log("--- DataTable received props ---");
  // console.log('DataTable received historyData:', JSON.stringify(historyData)?.substring(0, 200) + '...');
  // console.log('DataTable received isLoading:', isLoading);
  // console.log('DataTable received error:', error);
  // console.log('DataTable received selectedTab:', selectedTab);
  // --- 로깅 끝 ---

  // --- useMemo 복원 ---

  // 1. rowsArray 계산 (historyData.rows를 실제 배열로 변환)
  const rowsArray = useMemo(() => {
    console.log("DataTable: Calculating rowsArray (with useMemo)"); // 이제 useMemo 사용
    if (!historyData || !historyData.rows) {
      console.log(
        "DataTable: historyData or historyData.rows is missing. Returning empty array."
      );
      return [];
    }
    if (Array.isArray(historyData.rows)) {
      return historyData.rows;
    } else {
      console.warn(
        "DataTable: historyData.rows is not a standard array. Converting using Array.from()."
      );
      try {
        const convertedArray = Array.from(historyData.rows);
        console.log(
          `DataTable: Conversion successful. New array length: ${convertedArray.length}`
        );
        return convertedArray;
      } catch (e) {
        console.error(
          "DataTable: Failed to convert historyData.rows to array:",
          e
        );
        return [];
      }
    }
  }, [historyData]); // historyData가 변경될 때만 재계산

  // 2. columns 계산 (변환된 rowsArray와 selectedTab 기반)
  const columns = useMemo(() => {
    console.log("DataTable: Calculating columns (with useMemo)"); // 이제 useMemo 사용
    if (!rowsArray || rowsArray.length === 0) {
      console.log(
        "DataTable: rowsArray is invalid or empty for columns calculation."
      );
      return [];
    }
    const firstItem = rowsArray[0];
    if (!firstItem || typeof firstItem !== "object") {
      console.log(
        "DataTable: First row is invalid for columns calculation.",
        firstItem
      );
      return [];
    }
    console.log(
      "DataTable: Calculating columns based on selectedTab:",
      selectedTab,
      "and firstItem keys:",
      Object.keys(firstItem)
    );
    const allKeys = Object.keys(firstItem);
    const filteredKeys = allKeys.filter((key) => {
      if (key === "timestamp" || typeof firstItem[key] === "object")
        return false;
      if (selectedTab === "Total") {
        const isPcsKey = /^PCS\d/.test(key);
        const shouldInclude =
          key.includes("Total") ||
          key.includes("Filtered_Grid_Freq") ||
          key.includes("_Grid_Freq");
        return !isPcsKey && shouldInclude;
      } else {
        return key.startsWith(selectedTab);
      }
    });
    console.log("DataTable: Filtered keys for columns:", filteredKeys);
    return filteredKeys.map((key) => ({ id: key, label: key }));
  }, [rowsArray, selectedTab]); // rowsArray 또는 selectedTab이 변경될 때만 재계산

  // 3. filteredData 계산 (계산된 columns와 rowsArray 포함)
  const filteredData = useMemo(() => {
    console.log("DataTable: Calculating filteredData (with useMemo)"); // 이제 useMemo 사용
    console.log(
      "DataTable: Preparing filteredData. Input rows:",
      rowsArray.length,
      "Calculated columns count:",
      columns.length
    );
    // itemData는 columns와 rows를 모두 포함해야 함
    return { columns: columns, rows: rowsArray };
  }, [rowsArray, columns]); // rowsArray 또는 columns가 변경될 때만 재계산

  // --- /useMemo 복원 ---

  // RowWrapper 함수 (이전과 동일 - 모든 컬럼 동적 렌더링)
  const RowWrapper = ({ index, style, data }) => {
    // 데이터 유효성 체크 (columns 포함 확인)
    if (!data || !data.rows || !data.columns || !Array.isArray(data.columns)) {
      console.error(
        `RowWrapper ${index}: Invalid data structure! Missing rows or columns array.`
      );
      return <div style={style}>Error: Invalid data for row {index}</div>;
    }

    const rowData = data.rows[index];
    const currentColumns = data.columns; // columns 배열 접근

    // rowData 체크
    if (!rowData) {
      console.warn(`RowWrapper ${index}: rowData is missing.`);
      return <div style={style}>Loading...</div>;
    }

    // 1. Timestamp 값 처리 (이전과 동일)
    let displayTimestamp = "N/A";
    try {
      if (rowData.timestamp) {
        const date = new Date(rowData.timestamp);
        displayTimestamp = !isNaN(date.getTime())
          ? date.toLocaleString()
          : "Invalid Date";
      }
    } catch (e) {
      console.error(`Error formatting timestamp for row ${index}:`, e);
      displayTimestamp = "Timestamp Error";
    }

    // JSX 반환 (Timestamp와 모든 데이터 컬럼 동적 렌더링)
    return (
      <div
        style={{
          ...style,
          display: "flex",
          alignItems: "center",
          borderBottom: "1px solid #eee",
          background: index % 2 ? "#f9f9f9" : "#fff",
          paddingLeft: "10px",
          fontSize: "12px",
        }}
      >
        {/* Timestamp 컬럼 */}
        <div
          style={{
            width: "150px",
            flexShrink: 0,
            borderRight: "1px solid #eee",
            padding: "0 5px",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {displayTimestamp}
        </div>

        {/* --- 모든 데이터 컬럼 동적 렌더링 (map 사용 복원) --- */}
        {/* React Fragment 사용은 유지 */}
        <>
          {currentColumns.map((col) => {
            // 각 컬럼 ID에 해당하는 셀 값 가져오기
            const cellValue = rowData[col.id];
            // 셀 값 표시 (null/undefined는 '-'로 표시, 나머지는 문자열로)
            const displayValue =
              cellValue === null || cellValue === undefined
                ? "-"
                : String(cellValue);
            return (
              // 각 셀을 나타내는 div
              <div
                key={col.id} // 고유 key prop 필수
                title={displayValue} // 마우스 오버 시 전체 값 표시
                style={{
                  minWidth: "100px", // 최소 너비
                  flex: 1, // 남은 공간 차지하도록
                  borderRight: "1px solid #eee", // 우측 구분선
                  padding: "0 5px", // 좌우 패딩
                  textAlign: "right", // 우측 정렬
                  overflow: "hidden", // 내용 넘칠 경우 숨김
                  textOverflow: "ellipsis", // ... 처리
                  whiteSpace: "nowrap", // 줄바꿈 방지
                }}
              >
                {displayValue} {/* 실제 값 표시 */}
              </div>
            );
          })}
        </>
        {/* --------------------------------------------------- */}
      </div>
    );
  };

  // renderHeader 함수 (계산된 columns 사용)
  const renderHeader = () => {
    console.log("Rendering header with columns count:", columns.length);
    if (!columns || columns.length === 0) {
      return (
        <div
          style={{
            height: "40px",
            display: "flex",
            alignItems: "center",
            fontWeight: "bold",
            borderBottom: "1px solid #ccc",
            background: "#f0f0f0",
            paddingLeft: "10px",
          }}
        >
          컬럼 정의 없음
        </div>
      );
    }
    return (
      <div
        style={{
          height: "40px",
          display: "flex",
          alignItems: "center",
          fontWeight: "bold",
          borderBottom: "1px solid #ccc",
          background: "#f0f0f0",
          paddingLeft: "10px",
        }}
      >
        <div
          style={{
            width: "150px",
            flexShrink: 0,
            borderRight: "1px solid #eee",
            padding: "0 5px",
          }}
        >
          Timestamp
        </div>
        {columns.map((col) => (
          <div
            key={col.id}
            style={{
              minWidth: "100px",
              flex: 1,
              borderRight: "1px solid #eee",
              padding: "0 5px",
              textAlign: "center",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {col.label}
          </div>
        ))}
      </div>
    );
  };

  // DataTable 컴포넌트의 최종 return 문
  // console.log("Rendering DataTable. Is loading?", isLoading); // 디버깅 로그 제거 가능
  // console.log("Filtered data for rendering:", filteredData); // 디버깅 로그 제거 가능

  const itemCount = filteredData?.rows?.length ?? 0;
  const itemDataForList = filteredData;

  // console.log(`DataTable: FixedSizeList Props Check: height=600, width=100%, itemCount=${itemCount}`); // 디버깅 로그 제거 가능
  // console.log('DataTable: FixedSizeList itemData keys:', /* ... */); // 디버깅 로그 제거 가능
  // if (...) { console.warn('DataTable: itemData structure issue detected! ...'); } // 디버깅 로그 제거 가능

  return (
    <div
      className="data-table-container"
      // style={{ height: 600, width: "100%", border: "1px dashed red" }} // 테두리 제거 가능
      style={{ height: 600, width: "100%" }}
    >
      {/* 로딩 중 표시 */}
      {isLoading && <div>데이터 로딩 중...</div>}
      {/* 에러 발생 시 표시 */}
      {error && <div style={{ color: "red" }}>에러: {error}</div>}

      {/* 로딩/에러 아니고 데이터 있을 때 */}
      {!isLoading && !error && itemCount > 0 && (
        <>
          {renderHeader()} {/* 헤더 렌더링 */}
          <FixedSizeList
            height={560}
            itemCount={itemCount}
            itemSize={35}
            itemData={itemDataForList}
            width="100%"
            // style={{ border: '1px solid blue' }} // 테두리 제거 가능
          >
            {RowWrapper}
          </FixedSizeList>
        </>
      )}

      {/* 로딩/에러 아니고 데이터 없을 때 메시지 표시 */}
      {!isLoading && !error && itemCount === 0 && (
        <div>
          표시할 데이터가 없습니다. 기간을 다시 설정하거나 필터를 확인하세요.
        </div>
      )}
    </div>
  );
};

// --- 데이터 샘플링 함수 ---
const sampleData = (data, maxPoints) => {
  if (!Array.isArray(data) || data.length <= maxPoints) {
    return data; // 데이터가 없거나 이미 충분히 적으면 그대로 반환
  }
  console.log(
    `Sampling data from ${data.length} to approximately ${maxPoints} points.`
  );
  const step = Math.max(1, Math.floor(data.length / maxPoints));
  const sampled = [];
  for (let i = 0; i < data.length; i += step) {
    sampled.push(data[i]);
  }
  console.log(`Sampling finished. Sampled points: ${sampled.length}`);
  return sampled;
};
// ------------------------

export default function OpcuaHistoricalPage() {
  const [exportLoading, setExportLoading] = useState(false);
  const [exportError, setExportError] = useState(null);
  // opcuaData: 원본 데이터 저장용 (CSV 내보내기 등)
  const [opcuaData, setOpcuaData] = useState({
    Total: { history: [] },
    PCS1: { history: [] },
    PCS2: { history: [] },
    PCS3: { history: [] },
    PCS4: { history: [] },
  });
  // displayData: 화면 표시용 데이터 (초기엔 샘플링, 확대 시 상세)
  const [displayData, setDisplayData] = useState({ history: [] });
  const [selectedTab, setSelectedTab] = useState("Total");
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 1 * 60 * 60 * 1000)
  ); // 기본 1시간
  const [endDate, setEndDate] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showTable, setShowTable] = useState(false); // 차트 먼저 보이도록 false 유지
  const [isZoomed, setIsZoomed] = useState(false); // 현재 확대 상태인지 여부

  // --- 웹소켓 관련 상태 및 Ref ---
  const [isConnected, setIsConnected] = useState(false); // 웹소켓 연결 상태
  const ws = useRef(null); // 웹소켓 인스턴스 저장

  // --- 웹소켓 연결 설정 ---
  useEffect(() => {
    // 1. 웹소켓 접속 URL 문자열 생성
    //    NEXT_PUBLIC_WS_URL 환경 변수가 있으면 사용하고, 없으면 현재 호스트 기반으로 생성

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || window.location.origin;
    const wsUrl = apiUrl.replace(/^http/, "ws");
    const wsUrlString = `${wsUrl}/api/opcua/historical/ws`;
    // // const wsUrlString =
    // //   process.env.NEXT_PUBLIC_WS_URL ||
    //   `${window.location.origin.replace(
    //     /^http/,
    //     "ws"
    //   )}/api/opcua/historical/ws`;

    console.log("Attempting to connect WebSocket:", wsUrlString); // 생성된 URL 문자열 확인

    try {
      // 2. 생성된 URL 문자열로 WebSocket 객체 생성 및 ref에 할당
      ws.current = new WebSocket(wsUrlString);

      // 3. 이벤트 핸들러 등록
      ws.current.onopen = () => {
        console.log("WebSocket Connected");
        setIsConnected(true);
        setError(null); // 연결 성공 시 에러 초기화
      };

      ws.current.onclose = (event) => {
        console.log("WebSocket Disconnected:", event.reason, event.code);
        setIsConnected(false);
        // 연결 끊김 시 적절한 에러 메시지 설정 (기존 로직 유지 또는 개선)
        if (event.wasClean) {
          console.log("WebSocket connection closed cleanly.");
        } else {
          // 예: 서버 프로세스 종료, 네트워크 오류 등
          setError(
            `웹소켓 연결이 끊어졌습니다 (코드: ${event.code}). 페이지를 새로고침하거나 다시 시도해주세요.`
          );
        }
      };

      ws.current.onerror = (err) => {
        // onerror 이벤트 자체는 상세 정보를 제공하지 않는 경우가 많음
        // 실제 오류는 onclose 이벤트의 코드를 통해 파악하는 것이 더 유용할 수 있음
        console.error("WebSocket Error Object:", err);
        setIsConnected(false);
        // 에러 메시지를 좀 더 구체적으로 설정하거나, onclose 메시지에 의존
        setError("웹소켓 연결 중 오류가 발생했습니다. 콘솔을 확인하세요.");
      };

      ws.current.onmessage = (event) => {
        setLoading(false); // 메시지 수신 시 로딩 종료
        try {
          const message = JSON.parse(event.data);
          console.log("WebSocket Message Received:", message);

          // 서버가 보낸 메시지 구조에 따라 데이터 처리 (기존 로직 유지)
          if (message.type === "historicalData") {
            processHistoricalData(message.payload);
          } else if (message.type === "error") {
            console.error("WebSocket server error:", message.payload);
            setError(
              message.payload.message || "서버에서 오류가 발생했습니다."
            );
          }
          // TODO: 필요한 경우 다른 메시지 타입 처리
        } catch (e) {
          console.error("Error processing WebSocket message:", e);
          setError("수신된 데이터 처리 중 오류 발생");
        }
      };
    } catch (error) {
      console.error("Failed to create WebSocket:", error);
      setError("WebSocket 생성 실패. URL을 확인하세요: " + wsUrlString);
      setIsConnected(false);
    }

    // 컴포넌트 언마운트 시 웹소켓 연결 해제
    return () => {
      if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        console.log("Closing WebSocket connection...");
        ws.current.close();
      } else if (ws.current && ws.current.readyState === WebSocket.CONNECTING) {
        console.log("Closing WebSocket connection attempt...");
        // 연결 시도 중일 때도 close() 호출 가능 (연결 시도 중단)
        ws.current.close();
      }
    };
  }, []); // 마운트 시 한 번만 실행

  // --- 데이터 처리 함수: 웹소켓으로 받은 전체 데이터 처리 ---
  // (이전 샘플링 방식의 processHistoricalData와 유사하게, isDetailed 구분 제거)
  const processHistoricalData = (data) => {
    try {
      const rawHistoryData = data.timeSeriesData || [];
      console.log(`✅ WebSocket 수신 데이터 수:`, rawHistoryData.length);

      if (rawHistoryData.length > 0) {
        const safeHistory = sanitizeHistoryData(rawHistoryData); // 필터링
        console.log("🧼 필터링 후 첫 데이터:", safeHistory[0]);

        // opcuaData 업데이트 (전체 원본 저장)
        setOpcuaData((prevData) => {
          const newState = { ...prevData };
          newState[selectedTab] = {
            history: safeHistory,
            data: safeHistory[safeHistory.length - 1] || {},
          };
          console.log(
            `💾 원본 데이터 ${safeHistory.length}건 opcuaData에 저장 (${selectedTab} 탭)`
          );
          return newState;
        });

        // displayData 업데이트 (현재는 전체 데이터 그대로 사용)
        // TODO: 필요 시 여기서도 샘플링을 적용할 수 있으나, 근본 해결책은 아님
        setDisplayData({ history: safeHistory });
        console.log(`📊 표시 데이터 ${safeHistory.length}건 설정`);
      } else {
        console.warn("⛔ 수신된 데이터가 없음");
        setOpcuaData((prevData) => ({
          ...prevData,
          [selectedTab]: { history: [] },
        }));
        setDisplayData({ history: [] });
      }
    } catch (e) {
      console.error("❌ 데이터 처리 중 오류:", e);
      setError("데이터 형식 처리 오류");
    }
  };

  // --- "조회" 버튼 클릭 핸들러: 웹소켓으로 요청 전송 ---
  const handleSearchClick = () => {
    if (!ws.current || ws.current.readyState !== WebSocket.OPEN) {
      setError("웹소켓이 연결되지 않았습니다. 잠시 후 다시 시도해주세요.");
      return;
    }

    console.log("Sending historical data request via WebSocket...");
    setLoading(true); // 로딩 시작
    setError(null);
    // 기존 데이터 초기화 (새 조회 시작)
    setOpcuaData((prev) => ({ ...prev, [selectedTab]: { history: [] } }));
    setDisplayData({ history: [] });

    const startTimeISO = startDate.toISOString();
    const endTimeISO = endDate.toISOString();

    const requestPayload = {
      type: "getHistoricalData", // 서버와 약속된 요청 타입
      payload: {
        startTime: startTimeISO,
        endTime: endTimeISO,
        deviceGroup: selectedTab,
      },
    };

    try {
      ws.current.send(JSON.stringify(requestPayload));
    } catch (err) {
      console.error("WebSocket send error:", err);
      setError("데이터 요청 전송 실패");
      setLoading(false);
    }
  };

  // --- CSV 내보내기 핸들러 ---
  // 이 부분은 별도의 HTTP GET 엔드포인트(/api/opcua/historical/export)를 호출하는 이전 방식 유지 권장
  const handleExportData = async () => {
    setExportLoading(true);
    setExportError(null);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || window.location.origin;
      const startTimeISO = startDate.toISOString();
      const endTimeISO = endDate.toISOString();
      const exportUrl = `${apiUrl}/api/opcua/historical/export?startTime=${encodeURIComponent(
        startTimeISO
      )}&endTime=${encodeURIComponent(
        endTimeISO
      )}&deviceGroup=${encodeURIComponent(selectedTab)}`;
      console.log("CSV 내보내기 요청 URL (HTTP):", exportUrl);
      window.location.href = exportUrl; // 간단한 다운로드 트리거
      setTimeout(() => setExportLoading(false), 2000); // 임시 로딩 해제
    } catch (err) {
      console.error("CSV 내보내기 오류:", err);
      setExportError("CSV 데이터 내보내는 중 오류 발생");
      setExportLoading(false);
    }
  };

  // --- 탭 변경 시 로직 ---
  useEffect(() => {
    // 탭 변경 시 해당 탭의 데이터를 보여주도록 displayData 업데이트
    console.log(
      `Tab changed to: ${selectedTab}. Updating display data from opcuaData.`
    );
    setDisplayData({ history: opcuaData[selectedTab]?.history || [] });
    // 탭 변경 시 자동으로 데이터를 다시 로드하지 않음 (조회 버튼 눌러야 함)
  }, [selectedTab, opcuaData]); // opcuaData도 의존성에 포함 (탭 데이터 반영 위해)

  // --- sanitizeHistoryData, updateDateRange, 핸들러 등 나머지 함수는 거의 동일 ---
  const sanitizeHistoryData = (data) => {
    const newData = data.map((item) => {
      const newItem = Object.fromEntries(
        Object.entries(item).filter(
          ([k, v]) => typeof v !== "object" || k === "timestamp"
        )
      );
      return newItem;
    });
    return newData;
  };

  const updateDateRange = (changedDate, changeSource) => {
    const maxDuration = 3 * 60 * 60 * 1000; // 3시간
    const now = new Date();
    let potentialStart, potentialEnd;

    if (changeSource === "start") {
      potentialStart = changedDate > now ? now : changedDate;
      potentialEnd = endDate;
    } else {
      potentialEnd = changedDate > now ? now : changedDate;
      potentialStart = startDate;
    }

    // 종료가 시작보다 빠를 수 없도록 처리
    if (potentialStart > potentialEnd) {
      if (changeSource === "start") {
        potentialEnd = potentialStart;
      } else {
        potentialStart = potentialEnd;
      }
    }

    // 💡 최대 3시간 초과 제한
    let duration = potentialEnd.getTime() - potentialStart.getTime();
    if (duration > maxDuration) {
      if (changeSource === "start") {
        potentialEnd = new Date(potentialStart.getTime() + maxDuration);
      } else {
        potentialStart = new Date(potentialEnd.getTime() - maxDuration);
      }
    }

    // 현재 시간 넘어가지 않도록 제한
    if (potentialEnd > now) {
      potentialEnd = now;
      if (potentialEnd.getTime() - potentialStart.getTime() > maxDuration) {
        potentialStart = new Date(potentialEnd.getTime() - maxDuration);
      }
    }

    setStartDate(potentialStart);
    setEndDate(potentialEnd);

    console.log("최종 설정된 시간:", {
      start: potentialStart.toISOString(),
      end: potentialEnd.toISOString(),
    });
  };

  const handleStartDateChange = (date) => {
    if (date) {
      updateDateRange(date, "start");
    }
  };

  const handleEndDateChange = (date) => {
    if (date) {
      updateDateRange(date, "end");
    }
  };

  // --- handleRelayout (확대/축소) ---
  // 웹소켓 방식에서도 확대 시 데이터 요청 로직 구현 가능 (메시지 전송)
  // 하지만 현재는 전체 데이터를 받는 방식이므로, 확대 시 추가 요청 불필요
  // 필요하다면 스트리밍/청크 방식 도입 시 수정
  const handleRelayout = useCallback((eventData) => {
    console.log("Relayout event (WebSocket):", eventData);
    // 현재 방식에서는 확대/축소 시 추가 데이터 요청 로직 불필요
    // 만약 스트리밍/청크 방식이라면 여기서 서버에 추가 데이터 요청 메시지 전송
  }, []);

  return (
    <div className="opcua-container">
      {/* Header 부분 (기존과 동일) */}
      <div className="header">
        <h1>LPMS Historian</h1>
        <div className="date-picker-container">
          {/* DatePickers, 조회 버튼, CSVLink, 내보내기 버튼 */}
          <DatePicker
            selected={startDate}
            onChange={handleStartDateChange}
            showTimeSelect
            timeIntervals={1}
            dateFormat="yyyy-MM-dd HH:mm"
            className="date-picker"
            maxDate={new Date()}
          />
          <span className="date-separator">~</span>
          <DatePicker
            selected={endDate}
            onChange={handleEndDateChange}
            showTimeSelect
            timeIntervals={1}
            dateFormat="yyyy-MM-dd HH:mm"
            className="date-picker"
            maxDate={new Date()}
            minDate={startDate}
          />
          <button
            onClick={handleSearchClick} // 웹소켓 요청 핸들러
            className="search-button"
            disabled={!isConnected || loading} // 연결 안 됐거나 로딩 중이면 비활성화
          >
            {/* 연결 상태 표시 추가 */}
            {!isConnected ? "연결 중..." : loading ? "조회 중..." : "조회"}
          </button>
          {/* <div style={{ display: "none" }}>
            <CSVLink
              id="csvDownloadLink"
              data={opcuaData[selectedTab].history}
              filename={`historical_data_${selectedTab}_${
                startDate.toISOString().split("T")[0]
              }.csv`}
              separator=","
            />
          </div> */}
          <button
            onClick={handleExportData}
            className="export-button"
            disabled={exportLoading || loading}
            style={{ marginLeft: "10px" }}
          >
            {exportLoading ? "내보내는 중..." : "데이터 내보내기 (CSV)"}
          </button>
          {exportError && (
            <div style={{ color: "red", fontSize: "12px", marginLeft: "10px" }}>
              {exportError}
            </div>
          )}
        </div>
      </div>

      {/* Connection/Error Message */}
      {error && (
        <div
          className="error-message"
          style={{ color: "red", marginTop: "10px", textAlign: "center" }}
        >
          {error}
        </div>
      )}
      {!isConnected && !error && (
        <div
          style={{ color: "orange", marginTop: "10px", textAlign: "center" }}
        >
          웹소켓 서버에 연결 중입니다...
        </div>
      )}

      {/* 데이터 표시 영역 (테이블/차트 전환 로직 복구) */}
      <div className="data-display-section" style={{ marginTop: "20px" }}>
        {/* 탭 버튼 및 테이블/차트 토글 버튼 */}
        <div
          className="chart-tabs"
          style={{ borderBottom: "1px solid #e0e0e0", marginBottom: "15px" }}
        >
          {/* 탭 버튼들 */}
          {["Total", "PCS1", "PCS2", "PCS3", "PCS4"].map((tab) => (
            <button
              key={tab}
              className={`tab-button ${selectedTab === tab ? "active" : ""}`}
              onClick={() => setSelectedTab(tab)}
              style={{
                /* 기존 탭 버튼 스타일 */
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
                top: "1px",
                outline: "none",
                marginRight: "5px",
              }}
            >
              {tab === "Total" ? "Total Trends" : tab}
            </button>
          ))}
          {/* 테이블/차트 토글 버튼 */}
          <div
            className="view-toggle-buttons"
            style={{
              display: "inline-block",
              marginLeft: "auto",
              float: "right",
              position: "relative",
              top: "8px",
            }}
          >
            <button
              onClick={() => setShowTable(true)}
              className={`toggle-button ${showTable ? "active" : ""}`}
              style={{
                padding: "6px 12px",
                cursor: "pointer",
                border: "1px solid #ccc",
                borderRadius: "4px 0 0 4px",
                background: showTable ? "#e6f7ff" : "#f0f0f0",
                color: showTable ? "#1890ff" : "black",
                borderRight: "none",
                fontSize: "12px",
              }}
            >
              테이블
            </button>
            <button
              onClick={() => setShowTable(false)}
              className={`toggle-button ${!showTable ? "active" : ""}`}
              style={{
                padding: "6px 12px",
                cursor: "pointer",
                border: "1px solid #ccc",
                borderRadius: "0 4px 4px 0",
                background: !showTable ? "#e6f7ff" : "#f0f0f0",
                color: !showTable ? "#1890ff" : "black",
                fontSize: "12px",
              }}
            >
              차트
            </button>
          </div>
        </div>

        {/* 로딩 또는 데이터 없음 표시 */}
        {loading ? (
          <div
            className="loading-spinner-container"
            style={{
              height: "400px",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <div className="loading-spinner"></div>
          </div>
        ) : displayData?.history.length === 0 ? (
          <div
            className="no-data-message"
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              height: "400px",
              fontSize: "16px",
              color: "#666",
            }}
          >
            데이터가 없습니다. 기간 설정 후 '조회' 버튼을 누르세요.
          </div>
        ) : (
          <>
            {/* 테이블 또는 차트 표시 */}
            {showTable ? (
              <DataTable
                historyData={{ rows: displayData.history }}
                isLoading={loading}
                error={error}
                selectedTab={selectedTab}
              />
            ) : (
              <div className="chart-container">
                {/* 각 탭에 맞는 차트 렌더링 */}
                {selectedTab === "Total" && (
                  <div className="chart-wrapper">
                    <Plot
                      data={getFilteredChartData(displayData.history, "Total")}
                      layout={{
                        ...commonChartLayout,
                        title: `Total Trends (8MW)`,
                        xaxis: {
                          ...commonChartLayout.xaxis,
                          range: [startDate, endDate],
                          autorange: false,
                        },
                        uirevision:
                          isConnected +
                          "total" +
                          opcuaData[selectedTab]?.history?.length,
                      }}
                      useResizeHandler={true}
                      style={{
                        width: "100%",
                        height: "100%",
                        minHeight: "400px",
                        maxWidth: "100%",
                        overflowX: "hidden",
                      }}
                      config={{
                        responsive: true,
                        displayModeBar: true,
                        displaylogo: false,
                        locale: "ko",
                        modeBarButtonsToRemove: ["lasso2d", "select2d"],
                      }}
                      onRelayout={handleRelayout}
                    />
                  </div>
                )}
                {selectedTab === "PCS1" && (
                  <div className="chart-wrapper">
                    <Plot
                      data={getFilteredChartData(displayData.history, "PCS1")}
                      layout={{
                        ...commonChartLayout,
                        title: "PCS1 (2MW)",
                        xaxis: {
                          ...commonChartLayout.xaxis,
                          range: [startDate, endDate],
                          autorange: false,
                        },
                        uirevision:
                          isConnected +
                          "pcs1" +
                          opcuaData[selectedTab]?.history?.length,
                      }}
                      useResizeHandler={true}
                      style={{
                        width: "100%",
                        height: "100%",
                        minHeight: "400px",
                        maxWidth: "100%",
                        overflowX: "hidden",
                      }}
                      config={{
                        responsive: true,
                        displayModeBar: true,
                        displaylogo: false,
                        locale: "ko",
                        modeBarButtonsToRemove: ["lasso2d", "select2d"],
                      }}
                      onRelayout={handleRelayout}
                    />
                  </div>
                )}
                {selectedTab === "PCS2" && (
                  <div className="chart-wrapper">
                    <Plot
                      data={getFilteredChartData(displayData.history, "PCS2")}
                      layout={{
                        ...commonChartLayout,
                        title: "PCS2",
                        xaxis: {
                          ...commonChartLayout.xaxis,
                          range: [startDate, endDate],
                          autorange: false,
                        },
                        uirevision:
                          isConnected +
                          "pcs2" +
                          opcuaData[selectedTab]?.history?.length,
                      }}
                      useResizeHandler={true}
                      style={{
                        width: "100%",
                        height: "100%",
                        minHeight: "400px",
                        maxWidth: "100%",
                        overflowX: "hidden",
                      }}
                      config={{
                        responsive: true,
                        displayModeBar: true,
                        displaylogo: false,
                        locale: "ko",
                        modeBarButtonsToRemove: ["lasso2d", "select2d"],
                      }}
                      onRelayout={handleRelayout}
                    />
                  </div>
                )}
                {selectedTab === "PCS3" && (
                  <div className="chart-wrapper">
                    <Plot
                      data={getFilteredChartData(displayData.history, "PCS3")}
                      layout={{
                        ...commonChartLayout,
                        title: "PCS3",
                        xaxis: {
                          ...commonChartLayout.xaxis,
                          range: [startDate, endDate],
                          autorange: false,
                        },
                        uirevision:
                          isConnected +
                          "pcs3" +
                          opcuaData[selectedTab]?.history?.length,
                      }}
                      useResizeHandler={true}
                      style={{
                        width: "100%",
                        height: "100%",
                        minHeight: "400px",
                        maxWidth: "100%",
                        overflowX: "hidden",
                      }}
                      config={{
                        responsive: true,
                        displayModeBar: true,
                        displaylogo: false,
                        locale: "ko",
                        modeBarButtonsToRemove: ["lasso2d", "select2d"],
                      }}
                      onRelayout={handleRelayout}
                    />
                  </div>
                )}
                {selectedTab === "PCS4" && (
                  <div className="chart-wrapper">
                    <Plot
                      data={getFilteredChartData(displayData.history, "PCS4")}
                      layout={{
                        ...commonChartLayout,
                        title: "PCS4",
                        xaxis: {
                          ...commonChartLayout.xaxis,
                          range: [startDate, endDate],
                          autorange: false,
                        },
                        uirevision:
                          isConnected +
                          "pcs4" +
                          opcuaData[selectedTab]?.history?.length,
                      }}
                      useResizeHandler={true}
                      style={{
                        width: "100%",
                        height: "100%",
                        minHeight: "400px",
                        maxWidth: "100%",
                        overflowX: "hidden",
                      }}
                      config={{
                        responsive: true,
                        displayModeBar: true,
                        displaylogo: false,
                        locale: "ko",
                        modeBarButtonsToRemove: ["lasso2d", "select2d"],
                      }}
                      onRelayout={handleRelayout}
                    />
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
