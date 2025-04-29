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
// const FixedSizeList = dynamic(
//   () => import("react-window").then((mod) => mod.FixedSizeList),
//   { ssr: false }
// );

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

// --- DataTable 컴포넌트 리팩토링 ---
const DataTable = ({
  paginatedData, // historyData 대신 paginatedData 수신
  isLoading,
  error,
  selectedTab,
  currentPage,
  itemsPerPage,
  totalItems,
  onPageChange,
}) => {
  // --- 로깅 제거 또는 수정 ---
  // console.log("--- DataTable received props ---");
  // console.log('DataTable received paginatedData length:', paginatedData?.length);
  // console.log('DataTable received currentPage:', currentPage);
  // console.log('DataTable received totalItems:', totalItems);

  const columns = useMemo(() => {
    // 컬럼 계산 로직은 첫 번째 데이터 아이템 기반으로 유지
    if (!paginatedData || paginatedData.length === 0) {
      // 데이터가 없으면 부모(OpcuaHistoricalPage)의 opcuaData에서 가져와야 할 수도 있음
      // 하지만 여기서는 일단 빈 배열 반환
      console.log("DataTable: No data available for column calculation.");
      return [];
    }
    const firstItem = paginatedData[0];
    if (!firstItem || typeof firstItem !== "object") {
      console.log("DataTable: First row is invalid for columns calculation.");
      return [];
    }

    const allKeys = Object.keys(firstItem);
    const filteredKeys = allKeys.filter((key) => {
      if (key === "timestamp" || typeof firstItem[key] === "object")
        return false;
      // selectedTab 기반 필터링 로직 유지
      if (selectedTab === "Total") {
        // return key.includes("Total") || key.includes("Filtered_Grid_Freq") || key.includes("T_Simul_P_REAL");
        const isPcsKey = /^PCS\d/.test(key); // PCS로 시작하는지 확인
        // PCS 키가 아니고, Total, Freq, REAL 관련 키 포함
        return (
          !isPcsKey &&
          (key.includes("Total") ||
            key.includes("Filtered_Grid_Freq") ||
            key.includes("_Grid_Freq") ||
            key.includes("T_Simul_P_REAL"))
        );
      } else {
        // PCS 탭이면 해당 PCS로 시작하는 키만
        return key.startsWith(selectedTab);
      }
    });
    return filteredKeys.map((key) => ({ id: key, label: key }));
  }, [paginatedData, selectedTab]); // paginatedData가 변경될 때 컬럼 재계산

  // --- react-window 관련 RowWrapper 제거 ---

  // 헤더 렌더링 함수 (columns 사용은 동일) - 스타일 개선
  const renderHeader = () => {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          fontWeight: "600", // 글씨 약간 굵게
          // borderBottom: "2px solid #dee2e6", // 하단 구분선 강화
          borderBottom: "1px solid #ccc", // 기존 스타일 유지 또는 약간 조정
          background: "#f8f9fa", // 배경색 변경 (약간 밝은 회색)
          color: "#495057", // 텍스트 색상 변경 (어두운 회색)
          padding: "0 10px", // 좌우 패딩 추가 (헤더 전체에 적용)
          height: "45px", // 높이 약간 증가
          position: "sticky",
          top: 0,
          zIndex: 1,
        }}
      >
        {/* Timestamp 헤더 */}
        <div
          style={{
            width: "150px",
            flexShrink: 0,
            padding: "0 5px", // 셀 내부 패딩
            textAlign: "center", // 중앙 정렬
            borderRight: "1px solid #e9ecef", // 구분선 색상 변경
          }}
        >
          Timestamp
        </div>
        {/* 데이터 컬럼 헤더 */}
        {columns.map((col) => (
          <div
            key={col.id}
            style={{
              minWidth: "100px",
              flex: 1,
              padding: "0 5px", // 셀 내부 패딩
              textAlign: "center", // 중앙 정렬
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              borderRight: "1px solid #e9ecef", // 구분선 색상 변경 (마지막 요소 제외 가능)
              // 마지막 요소 오른쪽 구분선 제거 (선택적)
              // ...(columns[columns.length - 1].id === col.id ? { borderRight: 'none' } : {}),
            }}
          >
            {col.label}
          </div>
        ))}
      </div>
    );
  };

  // 페이지네이션 컨트롤 렌더링 함수
  const renderPaginationControls = () => {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    if (totalPages <= 1) return null; // 페이지가 1개 이하면 컨트롤 표시 안 함

    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          padding: "10px 0",
          marginTop: "10px",
          borderTop: "1px solid #eee",
        }}
      >
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          style={{
            marginRight: "10px",
            padding: "5px 10px",
            cursor: "pointer",
          }}
        >
          이전
        </button>
        <span>
          페이지 {currentPage} / {totalPages} (총 {totalItems}개)
        </span>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          style={{ marginLeft: "10px", padding: "5px 10px", cursor: "pointer" }}
        >
          다음
        </button>
      </div>
    );
  };

  // DataTable 컴포넌트 최종 return 문
  return (
    <div
      className="data-table-container"
      style={{ width: "100%" }} // height 제거 (내용에 따라 조절)
    >
      {/* 로딩 중 표시 */}
      {isLoading && <div>데이터 로딩 중...</div>}
      {/* 에러 발생 시 표시 */}
      {error && <div style={{ color: "red" }}>에러: {error}</div>}

      {/* 로딩/에러 아니고 데이터 있을 때 */}
      {!isLoading && !error && paginatedData && paginatedData.length > 0 && (
        <div style={{ maxHeight: "560px", overflowY: "auto" }}>
          {" "}
          {/* 스크롤 컨테이너 추가 */}
          {renderHeader()} {/* 헤더 렌더링 */}
          {/* --- react-window 대신 .map() 사용 --- */}
          {paginatedData.map((rowData, index) => {
            let displayTimestamp = "N/A";
            try {
              if (rowData.timestamp) {
                const date = new Date(rowData.timestamp);
                displayTimestamp = !isNaN(date.getTime())
                  ? date.toLocaleString() // 날짜 형식 유지
                  : "Invalid Date";
              }
            } catch (e) {
              displayTimestamp = "Timestamp Error";
            }

            return (
              <div
                key={`row-${index}-${rowData.timestamp}`} // 고유 키 개선
                style={{
                  display: "flex",
                  alignItems: "center",
                  borderBottom: "1px solid #eee",
                  background: index % 2 ? "#f9f9f9" : "#fff",
                  paddingLeft: "10px",
                  fontSize: "12px",
                  minHeight: "35px", // 최소 높이 유지
                }}
              >
                {/* Timestamp 컬럼 */}
                <div style={{ width: "150px", flexShrink: 0 /* ... */ }}>
                  {displayTimestamp}
                </div>
                {/* 데이터 컬럼 동적 렌더링 (columns 사용) */}
                {columns.map((col) => {
                  const cellValue = rowData[col.id];
                  const displayValue =
                    cellValue === null || cellValue === undefined
                      ? "-"
                      : String(cellValue);
                  return (
                    <div
                      key={col.id}
                      title={displayValue}
                      style={{
                        minWidth: "100px",
                        flex: 1,
                        textAlign: "right" /* ... */,
                      }}
                    >
                      {displayValue}
                    </div>
                  );
                })}
              </div>
            );
          })}
          {/* --- .map() 끝 --- */}
        </div>
      )}
      {/* 페이지네이션 컨트롤 추가 (데이터 있을 때만) */}
      {!isLoading && !error && totalItems > 0 && renderPaginationControls()}

      {/* 로딩/에러 아니고 데이터 없을 때 메시지 표시 */}
      {!isLoading &&
        !error &&
        totalItems === 0 && ( // totalItems 기준으로 변경
          <div>
            표시할 데이터가 없습니다. 기간을 다시 설정하거나 필터를 확인하세요.
          </div>
        )}
    </div>
  );
};
// --- DataTable 컴포넌트 리팩토링 끝 ---

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
  const [showTable, setShowTable] = useState(true); // 테이블 먼저 보이도록 true로 변경
  const accumulatedChunks = useRef([]);
  const isReceivingChunks = useRef(false);
  const [isConnected, setIsConnected] = useState(false);
  const ws = useRef(null);
  const workerRef = useRef(null);

  // --- 페이지네이션 상태 추가 ---
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(100); // 페이지당 항목 수 (조절 가능)
  // ---------------------------

  // --- 웹소켓 및 워커 설정 useEffect ---
  useEffect(() => {
    // 워커 생성
    workerRef.current = new Worker("/historicalWorker.js"); // public 경로 기준
    console.log("Web Worker created.");

    // 워커로부터 메시지 수신 처리
    workerRef.current.onmessage = (event) => {
      const { type, payload } = event.data;
      if (type === "processedData") {
        console.log(
          `Main: Received processed data (${payload.length} items) from worker.`
        );
        // --- 워커로부터 받은 데이터로 opcuaData 상태 업데이트 ---
        setOpcuaData((prevData) => {
          const newState = { ...prevData };
          const tabs = ["Total", "PCS1", "PCS2", "PCS3", "PCS4"];
          tabs.forEach((tab) => {
            // 모든 탭에 동일한 처리된 데이터 저장
            newState[tab] = { history: payload };
          });
          console.log(
            `💾 Stored ${payload.length} data points from worker for ALL tabs in opcuaData.`
          );
          return newState;
        });
        // --- 데이터 로드 완료 시 현재 페이지 1로 초기화 ---
        setCurrentPage(1);
        setLoading(false); // 워커 처리 완료 후 로딩 종료
        // ------------------------------------------
      } else if (type === "error") {
        console.error("Main: Received error from worker:", payload);
        setError(`Worker error: ${payload}`);
        setLoading(false); // 워커 에러 시 로딩 종료
        // 워커 에러 시에도 페이지 초기화 및 데이터 초기화
        setOpcuaData((prev) => {
          const newState = { ...prev };
          const tabs = ["Total", "PCS1", "PCS2", "PCS3", "PCS4"];
          tabs.forEach((tab) => {
            newState[tab] = { history: [] };
          });
          return newState;
        });
        setDisplayData({ history: [] });
        setCurrentPage(1);
      }
    };

    // 워커 에러 처리 (선택적)
    workerRef.current.onerror = (errorEvent) => {
      console.error("Main: Uncaught worker error Event:", errorEvent); // 전체 이벤트 객체 로깅

      // --- 개별 속성 로깅 추가 ---
      console.log("--> errorEvent.message:", errorEvent.message);
      console.log("--> errorEvent.filename:", errorEvent.filename);
      console.log("--> errorEvent.lineno:", errorEvent.lineno);
      console.log("--> errorEvent.colno:", errorEvent.colno);
      // errorEvent.error 속성도 확인 (에러 원본 객체를 포함하는 경우가 있음)
      console.log("--> errorEvent.error:", errorEvent.error);
      // --------------------------

      // ErrorEvent 객체에서 message, filename, lineno 추출 시도
      const errorMessage = errorEvent.message || "Unknown worker error";
      const errorLocation = errorEvent.filename
        ? ` at ${errorEvent.filename}:${errorEvent.lineno}`
        : "";
      const fullErrorMessage = `Uncaught worker error: ${errorMessage}${errorLocation}`;

      console.error("Main: Extracted worker error message:", fullErrorMessage);

      setError(fullErrorMessage);
      setLoading(false);
      // 상태 초기화 등 추가 에러 처리
      setOpcuaData((prev) => {
        const newState = { ...prev };
        const tabs = ["Total", "PCS1", "PCS2", "PCS3", "PCS4"];
        tabs.forEach((tab) => {
          newState[tab] = { history: [] };
        });
        return newState;
      });
      setDisplayData({ history: [] });
      setCurrentPage(1);
    };

    // 웹소켓 연결 설정 (기존 로직 유지, onmessage 부분 수정)
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || window.location.origin;
    const wsUrl = apiUrl.replace(/^http/, "ws");
    const wsUrlString = `${wsUrl}/api/opcua/historical/ws`;
    console.log("Attempting to connect WebSocket:", wsUrlString);

    try {
      ws.current = new WebSocket(wsUrlString);

      ws.current.onopen = () => {
        console.log("WebSocket Connected");
        setIsConnected(true);
        setError(null);
      };

      ws.current.onclose = (event) => {
        console.log("WebSocket Disconnected:", event.reason, event.code);
        setIsConnected(false);
        // 웹소켓 닫힐 때 워커도 종료 (선택적, 재연결 시 새로 생성 필요)
        // if (workerRef.current) {
        //   console.log("Terminating worker due to WebSocket close.");
        //   workerRef.current.terminate();
        //   workerRef.current = null;
        // }
      };

      ws.current.onerror = (err) => {
        console.error("WebSocket Error Object:", err);
        setIsConnected(false);
        // 에러 시 워커 종료 (선택적)
        // if (workerRef.current) {
        //   console.log("Terminating worker due to WebSocket error.");
        //   workerRef.current.terminate();
        //   workerRef.current = null;
        // }
      };

      // --- 웹소켓 onmessage 핸들러 수정 ---
      ws.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);

          if (message.type === "historicalDataChunk") {
            // 청크 데이터를 워커로 전송
            if (workerRef.current) {
              workerRef.current.postMessage({
                type: "chunk",
                payload: message.payload,
              });
            }
          } else if (message.type === "historicalDataEnd") {
            console.log(
              "Main: All data chunks received via WebSocket. Signaling worker to process."
            );
            // 워커에게 데이터 처리 시작 신호 전송
            if (workerRef.current) {
              workerRef.current.postMessage({ type: "end" });
            }
            // 로딩 상태는 유지하고, 워커가 결과를 보내면 해제됨
          } else if (message.type === "historicalDataResponse") {
            // 단일 응답 처리 (웹 워커 사용 안 함 - 필요 시 로직 추가)
            console.warn(
              "Received single 'historicalDataResponse'. Processing in main thread (Worker not used for this)."
            );
            // processHistoricalData(message.payload); // 이 함수는 제거됨
            // 단일 응답 처리 로직 필요 시 여기에 추가 (sanitize 등)
            // const sanitized = sanitizeHistoryData(message.payload?.timeSeriesData || []); // sanitize 함수도 제거됨
            // setOpcuaData(...);
            setLoading(false);
          } else if (message.type === "error") {
            console.error("WebSocket server error:", message.payload);
            setError(message.payload?.message || "서버 오류 발생");
            setLoading(false); // 에러 시 로딩 종료
            // 에러 시 워커 리셋 (선택적)
            if (workerRef.current) {
              workerRef.current.postMessage({ type: "reset" });
            }
          } else {
            console.warn("Unknown message type received:", message.type);
          }
        } catch (e) {
          console.error("Error processing WebSocket message:", e);
          setError("수신된 데이터 처리 중 오류 발생");
          setLoading(false);
          // 에러 시 워커 리셋 (선택적)
          if (workerRef.current) {
            workerRef.current.postMessage({ type: "reset" });
          }
        }
      };
    } catch (error) {
      console.error("Failed to create WebSocket:", error);
      setError("WebSocket 생성 실패. URL을 확인하세요: " + wsUrlString);
      setIsConnected(false);
    }

    // 컴포넌트 언마운트 시 워커 및 웹소켓 정리
    return () => {
      console.log("Cleaning up WebSocket and Worker...");
      if (
        ws.current &&
        (ws.current.readyState === WebSocket.OPEN ||
          ws.current.readyState === WebSocket.CONNECTING)
      ) {
        ws.current.close();
        console.log("WebSocket connection closed.");
      }
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
        console.log("Web Worker terminated.");
      }
    };
  }, []); // 의존성 배열 비어있음 (마운트 시 1회 실행)

  // --- updateDateRange 함수 정의를 날짜 변경 핸들러 앞으로 이동 ---
  const updateDateRange = (changedDate, changeSource) => {
    const maxDuration = 3 * 60 * 60 * 1000; // 3시간
    const now = new Date();
    let potentialStart, potentialEnd;

    // 현재 상태 값인 startDate와 endDate를 직접 참조
    const currentStartDate = startDate;
    const currentEndDate = endDate;

    if (changeSource === "start") {
      potentialStart = changedDate > now ? now : changedDate;
      potentialEnd = currentEndDate; // 현재 endDate 사용
    } else {
      // changeSource === "end"
      potentialEnd = changedDate > now ? now : changedDate;
      potentialStart = currentStartDate; // 현재 startDate 사용
    }

    // 종료가 시작보다 빠를 수 없도록 처리
    if (potentialStart > potentialEnd) {
      if (changeSource === "start") {
        potentialEnd = potentialStart;
      } else {
        // changeSource === "end"
        potentialStart = potentialEnd;
      }
    }

    // 최대 3시간 초과 제한
    let duration = potentialEnd.getTime() - potentialStart.getTime();
    if (duration > maxDuration) {
      console.log(
        `기간 ${duration / 1000 / 60}분 초과. 최대 ${
          maxDuration / 1000 / 60
        }분으로 제한합니다.`
      );
      if (changeSource === "start") {
        // 시작 날짜를 변경했는데 기간 초과 -> 종료 날짜를 조정
        potentialEnd = new Date(potentialStart.getTime() + maxDuration);
      } else {
        // changeSource === "end"
        // 종료 날짜를 변경했는데 기간 초과 -> 시작 날짜를 조정
        potentialStart = new Date(potentialEnd.getTime() - maxDuration);
      }
    }

    // 현재 시간 넘어가지 않도록 제한 (미래 시간 선택 방지)
    if (potentialEnd > now) {
      console.log(
        "종료 시간이 현재 시간 이후입니다. 현재 시간으로 조정합니다."
      );
      potentialEnd = now;
      // 종료 시간을 현재로 조정 후에도 기간 초과될 수 있으므로 재확인
      if (potentialEnd.getTime() - potentialStart.getTime() > maxDuration) {
        console.log(
          "종료 시간 조정 후에도 기간 초과. 시작 시간을 다시 조정합니다."
        );
        potentialStart = new Date(potentialEnd.getTime() - maxDuration);
      }
      // 시작 시간도 미래로 설정되는 경우 방지 (종료시간이 시작시간보다 과거가 될 수 없으므로 자동 방지될 수 있음)
      if (potentialStart > potentialEnd) {
        potentialStart = potentialEnd;
      }
    }

    console.log("최종 설정될 시간:", {
      start: potentialStart.toISOString(),
      end: potentialEnd.toISOString(),
    });

    // 최종 계산된 값으로 상태 업데이트
    setStartDate(potentialStart);
    setEndDate(potentialEnd);
  };
  // -----------------------------------------------------

  // --- 날짜 변경 핸들러 함수 정의 ---
  const handleStartDateChange = (date) => {
    if (date) {
      // 이제 updateDateRange 함수를 찾을 수 있음
      updateDateRange(date, "start");
    }
  };

  const handleEndDateChange = (date) => {
    if (date) {
      // 이제 updateDateRange 함수를 찾을 수 있음
      updateDateRange(date, "end");
    }
  };
  // ------------------------------------------

  // --- handleRelayout (확대/축소 관련 로직 제거 또는 수정) ---
  const handleRelayout = useCallback((eventData) => {
    // 확대/축소 시 상세 데이터 로딩 로직은 제거되었으므로, 이 함수는 비워두거나 로깅만 남깁니다.
    console.log("Relayout event occurred:", eventData);
    // 예: 확대 상태 관리 로직이 있었다면 제거
    // if (eventData['xaxis.range[0]'] || eventData['xaxis.range']) {
    //   setIsZoomed(true); // 확대 상태 표시 (만약 필요하다면)
    // } else {
    //   setIsZoomed(false); // 기본 상태로 돌아감
    // }
  }, []);
  // ----------------------------------------------------

  // --- 조회 버튼 클릭 핸들러 수정 ---
  const handleSearchClick = () => {
    if (!ws.current || ws.current.readyState !== WebSocket.OPEN) {
      setError("웹소켓이 연결되지 않았습니다. 잠시 후 다시 시도해주세요.");
      return;
    }
    if (!workerRef.current) {
      setError("웹 워커가 초기화되지 않았습니다. 페이지를 새로고침 해주세요.");
      return;
    }

    console.log(
      `Sending historical data request (expecting chunked data for worker, triggered from ${selectedTab})...`
    );
    setLoading(true);
    setError(null);

    // --- 데이터 상태 초기화 및 워커 리셋 ---
    setOpcuaData((prev) => {
      const newState = { ...prev };
      const tabs = ["Total", "PCS1", "PCS2", "PCS3", "PCS4"];
      tabs.forEach((tab) => {
        newState[tab] = { history: [] };
      });
      console.log("Cleared data state for all tabs before request.");
      return newState;
    });
    setDisplayData({ history: [] });
    setCurrentPage(1); // 조회 시작 시 페이지 1로 초기화

    // 워커의 누적 데이터 리셋 요청
    workerRef.current.postMessage({ type: "reset" });
    console.log("Sent reset signal to worker.");
    // ----------------------------------------------

    const startTimeISO = startDate.toISOString();
    const endTimeISO = endDate.toISOString();
    const requestPayload = {
      type: "getHistoricalData", // 백엔드와 협의된 요청 타입
      payload: {
        startTime: startTimeISO,
        endTime: endTimeISO,
        deviceGroup: selectedTab, // 백엔드가 이 값을 사용하든 안하든 일단 전송
      },
    };

    try {
      ws.current.send(JSON.stringify(requestPayload));
    } catch (err) {
      console.error("WebSocket send error:", err);
      setError("데이터 요청 전송 실패");
      setLoading(false);
      // 에러 시 워커 리셋 (선택적)
      if (workerRef.current) {
        workerRef.current.postMessage({ type: "reset" });
      }
      setCurrentPage(1);
    }
  };

  // --- CSV 내보내기 핸들러 (변경 없음) ---
  const handleExportData = () => {
    // ... (CSV 내보내기 로직) ...
  };

  // --- 탭 변경 시 로직 (변경 없음, opcuaData 업데이트 시 자동으로 displayData 업데이트됨) ---
  useEffect(() => {
    console.log(
      `Tab changed to: ${selectedTab} or opcuaData updated. Updating display data.`
    );
    setDisplayData({ history: opcuaData[selectedTab]?.history || [] });
    setCurrentPage(1); // 탭 변경 시 페이지 1로 초기화
  }, [selectedTab, opcuaData]);

  // --- 페이지 변경 핸들러 (변경 없음) ---
  const handlePageChange = (newPage) => {
    // 유효한 페이지 번호인지 확인 (1 이상, totalPages 이하)
    const totalItems = displayData.history?.length || 0;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  // --- JSX 반환 전 데이터 슬라이싱 (변경 없음) ---
  const totalItems = displayData.history?.length || 0;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentDisplayData = useMemo(
    () => displayData.history?.slice(startIndex, endIndex) || [],
    [displayData.history, currentPage, itemsPerPage] // 의존성 배열 수정
  );

  // --- JSX 반환 부분 (변경 없음) ---
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
        ) : totalItems === 0 ? ( // totalItems 기준으로 변경
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
              // DataTable에 페이지네이션 관련 props 전달
              <DataTable
                paginatedData={currentDisplayData}
                isLoading={loading}
                error={error}
                selectedTab={selectedTab}
                currentPage={currentPage}
                itemsPerPage={itemsPerPage}
                totalItems={totalItems}
                onPageChange={handlePageChange}
              />
            ) : (
              <div className="chart-container">
                {/* 각 탭에 맞는 차트 렌더링 */}
                {["Total", "PCS1", "PCS2", "PCS3", "PCS4"].map(
                  (tab) =>
                    selectedTab === tab && (
                      <div className="chart-wrapper" key={tab}>
                        <Plot
                          data={getFilteredChartData(currentDisplayData, tab)}
                          layout={{
                            ...commonChartLayout,
                            title: `${
                              tab === "Total" ? "Total Trends" : tab
                            } (Page ${currentPage})`,
                            xaxis: {
                              ...commonChartLayout.xaxis,
                              autorange: true,
                            },
                            yaxis: {
                              ...commonChartLayout.yaxis,
                              autorange: true,
                            },
                            uirevision: selectedTab + currentPage,
                          }}
                          useResizeHandler={true}
                          style={{
                            width: "100%",
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
                        <div
                          style={{
                            textAlign: "center",
                            marginTop: "5px",
                            fontSize: "12px",
                            color: "#666",
                          }}
                        >
                          Showing data for Table Page: {currentPage} /{" "}
                          {totalPages}
                        </div>
                      </div>
                    )
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
