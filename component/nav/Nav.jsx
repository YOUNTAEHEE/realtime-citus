"use client";
import styles from "./nav.scss";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function Nav() {
  const [choice_nav, setChoice_nav] = useState("standard");
  const [choice_programmer, setChoice_programmer] = useState("WORD");
  const router = useRouter();

  const handleNavClick = (type) => {
    setChoice_nav(type);
    console.log("Updated choice_nav:", type);
    if (type === "standard") {
      setChoice_programmer("");
      router.push("/calculator/standard");
    } else if (type === "programmer") {
      setChoice_programmer("WORD");
      router.push("/calculator/programmer?mode=WORD");
    }
  };

  const handleProgrammerNavClick = (type) => {
    setChoice_programmer(type);
    if (type === "WORD") {
      router.push(`/calculator/programmer?mode=${type}`);
    } else if (type === "DWORD") {
      router.push(`/calculator/programmer?mode=${type}`);
    } else if (type === "QWORD") {
      router.push(`/calculator/programmer?mode=${type}`);
    }
  };

  return (
    <div className="c_nav_box">
      <div className="c_nav">
        <div
          className={`c_nav_title  ${choice_nav === "standard" ? "on" : ""}`}
          onClick={() => handleNavClick("standard")}
        >
          표준 계산기
        </div>
        <div
          className={`c_nav_title ${choice_nav === "programmer" ? "on" : ""}`}
          onClick={() => handleNavClick("programmer")}
        >
          프로그래머
        </div>
      </div>
      <div
        className={`programmer_nav ${choice_nav === "programmer" ? "on" : ""}`}
      >
        <div
          className={`programmer_nav_title ${
            choice_nav === "programmer" && choice_programmer === "WORD"
              ? "on"
              : ""
          }`}
          onClick={() => handleProgrammerNavClick("WORD")}
        >
          WORD
        </div>
        <div
          className={`programmer_nav_title ${
            choice_nav === "programmer" && choice_programmer === "DWORD"
              ? "on"
              : ""
          }`}
          onClick={() => handleProgrammerNavClick("DWORD")}
        >
          DWORD
        </div>
        <div
          className={`programmer_nav_title ${
            choice_nav === "programmer" && choice_programmer === "QWORD"
              ? "on"
              : ""
          }`}
          onClick={() => handleProgrammerNavClick("QWORD")}
        >
          QWORD
        </div>
      </div>
    </div>
  );
}
