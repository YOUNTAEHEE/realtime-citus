"use client";
import dynamic from "next/dynamic";

import axios from "axios";
import "chart.js/auto"; // 🔥 Chart.js에서 모든 필수 요소를 자동으로 등록!
import { useEffect, useState } from "react";
import { Bar } from "react-chartjs-2";
// import { Bar, Line } from "react-chartjs-2";
import { BeatLoader } from "react-spinners";
// import { Barchart1, Linechart } from "../../../commondata/chartsdata";
// import PageHeader from "../../../layouts/layoutcomponents/pageheader";
import "./weatherChart.scss";
const WeatherMap = dynamic(
  () => import("../../component/weatherMap/WeatherMap"),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          width: "100%",
          height: "400px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "1px solid #ddd",
          borderRadius: "8px",
        }}
      >
        지도를 불러오는 중...
      </div>
    ),
  }
);

const FutureWeather = dynamic(
  () => import("../../component/futureWeather/FutureWeather"),
  {
    ssr: false,
    loading: () => <BeatLoader color="#b19ae0" />,
  }
);
// Chart 컴포넌트를 dynamic import로 변경
const Chart = dynamic(
  () =>
    Promise.all([
      import("chart.js"),
      import("react-chartjs-2"),
      import("chartjs-plugin-zoom"),
    ]).then(([ChartModule, ReactChartJS, ZoomPlugin]) => {
      const {
        Chart,
        CategoryScale,
        LinearScale,
        PointElement,
        LineElement,
        Title,
        Tooltip,
        Legend,
      } = ChartModule;

      // Chart.js 컴포넌트 등록
      Chart.register(
        CategoryScale,
        LinearScale,
        PointElement,
        LineElement,
        Title,
        Tooltip,
        Legend,
        ZoomPlugin.default // zoom plugin은 default export를 사용
      );

      return ReactChartJS.Line;
    }),
  {
    ssr: false,
    loading: () => <BeatLoader color="#b19ae0" />,
  }
);

const colors = {
  temperature: {
    main: "rgb(255, 99, 132)",
    background: "rgba(255, 99, 132, 0.1)",
    light: "rgba(255, 99, 132, 0.5)",
  },
  humidity: {
    main: "rgb(75, 192, 192)",
    background: "rgba(75, 192, 192, 0.1)",
    light: "rgba(75, 192, 192, 0.5)",
  },
  windSpeed: {
    main: "rgb(53, 162, 235)",
    background: "rgba(53, 162, 235, 0.1)",
    light: "rgba(53, 162, 235, 0.5)",
  },
  windDirection: {
    main: "rgb(255, 159, 64)",
    background: "rgba(255, 159, 64, 0.1)",
    light: "rgba(255, 159, 64, 0.5)",
  },
};

// ChartJS.register(
//   CategoryScale,
//   LinearScale,
//   PointElement,
//   LineElement,
//   BarElement,
//   Title,
//   Tooltip,
//   Legend,
//   zoomPlugin
// );

