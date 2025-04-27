import express, { application } from "express";
import mongoose from "mongoose";
import cors from "cors";
import { nanoid } from "nanoid";
import dotenv from "dotenv";
import QRCode from "qrcode";
import path from "path";
dotenv.config();
import { fileURLToPath } from "url";
import { dirname } from "path";

// this will fix __dirname problem
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

//connection
mongoose
  .connect(process.env.DATABASE_URL)
  .then(() => console.log("db connected successfully"))
  .catch((err) => console.log("failed to connect db", err));

//url model
const urlSchema = new mongoose.Schema({
  originalUrl: String,
  shortUrl: String,
  clicks: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now, expires: '7d' }
});

const Url = mongoose.model("url", urlSchema);

//api
// app.post("/api/short", async (req, res) => {
//   try {
//     const { originalUrl } = req.body;
//     if (!originalUrl)
//       return res.status(400).json({ error: "originalUrl required" });

//     const shortUrl = nanoid(5); // generate short string
//     const newUrl = new Url({ originalUrl, shortUrl });
//     const myUrl = `http://localhost:3000/${shortUrl}`;
//     const qrCodeImg = await QRCode.toDataURL(myUrl);
//     await newUrl.save();

//     return res
//       .status(200)
//       .json({ message: "URL generated", shortUrl: myUrl, qrCodeImg });
//   } catch (error) {
//     console.log(error);
//     res.status(500).json({ error: "server error" });
//   }
// });

app.post("/api/short", async (req, res) => {
  try {
    // -   const { originalUrl } = req.body;
    const { originalUrl, customShortUrl } = req.body;
    if (!originalUrl)
      return res.status(400).json({ error: "originalUrl required" });

    // -   const shortUrl = nanoid(5); // generate short string
    let shortUrl = customShortUrl ? customShortUrl : nanoid(5);

    // check if custom short url already exists
    if (customShortUrl) {
      const existingUrl = await Url.findOne({ shortUrl: customShortUrl });
      if (existingUrl) {
        return res.status(400).json({ error: "Custom name already taken!" });
      }
    }

    const newUrl = new Url({ originalUrl, shortUrl });
    const myUrl = `http://localhost:3000/${shortUrl}`;
    const qrCodeImg = await QRCode.toDataURL(myUrl);
    await newUrl.save();

    return res
      .status(200)
      .json({
        message: "URL generated",
        shortUrl: myUrl,
        qrCodeImg,
        clicks: newUrl.clicks,
      });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "server error" });
  }
});

//open url
app.get("/:shortUrl", async (req, res) => {
  try {
    const { shortUrl } = req.params;
    const url = await Url.findOne({ shortUrl });
    if (url) {
      url.clicks++;
      await url.save();
      return res.redirect(url.originalUrl);
    } else {
      return res.status(404).json({ error: "Link expired or not found" });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "server error" });
  }
});

// static file
// app.use(express.static(path.join(__dirname, "/frontend/dist")));

// app.get("*", function (req, res) {
//   res.sendFile(path.join(__dirname, "/frontend/dist/index.html"));
// });

app.listen(3000, () => console.log("server is running on 3000"));
