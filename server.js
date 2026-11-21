require("dotenv").config();

const mongoose = require("mongoose");

const app = require("./src/app");
const connectDB = require("./src/config/db");

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();

    const server = app.listen(PORT, () => {
      console.log("");
      console.log("  INVENTORY AND DATA MANAGEMENT SYSTEM API");
      console.log("  Web Dev III - Unit 3 - Lab Assignment 3");
      console.log(`  http://localhost:${PORT}`);
      console.log("");
    });

    server.on("error", (error) => {
      if (error.code === "EADDRINUSE") {
        console.error(`Port ${PORT} is already in use. Stop the other process or set a different PORT.`);
        process.exit(1);
      }
      throw error;
    });

    const shutdown = async () => {
      await mongoose.connection.close();
      server.close(() => process.exit(0));
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
};

startServer();
