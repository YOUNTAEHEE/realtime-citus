"use server";
import { connectDB } from "./connectDB";
import { Standard, Programmer } from "./models";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
export const getStandard = async () => {
  try {
    connectDB();
    let calculator = null;
    calculator = await Standard.find().sort({ createdAt: -1 });
    const data = JSON.parse(JSON.stringify(calculator));
    return data;
  } catch (err) {
    console.log(err);
    throw new Error("Fail to fetch All posts data!!");
  }
};

export const addStandard = async (formData) => {
  const result = Object.fromEntries(formData);
  const { id, monitor_number, monitor_result, monitor_date } = result;
  try {
    connectDB();
    const newCalculator = new Standard({
      id,
      monitor_number,
      monitor_result,
      monitor_date,
    });
    console.log("newCalculator", newCalculator);
    await newCalculator.save();
  } catch (err) {
    console.log(err);
    throw new Error("Fail to save Post!");
  }
};

export const deleteStandard = async (formData) => {
  const ids = formData.getAll("id");
  try {
    connectDB();
    await Standard.deleteMany({
      id: { $in: ids },
    });
  } catch (err) {
    console.log(err);
    throw new Error("Fail to save Post!");
  }
};

export const getProgrammer = async () => {
  try {
    connectDB();
    let calculator = null;
    calculator = await Programmer.find().sort({ createdAt: -1 });
    const data = JSON.parse(JSON.stringify(calculator));
    return data;
  } catch (err) {
    console.log(err);
    throw new Error("Fail to fetch All posts data!!");
  }
};

export const addProgrammer = async (formData) => {
  const result = Object.fromEntries(formData);
  const { id, monitor_number, monitor_result, monitor_date, pro_mode } = result;
  try {
    connectDB();
    const newCalculator = new Programmer({
      id,
      monitor_number,
      monitor_result,
      monitor_date,
      pro_mode,
    });
    console.log("newCalculator", newCalculator);
    await newCalculator.save();
  } catch (err) {
    console.log(err);
    throw new Error("Fail to save Post!");
  }
};

export const deleteProgrammer = async (formData) => {
  const ids = formData.getAll("id");
  try {
    connectDB();
    await Programmer.deleteMany({
      id: { $in: ids },
    });
  } catch (err) {
    console.log(err);
    throw new Error("Fail to save Post!");
  }
};

export const getProgrammerByDate = async (date) => {
  try {
    connectDB();

    const startOfDayUTC = new Date(`${date}T00:00:00+00:00`); // UTC
    const endOfDayUTC = new Date(`${date}T23:59:59.999+00:00`);
    // monitor_date 기준 조건
    const monitorDateCondition = {
      monitor_date: {
        $regex: `^${date}`, // date = "2025-01-07"
      },
    };

    // createdAt 기준 조건
    const startOfDayKST = new Date(`${date}T00:00:00+09:00`);
    const endOfDayKST = new Date(`${date}T23:59:59.999+09:00`);
    const createdAtCondition = {
      createdAt: {
        $gte: startOfDayKST, //startOfDayUTC -> 저장값이 한국시간이면, KST는 표준시일경우
        $lte: endOfDayKST, // endOfDayUTC
      },
    };

    let calculator = await Programmer.find(monitorDateCondition)
      .sort({ createdAt: -1 })
      .lean();

    // monitor_date로 찾은 데이터가 없으면 createdAt으로 검색
    if (calculator.length === 0) {
      calculator = await Programmer.find(createdAtCondition)
        .sort({ createdAt: -1 })
        .lean();
    }

    return JSON.parse(JSON.stringify(calculator));
  } catch (err) {
    console.log(err);
    throw new Error("해당 날짜의 기록을 가져오는데 실패했습니다.");
  }
};

export const getStandardByDate = async (date) => {
  try {
    connectDB();
    const startOfDayUTC = new Date(`${date}T00:00:00+00:00`); // UTC
    const endOfDayUTC = new Date(`${date}T23:59:59.999+00:00`);
    // monitor_date 기준 조건
    const monitorDateCondition = {
      monitor_date: {
        $regex: `^${date}`, // date = "2025-01-07"
      },
    };

    // createdAt 기준 조건
    const startOfDayKST = new Date(`${date}T00:00:00+09:00`);
    const endOfDayKST = new Date(`${date}T23:59:59.999+09:00`);
    const createdAtCondition = {
      createdAt: {
        $gte: startOfDayKST,
        $lte: endOfDayKST,
      },
    };

    let calculator = await Standard.find(monitorDateCondition)
      .sort({ createdAt: -1 })
      .lean();

    // monitor_date로 찾은 데이터가 없으면 createdAt으로 검색
    if (calculator.length === 0) {
      calculator = await Standard.find(createdAtCondition)
        .sort({ createdAt: -1 })
        .lean();
    }

    return JSON.parse(JSON.stringify(calculator));
  } catch (err) {
    console.log(err);
    throw new Error("해당 날짜의 기록을 가져오는데 실패했습니다.");
  }
};