// 차트 공통 옵션 생성
const getChartOptions = (isDarkMode) => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    mode: "nearest", // 데이터 포인트에 가까운 값 선택
    axis: "x", // X축 기준으로 동작
    intersect: false,
  },
  plugins: {
    legend: {
      labels: {
        color: isDarkMode ? "#fff" : "#666", // 범례 색상
      },
    },
    title: {
      color: isDarkMode ? "#fff" : "#666", // 제목 색상
    },

    zoom: {
      pan: {
        enabled: true, // 팬 기능 활성화
        mode: "xy", // X축 방향으로만 이동 가능
        threshold: 10, // 드래그 시작을 위한 최소 이동 거리(px)
        // onPanStart: () => {
        //   document.querySelector(".weather_chart").style.cursor = "grabbing";
        // },
        // onPanComplete: () => {
        //   document.querySelector(".weather_chart").style.cursor = "grab";
        // },
      },
      zoom: {
        wheel: {
          enabled: true,
        },
        pinch: {
          enabled: true,
        },
        mode: "x",
      },
    },
  },
  scales: {
    x: {
      ticks: {
        color: isDarkMode ? "#fff" : "#666", // X축 레이블 색상
      },
      grid: {
        color: isDarkMode ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)", // X축 그리드 색상
      },
    },
    y: {
      type: "linear",
      ticks: {
        color: isDarkMode ? "#fff" : "#666", // Y축 레이블 색상
      },
      grid: {
        color: isDarkMode ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)", // Y축 그리드 색상
      },
    },
  },
});
export const Linechart = {
  responsive: true,
  aspectRatio: 2,
  plugins: {
    legend: {
      position: "top",
    },
    title: {
      display: false,
      text: "Chart.js Line Chart",
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: "rgba(119, 119, 142, 0.2)",
        },
      },
      x: {
        grid: {
          color: "rgba(119, 119, 142, 0.2)",
        },
      },
    },
    zoom: {
      pan: {
        enabled: true, // 팬 기능 활성화
        mode: "xy", // X축 방향으로만 이동 가능
        threshold: 10, // 드래그 시작을 위한 최소 이동 거리(px)
        // onPanStart: () => {
        //   document.querySelector(".weather_chart").style.cursor = "grabbing";
        // },
        // onPanComplete: () => {
        //   document.querySelector(".weather_chart").style.cursor = "grab";
        // },
      },
      zoom: {
        wheel: {
          enabled: true,
        },
        pinch: {
          enabled: true,
        },
        mode: "x",
      },
    },
  },
};
// linechartdata
export const linechartdata = {
  labels: [],
  datasets: [
    {
      label: "기온 (°C)",
      data: [],
      backgroundColor: "transparent",
      borderColor: "#6259ca",
      borderWidth: 3,
      pointBackgroundColor: "#ffffff",
      pointRadius: 2,
      fill: true,
      tension: 0.4,
    },
    {
      label: "풍속 (m/s)",
      data: [],
      backgroundColor: "transparent",
      borderColor: "#eb6f33",
      borderWidth: 3,
      pointBackgroundColor: "#ffffff",
      pointRadius: 2,
      fill: true,
      tension: 0.4,
    },
  ],
};

