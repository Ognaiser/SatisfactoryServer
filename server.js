import express from "express";
import path from "path";
import fs from "fs";

const app = express();
const PORT = 8080;

// Folder where your tiles were downloaded
const TILES_DIR = path.resolve("./static/tiles");
const DATA_DIR = path.resolve("./static/data");

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

app.get("/data/resources", (req, res) => {
  const filePath = path.join(DATA_DIR, "resources.json");
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "Resources data not found" });
  }
  
  try {
    const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: "Failed to read resources data" });
  }
});

app.get("/data/collectibles", (req, res) => {
  const filePath = path.join(DATA_DIR, "collectibles.json");
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "Collectibles data not found" });
  }
  
  try {
    const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: "Failed to read collectibles data" });
  }
});

app.get("/data/artifacts", (req, res) => {
  const filePath = path.join(DATA_DIR, "artifacts.json");
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "Artifacts data not found" });
  }
  
  try {
    const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: "Failed to read artifacts data" });
  }
});

app.get("/data/wells", (req, res) => {
  const filePath = path.join(DATA_DIR, "wells.json");
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "Wells data not found" });
  }
  
  try {
    const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: "Failed to read wells data" });
  }
});

// Optional: serve static test files (like an index.html if you add one)
app.use(express.static("public"));

// Start the server
app.listen(PORT, () => {
  console.log(`🛰️  Tile server running at: http://localhost:${PORT}`);
  console.log(`Example: http://localhost:${PORT}/imgMap/gameLayer/Stable/4/0/0.png`);
});