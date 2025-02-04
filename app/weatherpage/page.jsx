"use client";
import axios from "axios";
import {
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
} from "chart.js";
import zoomPlugin from "chartjs-plugin-zoom";
import { useEffect, useState } from "react";
import { Line } from "react-chartjs-2";
import { SlArrowLeft, SlArrowRight } from "react-icons/sl";
import { BeatLoader } from "react-spinners";
import { v4 as uuidv4 } from "uuid";
import "./weatherPage.scss";

// Chart.js 초기화
ChartJS.register(
  LineElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Title,
  Tooltip,
  Legend,
  zoomPlugin
);
export default function WeatherPage() {
  const [isSearch, setIsSearch] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalData, setTotalData] = useState([]);
  const [selectedRegion, setSelectedRegion] = useState("119");
  const [viewData, setViewData] = useState([]);

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
    fetchWeather();
  }, []);
  useEffect(() => {
    if (isSearch) {
      setIsLoading(true);
      fetchWeather();
      setIsLoading(false);
      setIsSearch(false);
    }
  }, [isSearch]);
  const fetchWeather = async () => {
    try {
      setIsLoading(true);
      setViewData([]);
      const response = await axios.get(
        `/api/weatherAPI?date-first=${formatAPIDate(
          date_first
        )}&date-last=${formatAPIDate(date_last)}&region=${selectedRegion}`
      );
      const data = parseWeather(response.data);

      if (data && Array.isArray(data)) {
        setTotalData(data);
        setCurrentPage(1);

        setViewData(viewWeatherData(data.slice(0, limit)));
      } else {
        setTotalData([]);
        setViewData([]);
      }
    } catch (err) {
      console.log(err);
      alert("데이터 조회에 실패했습니다.");
    } finally {
      setIsLoading(false); // 로딩 종료
    }
  };
  const parseWeather = (data) => {
    const line = data.split("\n").map((item) => item.trim());
    console.log("line", line);
    const headerIndex = line.findIndex((line) => line.includes("YYMMDDHHMI"));
    console.log("headerIndex", headerIndex);
    const header = line[headerIndex].replace("#", "").trim().split(/\s+/);
    console.log("header", header);
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
          enabled: true, // 팬 기능 활성화
          mode: "xy", // X축 방향으로만 이동 가능
          threshold: 10, // 드래그 시작을 위한 최소 이동 거리(px)
          onPanStart: () => {
            document.querySelector(".weather_chart").style.cursor = "grabbing";
          },
          onPanComplete: () => {
            document.querySelector(".weather_chart").style.cursor = "grab";
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
    setCurrentPage(pageNumber);
    const startIndex = (pageNumber - 1) * limit;
    const endIndex = pageNumber * limit;
    setViewData(viewWeatherData(totalData.slice(startIndex, endIndex)));
  };

  // if (isLoading || totalData.length === 0) {
  //   return (
  //     <div className="loding_icon">
  //       <BeatLoader color="#b19ae0" />
  //     </div>
  //   );
  // }

  const LoadingOverlay = () => {
    return (
      <div className="loding_icon">
        <BeatLoader color="#b19ae0" />
      </div>
    );
  };

  return (
    <div className="weather_container">
      {isLoading ? (
        <LoadingOverlay />
      ) : (
        <>
          <div className="weather_top_box">
            <p className="weather_title">지상 관측자료 조회</p>
            <div className="weather_search_box">
              <select
                className="weather_search_select"
                onChange={(e) => setSelectedRegion(e.target.value)}
                value={selectedRegion}
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
          <div className="weather_chart">
            <Line options={options} data={chartData} />
          </div>
          <div className="weather_page_wrap">
            <button
              className="weather_page_btn"
              disabled={currentPage === 1}
              onClick={() => handlePageChange(currentPage - 1)}
            >
              <SlArrowLeft />
            </button>
            <span className="weather_page_text">
              {currentPage} / {Math.ceil(totalData.length / limit)}
            </span>
            <button
              className="weather_page_btn"
              disabled={currentPage === Math.ceil(totalData.length / limit)}
              onClick={() => handlePageChange(currentPage + 1)}
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
                {viewData && viewData.length > 0 ? (
                  viewData.map((item, index) => {
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
                disabled={currentPage === 1}
                onClick={() => handlePageChange(currentPage - 1)}
              >
                <SlArrowLeft />
              </button>
              <span className="weather_page_text">
                {currentPage} / {Math.ceil(totalData.length / limit)}
              </span>
              <button
                className="weather_page_btn"
                disabled={currentPage === Math.ceil(totalData.length / limit)}
                onClick={() => handlePageChange(currentPage + 1)}
              >
                <SlArrowRight />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
