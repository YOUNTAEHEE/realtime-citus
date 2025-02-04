const mongoose = require("mongoose");

const standardSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    monitor_number: { type: String, required: true },
    monitor_result: { type: String, required: true },
    monitor_date: { type: String, required: true },
  },
  {
    timestamps: true,
    collection: "standard",
  }
);

const programmerSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    monitor_number: { type: String, required: true },
    monitor_result: { type: String, required: true },
    monitor_date: { type: String, required: true },
    pro_mode: { type: String, required: true },
  },
  {
    timestamps: true,
    collection: "programmer",
  }
);

export const Standard =
  mongoose.models.Standard || mongoose.model("Standard", standardSchema);

export const Programmer =
  mongoose.models.Programmer || mongoose.model("Programmer", programmerSchema);
