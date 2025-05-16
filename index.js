const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const ws = require("windows-shortcuts"); // npm install windows-shortcuts
const fs = require("fs");
const os = require("os");

let profileName = app.commandLine.getSwitchValue("profile");
let shouldNotMaximize = app.commandLine.getSwitchValue("no-maximize");
let appHeight = parseInt(app.commandLine.getSwitchValue("height"));
let appWidth = parseInt(app.commandLine.getSwitchValue("width"));

console.log("Profile:", profileName);
console.log("No Maximize:", shouldNotMaximize);
console.log("Height:", appHeight);
console.log("Width:", appWidth);

if (profileName === "") {
  profileName = process.argv[2];
}

if (!profileName) {
  profileName = "default";
}

const createWindow = () => {
  if (isNaN(appHeight) || appHeight == undefined) {
    appHeight = 1080;
  }
  if (isNaN(appWidth) || appWidth == undefined) {
    appWidth = 1920;
  }

  const win = new BrowserWindow({
    autoHideMenuBar: true,
    show: false,
    width: appWidth,
    height: appHeight,
    webPreferences: {
      partition: profileName ? `persist:${profileName}` : undefined,
    },
  });

  if (shouldNotMaximize !== "true") {
    win.maximize();
  }

  win.loadURL("https://universe.flyff.com/play");

  win.once("ready-to-show", () => {
    win.setTitle(`Flyff Universe - ${profileName}`);
    win.setSize(appWidth, appHeight);
    win.show();
    win.webContents.setZoomFactor(1);
  });

  win.webContents.on("before-input-event", (event, input) => {
    if (
      (input.control || input.meta) &&
      (input.key === "+" || input.key === "-")
    ) {
      event.preventDefault();
    }
  });
};

const createCreationWindow = () => {
  const win = new BrowserWindow({
    width: 800,
    height: 1000,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  win.loadFile("screens/index.html");
};

ipcMain.on("create-shortcut", (event, settings) => {
  const appPath = process.execPath;
  const desktop = app.getPath("desktop");
  const profile = settings.profile;
  const platform = os.platform();

  const args = [
    `--profile=${profile}`,
    `--width=${settings.width}`,
    `--height=${settings.height}`,
  ];
  if (settings.noMaximize) args.push("--no-maximize");

  if (platform === "win32") {
    const shortcutPath = path.join(desktop, `${profile}.lnk`);
    const iconPath = path.join(__dirname, "assets", "icons", settings.icon);

    ws.create(
      shortcutPath,
      {
        target: appPath,
        args: args.join(" "),
        icon: iconPath,
        desc: `Flyff Universe - ${profile}`,
      },
      (err) => {
        if (err) {
          event.reply("shortcut-created", { success: false, error: err.message });
        } else {
          event.reply("shortcut-created", { success: true });
        }
      }
    );
  } else if (platform === "darwin") {
    const bundleName = `${profile}.app`;
    const appBundlePath = path.join(desktop, bundleName);
    const contentsDir = path.join(appBundlePath, "Contents");
    const macosDir = path.join(contentsDir, "MacOS");
    const resourcesDir = path.join(contentsDir, "Resources");
  
    fs.mkdirSync(macosDir, { recursive: true });
    fs.mkdirSync(resourcesDir, { recursive: true });
  
    const launcherPath = path.join(macosDir, "launcher");
    const launcherScript = `#!/bin/bash
  "${appPath}" ${args.map((a) => `"${a}"`).join(" ")} &
  `;
    fs.writeFileSync(launcherPath, launcherScript, { mode: 0o755 });
  
    // 🔽 Use .icns instead of .ico
    const icnsFilename = settings.icon.replace(/\.ico$/i, ".icns");
    const icnsSource = path.join(__dirname, "assets", "icons", icnsFilename);
    const icnsTarget = path.join(resourcesDir, "app.icns");
  
    try {
      fs.copyFileSync(icnsSource, icnsTarget);
    } catch (copyErr) {
      console.warn(`⚠️ Couldn't copy icon for ${profile}: ${copyErr.message}`);
    }
  
    // Info.plist
    const plist = `<?xml version="1.0" encoding="UTF-8"?>
  <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
    "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
  <plist version="1.0">
    <dict>
      <key>CFBundleExecutable</key>
      <string>launcher</string>
      <key>CFBundleIdentifier</key>
      <string>com.yourapp.${profile}</string>
      <key>CFBundleName</key>
      <string>${profile}</string>
      <key>CFBundlePackageType</key>
      <string>APPL</string>
      <key>CFBundleIconFile</key>
      <string>app.icns</string>
    </dict>
  </plist>
  `;
    fs.writeFileSync(path.join(contentsDir, "Info.plist"), plist);
  
    event.reply("shortcut-created", { success: true });
  }
});

ipcMain.on("clear-cache", (event) => {
  const userData = app.getPath("userData");
  const partitionsRoot = path.join(userData, "Partitions");

  let deletedCount = 0;
  const errors = [];

  // 1) Make sure Partitions/ exists
  if (!fs.existsSync(partitionsRoot) || !fs.statSync(partitionsRoot).isDirectory()) {
    return event.reply("cache-cleared", {
      success: false,
      errors: ["Partitions folder not found at " + partitionsRoot],
    });
  }

  // 2) List each profile folder under Partitions/
  const profiles = fs
    .readdirSync(partitionsRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => path.join(partitionsRoot, d.name));

  // 3) For each profile, delete its Cache/ directory if present
  profiles.forEach((profileDir) => {
    const cacheDir = path.join(profileDir, "Cache");
    if (fs.existsSync(cacheDir) && fs.statSync(cacheDir).isDirectory()) {
      try {
        fs.rmSync(cacheDir, { recursive: true, force: true });
        deletedCount++;
      } catch (err) {
        errors.push(`Failed to delete Cache for “${path.basename(profileDir)}”: ${err.message}`);
      }
    }
  });

  // 4) Report back
  if (errors.length === 0) {
    event.reply("cache-cleared", { success: true, deletedCount });
  } else {
    event.reply("cache-cleared", { success: false, deletedCount: 0, errors });
  }
});

app.whenReady().then(() => {
  if (profileName !== "default") {
    createWindow();
  } else {
    createCreationWindow();
  }
});
