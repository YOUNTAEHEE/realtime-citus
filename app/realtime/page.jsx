"use client";
import { useEffect, useState } from "react";

export default function RealtimePage() {
  const [data, setData] = useState({ temperature: 0, humidity: 0 });
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const ws = new WebSocket("ws://localhost:8080/modbus");

    ws.onopen = () => {
      console.log("WebSocket 연결됨");
      setConnected(true);
      setError(null);
    };

    ws.onmessage = (event) => {
      try {
        const newData = JSON.parse(event.data);
        setData(newData);
      } catch (e) {
        console.error("데이터 파싱 오류:", e);
        setError("데이터 형식 오류");
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket 오류:", error);
      setError("연결 오류");
      setConnected(false);
    };

    ws.onclose = () => {
      console.log("WebSocket 연결 종료");
      setConnected(false);
    };

    return () => {
      ws.close();
    };
  }, []);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">실시간 모니터링</h1>
      <div className="mb-2">
        연결 상태: {connected ? "연결됨" : "연결 안됨"}
      </div>
      {error && <div className="text-red-500 mb-2">오류: {error}</div>}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 border rounded">
          <h2 className="font-bold">온도</h2>
          <p className="text-2xl">{data.temperature}°C</p>
        </div>
        <div className="p-4 border rounded">
          <h2 className="font-bold">습도</h2>
          <p className="text-2xl">{data.humidity}%</p>
        </div>
      </div>
    </div>
  );
}
