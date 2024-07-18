import { Schema, model } from "mongoose";
import bcrypt from "bcrypt";

const UserSchema = new Schema(
  {
    email: {
      type: String,
      unique: true,
      required: [true, "El email es necesario."],
    },
    first_name: { type: String },
    last_name: { type: String },
    status: { type: Boolean, default: true },
    username: { type: String, required: [true, "El username es necesario."] },
    phone_number: { type: String },
    password: { type: String, required: [true, "La contraseña es necesaria."] },
    roles: [{ ref: "Roles", type: Schema.Types.ObjectId }],
  },
  { timestamps: true, versionKey: false }
);

UserSchema.statics.encryptPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
};

UserSchema.statics.comparePassword = async (password, receivedPassword) => {
  return await bcrypt.compare(password, receivedPassword);
};

export default model("User", UserSchema);
