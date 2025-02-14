"use client";
import { useEffect, useRef, useState } from "react";
import "./weatherMap.scss";

export default function WeatherMap() {
  const mapContainer = useRef(null);
  const [clickPosition, setClickPosition] = useState(null);

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
          setClickPosition({
            lat: latlng.getLat(),
            lng: latlng.getLng(),
          });
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
            선택한 위치 - 위도: {clickPosition.lat.toFixed(6)}, 경도:{" "}
            {clickPosition.lng.toFixed(6)}
          </p>
        </div>
      )}
    </div>
  );
}
