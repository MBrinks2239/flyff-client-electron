const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const ws = require("windows-shortcuts"); // npm install windows-shortcuts

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
    if ((input.control || input.meta) && (input.key === "+" || input.key === "-")) {
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
  const shortcutPath = path.join(desktop, `${settings.profile}.lnk`);

  const iconPath = path.join(__dirname, "assets", "icons", settings.icon);

  const args = [
    `--profile=${settings.profile}`,
    `--width=${settings.width}`,
    `--height=${settings.height}`,
  ];
  if (settings.noMaximize) args.push("--no-maximize");

  ws.create(
    shortcutPath,
    {
      target: appPath,
      args: args.join(" "),
      icon: iconPath,
      desc: `Flyff Universe - ${settings.profile}`,
    },
    (err) => {
      if (err) {
        console.error("Failed to create shortcut:", err);
        event.reply("shortcut-created", { success: false, error: err.message });
      } else {
        console.log("Shortcut created:", shortcutPath);
        event.reply("shortcut-created", { success: true });
      }
    }
  );
});

app.whenReady().then(() => {
  if (profileName !== "default") {
    createWindow();
  } else {
    createCreationWindow();
  }
});
