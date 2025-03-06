"use client";
import axios from "axios";
import dynamic from "next/dynamic";
import { Suspense, useEffect, useRef, useState } from "react";
import { SlArrowLeft, SlArrowRight } from "react-icons/sl";
import { BeatLoader } from "react-spinners";
import { v4 as uuidv4 } from "uuid";
import "./weatherpage.scss";

// Chart.js와 관련된 모든 import를 dynamic import로 변경
const ChartComponent = dynamic(
  () =>
    Promise.all([
      import("chart.js"),
      import("react-chartjs-2"),
      import("chartjs-plugin-zoom"),
    ]).then(([ChartJS, ReactChartJS, ZoomPlugin]) => {
      const {
        Chart,
        CategoryScale,
        LinearScale,
        PointElement,
        LineElement,
        Title,
        Tooltip,
        Legend,
      } = ChartJS;

      Chart.register(
        CategoryScale,
        LinearScale,
        PointElement,
        LineElement,
        Title,
        Tooltip,
        Legend,
        ZoomPlugin
      );

      return ReactChartJS.Line;
    }),
  {
    ssr: false,
    loading: () => <BeatLoader color="#b19ae0" />,
  }
);

// 초기 상태값을 함수로 설정
const getInitialState = () => {
  return {
    isLoading: false,
    currentPage: 1,
    limit: 10,
    totalData: [],
    selectedRegion: "119",
    viewData: [],
    // ... 다른 초기 상태값들
  };
};

