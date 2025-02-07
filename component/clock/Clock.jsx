"use client";
import { useEffect, useState } from "react";
import TopNav from "../topNav/TopNav";
export default function Clock() {
  const [currentTime, setCurrentTime] = useState("");
  useEffect(() => {
    // 초기 시간 설정
    setCurrentTime(
      new Date().toLocaleTimeString("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      })
    );

    const timer = setInterval(() => {
      setCurrentTime(
        new Date().toLocaleTimeString("ko-KR", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        })
      );
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="clock_wrap">
      <div className="clock_title">현재 시각 {currentTime}</div>
      <TopNav />
    </div>
  );
}
