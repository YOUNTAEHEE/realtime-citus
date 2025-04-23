// "use client";

// import dynamic from "next/dynamic";
// import { memo, useState } from "react";
// import DatePicker from "react-datepicker";
// import "react-datepicker/dist/react-datepicker.css";
// import "../opcua/realtimeOpcua.scss";
// import "./opcuaHistorical.scss";

// const Plot = dynamic(
//   () =>
//     import("react-plotly.js").then((mod) => {
//       return memo(mod.default);
//     }),
//   { ssr: false }
// );

// // 차트 레이아웃 설정
// const commonChartLayout = {
//   xaxis: {
//     title: "시간",
//     type: "date",
//     tickformat: "%H:%M:%S.%L<br>%Y-%m-%d",
//     autorange: true,
//     rangemode: "normal",
//     gridcolor: "#e0e0e0",
//     linecolor: "#cccccc",
//     tickfont: { size: 10, family: "Pretendard, sans-serif" },
//     titlefont: {
//       size: 13,
//       color: "#444",
//       family: "Pretendard, sans-serif",
//     },
//     showgrid: true,
//     zeroline: false,
//   },
//   yaxis: {
//     title: "전력 (MW)",
//     autorange: true,
//     gridcolor: "#e0e0e0",
//     linecolor: "#cccccc",
//     tickfont: { size: 10, family: "Pretendard, sans-serif" },
//     titlefont: {
//       size: 13,
//       color: "#444",
//       family: "Pretendard, sans-serif",
//     },
//     showgrid: true,
//     zeroline: false,
//     rangemode: "normal",
//   },
//   height: "auto",
//   margin: { t: 50, r: 40, l: 60, b: 70 },
//   paper_bgcolor: "#ffffff",
//   plot_bgcolor: "#f8f9fa",
//   font: {
//     family:
//       "Pretendard, -apple-system, BlinkMacSystemFont, system-ui, Roboto, sans-serif",
//     size: 12,
//     color: "#444",
//   },
//   title: {
//     font: {
//       size: 16,
//       color: "#2d3748",
//       family: "Pretendard, sans-serif",
//       weight: 600,
//     },
//     y: 0.98,
//   },
//   legend: {
//     orientation: "h",
//     y: -0.18,
//     x: 0.5,
//     xanchor: "center",
//     font: {
//       size: 11,
//       family: "Pretendard, sans-serif",
//     },
//     bgcolor: "#ffffff",
//     bordercolor: "#e8e8e8",
//     borderwidth: 1,
//     itemsizing: "constant",
//     itemwidth: 40,
//     itemclick: "toggle", // ✅ 클릭하면 숨기기/보이기
//     itemdoubleclick: "toggleothers", // ✅ 더블클릭하면 나머지 다 숨기고 이것만 보기
//   },
//   modebar: {
//     bgcolor: "rgba(255, 255, 255, 0.8)",
//     color: "#2d3748",
//     activecolor: "#3b82f6",
//   },
//   hovermode: "closest",
//   hoverlabel: {
//     bgcolor: "#ffffff",
//     font: { size: 12, family: "Pretendard, sans-serif", color: "#2d3748" },
//     bordercolor: "#e0e0e0",
//   },
//   dragmode: "zoom",
//   selectdirection: "h",
//   shapes: [],
//   annotations: [],
// };

// // 탭별 필드 매핑 수정 - 실제 데이터 필드명으로 수정 필요
// // const tabFieldMappings = {
// //   Total: {
// //     // 예시: 아래 필드명을 실제 데이터 필드명으로 수정해야 합니다
// //     Filtered_Grid_Freq: "Filtered_Grid_Freq",
// //     T_Simul_P_REAL: "T_Simul_P_REAL",
// //     Total_TPWR_P_REAL: "Total_TPWR_P_REAL",
// //     Total_TPWR_P_REF: "Total_TPWR_P_REF",
// //   },
// //   PCS1: {
// //     Filtered_Grid_Freq: "Filtered_Grid_Freq",
// //     PCS1_TPWR_P_REAL: "PCS1_TPWR_P_REAL",
// //     PCS1_TPWR_P_REF: "PCS1_TPWR_P_REF",
// //     PCS1_SOC: "PCS1_SOC",
// //   },
// //   PCS2: {
// //     Filtered_Grid_Freq: "Filtered_Grid_Freq",
// //     PCS2_TPWR_P_REAL: "PCS2_TPWR_P_REAL",
// //     PCS2_TPWR_P_REF: "PCS2_TPWR_P_REF",
// //     PCS2_SOC: "PCS2_SOC",
// //   },
// //   PCS3: {
// //     Filtered_Grid_Freq: "Filtered_Grid_Freq",
// //     PCS3_TPWR_P_REAL: "PCS3_TPWR_P_REAL",
// //     PCS3_TPWR_P_REF: "PCS3_TPWR_P_REF",
// //     PCS3_SOC: "PCS3_SOC",
// //   },
// //   PCS4: {
// //     Filtered_Grid_Freq: "Filtered_Grid_Freq",
// //     PCS4_TPWR_P_REAL: "PCS4_TPWR_P_REAL",
// //     PCS4_TPWR_P_REF: "PCS4_TPWR_P_REF",
// //     PCS4_SOC: "PCS4_SOC",
// //   },
// // };

// // getFilteredChartData 함수에서 더 포괄적인 데이터 처리
// // const getFilteredChartData = (historyData, tab) => {
// //   if (!historyData || historyData.length === 0) return [];

// //   const fieldMapping = tabFieldMappings[tab];
// //   if (!fieldMapping) return [];

// //   // === 추가: new Date() 변환 결과 확인 ===
// //   console.log(`Convert (${tab}) - historyData 개수:`, historyData.length);
// //   historyData.slice(0, 5).forEach((item, index) => {
// //     // 처음 5개 항목만 로그
// //     console.log(`Convert (${tab})[${index}] - 입력 문자열:`, item.timestamp);
// //     const dateObject = new Date(item.timestamp);
// //     console.log(`Convert (${tab})[${index}] - 변환된 Date 객체:`, dateObject);
// //     // Invalid Date 확인
// //     if (isNaN(dateObject.getTime())) {
// //       console.error(
// //         `Convert (${tab})[${index}] - Error: Invalid Date 객체 생성됨!`
// //       );
// //     }
// //   });
// //   // ====================================

// //   const colors = ["#74C0FC", "#FF8787", "#69DB7C", "#FAB005"];

// //   return Object.entries(fieldMapping)
// //     .map(([fieldName, displayName], index) => {
// //       // 필드 데이터 유효성 확인
// //       const hasData = historyData.some(
// //         (item) => item[fieldName] !== undefined && item[fieldName] !== -1
// //       );

// //       // 실제 로깅
// //       console.log(`${displayName} 데이터 존재:`, hasData);

// //       return {
// //         type: "scatter",
// //         mode: "lines",
// //         name: displayName,
// //         x: historyData.map((item) => new Date(item.timestamp)),
// //         y: historyData.map((item) =>
// //           item[fieldName] === undefined || item[fieldName] === -1
// //             ? null
// //             : item[fieldName]
// //         ),
// //         line: { color: colors[index % colors.length], width: 2 },
// //         connectgaps: false,
// //         hovertemplate:
// //           "<b>데이터</b>: %{data.name}<br><b>시간</b>: %{x|%Y-%m-%d %H:%M:%S.%L}<br><b>값</b>: %{y:.3f}<extra></extra>",
// //       };
// //     })
// //     .filter((series) => series.y.some((val) => val !== null)); // null 값만 있는 시리즈 제거
// // };

// const getFilteredChartData = (historyData, selectedTab) => {
//   if (!historyData || historyData.length === 0) return [];

//   const firstItem = historyData[0];
//   console.log("📊 getFilteredChartData - 첫 항목:", firstItem); // 첫 데이터 확인

