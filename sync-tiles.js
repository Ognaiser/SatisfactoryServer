// sync-drive.js
import fs from "fs-extra";
import path from "path";
import readline from "readline";
import dotenv from "dotenv";
import { google } from "googleapis";

dotenv.config();

const SCOPES = ["https://www.googleapis.com/auth/drive.readonly"];
const TOKEN_PATH = "token.json";
const CREDENTIALS_PATH = "credentials.json";

const DRIVE_FOLDER_ID = process.env.DRIVE_FOLDER_ID; // ID of "Tiles" main folder
const LOCAL_FOLDER = process.env.LOCAL_FOLDER || "./public/images";

// --- AUTH SETUP ---
async function loadCredentials() {
  try {
    const content = await fs.readFile(CREDENTIALS_PATH, "utf8");
    return JSON.parse(content);
  } catch {
    console.error("❌ Missing credentials.json file. Please download it from Google Cloud Console.");
    process.exit(1);
  }
}

async function authorize() {
  const credentials = await loadCredentials();
  const { client_secret, client_id, redirect_uris } = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

  try {
    const token = await fs.readFile(TOKEN_PATH, "utf8");
    oAuth2Client.setCredentials(JSON.parse(token));
    return oAuth2Client;
  } catch {
    return getNewToken(oAuth2Client);
  }
}

function getNewToken(oAuth2Client) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
  });
  console.log("🔗 Authorize this app by visiting this URL:\n", authUrl);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve, reject) => {
    rl.question("\nEnter the code from that page here: ", async (code) => {
      rl.close();
      try {
        const { tokens } = await oAuth2Client.getToken(code.trim());
        oAuth2Client.setCredentials(tokens);
        await fs.writeFile(TOKEN_PATH, JSON.stringify(tokens));
        console.log("✅ Token stored to", TOKEN_PATH);
        resolve(oAuth2Client);
      } catch (err) {
        reject(err);
      }
    });
  });
}

// --- DRIVE UTILS ---
async function listFilesInFolder(drive, folderId) {
  let files = [];
  let pageToken = null;

  do {
    const res = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: "nextPageToken, files(id, name, mimeType)",
      spaces: "drive",
      pageToken,
    });

    files.push(...res.data.files);
    pageToken = res.data.nextPageToken;
  } while (pageToken);

  return files;
}

async function downloadFile(drive, file, destPath) {
  if (await fs.pathExists(destPath)) {
    console.log(`✔ Skipping ${file.name} (already exists)`);
    return;
  }

  console.log(`⬇ Downloading ${file.name} → ${destPath}`);
  await fs.ensureDir(path.dirname(destPath));

  const dest = fs.createWriteStream(destPath);
  await drive.files.get(
    { fileId: file.id, alt: "media" },
    { responseType: "stream" }
  ).then(res => {
    return new Promise((resolve, reject) => {
      res.data.on("end", resolve).on("error", reject).pipe(dest);
    });
  });

  console.log(`✅ Downloaded ${file.name}`);
}

async function syncFolder(drive, folderId, localPath) {
  const items = await listFilesInFolder(drive, folderId);
  for (const item of items) {
    if (item.mimeType === "application/vnd.google-apps.folder") {
      // Subfolder → recurse
      const subFolderPath = path.join(localPath, item.name);
      await syncFolder(drive, item.id, subFolderPath);
    } else {
      // File → download
      const filePath = path.join(localPath, item.name);
      await downloadFile(drive, item, filePath);
    }
  }
}

// --- MAIN SYNC ---
async function syncDrive() {
  const auth = await authorize();
  const drive = google.drive({ version: "v3", auth });

  console.log("🔄 Syncing Google Drive folder structure...");
  await fs.ensureDir(LOCAL_FOLDER);

  await syncFolder(drive, DRIVE_FOLDER_ID, LOCAL_FOLDER);
  console.log("✅ Sync complete!");
}

syncDrive().catch(err => console.error("❌ Error:", err));