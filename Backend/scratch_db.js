const mongoose = require("mongoose");
require("dotenv").config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/skillifyme");
  
  const User = mongoose.model("User", new mongoose.Schema({}, { strict: false }), "users");
  const users = await User.find({});
  console.log("Users:", users.map(u => ({ email: u.email, role: u.role, password: u.password })));
  
  await mongoose.connection.close();
}
run();