//   // timestamp 제외 + 현재 탭(selectedTab)과 관련된 필드만 필터링
//   const keys = Object.keys(firstItem).filter((key) => {
//     if (key === "timestamp" || typeof firstItem[key] === "object") return false;

//     let include = false;
//     if (selectedTab === "Total") {
//       include =
//         key.includes("Total") ||
//         key.includes("Filtered_Grid_Freq") ||
//         key.includes("T_Simul_P_REAL");
//     } else {
//       // --- 수정: PCS 탭 필터링 강화 (대소문자 구분 없이, 정확히 해당 PCS로 시작하는지) ---
//       // 예: PCS1 탭이면 "PCS1_"로 시작하는 필드만 포함 (PCS10 등 제외)
//       include = key.toUpperCase().startsWith(selectedTab.toUpperCase() + "_");
//       // -------------------------------------------------------------------
//     }
//     // --- 추가: 키 필터링 결과 로그 ---
//     // console.log(`  - 필터링 키: '${key}', 포함 여부: ${include}`);
//     // -------------------------------
//     return include;
//   });

//   // --- 수정: 필터링된 키 목록 로그 강화 ---
//   console.log(`📊 ${selectedTab} 탭에 대해 필터링된 키 목록:`, keys);
//   if (keys.length === 0) {
//     console.warn(
//       `�� ${selectedTab} 탭에 해당하는 필드를 찾지 못했습니다. 필터링 로직 또는 데이터 필드명을 확인하세요.`
//     );
//     return []; // 데이터 없으면 빈 배열 반환
//   }
//   // -------------------------------------

//   const colors = [
//     "#74C0FC",
//     "#FF8787",
//     "#69DB7C",
//     "#FAB005",
//     "#D0BFFF",
//     "#FFA8A8",
//     "#63E6BE",
//   ];

//   const traces = keys
//     .map((fieldName, index) => {
//       const xData = historyData.map((item, idx) => {
//         const tsString = item.timestamp;
//         if (idx < 5) {
//           console.log(`  [Timestamp Check ${idx}] Input String: ${tsString}`);
//         }
//         const dateObj = new Date(tsString);
//         if (idx < 5) {
//           console.log(
//             `  [Timestamp Check ${idx}] Parsed Date: ${dateObj.toISOString()}, isValid: ${!isNaN(
//               dateObj.getTime()
//             )}`
//           );
//           if (isNaN(dateObj.getTime())) {
//             console.error(
//               `  ⚠️ Invalid Date object created for timestamp: ${tsString}`
//             );
//           }
//         }
//         return dateObj;
//       });
//       const yData = historyData.map((item) =>
//         item[fieldName] === undefined || item[fieldName] === null // -1 대신 null 체크
//           ? null
//           : item[fieldName]
//       );

//       // --- 추가: 각 시리즈의 데이터 샘플 로깅 ---
//       const nonNullYCount = yData.filter((y) => y !== null).length;
//       console.log(
//         `  📈 시리즈 '${fieldName}': X 데이터 ${xData.length}개, Y 데이터 ${yData.length}개 (유효값 ${nonNullYCount}개)`
//       );
//       // console.log(`    Y 샘플 (처음 5개):`, yData.slice(0, 5)); // 필요시 샘플 확인
//       if (xData.length === 0 || nonNullYCount === 0) {
//         console.warn(
//           `    ⚠️ 시리즈 '${fieldName}'는 유효한 데이터가 없어 제외될 수 있습니다.`
//         );
//       }
//       // ---------------------------------------

//       return {
//         type: "scatter",
//         mode: "lines",
//         name: fieldName,
//         x: xData,
//         y: yData,
//         line: { color: colors[index % colors.length], width: 2 },
//         connectgaps: false, // false 유지 (null 값은 끊어서 표시)
//         hovertemplate:
//           "<b>데이터</b>: %{data.name}<br><b>시간</b>: %{x|%Y-%m-%d %H:%M:%S.%L}<br><b>값</b>: %{y:.3f}<extra></extra>",
//       };
//     })
//     .filter((series) => series.y.some((val) => val !== null)); // 유효한 Y값이 하나라도 있는 시리즈만 최종 포함

//   // --- 추가: 최종 생성된 트레이스 로깅 ---
//   console.log(
//     `📊 ${selectedTab} 탭에 대해 최종 생성된 Plotly 트레이스 수: ${traces.length}`
//   );
//   // ------------------------------------

//   return traces;
// };

// export default function OpcuaHistoricalPage() {
//   const [exportLoading, setExportLoading] = useState(false); // 내보내기 로딩 상태
//   const [exportError, setExportError] = useState(null); // 내보내기 오류 상태
//   const [opcuaData, setOpcuaData] = useState({
//     Total: { data: {}, history: [] },
//     PCS1: { data: {}, history: [] },
//     PCS2: { data: {}, history: [] },
//     PCS3: { data: {}, history: [] },
//     PCS4: { data: {}, history: [] },
//   });
//   const [selectedTab, setSelectedTab] = useState("Total");
//   const [startDate, setStartDate] = useState(
//     new Date(Date.now() - 3 * 60 * 60 * 1000)
//   );
//   const [endDate, setEndDate] = useState(new Date());
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState(null);
//   const [aggregationInterval, setAggregationInterval] = useState("raw"); // --- 추가: 집계 간격 상태 (기본값: raw) ---

//   // --- 추가: 집계 간격 옵션 ---
//   const aggregationOptions = [
//     { value: "raw", label: "원본 데이터" },
//     { value: "10ms", label: "10ms 평균" },
//     // { value: "100ms", label: "100ms 평균" }, // 필요시 추가
//     { value: "1s", label: "1초 평균" },
//     // { value: "10s", label: "10초 평균" }, // 필요시 추가
//   ];
//   // ---------------------------

//   // --- 추가: 집계 간격 변경 핸들러 ---
//   const handleAggregationChange = (event) => {
//     setAggregationInterval(event.target.value);
//     // 선택 변경 시 자동으로 데이터를 다시 조회하도록 할 수 있음 (선택사항)
//     // fetchHistoricalData(event.target.value); // fetchHistoricalData가 interval 인자를 받도록 수정 필요
//   };
//   // ---------------------------------

//   // useEffect(() => {
//   //   fetchHistoricalData();
//   // }, [selectedTab]);

//   // --- 수정된 날짜 범위 업데이트 함수 (1~3시간 범위 허용) ---
//   /**
//    * 날짜 범위를 업데이트하고 1~3시간 제한을 적용합니다.
//    * 간격이 1시간 미만이거나 3시간 초과 시에만 다른 쪽 날짜를 조정합니다.
//    * @param {Date} changedDate 사용자가 DatePicker에서 선택/변경된 날짜
//    * @param {'start' | 'end'} changeSource 어떤 DatePicker가 변경되었는지 ('start' 또는 'end')
//    */
//   // const updateDateRange = (changedDate, changeSource) => {
//   //   const minDuration = 1 * 60 * 60 * 1000; // 1시간
//   //   const maxDuration = 3 * 60 * 60 * 1000; // 3시간
//   //   const now = new Date();
//   //   let potentialStart;
//   //   let potentialEnd;

//   //   // 1. Determine the potential start and end based on the change, validating against now
//   //   if (changeSource === "start") {
//   //     potentialStart = changedDate > now ? now : changedDate;
//   //     potentialEnd = endDate; // Keep the other date for now
//   //   } else {
//   //     // changeSource === 'end'
//   //     potentialEnd = changedDate > now ? now : changedDate;
//   //     potentialStart = startDate; // Keep the other date for now
//   //   }

