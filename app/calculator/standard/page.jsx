"use client";
import dynamic from "next/dynamic";
import "./standard.scss";
import { useEffect, useState } from "react";
import { FaTrashAlt } from "react-icons/fa";
import { FaDeleteLeft } from "react-icons/fa6";
import { v4 as uuidv4 } from "uuid";
// import { CSVLink, CSVDownload } from "react-csv";
import {
  addStandard,
  deleteStandard,
  getStandardByDate
} from "../../../lib/actions";
const CSVLink = dynamic(() => import("react-csv").then((mod) => mod.CSVLink), {
  ssr: false,
});
export default function Standard() {
  const [monitor_number, setMonitor_number] = useState("");
  const [result, setResult] = useState("");
  const [history, setHistory] = useState(false);
  const [history_list, setHistory_list] = useState([]);
  const [parenthesis, setParenthesis] = useState(false);
  const [check_list, setCheck_list] = useState([]);
  // const [result_HEX, setResult_HEX] = useState("");
  // const [result_OCT, setResult_OCT] = useState("");
  // const [result_BIN, setResult_BIN] = useState("");
  // const [result_DEC, setResult_DEC] = useState("");
  const [show_mobile_btn, setShow_mobile_btn] = useState(false);
  // const [selectDate, setSelectDate] = useState(() => {
  //   return (
  //     sessionStorage.getItem("selectDate") ||
  //     new Date().toISOString().split("T")[0]
  //   );
  // });
  const [selectDate, setSelectDate] = useState(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem("selectedDate") || new Date().toISOString().split("T")[0];
    }
    return new Date().toISOString().split("T")[0];
  });

  useEffect(() => {
    loadHistory();
  }, [selectDate]);


  const loadHistory = async () => {
    try {
      const viewHistory = await getStandardByDate(selectDate);
      setHistory_list(viewHistory || []);
    } catch (error) {
      console.error("데이터 로딩 실패", error);
    }
  };
  const CSVHeader = [
    { label: "날짜", key: "monitor_date" },
    { label: "계산식", key: "monitor_number" },
    { label: "답", key: "monitor_result" },
  ];

  const CSVdata = history_list.map((item) => ({
    monitor_number: `'${item.monitor_number}`,
    monitor_result: item.monitor_result,
    monitor_date: item.monitor_date,
  }));

  const handleMonitorNumber = (e) => {
    setResult("");
    const value = e.target.textContent;
    const lastChar = monitor_number[monitor_number.length - 1];
    const match = monitor_number.match(/(\d+\.?\d*)$/);

    if (/[)]/.test(lastChar) && /\d+/.test(value)) {
      return;
    }
    if (/[%]/.test(lastChar) && /\d+/.test(value)) {
      return;
    }
    if (/[(]/.test(lastChar) && /[+\-×÷%]/.test(value)) {
      return;
    }
    if (
      (monitor_number.match(/^(0+)$/) && /\d+/.test(value)) ||
      (monitor_number.match(/[+\-×÷](0+)(?!\.)/) && /\d+/.test(value))
    ) {
      return;
    }

    // if (monitor_number.match(/(0+)$/) && /[+\-×÷]/.test(value)) {
    //   return;
    // }

    if (/[%]/.test(lastChar) && /[%]/.test(value)) {
      return;
    }
    if (/[+\-×÷]/.test(lastChar) && value === "1/x") {
      return;
    }
    if (monitor_number === "" && /[+×÷%]/.test(value)) {
      return;
    }

    if (/[+\-×÷]/.test(lastChar) && /[+\-×÷]/.test(value)) {
      return;
    } else {
      if (value === "1/x") {
        if (!monitor_number || monitor_number.trim() === "") {
          return;
        }
        let number = parseFloat(match[1]);
        let changeValue = `1 / ${number}`;
        setMonitor_number(
          monitor_number.slice(0, -match[0].length) + changeValue
        );
        return;
      }
      if (value === "x²") {
        if (!monitor_number || monitor_number.trim() === "") {
          return;
        }
        let number = parseFloat(match[1]);
        let changeValue = `(${number} * ${number})`;
        setMonitor_number(
          monitor_number.slice(0, -match[0].length) + changeValue
        );
        return;
      }
      if (value === "²√x") {
        if (!monitor_number || monitor_number.trim() === "") {
          return;
        }
        let number = parseFloat(match[1]);
        let changeValue = Math.sqrt(number);
        setMonitor_number(
          monitor_number.slice(0, -match[0].length) + changeValue
        );
        return;
      }
      setMonitor_number((prev) => prev + value);
    }
  };

  const handleMonitorOneDel = (e) => {
    setMonitor_number(monitor_number.slice(0, -1));
  };

  const handleAllDel = (e) => {
    setMonitor_number("");
    setResult("");
    // setResult_HEX(""); //16진수
    // setResult_OCT(""); //8진수
    // setResult_BIN(""); //2진수
    // setResult_DEC(""); //10진수
  };

  const handleMonitorResult = async (e) => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const todayKOR = new Date()
        .toLocaleString("ko-KR", {
          timeZone: "Asia/Seoul",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
        .replace(/\./g, "-")
        .replace(/\.$/, "")
        .replace(/- (오전|오후)/, " $1");
      if (monitor_number.match(/([÷])(0+\.?0*)$/)) {
        setResult(`0으로 나눌 수 없습니다.`);
        return;
      }

      if (!/[+\-×÷]/.test(monitor_number)) {
        return;
      }

      if (!monitor_number || /[+\-×÷]$/.test(monitor_number)) {
        return;
      }

      let formula = monitor_number;

      formula = formula
        .replace(/÷/g, "/")
        .replace(/×/g, "*")
        .replace(/−/g, "-");

      formula = formula.replace(
        /(\d+\.?\d*)\s*([×*÷/])\s*(\d+\.?\d*)\s*%/g,
        (match, number1, operator, number2) => {
          const op = operator === "×" || operator === "*" ? "*" : "/";
          return `(${number1} ${op} ${number2 / 100})`;
        }
      );

      formula = formula.replace(
        /(\d+\.?\d*)\s*([+\-])\s*(\d+\.?\d*)\s*%/g,
        (match, number1, operator, number2) => {
          return `(${number1} ${operator} (${number1} * ${number2 / 100}))`;
        }
      );

      const result = new Function("return " + formula)();
      // const integerResult = Math.floor(result);

      // setResult_HEX(integerResult.toString(16).toUpperCase()); //16진수
      // setResult_OCT(integerResult.toString(8)); //8진수
      // setResult_BIN(integerResult.toString(2)); //2진수
      // setResult_DEC(integerResult.toString()); //10진수

      const format_result = Number.isInteger(result)
        ? result.toString()
        : parseFloat(result.toFixed(5)).toString();

      setResult(format_result);

      const newId = uuidv4();

      const formData = new FormData();
      formData.append("id", newId);
      formData.append("monitor_number", monitor_number);
      formData.append("monitor_result", format_result);
      formData.append("monitor_date", todayKOR);
      await addStandard(formData);
      loadHistory();
      // if (selectDate === today) {
      //   setHistory_list((prev) => {
      //     const updatedHistory = [
      //       {
      //         id: newId,
      //         monitor_number: monitor_number,
      //         monitor_result: format_result,
      //         monitor_date: todayKOR,
      //       },
      //       ...prev,
      //     ];

      //     return updatedHistory;
      //   });
      // }
      setMonitor_number("");
    } catch (error) {
      console.log(error);
    }
  };

  const handleParenthesis = (e) => {
    if (!parenthesis) {
      setMonitor_number((prev) => prev + "(");
      setParenthesis(!parenthesis);
    } else {
      setMonitor_number((prev) => prev + ")");
      setParenthesis(!parenthesis);
    }
  };

  const handleHistory = () => {
    setHistory(!history);
  };

  const handleAllCheck = (checked) => {
    if (checked) {
      const idArray = [];
      history_list.forEach((el) => idArray.push(el.id));
      setCheck_list(idArray);
    } else if (!checked) {
      setCheck_list([]);
    }
  };
  const handleSingleCheck = (checked, id) => {
    if (checked) {
      setCheck_list((prev) => [...prev, id]);
    } else if (!checked) {
      setCheck_list(check_list.filter((el) => el !== id));
    }
  };

  const handleCheckDel = async () => {
    try {
      const formData = new FormData();

      check_list.forEach((el) => {
        formData.append("id", el);
      });

      await deleteStandard(formData);
      setHistory_list(history_list.filter((el) => !check_list.includes(el.id)));
      setCheck_list([]);
    } catch (error) {
      console.log(error);
    }
  };

  const handleDateChange = async (e) => {
    const date = e.target.value;
    setSelectDate(date);
    sessionStorage.setItem("selectedDate", date);

    try {
      const dateData = await getStandardByDate(date);
      setHistory_list(dateData);
    } catch (error) {
      console.log("날짜 조회 실패", error);
    }
  };

  useEffect(() => {
    const element = document.querySelector(".monitor_text");
    if (element) {
      element.scrollLeft = element.scrollWidth;
    }
  }, [monitor_number]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 500) {
        setShow_mobile_btn(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const handleKeyPress = (e) => {
      switch (e.key) {
        case "/":
          handleMonitorNumber({ target: { textContent: "÷" } });
          break;
        case "*":
          handleMonitorNumber({ target: { textContent: "×" } });
          break;
        case "-":
          handleMonitorNumber({ target: { textContent: "-" } });
          break;
        case "+":
          handleMonitorNumber({ target: { textContent: "+" } });
          break;
        case "%":
          handleMonitorNumber({ target: { textContent: "%" } });
          break;
        case "Enter":
          handleMonitorResult();
          break;

        case "0":
        case "1":
        case "2":
        case "3":
        case "4":
        case "5":
        case "6":
        case "7":
        case "8":
        case "9":
          handleMonitorNumber({ target: { textContent: e.key } });
          break;
        case ".":
          handleMonitorNumber({ target: { textContent: "." } });
          break;
        case "Backspace":
          handleMonitorOneDel();
          break;
        case "Delete":
          handleAllDel();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [monitor_number]);

  useEffect(() => {
    loadHistory(); // 즉시 호출
    const intervalId = setInterval(loadHistory, 1000); // 1초마다 갱신
    return () => clearInterval(intervalId);
  }, [selectDate]); // selectDate 의존성 추가

  return (
    <div className="standard_calculator">
      <div className={`main_content ${history ? "on" : ""}`}>
        <div className="main_box">
          <div className="r_monitor">
            <div className="monitor_top_box">
              <p className="monitor_text monitor_top_text">{monitor_number}</p>
              <p className="monitor_result">{result}</p>
            </div>
            {/* <div className="monitor_bottom_box">
            <div className="monitor_bottom_box_1 ">
              <p className=" m_s_text_top">HEX</p>
              <p className=" m_s_text_top">DEC</p>
              <p className=" m_s_text_top">OCT</p>
              <p className=" m_s_text_top">BIN</p>
            </div>
            <div className="monitor_bottom_box_2 ">
              <p className=" m_s_text_result">{result_HEX}</p>
              <p className="m_s_text_result">{result_DEC}</p> 
              <p className="m_s_text_result">{result_OCT}</p>
              <p className=" m_s_text_result">{result_BIN}</p>
            </div>
          </div> */}
          </div>
          <div className="button_big_box">
            <div className="button_box_center" onClick={handleHistory}>
              기록
            </div>
            <div
              className="button_box_mobile_show_btn "
              onClick={() => setShow_mobile_btn(!show_mobile_btn)}
            >
              계산기 기능 키 {show_mobile_btn ? "숨기기" : "펼치기"}
            </div>

            <div className="button_box_wrap">
              <div
                className={`mobile_hidden ${
                  show_mobile_btn === true ? "on" : ""
                }`}
              >
                <div className="button_box">
                  <div
                    className="num_button s_button s_b_f_2 all_del_button"
                    onClick={handleAllDel}
                  >
                    AC
                  </div>
                  <div
                    className="num_button s_button s_b_f_2 one_del_button"
                    onClick={handleMonitorOneDel}
                  >
                    <FaDeleteLeft />
                  </div>
                </div>

                {/* 연산자 추가 */}
                <div className="button_box">
                  <div
                    className="num_button s_button "
                    onClick={handleMonitorNumber}
                  >
                    1/x
                  </div>
                  <div
                    className="num_button s_button "
                    onClick={handleMonitorNumber}
                  >
                    x²
                  </div>
                  <div
                    className="num_button s_button "
                    onClick={handleMonitorNumber}
                  >
                    ²√x
                  </div>
                </div>
                {/* 연산자 추가끝 */}
                <div className="button_box">
                  <div
                    className="num_button s_button s_b_big"
                    onClick={handleMonitorNumber}
                  >
                    ÷
                  </div>
                  <div
                    className="num_button s_button s_b_big"
                    onClick={handleMonitorNumber}
                  >
                    ×
                  </div>
                  <div
                    className="num_button s_button s_b_big"
                    onClick={handleMonitorNumber}
                  >
                    -
                  </div>
                </div>
                <div className="button_box">
                  <div
                    className="num_button s_button s_b_f"
                    onClick={handleMonitorNumber}
                  >
                    %
                  </div>
                  <div
                    className="num_button s_button s_b_big"
                    onClick={handleMonitorNumber}
                  >
                    +
                  </div>
                  <div
                    className="num_button s_button"
                    onClick={handleMonitorResult}
                  >
                    =
                  </div>
                </div>
              </div>
              <div className="button_box">
                <div className="num_button" onClick={handleMonitorNumber}>
                  7
                </div>
                <div className="num_button" onClick={handleMonitorNumber}>
                  8
                </div>
                <div className="num_button" onClick={handleMonitorNumber}>
                  9
                </div>
              </div>
              <div className="button_box">
                <div className="num_button" onClick={handleMonitorNumber}>
                  4
                </div>
                <div className="num_button" onClick={handleMonitorNumber}>
                  5
                </div>
                <div className="num_button" onClick={handleMonitorNumber}>
                  6
                </div>
              </div>
              <div className="button_box">
                <div className="num_button" onClick={handleMonitorNumber}>
                  1
                </div>
                <div className="num_button" onClick={handleMonitorNumber}>
                  2
                </div>
                <div className="num_button" onClick={handleMonitorNumber}>
                  3
                </div>
              </div>
              <div className="button_box">
                <div
                  className="num_button s_button s_b_f"
                  onClick={handleParenthesis}
                >
                  ()
                </div>
                <div className="num_button" onClick={handleMonitorNumber}>
                  0
                </div>
                <div
                  className="num_button s_button s_b_big"
                  onClick={handleMonitorNumber}
                >
                  .
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className={`history_wrap ${history ? "on" : ""}`}>
          <div className="history_top">
            <CSVLink
              data={CSVdata}
              headers={CSVHeader}
              filename={`계산 기록 CSV`}
              className="history_top_csv"
            >
              CSV 저장
            </CSVLink>
            <input
              type="date"
              id="start-date"
              min=""
              value={selectDate}
              onChange={handleDateChange}
              max={new Date().toISOString().split("T")[0]}
              className="history_date"
            ></input>
          </div>
          <div className="history_m_wrap">
            <div className="history_small_wrap">
              {history_list.length > 0 ? (
                history_list.map((item, index) => (
                  <div className="history_one" key={item.id}>
                    <div className="history_one_in_box2">
                      <p className="history_formula">{item.monitor_number}</p>
                      <p className="history_result">{item.monitor_result}</p>
                      <p className="history_monitor_date">
                        {item.monitor_date}
                      </p>
                    </div>
                    <input
                      className="history_one_check"
                      type="checkbox"
                      onChange={(e) => {
                        handleSingleCheck(e.target.checked, item.id);
                      }}
                      checked={check_list.includes(item.id)}
                    />
                  </div>
                ))
              ) : (
                <div className="history_none">
                  <p>해당 날짜의 기록이 없습니다.</p>
                </div>
              )}
            </div>
            <div className="history_bottom">
              <div className="all_check">
                <input
                  className="history_all_check"
                  type="checkbox"
                  id="history_all_check"
                  onChange={(e) => handleAllCheck(e.target.checked)}
                  checked={
                    check_list.length === history_list.length &&
                    history_list.length > 0
                  }
                />
                <label
                  className="history_all_check_text"
                  htmlFor="history_all_check"
                >
                  전체 선택
                </label>
              </div>
              <div className="delete_btn" onClick={handleCheckDel}>
                <FaTrashAlt />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
