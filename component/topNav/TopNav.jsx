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
    } else if (type === "weatherpage") {
      router.push("/weatherpage");
    } else if (type === "weatherReact") {
      router.push("/twoWeather");
    } else if (type === "realtime") {
      router.push("/realtime");
    } else if (type === "realtime2") {
      router.push("/realtime2");
    } else if (type === "futureWeatherPage") {
      router.push("/futureWeatherPage");
    } else if (type === "opcua") {
      router.push("/opcua");
    } else if (type === "opcuaHistorical") {
      router.push("/opcuaHistorical");
    }
  };
  return (
    <div className="top_nav_wrap">
      {/* <div
        className={`top_nav_title ${
          choice_top_nav === "calculator" ? "on" : ""
        }`}
        onClick={() => handleTopNavClick("calculator")}
      >
        계산기
      </div> */}
      {/* 삭제 */}
      {/* <span>|</span>
      <div
        className={`top_nav_title ${choice_top_nav === "weather" ? "on" : ""}`}
        onClick={() => handleTopNavClick("weather")}
      >
        기상청
      </div> */}
      {/* 삭제끝 */}
      {/* <span>|</span>
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
        기상청2
      </div>
      <span>|</span>
      <div
        className={`top_nav_title ${choice_top_nav === "realtime" ? "on" : ""}`}
        onClick={() => handleTopNavClick("realtime")}
      >
        실시간(Modbus)
      </div>
      <span>|</span>
      <div
        className={`top_nav_title ${choice_top_nav === "realtime2" ? "on" : ""}`}
        onClick={() => handleTopNavClick("realtime2")}
      >
        실시간2(DB쿼리)
      </div> */}
      {/* 삭제 */}
      {/* <span>|</span>
      <div
        className={`top_nav_title ${choice_top_nav === "futureWeatherPage" ? "on" : ""}`}
        onClick={() => handleTopNavClick("futureWeatherPage")}
      >
        단기예보
      </div> */}
      {/* <span>|</span>
      <div
        className={`top_nav_title ${choice_top_nav === "opcua" ? "on" : ""}`}
        onClick={() => handleTopNavClick("opcua")}
      >
        OPC UA
      </div> */}
      {/* 삭제끝 */}
      {/* <span>|</span> */}
      <div
        className={`top_nav_title ${choice_top_nav === "opcuaHistorical" ? "on" : ""}`}
        onClick={() => handleTopNavClick("opcuaHistorical")}
      >
        LPMS Historian
      </div>
    </div>
  );
}