//   //   // 2. Ensure start is not after end (basic validity) - Adjust the *other* date
//   //   if (potentialStart > potentialEnd) {
//   //     console.log(
//   //       "기본 유효성: 시작 시간이 종료 시간보다 늦습니다. 최소 간격(1시간)으로 조정합니다."
//   //     );
//   //     if (changeSource === "start") {
//   //       // Start was moved after End
//   //       potentialEnd = new Date(potentialStart.getTime() + minDuration);
//   //       if (potentialEnd > now) potentialEnd = now; // Clamp end
//   //       // Re-check if start is still > end after clamping end
//   //       if (potentialStart > potentialEnd) {
//   //         potentialStart = new Date(potentialEnd.getTime() - minDuration);
//   //       }
//   //     } else {
//   //       // End was moved before Start
//   //       potentialStart = new Date(potentialEnd.getTime() - minDuration);
//   //     }
//   //     // Ensure start is not negative
//   //     if (potentialStart < new Date(0)) potentialStart = new Date(0);
//   //   }

//   //   // 3. Calculate the duration
//   //   let currentDuration = potentialEnd.getTime() - potentialStart.getTime();

//   //   // 4. Adjust ONLY if duration is outside the 1-3 hour range
//   //   let finalStart = potentialStart;
//   //   let finalEnd = potentialEnd;

//   //   if (currentDuration < minDuration) {
//   //     console.log(
//   //       `범위 부족 (${(currentDuration / (60 * 60 * 1000)).toFixed(
//   //         1
//   //       )}시간 < 1시간). ${changeSource} 날짜 기준으로 1시간 조정.`
//   //     );
//   //     if (changeSource === "start") {
//   //       finalEnd = new Date(finalStart.getTime() + minDuration);
//   //     } else {
//   //       finalStart = new Date(finalEnd.getTime() - minDuration);
//   //     }
//   //   } else if (currentDuration > maxDuration) {
//   //     console.log(
//   //       `범위 초과 (${(currentDuration / (60 * 60 * 1000)).toFixed(
//   //         1
//   //       )}시간 > 3시간). ${changeSource} 날짜 기준으로 3시간 조정.`
//   //     );
//   //     if (changeSource === "start") {
//   //       finalEnd = new Date(finalStart.getTime() + maxDuration);
//   //     } else {
//   //       finalStart = new Date(finalEnd.getTime() - maxDuration);
//   //     }
//   //   }
//   //   // Else (1h <= duration <= 3h): No adjustment needed for duration, use potentialStart/End

//   //   // 5. Final validation against 'now' for the potentially adjusted dates
//   //   // Clamp the end date first
//   //   if (finalEnd > now) {
//   //     finalEnd = now;
//   //     console.log("최종 종료 시간을 'now'로 제한합니다.");
//   //     // If end is clamped, re-check start to ensure minimum duration and start <= end
//   //     if (finalEnd.getTime() - finalStart.getTime() < minDuration) {
//   //       finalStart = new Date(finalEnd.getTime() - minDuration);
//   //       console.log(
//   //         "종료 시간 'now' 제한 후 최소 시간(1시간) 보장을 위해 시작 시간 재조정."
//   //       );
//   //     }
//   //     // Ensure start is not after (clamped) end
//   //     if (finalStart > finalEnd) {
//   //       finalStart = new Date(finalEnd.getTime() - minDuration); // Fallback
//   //     }
//   //   }
//   //   // Ensure start date is also clamped (in case it was adjusted past now, unlikely but possible)
//   //   if (finalStart > now) {
//   //     finalStart = now;
//   //     console.log("최종 시작 시간을 'now'로 제한합니다.");
//   //     // If start is clamped to now, re-adjust end to ensure min duration
//   //     if (finalEnd.getTime() - finalStart.getTime() < minDuration) {
//   //       finalEnd = new Date(finalStart.getTime() + minDuration);
//   //       if (finalEnd > now) finalEnd = now; // Clamp end again if needed
//   //     }
//   //   }

//   //   // Ensure start is not negative after all adjustments
//   //   if (finalStart < new Date(0)) finalStart = new Date(0);

//   //   // Final safety check: Ensure start <= end one last time
//   //   if (finalStart > finalEnd) {
//   //     console.warn(
//   //       "최종 조정 후 시작 시간이 종료 시간보다 늦어, 시작 시간을 강제로 1시간 전으로 조정합니다."
//   //     );
//   //     finalStart = new Date(finalEnd.getTime() - minDuration);
//   //     if (finalStart < new Date(0)) finalStart = new Date(0);
//   //   }

//   //   // 6. Update state
//   //   setStartDate(finalStart);
//   //   setEndDate(finalEnd);
//   //   console.log("최종 설정된 시간:", {
//   //     start: finalStart.toISOString(),
//   //     end: finalEnd.toISOString(),
//   //   });
//   // };
//   // --- 추가: 데이터 내보내기 핸들러 ---
//   const handleExportData = async () => {
//     setExportLoading(true); // 로딩 시작
//     setExportError(null); // 이전 오류 초기화
//     console.log("데이터 내보내기 시작:", {
//       start: startDate.toISOString(),
//       end: endDate.toISOString(),
//       tab: selectedTab,
//     });

//     try {
//       const apiUrl = process.env.NEXT_PUBLIC_API_URL || window.location.origin;
//       const startTimeISO = startDate.toISOString();
//       const endTimeISO = endDate.toISOString();

//       // 백엔드 /export 엔드포인트 호출
//       const response = await fetch(`${apiUrl}/api/opcua/historical/export`, {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify({
//           startTime: startTimeISO,
//           endTime: endTimeISO,
//           deviceGroup: selectedTab,
//           aggregationInterval: interval, // 집계 간격 추가
//         }),
//       });

//       // 응답 상태 확인
//       if (!response.ok) {
//         let errorBody = "오류 내용을 읽을 수 없습니다.";
//         try {
//           // 오류 응답 본문을 텍스트로 읽기 시도
//           errorBody = await response.text();
//         } catch (readError) {
//           console.error("내보내기 오류 응답 본문 읽기 실패:", readError);
//         }
//         // 오류 객체 생성 및 throw
//         throw new Error(
//           `데이터 내보내기 실패: ${response.status} ${response.statusText}. 본문: ${errorBody}`
//         );
//       }

//       // 응답 본문을 Blob 객체로 받음 (CSV 데이터)
//       const blob = await response.blob();

//       // 파일 이름 생성 (컨트롤러에서 생성한 방식과 유사하게)
//       const safeStartTime = startTimeISO
//         .replaceAll("[:\\-]", "")
//         .replace("T", "_")
//         .replace("Z", "");
//       const safeEndTime = endTimeISO
//         .replaceAll("[:\\-]", "")
//         .replace("T", "_")
//         .replace("Z", "");
//       const fileName = `opcua_export_${selectedTab}_${safeStartTime}_${safeEndTime}.csv`;

//       // 다운로드 링크 생성 및 클릭
//       const link = document.createElement("a");
//       link.href = window.URL.createObjectURL(blob); // Blob 데이터 URL 생성
//       link.download = fileName; // 다운로드 파일 이름 설정
//       document.body.appendChild(link); // 링크를 DOM에 추가
//       link.click(); // 링크 클릭 이벤트 발생
//       document.body.removeChild(link); // 링크 제거
//       window.URL.revokeObjectURL(link.href); // 생성된 URL 해제 (메모리 누수 방지)

//       console.log("데이터 내보내기 성공:", fileName);
//     } catch (err) {
//       // 오류 상태 업데이트 및 콘솔 로그
//       const errorMessage = `내보내기 오류: ${err.message}`;
//       setExportError(errorMessage);
//       console.error("데이터 내보내기 중 오류 발생:", err);
//     } finally {
//       // 로딩 상태 종료
//       setExportLoading(false);
//     }
//   };
//   // ====================================

//   const updateDateRange = (changedDate, changeSource) => {
//     const maxDuration = 3 * 60 * 60 * 1000; // 3시간
//     const now = new Date();
//     let potentialStart, potentialEnd;

//     if (changeSource === "start") {
//       potentialStart = changedDate > now ? now : changedDate;
//       potentialEnd = endDate;
//     } else {
//       potentialEnd = changedDate > now ? now : changedDate;
//       potentialStart = startDate;
//     }