// Bar-chart 1
export const Barchart1 = {
  responsive: true,
  plugins: {
    legend: {
      position: "top",
    },
    zoom: {
      pan: {
        enabled: true, // 팬 기능 활성화
        mode: "xy", // X축 방향으로만 이동 가능
        threshold: 10, // 드래그 시작을 위한 최소 이동 거리(px)
        // onPanStart: () => {
        //   document.querySelector(".weather_chart").style.cursor = "grabbing";
        // },
        // onPanComplete: () => {
        //   document.querySelector(".weather_chart").style.cursor = "grab";
        // },
      },
      zoom: {
        wheel: {
          enabled: true,
        },
        pinch: {
          enabled: true,
        },
        mode: "x",
      },
    },
    title: {
      display: false,
      text: "Chart.js Line Chart",
    },
  },
};
//barchart1data
export const barchart1data = {
  labels: [], // 여기에 날짜/시간이 들어갈 것입니다
  datasets: [
    {
      label: "풍속 (m/s)",
      data: [], // 여기에 풍속 데이터가 들어갈 것입니다
      backgroundColor: "#9877f9",
      borderColor: "#9877f9",
      borderWidth: 2.0,
      pointBackgroundColor: "#ffffff",
    },
  ],
};
export const updateWindSpeedChart = (weatherData) => {
  try {
    if (!weatherData || !Array.isArray(weatherData)) {
      console.error("날씨 데이터가 올바르지 않습니다:", weatherData);
      return;
    }

    barchart1data.labels = weatherData.map((item) => item.YYMMDDHHMI);
    barchart1data.datasets[0].data = weatherData.map((item) => item.WS);

    console.log("차트 데이터 업데이트 완료:", barchart1data);
  } catch (error) {
    console.error("차트 데이터 업데이트 실패:", error);
  }
};
// Bar-chart 2
export const Barchart2 = {
  responsive: true,
  plugins: {
    legend: {
      position: "top",
    },
    title: {
      display: false,
      text: "Chart.js Line Chart",
    },
  },
};
export default function WeatherAll({
  onWeatherDataChange,
  componentId = "default",
}) {
  // const [selectedPosition, setSelectedPosition] = useState(null);
  const [isClient, setIsClient] = useState(false);
  const [date_temp_search, setDate_temp_search] = useState("");
  const [temp_search, setTemp_search] = useState("high_temp");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState("119");
  const [stationOptions, setStationOptions] = useState([
    { stnId: "108", stnName: "서울" },
    { stnId: "119", stnName: "수원" },
    { stnId: "112", stnName: "인천" },
    { stnId: "100", stnName: "대관령" },
    { stnId: "101", stnName: "춘천" },
  ]);
  const [isSearch, setIsSearch] = useState(false);
  const [totalData, setTotalData] = useState([]);
  const [showTable, setShowTable] = useState(false);
  const [chartData, setChartData] = useState({
    labels: [],
    datasets: [
      {
        label: "기온 (°C)",
        data: [],
        borderColor: "rgb(255, 99, 132)",
        backgroundColor: "rgba(255, 99, 132, 0.5)",
      },
      {
        label: "상대습도 (%)",
        data: [],
        borderColor: "rgb(75, 192, 192)",
        backgroundColor: "rgba(75, 192, 192, 0.5)",
      },
      {
        label: "풍속 (m/s)",
        data: [],
        borderColor: "rgb(53, 162, 235)",
        backgroundColor: "rgba(53, 162, 235, 0.5)",
      },
      {
        label: "풍향 (deg)",
        data: [],
        borderColor: "rgb(255, 159, 64)",
        backgroundColor: "rgba(255, 159, 64, 0.5)",
      },
    ],
  });
  const [chartData2, setChartData2] = useState({
    labels: [],
    datasets: [
      {
        label: "기압변화량 (hPa)",
        data: [],
        borderColor: "rgb(255, 99, 132)",
        backgroundColor: "rgba(255, 99, 132, 0.5)",
      },
      {
        label: "이슬점온도 (°C)",
        data: [],
        borderColor: "rgb(53, 162, 235)",
        backgroundColor: "rgba(53, 162, 235, 0.5)",
      },
    ],
  });

  // 각 차트의 타입을 관리하는 state 추가
  const [chart1Type, setChart1Type] = useState("line");
  const [chart2Type, setChart2Type] = useState("line");

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

  const formatAPIDate = (date) => {
    console.log("date", date);
    const formattedDate = date.replace(/-/g, "").trim();
    console.log("formattedDate", formattedDate);
    return formattedDate;
  };
  const getTodayDate = () => {
    const now = new Date();
    let year = now.getFullYear(); // 년도
    let month = String(now.getMonth() + 1).padStart(2, "0"); // 월
    let day = String(now.getDate()).padStart(2, "0"); // 날짜
    return `${year}-${month}-${day}`;
  };

  // parseWeather 함수 제거 (백엔드에서 처리)
  const [date_first, setDate_first] = useState(getTodayDate());
  const [date_last, setDate_last] = useState(getTodayDate());
  const fetchWeatherData = async () => {
    try {
      setIsLoading(true);
      console.log(
        "검색 시작 - 시작일:",
        date_first,
        "종료일:",
        date_last,
        "지역:",
        selectedRegion
      );

      const formattedDateFirst = formatAPIDate(date_first);
      const formattedDateLast = formatAPIDate(date_last);
      console.log(
        "변환된 날짜 - 시작:",
        formattedDateFirst,
        "종료:",
        formattedDateLast
      );

      const response = await axios.get(`http://${process.env.NEXT_PUBLIC_API_URL}/api/weather`, {
        params: {
          "date-first": formattedDateFirst,
          "date-last": formattedDateLast,
          region: selectedRegion,
        },
      });

      console.log("API 응답:", response.data);

      // 백엔드에서 이미 파싱된 데이터를 받음
      const data = response.data;
      setTotalData(data);

      if (data && Array.isArray(data) && data.length > 0) {
        setChartData({
          labels: data.map((item) => formatDateTime(item.YYMMDDHHMI)),
          datasets: [
            {
              label: "기온 (°C)",
              data: data.map((item) => parseFloat(item.TA) || 0),
              borderColor: "rgb(255, 99, 132)",
              backgroundColor: "rgba(255, 99, 132, 0.5)",
              yAxisID: "y-temperature",
            },
            {
              label: "상대습도 (%)",
              data: data.map((item) => parseFloat(item.HM) || 0),
              borderColor: "rgb(75, 192, 192)",
              backgroundColor: "rgba(75, 192, 192, 0.5)",
              yAxisID: "y-humidity",
            },
          ],
        });
        setChartData2({
          labels: data.map((item) => formatDateTime(item.YYMMDDHHMI)),
          datasets: [
            {
              label: "풍속 (m/s)",
              data: data.map((item) => parseFloat(item.WS) || 0),
              borderColor: "rgb(53, 162, 235)",
              backgroundColor: "rgba(53, 162, 235, 0.5)",
              yAxisID: "y-windSpeed",
            },
            {
              label: "풍향 (deg)",
              data: data.map((item) => parseFloat(item.WD) || 0),
              borderColor: "rgb(255, 159, 64)",
              backgroundColor: "rgba(255, 159, 64, 0.5)",
              yAxisID: "y-windDirection",
            },
          ],
        });
      } else {
        console.error("데이터가 없거나 형식이 잘못되었습니다");
      }
    } catch (error) {
      console.error("API 호출 오류:", error);
    } finally {
      setIsLoading(false); // 로딩 종료
    }
  };
  // 날짜 포맷 변환 함수 추가
  const formatDateTime = (dateTimeString) => {
    if (!dateTimeString) return "";

    // 202501210000 형식을 2025-01-21 00:00 형식으로 변환
    const year = dateTimeString.substring(0, 4);
    const month = dateTimeString.substring(4, 6);
    const day = dateTimeString.substring(6, 8);
    const hour = dateTimeString.substring(8, 10);
    const minute = dateTimeString.substring(10, 12);

    return `${year}-${month}-${day} ${hour}:${minute}`;
  };
  const handleSearch = () => {
    setIsLoading(true); // 로딩 상태 시작
    setIsSearch(true);
    onWeatherDataChange({
      selectedRegion,
      date_first,
      date_last,
    });
  };
  const [tempSearchResult, setTempSearchResult] = useState({
    datetime: "",
    temperature: "",
    windSpeed: "",
    humidity: "",
    windDirection: "",
  });

  //  // 값이 변경될 때마다 부모에게 전달
  //  useEffect(() => {
  //   if (selectedRegion && date_first && date_last) {
  //     onWeatherDataChange({
  //       selectedRegion,
  //       date_first,
  //       date_last,
  //     });
  //   }
  // }, [selectedRegion, date_first, date_last, onWeatherDataChange]);

  const handleTempSearch = async () => {
    try {
      setIsLoading(true);
      console.log("=== 온도 검색 시작 ===");
      console.log("검색 파라미터:", {
        date: formatAPIDate(date_temp_search),
        type: temp_search,
        region: selectedRegion,
      });

      if (!date_temp_search) {
        console.warn("날짜가 선택되지 않음");
        alert("날짜를 선택해주세요.");
        return;
      }
      if (!temp_search) {
        alert("검색 타입을 선택해주세요.");
        return;
      }

      // 선택된 날짜가 검색 기간 내에 있는지 확인
      const selectedDate = new Date(date_temp_search);
      const firstDate = new Date(date_first);
      const lastDate = new Date(date_last);

      if (selectedDate < firstDate || selectedDate > lastDate) {
        alert(`검색은 ${date_first} ~ ${date_last} 기간 내에서만 가능합니다.`);
        return;
      }

      const response = await axios.get(
        `http://${process.env.NEXT_PUBLIC_API_URL}/api/temp-search`,
        {
          params: {
            date: formatAPIDate(date_temp_search),
            type: temp_search,
            region: selectedRegion,
          },
        }
      );

      console.log("API 응답:", response.data);

      if (response.data.success === false) {
        console.warn("API 오류 응답:", response.data.message);
        alert(response.data.message);
      } else {
        console.log("검색 결과:", response.data);
        setTempSearchResult({
          datetime: response.data.datetime || "",
          temperature: response.data.temperature || "",
          windSpeed: response.data.windSpeed || "",
          humidity: response.data.humidity || "", // pressure를 humidity로 변경
          windDirection: response.data.windDirection || "", // dewPoint를 windDirection으로 변경
        });
      }
    } catch (error) {
      console.error("온도 검색 실패:", error);
      console.error("에러 상세:", error.response?.data);
      alert(
        error.response?.data?.message || "온도 검색 중 오류가 발생했습니다."
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setIsClient(true);
    fetchWeatherData();
  }, []);

  useEffect(() => {
    if (isSearch) {
      setIsLoading(true);
      fetchWeatherData();
      setIsLoading(false);
      setIsSearch(false);
    }
  }, [isSearch]);

  // isDarkMode 상태 추가
  const [isDarkMode, setIsDarkMode] = useState(false);

  // 다크모드 감지
  useEffect(() => {
    const body = document.querySelector("body");
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === "class") {
          setIsDarkMode(body.classList.contains("dark-mode"));
        }
      });
    });

    observer.observe(body, {
      attributes: true,
    });

    return () => observer.disconnect();
  }, []);

  if (!isClient) {
    return (
      <div className="loading">
        <BeatLoader color="#b19ae0" />
      </div>
    );
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
      },
      title: {
        display: true,
        text: "기온 및 풍속 시간 변화",
      },
      zoom: {
        pan: {
          enabled: true,
          mode: "xy",
        },
        zoom: {
          wheel: {
            enabled: true,
          },
          pinch: {
            enabled: true,
          },
          mode: "xy",
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
      x: {
        display: true,
      },
    },
  };

  return (
    <div className="weather_react_wrap">
      {/* <p className="weather_title">지상 관측자료 조회</p> */}
      {/* <PageHeader titles="기상청API" active="weather" items={["Charts"]} /> */}
      {isLoading ? (
        <div className="loding_icon">
          <BeatLoader color="#b19ae0" />
        </div>
      ) : (
        <>
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
            <input
              type="date"
              id="date_first"
              max={getTodayDate()}
              min="2022-01-01"
              value={date_first}
              className="weather_search_input"
              onChange={(e) => setDate_first(e.target.value)}
              disabled={isLoading}
            />
            ~
            <input
              type="date"
              id="date_last"
              max={getTodayDate()}
              min="2022-01-01"
              value={date_last}
              className="weather_search_input"
              onChange={(e) => setDate_last(e.target.value)}
              disabled={isLoading}
            />
            <button
              className={`weather_search_btn ${isLoading ? "loading" : ""}`}
              onClick={handleSearch}
              disabled={isLoading}
            >
              {isLoading ? "검색 중..." : "검색"}
            </button>
          </div>
          <div className="weather_temp_search_wrap">
            <div className="weather_temp_search_box">
              <input
                type="date"
                id="date_temp_search"
                min={date_first}
                max={date_last}
                value={date_temp_search}
                className="weather_search_input"
                onChange={(e) => setDate_temp_search(e.target.value)}
                disabled={isLoading}
              />
              <select
                className="weather_search_select"
                onChange={(e) => setTemp_search(e.target.value)}
                value={temp_search}
                disabled={isLoading}
              >
                <option value="high_temp">최고 기온</option>
                <option value="low_temp">최저 기온</option>
              </select>
              <button
                className={`weather_search_btn ${isLoading ? "loading" : ""}`}
                onClick={handleTempSearch}
                disabled={isLoading || !date_first || !date_last}
              >
                {isLoading ? "검색 중..." : "검색"}
              </button>
            </div>
            <p className="weather_temp_search_result dark-mode-cell">
              {tempSearchResult.datetime ? (
                <>
                  날짜&시간: {tempSearchResult.datetime} , 기온:{"   "}
                  {tempSearchResult.temperature}°C , 습도:{"   "}
                  {tempSearchResult.humidity}% , 풍속:{"   "}
                  {tempSearchResult.windSpeed}m/s , 풍향:{"   "}
                  {tempSearchResult.windDirection}°
                </>
              ) : (
                "날짜를 선택하고 검색해주세요."
              )}
            </p>
          </div>
          <WeatherMap
            onStationNumberSelect={handleStationSelect}
            // selectedPosition={selectedRegion}
            mapId={componentId} 
          />
          <div className="chart_container_wrap">
            <div className="chart_box">
              <div className="chart_header">
                <h3 className="chart_title">기온 & 상대습도</h3>
                <div className="chart_type_selector">
                  <button
                    className={`chart_type_btn ${
                      chart1Type === "line" ? "active" : ""
                    }`}
                    onClick={() => setChart1Type("line")}
                    data-type="line"
                  >
                    라인 차트
                  </button>
                  <button
                    className={`chart_type_btn ${
                      chart1Type === "bar" ? "active" : ""
                    }`}
                    onClick={() => setChart1Type("bar")}
                    data-type="bar"
                  >
                    바 차트
                  </button>
                </div>
              </div>
              <div className="chart_content">
                {chart1Type === "line" ? (
                  <Chart data={chartData} options={options} />
                ) : (
                  <Bar
                    options={{
                      ...getChartOptions(isDarkMode),
                      scales: {
                        "y-temperature": {
                          type: "linear",
                          position: "left",
                          title: {
                            display: true,
                            text: "기온 (°C)",
                            color: colors.temperature.main,
                            font: { weight: "bold" },
                          },
                          ticks: { color: colors.temperature.main },
                          grid: { color: colors.temperature.background },
                        },
                        "y-humidity": {
                          type: "linear",
                          position: "right",
                          title: {
                            display: true,
                            text: "상대습도 (%)",
                            color: colors.humidity.main,
                            font: { weight: "bold" },
                          },
                          ticks: { color: colors.humidity.main },
                          grid: {
                            drawOnChartArea: false,
                            color: colors.humidity.background,
                          },
                        },
                        x: {
                          /* 기존 x축 옵션 유지 */
                        },
                      },
                    }}
                    data={chartData}
                  />
                )}
              </div>
            </div>
            {/* <FutureWeather /> */}
            <div className="chart_box">
              <div className="chart_header">
                <h3 className="chart_title">풍속 & 풍향</h3>
                <div className="chart_type_selector">
                  <button
                    className={`chart_type_btn ${
                      chart2Type === "line" ? "active" : ""
                    }`}
                    onClick={() => setChart2Type("line")}
                    data-type="line"
                  >
                    라인 차트
                  </button>
                  <button
                    className={`chart_type_btn ${
                      chart2Type === "bar" ? "active" : ""
                    }`}
                    onClick={() => setChart2Type("bar")}
                    data-type="bar"
                  >
                    바 차트
                  </button>
                </div>
              </div>
              <div className="chart_content">
                {chart2Type === "line" ? (
                  <Chart data={chartData2} options={options} />
                ) : (
                  <Bar
                    options={{
                      ...getChartOptions(isDarkMode),
                      scales: {
                        "y-windSpeed": {
                          type: "linear",
                          position: "left",
                          title: {
                            display: true,
                            text: "풍속 (m/s)",
                            color: colors.windSpeed.main,
                            font: { weight: "bold" },
                          },
                          ticks: { color: colors.windSpeed.main },
                          grid: { color: colors.windSpeed.background },
                        },
                        "y-windDirection": {
                          type: "linear",
                          position: "right",
                          title: {
                            display: true,
                            text: "풍향 (deg)",
                            color: colors.windDirection.main,
                            font: { weight: "bold" },
                          },
                          ticks: { color: colors.windDirection.main },
                          grid: {
                            drawOnChartArea: false,
                            color: colors.windDirection.background,
                          },
                        },
                        x: {
                          /* 기존 x축 옵션 유지 */
                        },
                      },
                    }}
                    data={chartData2}
                  />
                )}
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowTable(!showTable)}
            className="toggle-button"
          >
            {showTable ? "테이블 숨기기" : "테이블 보기"}
          </button>
          {showTable && (
            <div className="weather_table_wrap">
              <table className="weather_table">
                <thead>
                  <tr>
                    <th>날짜/시간</th>
                    <th>기온 (°C)</th>
                    <th>상대습도 (%)</th>
                    <th>풍속 (m/s)</th>
                    <th>풍향 (deg)</th>
                  </tr>
                </thead>
                <tbody>
                  {totalData && totalData.length > 0 ? (
                    totalData.map((item, index) => {
                      return (
                        <tr key={index}>
                          <td className="dark-mode-cell">
                            {formatDateTime(item.YYMMDDHHMI)}
                          </td>
                          <td className="dark-mode-cell">{item.TA}</td>
                          <td className="dark-mode-cell">{item.HM}</td>
                          <td className="dark-mode-cell">{item.WS}</td>
                          <td className="dark-mode-cell">{item.WD}</td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="5">
                        <div className="loding_icon_table">
                          <BeatLoader color="#b19ae0" />
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
