import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "path";

import postRoutes from "./routes/posts.routes.js";
import userRoutes from "./routes/user.routes.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const __dirname = path.resolve();
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use(postRoutes);
app.use(userRoutes);

const start = async () => {
    await mongoose.connect(process.env.MONGO_URI);

    app.listen(9080, () => {
        console.log("Server is running on port 9080");
    });
};

start();