//     // 종료가 시작보다 빠를 수 없도록 처리
//     if (potentialStart > potentialEnd) {
//       if (changeSource === "start") {
//         potentialEnd = potentialStart;
//       } else {
//         potentialStart = potentialEnd;
//       }
//     }

//     // 💡 최대 3시간 초과 제한
//     let duration = potentialEnd.getTime() - potentialStart.getTime();
//     if (duration > maxDuration) {
//       if (changeSource === "start") {
//         potentialEnd = new Date(potentialStart.getTime() + maxDuration);
//       } else {
//         potentialStart = new Date(potentialEnd.getTime() - maxDuration);
//       }
//     }

//     // 현재 시간 넘어가지 않도록 제한
//     if (potentialEnd > now) {
//       potentialEnd = now;
//       if (potentialEnd.getTime() - potentialStart.getTime() > maxDuration) {
//         potentialStart = new Date(potentialEnd.getTime() - maxDuration);
//       }
//     }

//     setStartDate(potentialStart);
//     setEndDate(potentialEnd);

//     console.log("최종 설정된 시간:", {
//       start: potentialStart.toISOString(),
//       end: potentialEnd.toISOString(),
//     });
//   };

//   // handleStartDateChange and handleEndDateChange remain the same as the previous version:
//   const handleStartDateChange = (date) => {
//     if (date) {
//       updateDateRange(date, "start");
//     }
//   };

//   const handleEndDateChange = (date) => {
//     if (date) {
//       updateDateRange(date, "end");
//     }
//   };

//   const fetchHistoricalData = async (interval = aggregationInterval) => {
//     // interval 인자 추가 및 기본값 설정
//     try {
//       setLoading(true);
//       setError(null);
//       setExportError(null); // 조회 시 내보내기 오류 초기화

//       const apiUrl = process.env.NEXT_PUBLIC_API_URL || window.location.origin;
//       const startTimeISO = startDate.toISOString();
//       const endTimeISO = endDate.toISOString();

//       console.log("요청 URL:", `${apiUrl}/api/opcua/historical`);
//       console.log("요청 파라미터:", {
//         // 로그 수정
//         startTime: startTimeISO,
//         endTime: endTimeISO,
//         deviceGroup: selectedTab,
//         aggregationInterval: interval, // --- 수정: 집계 간격 포함 ---
//       });

//       const response = await fetch(`${apiUrl}/api/opcua/historical`, {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify({
//           startTime: startTimeISO,
//           endTime: endTimeISO,
//           deviceGroup: selectedTab,
//           aggregationInterval: interval, // --- 수정: 집계 간격 포함 ---
//         }),
//       });

//       // 응답 상태 디버깅
//       console.log("응답 상태:", response.status);

//       if (!response.ok) {
//         throw new Error(`데이터 조회 실패: ${response.status}`);
//       }

//       const data = await response.json();
//       console.log("processHistoricalData 진입 시 data:", data);

//       console.log("응답 데이터 항목 수:", data.data?.timeSeries?.length || 0);

//       processHistoricalData(data);
//     } catch (err) {
//       setError(err.message);
//       console.error("데이터 요청 오류:", err);
//       // 오류 발생 시 현재 탭 데이터 초기화
//       setOpcuaData((prev) => ({
//         ...prev,
//         [selectedTab]: { data: {}, history: [] },
//       }));
//     } finally {
//       setLoading(false);
//     }
//   };
//   const sanitizeHistoryData = (data) =>
//     data.map((item) =>
//       Object.fromEntries(
//         Object.entries(item).filter(([k, v]) => typeof v !== "object")
//       )
//     );

//   const processHistoricalData = (data) => {
//     try {
//       const rawHistoryData = data.data?.timeSeries || [];
//       console.log("✅ 원본 데이터 수:", rawHistoryData.length); // 기존 로그

//       if (rawHistoryData.length > 0) {
//         // --- 추가: 첫 데이터 항목 상세 로깅 ---
//         console.log("🧪 첫 번째 원본 데이터 항목:", rawHistoryData[0]);
//         // ----------------------------------

//         const safeHistory = sanitizeHistoryData(rawHistoryData);
//         console.log("🧼 필터링 후 데이터:", safeHistory[0]); // 기존 로그

//         // --- 추가: 상태 업데이트 전 데이터 확인 ---
//         console.log(
//           `💾 ${selectedTab} 탭 상태 업데이트 예정. History 길이: ${safeHistory.length}`
//         );
//         // ---------------------------------------

//         setOpcuaData((prevData) => {
//           const newState = {
//             ...prevData,
//             [selectedTab]: {
//               // data 필드는 마지막 데이터 포인트 또는 빈 객체로 유지
//               data: safeHistory[safeHistory.length - 1] || {},
//               // history 필드에 전체 배열 할당
//               history: safeHistory,
//             },
//           };
//           // --- 추가: 업데이트될 상태 객체 확인 ---
//           console.log("🔄 업데이트될 전체 상태 객체:", newState);
//           // -------------------------------------
//           return newState;
//         });
//       } else {
//         console.warn("⛔ 수신된 데이터가 없음");
//         setOpcuaData((prevData) => ({
//           ...prevData,
//           [selectedTab]: { data: {}, history: [] },
//         }));
//       }
//     } catch (e) {
//       console.error("❌ 데이터 처리 중 오류:", e);
//       setError("데이터 형식 오류");
//     }
//   };

//   return (
//     <div className="opcua-container">
//       <div className="header">
//         <h1>LPMS Historian</h1>
//         <div className="date-picker-container">
//           <DatePicker
//             selected={startDate}
//             onChange={handleStartDateChange}
//             showTimeSelect
//             timeIntervals={1} // 15에서 1로 변경
//             dateFormat="yyyy-MM-dd HH:mm"
//             className="date-picker"
//             maxDate={new Date()}
//           />
//           <span className="date-separator">~</span>
//           <DatePicker
//             selected={endDate}
//             onChange={handleEndDateChange}
//             showTimeSelect
//             timeIntervals={1} // 15에서 1로 변경
//             dateFormat="yyyy-MM-dd HH:mm"
//             className="date-picker"
//             maxDate={new Date()}
//             minDate={startDate}
//           />
//           {/* --- 추가: 집계 간격 선택 드롭다운 --- */}
//           <select
//             value={aggregationInterval}
//             onChange={handleAggregationChange}
//             className="aggregation-select" // 스타일링 위한 클래스 추가
//             disabled={loading || exportLoading}
//             style={{ marginLeft: "10px", padding: "5px", borderRadius: "4px" }}
//           >
//             {aggregationOptions.map((option) => (
//               <option key={option.value} value={option.value}>
//                 {option.label}
//               </option>
//             ))}
//           </select>
//           {/* --------------------------------- */}
//           <button
//             onClick={() => fetchHistoricalData()} // 현재 상태의 interval 사용
//             className="search-button"
//             disabled={loading || exportLoading}
//           >
//             {loading ? "조회 중..." : "조회"}
//           </button>
//           <button
//             onClick={handleExportData} // handleExportData는 현재 상태의 interval 사용
//             className="export-button"
//             disabled={exportLoading || loading}
//             style={{ marginLeft: "10px" }}
//           >
//             {exportLoading ? "내보내는 중..." : "데이터 내보내기 (CSV)"}
//           </button>
//         </div>
//       </div>

//       {/* 데이터 조회 오류 메시지 */}
//       {error && <div className="error-message">조회 오류: {error}</div>}
//       {/* --- 추가: 내보내기 오류 메시지 표시 --- */}
//       {exportError && (
//         <div
//           className="error-message"
//           style={{ color: "orange", marginTop: "5px" }}
//         >
//           내보내기 오류: {exportError}
//         </div>
//       )}
//       {/* ================================= */}

