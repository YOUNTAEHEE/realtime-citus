import axios from "axios";
import { NextResponse } from "next/server";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const weatherDate_first = searchParams.get("date-first"); // 클라이언트에서 전달한 날짜
  const weatherDate_last = searchParams.get("date-last"); // 클라이언트에서 전달한 날짜
  const regionCode = searchParams.get("region"); // 클라이언트에서 전달한 지역 코드

  const API_KEY = process.env.WEATHER_API_KEY; // 환경 변수에 저장된 API 키
  // const apiUrl = `https://apihub.kma.go.kr/api/typ01/url/kma_sfctm2.php?tm=${weatherDate}&stn=${regionCode}&help=1&authKey=${API_KEY}`;
  const apiUrl = `https://apihub.kma.go.kr/api/typ01/url/kma_sfctm3.php?tm1=${weatherDate_first}0000&tm2=${weatherDate_last}2359&stn=${regionCode}&help=0&authKey=${API_KEY}`;
  try {
    const response = await axios.get(apiUrl); // axios로 API 호출
    console.log("API Response Data:", response.data); // 디버깅용 로그
    return NextResponse.json(response.data); // JSON 데이터 반환
  } catch (error) {
    console.error("Error in API Route:", error.message); // 에러 로그 출력
    return NextResponse.json({ error: error.message }, { status: 500 }); // 에러 반환
  }
}