const WeatherPage = () => {
  // 초기 상태값을 함수로 설정
  const [state, setState] = useState(getInitialState());
  const [isClient, setIsClient] = useState(false);
  const [isSearch, setIsSearch] = useState(false);
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
        label: "풍속 (m/s)",
        data: [],
        borderColor: "rgb(53, 162, 235)",
        backgroundColor: "rgba(53, 162, 235, 0.5)",
      },
    ],
  });
  const chartRef = useRef(null);

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

  const [date_first, setDate_first] = useState(getTodayDate());
  const [date_last, setDate_last] = useState(getTodayDate());

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    fetchWeather();
  }, []);
  useEffect(() => {
    if (isSearch) {
      setState((prevState) => ({ ...prevState, isLoading: true }));
      fetchWeather();
      setState((prevState) => ({
        ...prevState,
        isLoading: false,
        isSearch: false,
      }));
    }
  }, [isSearch]);

  useEffect(() => {
    if (isClient && chartRef.current) {
      chartRef.current.style.cursor = "grab";
    }
  }, [isClient]);

  const fetchWeather = async () => {
    try {
      setState((prevState) => ({
        ...prevState,
        isLoading: true,
        viewData: [],
      }));
      const response = await axios.get(
        `/api/weatherAPI?date-first=${formatAPIDate(
          date_first
        )}&date-last=${formatAPIDate(date_last)}&region=${state.selectedRegion}`
      );
      const data = parseWeather(response.data);

      if (data && Array.isArray(data)) {
        setState((prevState) => ({
          ...prevState,
          totalData: data,
          currentPage: 1,
        }));
        setState((prevState) => ({
          ...prevState,
          viewData: viewWeatherData(data.slice(0, state.limit)),
        }));
      } else {
        setState((prevState) => ({
          ...prevState,
          totalData: [],
          viewData: [],
        }));
      }
    } catch (err) {
      console.log(err);
      alert("데이터 조회에 실패했습니다.");
    } finally {
      setState((prevState) => ({ ...prevState, isLoading: false })); // 로딩 종료
    }
  };
  const parseWeather = (data) => {
    const line = data.split("\n").map((item) => item.trim());
    // console.log("line", line);
    const headerIndex = line.findIndex((line) => line.includes("YYMMDDHHMI"));
    // console.log("headerIndex", headerIndex);
    const header = line[headerIndex].replace("#", "").trim().split(/\s+/);
    // console.log("header", header);
    const datalines = line
      .slice(headerIndex + 1)
      .filter((line) => line && !line.startsWith("#"));

    return datalines.map((item) => {
      const values = item.split(/\s+/);
      const entry = {};
      header.forEach((header, index) => {
        entry[header] = values[index];
      });
      return entry;
    });
  };
  const viewWeatherData = (data) => {
    const labels = data.map((item) => item.YYMMDDHHMI);
    const temperature = data.map((item) => item.TA);
    const windSpeed = data.map((item) => item.WS);
    setChartData({
      labels,
      datasets: [
        {
          label: "기온 (°C)",
          data: temperature,
          borderColor: "rgb(255, 99, 132)",
          backgroundColor: "rgba(255, 99, 132, 0.5)",
        },
        {
          label: "풍속 (m/s)",
          data: windSpeed,
          borderColor: "rgb(53, 162, 235)",
          backgroundColor: "rgba(53, 162, 235, 0.5)",
        },
      ],
    });
    return data;
  };
  const options = {
    responsive: true,
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
          threshold: 10,
          onPanStart: () => {
            if (chartRef.current) {
              chartRef.current.style.cursor = "grabbing";
            }
          },
          onPanComplete: () => {
            if (chartRef.current) {
              chartRef.current.style.cursor = "grab";
            }
          },
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

  const handlePageChange = (pageNumber) => {
    setState((prevState) => ({ ...prevState, currentPage: pageNumber }));
    const startIndex = (pageNumber - 1) * state.limit;
    const endIndex = pageNumber * state.limit;
    setState((prevState) => ({
      ...prevState,
      viewData: viewWeatherData(state.totalData.slice(startIndex, endIndex)),
    }));
  };

  const LoadingOverlay = () => {
    return (
      <div className="loding_icon">
        <BeatLoader color="#b19ae0" />
      </div>
    );
  };

  if (!isClient) {
    return <BeatLoader color="#b19ae0" />;
  }

  return (
    <Suspense fallback={<BeatLoader color="#b19ae0" />}>
      <div className="weather_container">
        {state.isLoading ? (
          <LoadingOverlay />
        ) : (
          <>
            <div className="weather_top_box">
              <p className="weather_title">지상 관측자료 조회</p>
              <div className="weather_search_box">
                <select
                  className="weather_search_select"
                  onChange={(e) =>
                    setState((prevState) => ({
                      ...prevState,
                      selectedRegion: e.target.value,
                    }))
                  }
                  value={state.selectedRegion}
                >
                  <option value="108">서울</option>
                  <option value="119">수원</option>
                  <option value="112">인천</option>
                  <option value="100">대관령</option>
                  <option value="101">춘천</option>
                </select>
                <input
                  type="date"
                  id="date_first"
                  max={getTodayDate()}
                  min="2022-01-01"
                  value={date_first}
                  className="weather_search_input"
                  onChange={(e) => setDate_first(e.target.value)}
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
                />
                <button
                  className="weather_search_btn"
                  onClick={() => setIsSearch(true)}
                >
                  검색
                </button>
              </div>
            </div>
            <div className="weather_chart" ref={chartRef}>
              <ChartComponent data={chartData} options={options} />
            </div>
            <div className="weather_page_wrap">
              <button
                className="weather_page_btn"
                disabled={state.currentPage === 1}
                onClick={() => handlePageChange(state.currentPage - 1)}
              >
                <SlArrowLeft />
              </button>
              <span className="weather_page_text">
                {state.currentPage} /{" "}
                {Math.ceil(state.totalData.length / state.limit)}
              </span>
              <button
                className="weather_page_btn"
                disabled={
                  state.currentPage ===
                  Math.ceil(state.totalData.length / state.limit)
                }
                onClick={() => handlePageChange(state.currentPage + 1)}
              >
                <SlArrowRight />
              </button>
            </div>
            <div className="weather_table_wrap">
              <table className="weather_table">
                <thead>
                  <tr>
                    <th>기온 (°C)</th>
                    <th>풍속 (m/s)</th>
                  </tr>
                </thead>
                <tbody>
                  {state.viewData && state.viewData.length > 0 ? (
                    state.viewData.map((item, index) => {
                      return (
                        <tr key={uuidv4()}>
                          <td>{item.TA}</td>
                          <td>{item.WS}</td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="2">
                        <div className="loding_icon_table">
                          <BeatLoader color="#b19ae0" />
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              <div className="weather_page_wrap">
                <button
                  className="weather_page_btn"
                  disabled={state.currentPage === 1}
                  onClick={() => handlePageChange(state.currentPage - 1)}
                >
                  <SlArrowLeft />
                </button>
                <span className="weather_page_text">
                  {state.currentPage} /{" "}
                  {Math.ceil(state.totalData.length / state.limit)}
                </span>
                <button
                  className="weather_page_btn"
                  disabled={
                    state.currentPage ===
                    Math.ceil(state.totalData.length / state.limit)
                  }
                  onClick={() => handlePageChange(state.currentPage + 1)}
                >
                  <SlArrowRight />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </Suspense>
  );
};

export default WeatherPage;