//       {/* 차트 영역 */}
//       <div className="chart-section">
//         <div className="chart-tabs">
//           {["Total", "PCS1", "PCS2", "PCS3", "PCS4"].map((tab) => (
//             <button
//               key={tab}
//               className={`tab-button ${selectedTab === tab ? "active" : ""}`}
//               onClick={() => {
//                 setSelectedTab(tab);
//               }}
//               style={{
//                 background: selectedTab === tab ? "#ffffff" : "transparent",
//                 color: selectedTab === tab ? "#3366cc" : "#666666",
//                 borderBottom:
//                   selectedTab === tab ? "3px solid #3366cc" : "none",
//                 borderTop: "none",
//                 borderLeft: "none",
//                 borderRight: "none",
//                 padding: "12px 20px",
//                 fontSize: "14px",
//                 fontWeight: selectedTab === tab ? "600" : "400",
//                 cursor: "pointer",
//                 transition: "all 0.3s ease",
//                 position: "relative",
//                 outline: "none",
//               }}
//             >
//               {tab === "Total" ? "Total Trends" : tab}
//             </button>
//           ))}
//         </div>

//         <div className="chart-container">
//           {selectedTab === "Total" && (
//             <div className="chart-wrapper" style={{ height: "500px" }}>
//               {loading ? (
//                 <div className="loading-spinner-container">
//                   <div className="loading-spinner"></div>
//                 </div>
//               ) : opcuaData.Total.history.length === 0 ? (
//                 <div
//                   className="no-data-message"
//                   style={{
//                     display: "flex",
//                     justifyContent: "center",
//                     alignItems: "center",
//                     height: "400px",
//                     fontSize: "16px",
//                     color: "#666",
//                   }}
//                 >
//                   데이터가 없습니다. 검색 조건을 확인해보세요.
//                 </div>
//               ) : (
//                 <Plot
//                   data={getFilteredChartData(
//                     opcuaData[selectedTab].history,
//                     selectedTab
//                   )}
//                   layout={{
//                     ...commonChartLayout,
//                     title: `Total Trends (8MW)`,
//                     xaxis: {
//                       ...commonChartLayout.xaxis,
//                       autorange: true,
//                     },
//                   }}
//                   useResizeHandler={true}
//                   style={{
//                     width: "100%",
//                     height: "100%",
//                     maxWidth: "100%", // ✅ 최대 너비 제한
//                     overflowX: "hidden", // ✅ 스크롤 방지
//                   }}
//                   config={{
//                     responsive: true,
//                     displayModeBar: true,
//                     displaylogo: false,
//                     locale: "ko",
//                     modeBarButtonsToRemove: ["lasso2d", "select2d"],
//                   }}
//                 />
//               )}
//             </div>
//           )}

//           {selectedTab === "PCS1" && (
//             <div className="chart-wrapper" style={{ height: "500px" }}>
//               {loading ? (
//                 <div className="loading-spinner-container">
//                   <div className="loading-spinner"></div>
//                 </div>
//               ) : opcuaData.PCS1.history.length === 0 ? (
//                 <div
//                   className="no-data-message"
//                   style={{
//                     display: "flex",
//                     justifyContent: "center",
//                     alignItems: "center",
//                     height: "400px",
//                     fontSize: "16px",
//                     color: "#666",
//                   }}
//                 >
//                   데이터가 없습니다. 검색 조건을 확인해보세요.
//                 </div>
//               ) : (
//                 <Plot
//                   data={getFilteredChartData(
//                     opcuaData[selectedTab].history,
//                     selectedTab
//                   )}
//                   layout={{
//                     ...commonChartLayout,
//                     title: "PCS1 (2MW)",
//                     xaxis: {
//                       ...commonChartLayout.xaxis,
//                       autorange: true,
//                     },
//                   }}
//                   useResizeHandler={true}
//                   style={{
//                     width: "100%",
//                     height: "100%",
//                     maxWidth: "100%", // ✅ 최대 너비 제한
//                     overflowX: "hidden", // ✅ 스크롤 방지
//                   }}
//                   config={{
//                     responsive: true,
//                     displayModeBar: true,
//                     displaylogo: false,
//                     locale: "ko",
//                     modeBarButtonsToRemove: ["lasso2d", "select2d"],
//                   }}
//                 />
//               )}
//             </div>
//           )}

//           {selectedTab === "PCS2" && (
//             <div className="chart-wrapper" style={{ height: "500px" }}>
//               {loading ? (
//                 <div className="loading-spinner-container">
//                   <div className="loading-spinner"></div>
//                 </div>
//               ) : opcuaData.PCS2.history.length === 0 ? (
//                 <div
//                   className="no-data-message"
//                   style={{
//                     display: "flex",
//                     justifyContent: "center",
//                     alignItems: "center",
//                     height: "400px",
//                     fontSize: "16px",
//                     color: "#666",
//                   }}
//                 >
//                   데이터가 없습니다. 검색 조건을 확인해보세요.
//                 </div>
//               ) : (
//                 <Plot
//                   data={getFilteredChartData(
//                     opcuaData[selectedTab].history,
//                     selectedTab
//                   )}
//                   layout={{
//                     ...commonChartLayout,
//                     title: "PCS2",
//                     xaxis: {
//                       ...commonChartLayout.xaxis,
//                       autorange: true,
//                     },
//                   }}
//                   useResizeHandler={true}
//                   style={{
//                     width: "100%",
//                     height: "100%",
//                     maxWidth: "100%", // ✅ 최대 너비 제한
//                     overflowX: "hidden", // ✅ 스크롤 방지
//                   }}
//                   config={{
//                     responsive: true,
//                     displayModeBar: true,
//                     displaylogo: false,
//                     locale: "ko",
//                     modeBarButtonsToRemove: ["lasso2d", "select2d"],
//                   }}
//                 />
//               )}
//             </div>
//           )}

//           {selectedTab === "PCS3" && (
//             <div className="chart-wrapper" style={{ height: "500px" }}>
//               {loading ? (
//                 <div className="loading-spinner-container">
//                   <div className="loading-spinner"></div>
//                 </div>
//               ) : opcuaData.PCS3.history.length === 0 ? (
//                 <div
//                   className="no-data-message"
//                   style={{
//                     display: "flex",
//                     justifyContent: "center",
//                     alignItems: "center",
//                     height: "400px",
//                     fontSize: "16px",
//                     color: "#666",
//                   }}
//                 >
//                   데이터가 없습니다. 검색 조건을 확인해보세요.
//                 </div>
//               ) : (
//                 <Plot
//                   data={getFilteredChartData(
//                     opcuaData[selectedTab].history,
//                     selectedTab
//                   )}
//                   layout={{
//                     ...commonChartLayout,
//                     title: "PCS3",
//                     xaxis: {
//                       ...commonChartLayout.xaxis,
//                       autorange: true,
//                     },
//                   }}
//                   useResizeHandler={true}
//                   style={{
//                     width: "100%",
//                     height: "100%",
//                     maxWidth: "100%", // ✅ 최대 너비 제한
//                     overflowX: "hidden", // ✅ 스크롤 방지
//                   }}
//                   config={{
//                     responsive: true,
//                     displayModeBar: true,
//                     displaylogo: false,
//                     locale: "ko",
//                     modeBarButtonsToRemove: ["lasso2d", "select2d"],
//                   }}
//                 />
//               )}
//             </div>
//           )}

