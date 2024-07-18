import mongoose from "mongoose";
import config from "./config";

// console.log(mongoose.version);

async function connectToDatabase() {
  try {
    await mongoose.connect(
      "mongodb+srv://" +
      config.MONGO_ATLAS_USER +
      ":" +
      config.MONGO_ATLAS_PASS +
      config.MONGO_ATLAS_URI,
      {
        maxPoolSize: 10,
      }
    );
    console.log("Mongoose connected to database");
  } catch (error) {
    console.log(`Mongoose connection error: ${error}`);
  }
}

connectToDatabase();

mongoose.connection.on("disconnected", () => {
  console.log("Mongoose disconnected from database");
});

process.on("SIGINT", async () => {
  await mongoose.connection.close();
  console.log("Mongoose disconnected from database due to application termination");
  process.exit(0);
});