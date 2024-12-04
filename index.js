const { app, BrowserWindow } = require("electron");

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

if (profileName === "" || profileName == undefined) {
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

  win.webContents.on('before-input-event', (event, input) => {
    if ((input.control || input.meta) && (input.key === '+' || input.key === '-')) {
      event.preventDefault();
    }
  });
};

app.whenReady().then(() => {
  createWindow();
});