//           {selectedTab === "PCS4" && (
//             <div className="chart-wrapper" style={{ height: "500px" }}>
//               {loading ? (
//                 <div className="loading-spinner-container">
//                   <div className="loading-spinner"></div>
//                 </div>
//               ) : opcuaData.PCS4.history.length === 0 ? (
//                 <div
//                   className="no-data-message"
//                   style={{
//                     display: "flex",
//                     justifyContent: "center",
//                     alignItems: "center",
//                     height: "400px",
//                     fontSize: "16px",
//                     color: "#666",
//                   }}
//                 >
//                   데이터가 없습니다. 검색 조건을 확인해보세요.
//                 </div>
//               ) : (
//                 <Plot
//                   data={getFilteredChartData(
//                     opcuaData[selectedTab].history,
//                     selectedTab
//                   )}
//                   layout={{
//                     ...commonChartLayout,
//                     title: "PCS4",
//                     xaxis: {
//                       ...commonChartLayout.xaxis,
//                       autorange: true,
//                     },
//                   }}
//                   useResizeHandler={true}
//                   style={{
//                     width: "100%",
//                     height: "100%",
//                     maxWidth: "100%", // ✅ 최대 너비 제한
//                     overflowX: "hidden", // ✅ 스크롤 방지
//                   }}
//                   config={{
//                     responsive: true,
//                     displayModeBar: true,
//                     displaylogo: false,
//                     locale: "ko",
//                     modeBarButtonsToRemove: ["lasso2d", "select2d"],
//                   }}
//                 />
//               )}
//             </div>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }

"use client";

import dynamic from "next/dynamic";
import { memo, useState } from "react";
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

// 차트 레이아웃 설정
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

// 탭별 필드 매핑 수정 - 실제 데이터 필드명으로 수정 필요
// const tabFieldMappings = {
//   Total: {
//     // 예시: 아래 필드명을 실제 데이터 필드명으로 수정해야 합니다
//     Filtered_Grid_Freq: "Filtered_Grid_Freq",
//     T_Simul_P_REAL: "T_Simul_P_REAL",
//     Total_TPWR_P_REAL: "Total_TPWR_P_REAL",
//     Total_TPWR_P_REF: "Total_TPWR_P_REF",
//   },
//   PCS1: {
//     Filtered_Grid_Freq: "Filtered_Grid_Freq",
//     PCS1_TPWR_P_REAL: "PCS1_TPWR_P_REAL",
//     PCS1_TPWR_P_REF: "PCS1_TPWR_P_REF",
//     PCS1_SOC: "PCS1_SOC",
//   },
//   PCS2: {
//     Filtered_Grid_Freq: "Filtered_Grid_Freq",
//     PCS2_TPWR_P_REAL: "PCS2_TPWR_P_REAL",
//     PCS2_TPWR_P_REF: "PCS2_TPWR_P_REF",
//     PCS2_SOC: "PCS2_SOC",
//   },
//   PCS3: {
//     Filtered_Grid_Freq: "Filtered_Grid_Freq",
//     PCS3_TPWR_P_REAL: "PCS3_TPWR_P_REAL",
//     PCS3_TPWR_P_REF: "PCS3_TPWR_P_REF",
//     PCS3_SOC: "PCS3_SOC",
//   },
//   PCS4: {
//     Filtered_Grid_Freq: "Filtered_Grid_Freq",
//     PCS4_TPWR_P_REAL: "PCS4_TPWR_P_REAL",
//     PCS4_TPWR_P_REF: "PCS4_TPWR_P_REF",
//     PCS4_SOC: "PCS4_SOC",
//   },
// };

// getFilteredChartData 함수에서 더 포괄적인 데이터 처리
// const getFilteredChartData = (historyData, tab) => {
//   if (!historyData || historyData.length === 0) return [];

//   const fieldMapping = tabFieldMappings[tab];
//   if (!fieldMapping) return [];

//   // === 추가: new Date() 변환 결과 확인 ===
//   console.log(`Convert (${tab}) - historyData 개수:`, historyData.length);
//   historyData.slice(0, 5).forEach((item, index) => {
//     // 처음 5개 항목만 로그
//     console.log(`Convert (${tab})[${index}] - 입력 문자열:`, item.timestamp);
//     const dateObject = new Date(item.timestamp);
//     console.log(`Convert (${tab})[${index}] - 변환된 Date 객체:`, dateObject);
//     // Invalid Date 확인
//     if (isNaN(dateObject.getTime())) {
//       console.error(
//         `Convert (${tab})[${index}] - Error: Invalid Date 객체 생성됨!`
//       );
//     }
//   });
//   // ====================================

//   const colors = ["#74C0FC", "#FF8787", "#69DB7C", "#FAB005"];

//   return Object.entries(fieldMapping)
//     .map(([fieldName, displayName], index) => {
//       // 필드 데이터 유효성 확인
//       const hasData = historyData.some(
//         (item) => item[fieldName] !== undefined && item[fieldName] !== -1
//       );

//       // 실제 로깅
//       console.log(`${displayName} 데이터 존재:`, hasData);

//       return {
//         type: "scatter",
//         mode: "lines",
//         name: displayName,
//         x: historyData.map((item) => new Date(item.timestamp)),
//         y: historyData.map((item) =>
//           item[fieldName] === undefined || item[fieldName] === -1
//             ? null
//             : item[fieldName]
//         ),
//         line: { color: colors[index % colors.length], width: 2 },
//         connectgaps: false,
//         hovertemplate:
//           "<b>데이터</b>: %{data.name}<br><b>시간</b>: %{x|%Y-%m-%d %H:%M:%S.%L}<br><b>값</b>: %{y:.3f}<extra></extra>",
//       };
//     })
//     .filter((series) => series.y.some((val) => val !== null)); // null 값만 있는 시리즈 제거
// };

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

