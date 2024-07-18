import { Schema, model } from "mongoose";

const SubCategorySchema = new Schema(
  {
    eq: { type: String, default: 0, required: [true, "eq is required."] },
    eq_mj: { type: String, default: 0, required: [true, "eq_mj is required."] },
    eq_water: {
      type: String,
      default: 0,
      required: [true, "eq_water is required."],
    },
    eq_ar: { type: String, default: 0, required: [true, "eq_ar is required."] },
    subCategoryName: {
      type: String,
      unique: true,
      required: [true, "category name is required."],
    },
    suggested_price: {
      type: Number,
      required: [true, "suggested_price is required."],
    },
    comision_porcentaje: {
      type: Number,
      required: [true, "comision_porcentaje is required."],
    },
    description: {
      type: String,
      required: false,
      default: null,
    },
    units: {
      type: String,
      required: false,
      default: null,
    },
    image: [
      {
        type: String,
        required: false,
        default: null,
      },
    ],
    status: {
      type: String,
      required: false,
      default: "active",
    },
    category: { ref: "Category", type: Schema.Types.ObjectId },
  },
  { timestamps: true, versionKey: false }
);

export default model("SubCategory", SubCategorySchema);
