"use client";
import axios from "axios";
import { useEffect, useState } from "react";
import WeatherMap from "../weatherMap/WeatherMap";
import "./futureWeather.scss";
export default function FutureWeather() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSearch, setIsSearch] = useState(false);
  const [totalData, setTotalData] = useState([]);
  const [selectedRegion, setSelectedRegion] = useState("119");
  const [stationOptions, setStationOptions] = useState([
    { stnId: "108", stnName: "서울" },
    { stnId: "119", stnName: "수원" },
    { stnId: "112", stnName: "인천" },
    { stnId: "100", stnName: "대관령" },
    { stnId: "101", stnName: "춘천" },
  ]);
  const [stnData, setStnData] = useState();
  const [taData, setTaData] = useState();
  const [stData, setStData] = useState();

  const handleSearch = () => {
    setIsLoading(true); // 로딩 상태 시작
    setIsSearch(true);
    fetchFutureWeatherData();
  };
  // WeatherMap에서 선택된 관측소 추가
  const handleStationSelect = (stationData) => {
    if (stationData && stationData.stnId) {
      console.log("✅ 선택된 관측소 데이터:", stationData);

      // 지역이 변경되었는지 확인
      if (selectedRegion !== stationData.stnId) {
        setSelectedRegion(stationData.stnId);
        setIsSearch(true); // 데이터 다시 가져오기 트리거
      }

      setStationOptions((prevOptions) => {
        const exists = prevOptions.some(
          (opt) => opt.stnId === stationData.stnId
        );

        if (!exists) {
          console.log("🔄 새로운 관측소 추가됨:", stationData); // 🚀 새로운 값 추가 확인
          return [
            ...prevOptions,
            { stnId: stationData.stnId, stnName: stationData.stnName },
          ];
        } else {
          console.log("⚠️ 이미 존재하는 관측소:", stationData.stnId); // 🚀 중복 방지 확인
          return prevOptions; // 중복 방지
        }
      });
    }
  };
  useEffect(() => {
    console.log("🚀 관측소 목록 변경됨:", stationOptions);
  }, [stationOptions]); // ✅ `stationOptions` 변경될 때마다 콘솔 출력

  const fetchFutureWeatherData = async () => {
    try {
      setIsLoading(true);

      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/short-term-forecast`,
        {
          params: {
            region: selectedRegion,
          },
        }
      );

      // 백엔드에서 이미 파싱된 데이터를 받음
      const data = response.data;
      setTotalData(data);
      setStnData(totalData.map((item) => item.STN));
      setTaData(totalData.map((item) => item.TA));
      setStData(totalData.map((item) => item.ST));
      console.log(stnData, taData, stData);
      setIsLoading(false);
    } catch (error) {
      console.error("API 호출 오류:", error);
    } finally {
      setIsLoading(false); // 로딩 종료
    }
  };
  return (
    <div className="future-weather-container">
      <h1>Future Weather</h1>
      <div className="weather_search_box">
        <select
          className="weather_search_select"
          onChange={(e) => setSelectedRegion(e.target.value)}
          value={selectedRegion}
          disabled={isLoading}
        >
          {stationOptions.map((station) => (
            <option key={station.stnId} value={station.stnId}>
              {station.stnName}
            </option>
          ))}
        </select>

        <button
          className={`weather_search_btn ${isLoading ? "loading" : ""}`}
          onClick={handleSearch}
          disabled={isLoading}
        >
          {isLoading ? "검색 중..." : "검색"}
        </button>
      </div>
      <WeatherMap
        onStationNumberSelect={handleStationSelect}
        // selectedPosition={selectedRegion}
        mapId={"future-weather"}
      />

      {isLoading ? (
        <div>로딩 중...</div>
      ) : (
        <div className="future-weather-content">
          <pre>{JSON.stringify(totalData, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
