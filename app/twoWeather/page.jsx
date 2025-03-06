"use client";
import axios from "axios";
import { useState } from "react";
import WeatherAll from "../../component/weatherAll/WeatherAll";
import "./twoWeather.scss";

export default function TwoWeather() {
  // 자식 컴포넌트에서 받을 데이터를 저장할 상태
  const [weatherData1, setWeatherData1] = useState({
    selectedRegion: "",
    date_first: "",
    date_last: "",
  });
  const [weatherData2, setWeatherData2] = useState({
    selectedRegion: "",
    date_first: "",
    date_last: "",
  });
  const [tempDiff, setTempDiff] = useState(0);
  const [region1Average, setRegion1Average] = useState(0);
  const [region2Average, setRegion2Average] = useState(0);

  // 자식 컴포넌트로부터 데이터 받기
  const handleWeatherData1 = (data) => {
    setWeatherData1(data);
  };
  // 자식 컴포넌트로부터 데이터 받기
  const handleWeatherData2 = (data) => {
    setWeatherData2(data);
  };

  const calculateTempDiff = async () => {
    try {
      const response = await axios.get(`http://localhost:8080/api/temp-diff`, {
        params: {
          region1: weatherData1.selectedRegion,
          region2: weatherData2.selectedRegion,
          dateFirst1: weatherData1.date_first.replace(/-/g, ""), // 날짜 포맷 변환
          dateLast1: weatherData1.date_last.replace(/-/g, ""),
          dateFirst2: weatherData2.date_first.replace(/-/g, ""),
          dateLast2: weatherData2.date_last.replace(/-/g, ""),
        },
      });
      console.log("평균 기온 차이:", response.data);
      setRegion1Average(response.data.region1Average);
      setRegion2Average(response.data.region2Average);
      setTempDiff(response.data.temperatureDifference);
    } catch (error) {
      console.error("오류 발생:", error);
    }
  };

  return (
    <div className="two_weather_container">
      <h1 className="two_weather_title">두 개의 지상 관측자료 조회</h1>
      <button onClick={calculateTempDiff}>두 지역 평균 기온 차이 조회</button>
      <p>
        첫번째 지역 평균 기온: {region1Average}, 두번째 지역 평균 기온:{" "}
        {region2Average}, 두 지역 평균 기온 차이: {tempDiff}
      </p>
      <div className="two_weather_wrap">
        <WeatherAll
          onWeatherDataChange={handleWeatherData1}
          componentId="map1"
        />
        <WeatherAll
          onWeatherDataChange={handleWeatherData2}
          componentId="map2"
        />
      </div>
    </div>
  );
}
