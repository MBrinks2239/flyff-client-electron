const { app, BrowserWindow } = require("electron");

var profileName = app.commandLine.getSwitchValue("profile");
if (profileName === "") {
  profileName = process.argv[2];
}

if (profileName === "" || profileName == undefined) {
  profileName = "default";
}

const createWindow = () => {
  const win = new BrowserWindow({
    autoHideMenuBar: true,
    show: false,
    width: 1920,
    height: 1080,
    webPreferences: {
      partition: profileName ? `persist:${profileName}` : undefined,
    },
  });

  win.maximize();

  win.loadURL("https://universe.flyff.com/play");

  win.once("ready-to-show", () => {
    win.setTitle(`Flyff Universe - ${profileName}`);
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
