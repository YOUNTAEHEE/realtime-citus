// public/historicalWorker.js

let accumulatedData = [];

// 데이터 정제 함수 (로깅 강화)
const sanitizeHistoryData = (data) => {
  console.log(`Worker: Sanitizing ${data?.length ?? 0} items.`); // 배열 길이 확인
  if (!Array.isArray(data)) {
    console.error("Worker: sanitizeHistoryData received non-array:", data);
    // 데이터가 배열이 아니면 에러 처리 또는 빈 배열 반환
    // throw new Error("Invalid data received: not an array");
    return [];
  }
  return data.map((item, index) => {
    // 맵 함수 시작 시 각 아이템 로깅
    console.log(
      `Worker: Processing item index ${index}:`,
      JSON.stringify(item)
    ); // 객체 내용을 보려면 stringify 사용

    // 아이템 타입 체크 추가
    if (typeof item !== "object" || item === null) {
      console.warn(
        `Worker: Item at index ${index} is not a valid object:`,
        item
      );
      // 유효하지 않은 아이템 처리 (예: 빈 객체 반환 또는 에러 발생)
      // return {}; // 에러를 발생시켜 onerror에서 잡도록 주석 처리
      throw new Error(`Invalid item at index ${index}: not an object`);
    }

    try {
      // 기존 필터링 로직
      const newItem = Object.fromEntries(
        Object.entries(item).filter(([k, v]) => {
          // 매우 상세한 로깅 (필요 시 주석 해제)
          // console.log(`   [Item ${index}] Filtering key: "${k}", Type: ${typeof v}, Value:`, v);
          return typeof v !== "object" || k === "timestamp";
        })
      );
      // console.log(`   [Item ${index}] Filtered result:`, JSON.stringify(newItem)); // 처리 결과 로깅
      return newItem;
    } catch (e) {
      // 특정 아이템 처리 중 에러 발생 시 로깅
      console.error(`Worker: Error processing item at index ${index}:`, e);
      console.error(
        "Worker: Original item that caused error:",
        JSON.stringify(item)
      );
      // 에러를 다시 던져서 self.onerror 에서 잡히도록 함
      throw e;
    }
  });
};

// 메인 스레드로부터 메시지를 받는 리스너
self.onmessage = function (event) {
  const { type, payload } = event.data;

  switch (type) {
    case "chunk":
      // 데이터 청크 수신 시 누적
      if (payload && Array.isArray(payload)) {
        accumulatedData.push(...payload);
      }
      // console.log(`Worker: Received chunk, accumulated ${accumulatedData.length} items.`); // 개발 중 로그
      break;
    case "end":
      // 데이터 수신 완료, 처리 시작
      console.log(
        `Worker: Received end signal. Processing ${accumulatedData.length} items.`
      ); // 개발 중 로그
      try {
        const processedData = sanitizeHistoryData(accumulatedData);
        // 처리된 데이터를 메인 스레드로 전송
        self.postMessage({ type: "processedData", payload: processedData });
        // console.log(`Worker: Sent processed data (${processedData.length} items) to main thread.`); // 개발 중 로그
      } catch (error) {
        // sanitizeHistoryData 내부에서 던져진 에러 포함, 모든 처리 에러 여기서 잡힘
        console.error(
          "Worker: Error during data processing in 'end' handler:",
          error
        ); // 전체 에러 객체 로깅
        // 에러 발생 시 메인 스레드로 에러 메시지 전송
        self.postMessage({
          type: "error",
          payload: `Processing error: ${error.message || "Unknown error"}`,
        }); // 에러 메시지 또는 기본 메시지 전송
      } finally {
        // 처리 후 누적 데이터 초기화
        accumulatedData = [];
      }
      break;
    case "reset":
      // 데이터 초기화 요청 (예: 새로운 조회 시작 시)
      accumulatedData = [];
      // console.log("Worker: Data reset."); // 개발 중 로그
      break;
    default:
      console.warn("Worker: Unknown message type received:", type);
  }
};

// 워커 자체에서 발생하는 잡히지 않은 에러 처리 (로깅 강화)
self.onerror = function (errorEvent) {
  // ErrorEvent 객체는 message, filename, lineno 등의 속성을 가짐
  console.error("Worker: === Uncaught Error in Worker ===");
  console.error("Worker: Message:", errorEvent.message);
  console.error("Worker: Filename:", errorEvent.filename);
  console.error("Worker: Lineno:", errorEvent.lineno);
  console.error("Worker: Colno:", errorEvent.colno);
  console.error("Worker: Error Object:", errorEvent.error); // 원본 에러 객체 (존재한다면)
  console.error("Worker: Full ErrorEvent:", errorEvent); // 전체 ErrorEvent 객체
  console.error("Worker: ===============================");

  // 메인 스레드로 에러 정보 전송 시도
  // 메인 스레드에서는 이 정보를 받아 사용자에게 표시하거나 추가 처리 가능
  self.postMessage({
    type: "error", // 동일한 에러 타입 사용
    payload: `Worker internal error: ${
      errorEvent.message || "Unknown error"
    } at ${errorEvent.filename || "?"}:${errorEvent.lineno || "?"}`,
  });

  // 기본 동작 (에러 전파)을 막으려면 true 반환 (선택적)
  // return true; // 일반적으로 false를 반환하거나 아무것도 반환하지 않아 에러가 콘솔에 표시되도록 둠
};
