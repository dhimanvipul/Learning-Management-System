require("dotenv").config();
const app = require("./app");
const connectDB = require("./config/db");
const http = require("http");
const { initSocket } = require("./utils/socket");

const PORT = process.env.PORT || 3000;

const server = http.createServer(app);
initSocket(server);

// 1. Routes (app ready hona chahiye)
app.use("/api/enrollments", require("./modules/enrollments/enrollment.routes"));


// 2. DB connect THEN server start
connectDB().then(() => {
  server.listen(PORT, () =>
    console.log(`🚀 Server on http://localhost:${PORT}`)
  );
});