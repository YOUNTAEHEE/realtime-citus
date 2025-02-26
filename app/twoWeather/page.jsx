"use client";
import WeatherAll from "../../component/weatherAll/WeatherAll";
import "./twoWeather.scss";

export default function TwoWeather() {
  return (
    <div className="two_weather_container">
      <h1 className="two_weather_title">두 개의 지상 관측자료 조회</h1>

      <div className="two_weather_wrap">
        <WeatherAll />
        <WeatherAll />
      </div>
    </div>
  );
}
