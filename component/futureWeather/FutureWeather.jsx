"use client";
import axios from "axios";
import { useEffect, useState } from "react";
import "./futureWeather.scss";
export default function FutureWeather() {
  const [IsLoading, setIsLoading] = useState(false);
  const [totalData, setTotalData] = useState([]);
  const [selectedRegion, setSelectedRegion] = useState("119");
  const [stnData, setStnData] = useState();
  const [taData, setTaData] = useState();
  const [stData, setStData] = useState();
  useEffect(() => {
    fetchFutureWeatherData();
  }, []);
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
    {IsLoading ? (
      <div>로딩 중...</div>
    ) : (
      <div className="future-weather-content">
        <pre>{JSON.stringify(totalData, null, 2)}</pre>
      </div>
    )}
    </div>
  );
}