export default function OpcuaHistoricalPage() {
  const [exportLoading, setExportLoading] = useState(false); // 내보내기 로딩 상태 추가
  const [exportError, setExportError] = useState(null); // 내보내기 오류 상태
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

  const CSVLink = dynamic(
    () => import("react-csv").then((mod) => mod.CSVLink),
    {
      ssr: false,
    }
  );
  // useEffect(() => {
  //   fetchHistoricalData();
  // }, [selectedTab]);

  // --- 수정된 날짜 범위 업데이트 함수 (1~3시간 범위 허용) ---
  /**
   * 날짜 범위를 업데이트하고 1~3시간 제한을 적용합니다.
   * 간격이 1시간 미만이거나 3시간 초과 시에만 다른 쪽 날짜를 조정합니다.
   * @param {Date} changedDate 사용자가 DatePicker에서 선택/변경된 날짜
   * @param {'start' | 'end'} changeSource 어떤 DatePicker가 변경되었는지 ('start' 또는 'end')
   */
  // const updateDateRange = (changedDate, changeSource) => {
  //   const minDuration = 1 * 60 * 60 * 1000; // 1시간
  //   const maxDuration = 3 * 60 * 60 * 1000; // 3시간
  //   const now = new Date();
  //   let potentialStart;
  //   let potentialEnd;

  //   // 1. Determine the potential start and end based on the change, validating against now
  //   if (changeSource === "start") {
  //     potentialStart = changedDate > now ? now : changedDate;
  //     potentialEnd = endDate; // Keep the other date for now
  //   } else {
  //     // changeSource === 'end'
  //     potentialEnd = changedDate > now ? now : changedDate;
  //     potentialStart = startDate; // Keep the other date for now
  //   }

  //   // 2. Ensure start is not after end (basic validity) - Adjust the *other* date
  //   if (potentialStart > potentialEnd) {
  //     console.log(
  //       "기본 유효성: 시작 시간이 종료 시간보다 늦습니다. 최소 간격(1시간)으로 조정합니다."
  //     );
  //     if (changeSource === "start") {
  //       // Start was moved after End
  //       potentialEnd = new Date(potentialStart.getTime() + minDuration);
  //       if (potentialEnd > now) potentialEnd = now; // Clamp end
  //       // Re-check if start is still > end after clamping end
  //       if (potentialStart > potentialEnd) {
  //         potentialStart = new Date(potentialEnd.getTime() - minDuration);
  //       }
  //     } else {
  //       // End was moved before Start
  //       potentialStart = new Date(potentialEnd.getTime() - minDuration);
  //     }
  //     // Ensure start is not negative
  //     if (potentialStart < new Date(0)) potentialStart = new Date(0);
  //   }

  //   // 3. Calculate the duration
  //   let currentDuration = potentialEnd.getTime() - potentialStart.getTime();

  //   // 4. Adjust ONLY if duration is outside the 1-3 hour range
  //   let finalStart = potentialStart;
  //   let finalEnd = potentialEnd;

  //   if (currentDuration < minDuration) {
  //     console.log(
  //       `범위 부족 (${(currentDuration / (60 * 60 * 1000)).toFixed(
  //         1
  //       )}시간 < 1시간). ${changeSource} 날짜 기준으로 1시간 조정.`
  //     );
  //     if (changeSource === "start") {
  //       finalEnd = new Date(finalStart.getTime() + minDuration);
  //     } else {
  //       finalStart = new Date(finalEnd.getTime() - minDuration);
  //     }
  //   } else if (currentDuration > maxDuration) {
  //     console.log(
  //       `범위 초과 (${(currentDuration / (60 * 60 * 1000)).toFixed(
  //         1
  //       )}시간 > 3시간). ${changeSource} 날짜 기준으로 3시간 조정.`
  //     );
  //     if (changeSource === "start") {
  //       finalEnd = new Date(finalStart.getTime() + maxDuration);
  //     } else {
  //       finalStart = new Date(finalEnd.getTime() - maxDuration);
  //     }
  //   }
  //   // Else (1h <= duration <= 3h): No adjustment needed for duration, use potentialStart/End

  //   // 5. Final validation against 'now' for the potentially adjusted dates
  //   // Clamp the end date first
  //   if (finalEnd > now) {
  //     finalEnd = now;
  //     console.log("최종 종료 시간을 'now'로 제한합니다.");
  //     // If end is clamped, re-check start to ensure minimum duration and start <= end
  //     if (finalEnd.getTime() - finalStart.getTime() < minDuration) {
  //       finalStart = new Date(finalEnd.getTime() - minDuration);
  //       console.log(
  //         "종료 시간 'now' 제한 후 최소 시간(1시간) 보장을 위해 시작 시간 재조정."
  //       );
  //     }
  //     // Ensure start is not after (clamped) end
  //     if (finalStart > finalEnd) {
  //       finalStart = new Date(finalEnd.getTime() - minDuration); // Fallback
  //     }
  //   }
  //   // Ensure start date is also clamped (in case it was adjusted past now, unlikely but possible)
  //   if (finalStart > now) {
  //     finalStart = now;
  //     console.log("최종 시작 시간을 'now'로 제한합니다.");
  //     // If start is clamped to now, re-adjust end to ensure min duration
  //     if (finalEnd.getTime() - finalStart.getTime() < minDuration) {
  //       finalEnd = new Date(finalStart.getTime() + minDuration);
  //       if (finalEnd > now) finalEnd = now; // Clamp end again if needed
  //     }
  //   }

  //   // Ensure start is not negative after all adjustments
  //   if (finalStart < new Date(0)) finalStart = new Date(0);

  //   // Final safety check: Ensure start <= end one last time
  //   if (finalStart > finalEnd) {
  //     console.warn(
  //       "최종 조정 후 시작 시간이 종료 시간보다 늦어, 시작 시간을 강제로 1시간 전으로 조정합니다."
  //     );
  //     finalStart = new Date(finalEnd.getTime() - minDuration);
  //     if (finalStart < new Date(0)) finalStart = new Date(0);
  //   }

  //   // 6. Update state
  //   setStartDate(finalStart);
  //   setEndDate(finalEnd);
  //   console.log("최종 설정된 시간:", {
  //     start: finalStart.toISOString(),
  //     end: finalEnd.toISOString(),
  //   });
  // };

  // 2. handleExportData 함수를 수정하여 API 호출 대신 CSVLink 사용
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

  // // --- 추가: 데이터 내보내기 핸들러 ---
  // const handleExportData = async () => {
  //   setExportLoading(true);
  //   setExportError(null);
  //   console.log("데이터 내보내기 시작:", {
  //     start: startDate.toISOString(),
  //     end: endDate.toISOString(),
  //     tab: selectedTab,
  //   });

  //   try {
  //     const apiUrl = process.env.NEXT_PUBLIC_API_URL || window.location.origin;
  //     const startTimeISO = startDate.toISOString();
  //     const endTimeISO = endDate.toISOString();

  //     const response = await fetch(`${apiUrl}/api/opcua/historical/export`, {
  //       // 새 백엔드 API 호출
  //       method: "POST",
  //       headers: {
  //         "Content-Type": "application/json",
  //       },
  //       body: JSON.stringify({
  //         startTime: startTimeISO,
  //         endTime: endTimeISO,
  //         deviceGroup: selectedTab,
  //       }),
  //     });

  //     if (!response.ok) {
  //       let errorBody = "No error body";
  //       try {
  //         errorBody = await response.text();
  //       } catch (readError) {
  //         console.error("Error reading export error response body:", readError);
  //       }
  //       throw new Error(
  //         `데이터 내보내기 실패: ${response.status}, 본문: ${errorBody}`
  //       );
  //     }

  //     // 백엔드가 CSV 데이터를 직접 반환한다고 가정
  //     const blob = await response.blob(); // 응답을 Blob 객체로 받음 (CSV 가정)

  //     // 파일 이름 생성 (예시)
  //     const fileName = `opcua_data_export_${selectedTab}_${startTimeISO}_to_${endTimeISO}.csv`;

  //     // 다운로드 링크 생성 및 클릭
  //     const link = document.createElement("a");
  //     link.href = window.URL.createObjectURL(blob);
  //     link.download = fileName;
  //     document.body.appendChild(link);
  //     link.click();
  //     document.body.removeChild(link);
  //     window.URL.revokeObjectURL(link.href); // 메모리 해제

  //     console.log("데이터 내보내기 성공:", fileName);
  //   } catch (err) {
  //     setExportError(`내보내기 오류: ${err.message}`);
  //     console.error("데이터 내보내기 오류:", err);
  //   } finally {
  //     setExportLoading(false);
  //   }
  // };
  // // ====================================

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

  // handleStartDateChange and handleEndDateChange remain the same as the previous version:
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
    } finally {
      setLoading(false);
    }
  };
  const sanitizeHistoryData = (data) =>
    data.map((item) =>
      Object.fromEntries(
        Object.entries(item).filter(([k, v]) => typeof v !== "object")
      )
    );

  // const processHistoricalData = (data) => {
  //   try {
  //     const historyData = data.data.timeSeries || [];
  //     console.log("Process - 원본 데이터 수신:", historyData.length);

  //     // === 추가: 첫 번째 데이터의 timestamp 로그 확인 ===
  //     if (historyData.length > 0) {
  //       console.log("Process - 첫 번째 데이터 항목 전체:", historyData[0]);
  //       console.log(
  //         "Process - 첫 번째 timestamp 문자열:",
  //         historyData[0]?.timestamp
  //       ); // timestamp 필드 확인
  //       console.log("Process - 실제 필드 목록:", Object.keys(historyData[0]));
  //     }
  //     // ============================================

  //     if (historyData.length > 0) {
  //       // 첫 번째 데이터 항목의 모든 필드를 출력
  //       console.log("첫 번째 데이터 항목 전체:", historyData[0]);
  //       console.log("실제 필드 목록:", Object.keys(historyData[0]));

  //       // 시간 범위 확인
  //       const timestamps = historyData.map((item) => new Date(item.timestamp));
  //       const minTime = new Date(Math.min(...timestamps));
  //       const maxTime = new Date(Math.max(...timestamps));

  //       console.log("데이터 시간 범위:", {
  //         min: minTime.toISOString(),
  //         max: maxTime.toISOString(),
  //         개수: historyData.length,
  //       });
  //       const rawHistoryData = data.data?.timeSeries || [];
  //       console.log("Process - 원본 데이터 수신:", rawHistoryData.length);
  //       if (rawHistoryData.length > 0) {
  //         console.log("🧪 첫 rawHistoryData:", rawHistoryData[0]);
  //         const safeHistory = sanitizeHistoryData(rawHistoryData);
  //         console.log("🧼 필터링 후 데이터:", safeHistory[0]);
  //         // 원본 데이터 그대로 사용
  //         setOpcuaData((prevData) => ({
  //           ...prevData,
  //           [selectedTab]: {
  //             data: safeHistory[safeHistory.length - 1] || {},
  //             history: safeHistory,
  //           },
  //         }));
  //       }
  //     } else {
  //       console.warn("수신된 데이터가 없습니다");
  //       // 빈 데이터 설정
  //       setOpcuaData((prevData) => ({
  //         ...prevData,
  //         [selectedTab]: {
  //           data: {},
  //           history: [],
  //         },
  //       }));
  //     }
  //   } catch (e) {
  //     console.error("데이터 처리 오류:", e);
  //     setError("데이터 형식이 올바르지 않습니다");
  //   }
  // };

  const processHistoricalData = (data) => {
    try {
      const rawHistoryData = data.timeSeriesData || [];
      console.log("✅ 원본 데이터 수:", rawHistoryData.length);

      if (rawHistoryData.length > 0) {
        const safeHistory = sanitizeHistoryData(rawHistoryData);
        console.log("🧼 필터링 후 데이터:", safeHistory[0]);

        // setOpcuaData((prevData) => ({
        //   ...prevData,
        //   [selectedTab]: {
        //     data: safeHistory[safeHistory.length - 1] || {},
        //     history: safeHistory,
        //   },
        // }));
         // --- 수정된 부분: 모든 탭의 history에 전체 safeHistory 할당 ---
      setOpcuaData((prevData) => {
        const newState = { ...prevData };
        const lastDataPoint = safeHistory[safeHistory.length - 1] || {};

        // 모든 탭 이름 배열
        const allTabs = ["Total", "PCS1", "PCS2", "PCS3", "PCS4"];

        // 반복문을 사용하여 모든 탭의 history 업데이트
        allTabs.forEach(tab => {
          newState[tab] = {
            data: lastDataPoint, // 마지막 데이터는 공통으로 사용 (선택 사항)
            history: safeHistory, // !!! 핵심: 모든 탭에 동일한 전체 히스토리 할당 !!!
          };
        });

        console.log("🔄 상태 업데이트 완료. 모든 탭에 history 할당됨.", newState);
        return newState;
      });
      // --- 수정 끝 ---
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
      <div className="header">
        <h1>LPMS Historian</h1>
        <div className="date-picker-container">
          <DatePicker
            selected={startDate}
            onChange={handleStartDateChange}
            showTimeSelect
            timeIntervals={1} // 15에서 1로 변경
            dateFormat="yyyy-MM-dd HH:mm"
            className="date-picker"
            maxDate={new Date()}
          />
          <span className="date-separator">~</span>
          <DatePicker
            selected={endDate}
            onChange={handleEndDateChange}
            showTimeSelect
            timeIntervals={1} // 15에서 1로 변경
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

          {/* 눈에 보이지 않게 CSVLink 추가 */}
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
            onClick={handleExportData} // handleExportData는 현재 상태의 interval 사용
            className="export-button"
            disabled={exportLoading || loading}
            style={{ marginLeft: "10px" }}
          >
            {exportLoading ? "내보내는 중..." : "데이터 내보내기 (CSV)"}
          </button>
          {/* --- 추가: 내보내기 버튼 --- */}
          {/* <button
             onClick={handleExportData}
             className="export-button" // CSS 스타일링 필요
             disabled={exportLoading || loading} // 조회 중이거나 내보내기 중일 때 비활성화
             style={{ marginLeft: '10px' }} // 간단한 간격 추가
          >
            {exportLoading ? "내보내는 중..." : "데이터 내보내기 (CSV)"}
          </button> */}
          {/* ======================== */}
          {/* <div className="time-limit-message">
            ※ 최대 3시간 범위만 조회 가능합니다
          </div> */}
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}
      {/* 전역 로딩 표시는 제거 또는 유지 */}

      {/* 차트 영역 */}
      <div className="chart-section">
        <div className="chart-tabs">
          {["Total", "PCS1", "PCS2", "PCS3", "PCS4"].map((tab) => (
            <button
              key={tab}
              className={`tab-button ${selectedTab === tab ? "active" : ""}`}
              onClick={() => {
                setSelectedTab(tab);
              }}
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
              {loading ? (
                <div className="loading-spinner-container">
                  <div className="loading-spinner"></div>
                </div>
              ) : opcuaData.Total.history.length === 0 ? (
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
                <Plot
                  data={getFilteredChartData(
                    opcuaData[selectedTab].history,
                    selectedTab
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
                    maxWidth: "100%", // ✅ 최대 너비 제한
                    overflowX: "hidden", // ✅ 스크롤 방지
                  }}
                  config={{
                    responsive: true,
                    displayModeBar: true,
                    displaylogo: false,
                    locale: "ko",
                    modeBarButtonsToRemove: ["lasso2d", "select2d"],
                  }}
                />
              )}
            </div>
          )}

          {selectedTab === "PCS1" && (
            <div className="chart-wrapper">
              {loading ? (
                <div className="loading-spinner-container">
                  <div className="loading-spinner"></div>
                </div>
              ) : opcuaData.PCS1.history.length === 0 ? (
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
                <Plot
                  data={getFilteredChartData(
                    opcuaData[selectedTab].history,
                    selectedTab
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
                    maxWidth: "100%", // ✅ 최대 너비 제한
                    overflowX: "hidden", // ✅ 스크롤 방지
                  }}
                  config={{
                    responsive: true,
                    displayModeBar: true,
                    displaylogo: false,
                    locale: "ko",
                    modeBarButtonsToRemove: ["lasso2d", "select2d"],
                  }}
                />
              )}
            </div>
          )}

          {selectedTab === "PCS2" && (
            <div className="chart-wrapper">
              {loading ? (
                <div className="loading-spinner-container">
                  <div className="loading-spinner"></div>
                </div>
              ) : opcuaData.PCS2.history.length === 0 ? (
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
                <Plot
                  data={getFilteredChartData(
                    opcuaData[selectedTab].history,
                    selectedTab
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
                    maxWidth: "100%", // ✅ 최대 너비 제한
                    overflowX: "hidden", // ✅ 스크롤 방지
                  }}
                  config={{
                    responsive: true,
                    displayModeBar: true,
                    displaylogo: false,
                    locale: "ko",
                    modeBarButtonsToRemove: ["lasso2d", "select2d"],
                  }}
                />
              )}
            </div>
          )}

          {selectedTab === "PCS3" && (
            <div className="chart-wrapper">
              {loading ? (
                <div className="loading-spinner-container">
                  <div className="loading-spinner"></div>
                </div>
              ) : opcuaData.PCS3.history.length === 0 ? (
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
                <Plot
                  data={getFilteredChartData(
                    opcuaData[selectedTab].history,
                    selectedTab
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
                    maxWidth: "100%", // ✅ 최대 너비 제한
                    overflowX: "hidden", // ✅ 스크롤 방지
                  }}
                  config={{
                    responsive: true,
                    displayModeBar: true,
                    displaylogo: false,
                    locale: "ko",
                    modeBarButtonsToRemove: ["lasso2d", "select2d"],
                  }}
                />
              )}
            </div>
          )}

          {selectedTab === "PCS4" && (
            <div className="chart-wrapper">
              {loading ? (
                <div className="loading-spinner-container">
                  <div className="loading-spinner"></div>
                </div>
              ) : opcuaData.PCS4.history.length === 0 ? (
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
                <Plot
                  data={getFilteredChartData(
                    opcuaData[selectedTab].history,
                    selectedTab
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
                    maxWidth: "100%", // ✅ 최대 너비 제한
                    overflowX: "hidden", // ✅ 스크롤 방지
                  }}
                  config={{
                    responsive: true,
                    displayModeBar: true,
                    displaylogo: false,
                    locale: "ko",
                    modeBarButtonsToRemove: ["lasso2d", "select2d"],
                  }}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
