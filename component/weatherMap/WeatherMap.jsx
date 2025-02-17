"use client";
import axios from "axios";
import { useEffect, useRef, useState } from "react";
import "./weatherMap.scss";

export default function WeatherMap({ onStationNumberSelect }) {
  const mapContainer = useRef(null);
  const [clickPosition, setClickPosition] = useState(null);
  const [weatherData, setWeatherData] = useState(null);
  const [error, setError] = useState(null);
  const fetchWeatherData = async (lat, lng) => {
    try {
      if (!lat || !lng) return;
      console.log("요청 보낼 위도:", lat, "경도:", lng); // 디버깅 로그 추가
     
     
      const response = await axios.get(
        "http://localhost:8080/api/stations/nearest",
        {
          params: {
            lat: lat,
            lng: lng,
          },
        }
      );

      console.log("API 응답:", response.data);
      setWeatherData(response.data);
      // 지점 번호 추출 및 부모 컴포넌트로 전달
      if (response.data && response.data.stnId) {
        onStationNumberSelect(response.data);
      }
      setError(null);
    } catch (error) {
      console.error("날씨 데이터 조회 실패:", error);
      setError("날씨 데이터를 가져오는데 실패했습니다.");
    }
  };

  useEffect(() => {
    const loadKakaoMapScript = () => {
      return new Promise((resolve, reject) => {
        if (window.kakao && window.kakao.maps) {
          resolve(window.kakao.maps);
          return;
        }

        const script = document.createElement("script");
        script.type = "text/javascript";
        script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_KEY}&autoload=false`;

        script.onload = () => {
          if (window.kakao && window.kakao.maps) {
            window.kakao.maps.load(() => {
              console.log("카카오맵 로드 완료");
              resolve(window.kakao.maps);
            });
          }
        };

        document.head.appendChild(script);
      });
    };

    const initializeMap = async () => {
      try {
        const maps = await loadKakaoMapScript();

        const options = {
          center: new maps.LatLng(37.51100661425726, 127.06162026853143),
          level: 3,
        };

        const map = new maps.Map(mapContainer.current, options);

        // 마커 생성
        const marker = new maps.Marker({
          position: map.getCenter(),
        });
        marker.setMap(map);

        // 클릭 이벤트 등록
        maps.event.addListener(map, "click", function (mouseEvent) {
          const latlng = mouseEvent.latLng;

          // 마커 위치 이동
          marker.setPosition(latlng);

          // 클릭 위치 상태 업데이트
          const newPosition = {
            lat: latlng.getLat().toFixed(8), // Math.floor로 정수 변환
            lng: latlng.getLng().toFixed(8),
          };
          setClickPosition(newPosition); // 내부 상태 업데이트

          fetchWeatherData(newPosition.lat, newPosition.lng);
        });

        console.log("지도 초기화 완료");
      } catch (error) {
        console.error("지도 초기화 실패:", error);
      }
    };

    initializeMap();

    return () => {
      const scriptElement = document.querySelector(
        'script[src*="dapi.kakao.com"]'
      );
      if (scriptElement) {
        document.head.removeChild(scriptElement);
      }
    };
  }, []);


  return (
    <div className="map_wrap">
      <h3 className="map_title">관측소 위치</h3>
      <div
        ref={mapContainer}
        style={{
          width: "100%",
          height: "400px",
          borderRadius: "8px",
          border: "1px solid #ddd",
          position: "relative",
          zIndex: 1,
        }}
      />
      {clickPosition && (
        <div className="click-position">
          <p>
            선택한 위치 - 위도: {clickPosition.lat}, 경도:
            {clickPosition.lng}
          </p>
        </div>
      )}
    </div>
  );
}
