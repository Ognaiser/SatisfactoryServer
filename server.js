import express from "express";
import path from "path";
import fs from "fs";

const app = express();
const PORT = 8080;

// Folder where your tiles were downloaded
const TILES_DIR = path.resolve("./tiles");

// Serve the map tiles
app.get("/imgMap/gameLayer/Stable/:z/:x/:y.png", (req, res) => {
    console.log("request received", req.params);
    
  const { z, x, y } = req.params;
  const filePath = path.join(TILES_DIR, z, x, `${y}.png`);

  if (!fs.existsSync(filePath)) {
    return res.status(404).send("Tile not found");
  }

  res.sendFile(filePath);
});

// Also handle requests without .png extension
app.get("/imgMap/gameLayer/Stable/:z/:x/:y", (req, res) => {
    
  const { z, x, y } = req.params;
  const filePath = path.join(TILES_DIR, z, x, `${y}.png`);

  if (!fs.existsSync(filePath)) {
    return res.status(404).send("Tile not found");
  }

  res.sendFile(filePath);
});

// Optional: serve static test files (like an index.html if you add one)
app.use(express.static("public"));

// Start the server
app.listen(PORT, () => {
  console.log(`🛰️  Tile server running at: http://localhost:${PORT}`);
  console.log(`Example: http://localhost:${PORT}/imgMap/gameLayer/Stable/4/0/0.png`);
});