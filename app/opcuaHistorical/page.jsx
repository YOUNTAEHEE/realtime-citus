"use client";

import dynamic from "next/dynamic";
import { memo, useMemo, useState } from "react";
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

const CSVLink = dynamic(() => import("react-csv").then((mod) => mod.CSVLink), {
  ssr: false,
});

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
        type: "scatter",
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

export default function OpcuaHistoricalPage() {
  const [exportLoading, setExportLoading] = useState(false);
  const [exportError, setExportError] = useState(null);
  const [opcuaData, setOpcuaData] = useState({
    Total: { data: {}, history: [] },
    PCS1: { data: {}, history: [] },
    PCS2: { data: {}, history: [] },
    PCS3: { data: {}, history: [] },
    PCS4: { data: {}, history: [] },
  });
  const [selectedTab, setSelectedTab] = useState("Total");
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 3 * 60 * 60 * 1000)
  );
  const [endDate, setEndDate] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showTable, setShowTable] = useState(true);
  const [historyData, setHistoryData] = useState({ columns: [], rows: [] });

  // --- 로그 추가 ---
  console.log("--- OpcuaHistoricalPage rendering ---");
  console.log(
    "OpcuaHistoricalPage state historyData:",
    JSON.stringify(historyData)?.substring(0, 200) + "..."
  ); // 상태 값 확인
  console.log("OpcuaHistoricalPage state loading:", loading);
  console.log("OpcuaHistoricalPage state error:", error);
  console.log("OpcuaHistoricalPage state selectedTab:", selectedTab);
  // ---------------

  const handleExportData = () => {
    // 이미 가지고 있는 데이터 활용
    const data = opcuaData[selectedTab].history;

    if (!data || data.length === 0) {
      alert("내보낼 데이터가 없습니다.");
      return;
    }

    // CSV 다운로드 트리거를 위해 csvLink 요소 클릭
    document.getElementById("csvDownloadLink").click();
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

  const fetchHistoricalData = async () => {
    try {
      setLoading(true);
      setError(null);

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || window.location.origin;
      // 시간 범위 확인 로그 추가
      console.log("요청 시간 범위:", {
        시작: startDate.toISOString(),
        종료: endDate.toISOString(),
        간격_시간: (endDate - startDate) / (1000 * 60 * 60),
      });
      const startTimeISO = startDate.toISOString();
      const endTimeISO = endDate.toISOString();
      console.log("실제 전송될 ISO 시간:", {
        start: startTimeISO,
        end: endTimeISO,
      }); // 전송 직전 값 확인

      // URL 디버깅
      console.log("요청 URL:", `${apiUrl}/api/opcua/historical`);
      console.log("selectedTab:", selectedTab);
      const response = await fetch(`${apiUrl}/api/opcua/historical`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          startTime: startTimeISO, // 확인된 변수 사용
          endTime: endTimeISO, // 확인된 변수 사용
          deviceGroup: selectedTab,
        }),
      });

      // 응답 상태 디버깅
      console.log("응답 상태:", response.status);

      if (!response.ok) {
        throw new Error(`데이터 조회 실패: ${response.status}`);
      }

      const data = await response.json();
      console.log("processHistoricalData 진입 시 data:", data);

      console.log("응답 데이터 항목 수:", data.timeSeriesData?.length || 0);

      processHistoricalData(data);
    } catch (err) {
      setError(err.message);
      console.error("데이터 요청 오류:", err);
      // 오류 발생 시 현재 탭 데이터 초기화
      setOpcuaData((prev) => ({
        ...prev,
        [selectedTab]: { data: {}, history: [] },
      }));
    } finally {
      setLoading(false);
    }
  };

  // const sanitizeHistoryData = (data) =>
  //   data.map((item) =>
  //     Object.fromEntries(
  //       Object.entries(item).filter(([k, v]) => typeof v !== "object")
  //     )
  //   );

  const sanitizeHistoryData = (data) =>
    data.map((item) => {
      const newItem = Object.fromEntries(
        Object.entries(item).filter(
          ([k, v]) => typeof v !== "object" || k === "timestamp"
        )
      );
      return newItem;
    });
  const processHistoricalData = (data) => {
    try {
      const rawHistoryData = data.timeSeriesData || [];
      console.log("✅ 원본 데이터 수:", rawHistoryData.length);

      if (rawHistoryData.length > 0) {
        const safeHistory = sanitizeHistoryData(rawHistoryData);
        console.log("🧼 필터링 후 데이터:", safeHistory[0]);

        // 모든 탭의 history에 전체 safeHistory 할당 (기존 로직 유지)
        setOpcuaData((prevData) => {
          const newState = { ...prevData };
          const lastDataPoint = safeHistory[safeHistory.length - 1] || {};
          const allTabs = ["Total", "PCS1", "PCS2", "PCS3", "PCS4"];
          allTabs.forEach((tab) => {
            newState[tab] = {
              data: lastDataPoint,
              history: safeHistory,
            };
          });
          console.log(
            "🔄 상태 업데이트 완료. 모든 탭에 history 할당됨.",
            newState
          );
          return newState;
        });
      } else {
        console.warn("⛔ 수신된 데이터가 없음");
        setOpcuaData((prevData) => ({
          ...prevData,
          [selectedTab]: { data: {}, history: [] },
        }));
      }
    } catch (e) {
      console.error("❌ 데이터 처리 중 오류:", e);
      setError("데이터 형식 오류");
    }
  };

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
            onClick={fetchHistoricalData}
            className="search-button"
            disabled={loading}
          >
            {loading ? "조회 중..." : "조회"}
          </button>
          <div style={{ display: "none" }}>
            <CSVLink
              id="csvDownloadLink"
              data={opcuaData[selectedTab].history}
              filename={`historical_data_${selectedTab}_${
                startDate.toISOString().split("T")[0]
              }.csv`}
              separator=","
            />
          </div>
          <button
            onClick={handleExportData}
            className="export-button"
            disabled={
              exportLoading ||
              loading ||
              opcuaData[selectedTab]?.history.length === 0
            }
            style={{ marginLeft: "10px" }}
          >
            {exportLoading ? "내보내는 중..." : "데이터 내보내기 (CSV)"}
          </button>
        </div>
      </div>

      {/* 에러 메시지 표시 (기존과 동일) */}
      {error && (
        <div
          className="error-message"
          style={{ color: "red", marginTop: "10px", textAlign: "center" }}
        >
          {error}
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
        ) : opcuaData[selectedTab]?.history.length === 0 ? (
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
            데이터가 없습니다. 검색 조건을 확인해보세요.
          </div>
        ) : (
          <>
            {/* 테이블 또는 차트 표시 */}
            {showTable ? (
              <DataTable
                historyData={{ rows: opcuaData[selectedTab].history }}
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
                      data={getFilteredChartData(
                        opcuaData.Total.history,
                        "Total"
                      )}
                      layout={{
                        ...commonChartLayout,
                        title: `Total Trends (8MW)`,
                        xaxis: {
                          ...commonChartLayout.xaxis,
                          range: [startDate, endDate],
                          autorange: false,
                        },
                        uirevision: "total",
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
                    />
                  </div>
                )}
                {selectedTab === "PCS1" && (
                  <div className="chart-wrapper">
                    <Plot
                      data={getFilteredChartData(
                        opcuaData.PCS1.history,
                        "PCS1"
                      )}
                      layout={{
                        ...commonChartLayout,
                        title: "PCS1 (2MW)",
                        xaxis: {
                          ...commonChartLayout.xaxis,
                          range: [startDate, endDate],
                          autorange: false,
                        },
                        uirevision: "pcs1",
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
                    />
                  </div>
                )}
                {selectedTab === "PCS2" && (
                  <div className="chart-wrapper">
                    <Plot
                      data={getFilteredChartData(
                        opcuaData.PCS2.history,
                        "PCS2"
                      )}
                      layout={{
                        ...commonChartLayout,
                        title: "PCS2",
                        xaxis: {
                          ...commonChartLayout.xaxis,
                          range: [startDate, endDate],
                          autorange: false,
                        },
                        uirevision: "pcs2",
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
                    />
                  </div>
                )}
                {selectedTab === "PCS3" && (
                  <div className="chart-wrapper">
                    <Plot
                      data={getFilteredChartData(
                        opcuaData.PCS3.history,
                        "PCS3"
                      )}
                      layout={{
                        ...commonChartLayout,
                        title: "PCS3",
                        xaxis: {
                          ...commonChartLayout.xaxis,
                          range: [startDate, endDate],
                          autorange: false,
                        },
                        uirevision: "pcs3",
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
                    />
                  </div>
                )}
                {selectedTab === "PCS4" && (
                  <div className="chart-wrapper">
                    <Plot
                      data={getFilteredChartData(
                        opcuaData.PCS4.history,
                        "PCS4"
                      )}
                      layout={{
                        ...commonChartLayout,
                        title: "PCS4",
                        xaxis: {
                          ...commonChartLayout.xaxis,
                          range: [startDate, endDate],
                          autorange: false,
                        },
                        uirevision: "pcs4",
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
