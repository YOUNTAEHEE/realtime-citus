"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import "./topNav.scss";
export default function TopNav() {
  const router = useRouter();
  const [choice_top_nav, setChoice_top_nav] = useState("calculator");
  const handleTopNavClick = (type) => {
    setChoice_top_nav(type);
    if (type === "calculator") {
      router.push("/calculator/standard");
    } else if (type === "weather") {
      router.push("/weather");
    } else if (type === "weatherpage") {
      router.push("/weatherpage");
    } else if (type === "weatherReact") {
      router.push("/weatherReact");
    } else if (type === "realtime") {
      router.push("/realtime");
    }
  };
  return (
    <div className="top_nav_wrap">
      <div
        className={`top_nav_title ${
          choice_top_nav === "calculator" ? "on" : ""
        }`}
        onClick={() => handleTopNavClick("calculator")}
      >
        계산기
      </div>
      {/* <span>|</span>
      <div
        className={`top_nav_title ${choice_top_nav === "weather" ? "on" : ""}`}
        onClick={() => handleTopNavClick("weather")}
      >
        기상청
      </div> */}
      <span>|</span>
      <div
        className={`top_nav_title ${
          choice_top_nav === "weatherpage" ? "on" : ""
        }`}
        onClick={() => handleTopNavClick("weatherpage")}
      >
        기상청
      </div>
      <span>|</span>
      <div
        className={`top_nav_title ${
          choice_top_nav === "weatherReact" ? "on" : ""
        }`}
        onClick={() => handleTopNavClick("weatherReact")}
      >
        기상청2(리액트 프로젝트용)
      </div>
      <span>|</span>
      <div
        className={`top_nav_title ${choice_top_nav === "realtime" ? "on" : ""}`}
        onClick={() => handleTopNavClick("realtime")}
      >
        실시간(Modbus)
      </div>
    </div>
  );
}
