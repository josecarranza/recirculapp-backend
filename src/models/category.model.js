import { Schema, model } from "mongoose";

const CategorySchema = new Schema(
  {
    categoryName: {
      type: String,
      unique: true,
      required: [true, "category name is required."],
    },
    description: {
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
  },
  { timestamps: true, versionKey: false }
);

export default model("Category", CategorySchema);
