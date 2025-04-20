const { ipcRenderer, remote } = require("electron");
const fs = require("fs");
const path = require("path");

const app = remote?.app ?? require("electron").app;

const assetsPath = path.join(__dirname, "..", "assets", "icons");
const customPath = path.join(assetsPath, "custom");

const folderSelect = document.getElementById("folder-select");
const iconSelect = document.getElementById("icon-select");
const iconPreview = document.getElementById("icon-preview");
const uploadInput = document.getElementById("icon-upload");
const uploadButton = document.getElementById("upload-button");
const clearCacheButton = document.getElementById("clear-cache-button");
const toast = document.getElementById("toast");

let toastTimeout = null;

const showToast = (msg, type = "success") => {
  toast.className = `toast ${type} show`;
  toast.innerHTML = msg;

  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.remove("show");
  }, 5000);
};

const clearInvalidStyles = () => {
  document.querySelectorAll("input, select").forEach((el) => {
    el.classList.remove("invalid");
  });
};

const loadFolders = () => {
  folderSelect.innerHTML = "";

  let folders = fs.readdirSync(assetsPath).filter((folder) => {
    const folderPath = path.join(assetsPath, folder);
    if (!fs.statSync(folderPath).isDirectory()) return false;
    const files = fs.readdirSync(folderPath);
    return files.some((f) => /\.ico$/i.test(f));
  });

  folders = folders.filter((f) => f !== "custom");
  if (fs.existsSync(customPath)) {
    const customFiles = fs.readdirSync(customPath);
    if (customFiles.some((f) => /\.ico$/i.test(f))) {
      folders.push("custom");
    }
  }

  folders.forEach((folder) => {
    const option = document.createElement("option");
    option.value = folder;
    option.textContent = folder;
    folderSelect.appendChild(option);
  });
};

const loadIconsFromFolder = (folderName) => {
  const folderPath = path.join(assetsPath, folderName);
  const icons = fs
    .readdirSync(folderPath)
    .filter((file) => /\.ico$/i.test(file));

  iconSelect.innerHTML = "";
  icons.forEach((icon) => {
    const option = document.createElement("option");
    option.value = icon;
    option.textContent = icon;
    iconSelect.appendChild(option);
  });

  if (icons.length > 0) {
    updatePreview(folderName, icons[0]);
  } else {
    iconPreview.src = "";
  }
};

const updatePreview = (folderName, iconName) => {
  const previewPath = path
    .join("..", "assets", "icons", folderName, iconName)
    .replace(/\\/g, "/");
  iconPreview.src = previewPath;
};

folderSelect.addEventListener("change", () => {
  loadIconsFromFolder(folderSelect.value);
});

iconSelect.addEventListener("change", () => {
  updatePreview(folderSelect.value, iconSelect.value);
});

document.getElementById("shortcut-form").addEventListener("submit", (e) => {
  e.preventDefault();
  clearInvalidStyles();

  const profileInput = document.getElementById("profile");
  const widthInput = document.getElementById("width");
  const heightInput = document.getElementById("height");

  const profile = profileInput.value.trim();
  const width = parseInt(widthInput.value);
  const height = parseInt(heightInput.value);
  const noMaximize = !document.getElementById("maximize").checked;
  const folder = folderSelect.value;
  const iconFile = iconSelect.value;
  const iconPath = path.join(assetsPath, folder, iconFile);

  const namePattern = /^[a-zA-Z0-9\-_]+$/;
  const errors = [];

  if (!profile || !namePattern.test(profile)) {
    errors.push(
      "Profile name must only contain letters, numbers, dashes, and underscores."
    );
    profileInput.classList.add("invalid");
  }

  if (isNaN(width) || width < 100) {
    errors.push("Width must be at least 100 pixels.");
    widthInput.classList.add("invalid");
  }

  if (isNaN(height) || height < 100) {
    errors.push("Height must be at least 100 pixels.");
    heightInput.classList.add("invalid");
  }

  if (!iconFile.toLowerCase().endsWith(".ico")) {
    errors.push("Only .ico files are allowed for icons.");
    iconSelect.classList.add("invalid");
  }

  if (!fs.existsSync(iconPath)) {
    errors.push("The selected icon file does not exist.");
    iconSelect.classList.add("invalid");
  }

  if (errors.length > 0) {
    showToast(errors.map((e) => `• ${e}`).join("<br>"), "error");
    return;
  }

  ipcRenderer.send("create-shortcut", {
    profile,
    width,
    height,
    noMaximize,
    icon: path.join(folder, iconFile),
  });
});

ipcRenderer.on("shortcut-created", (event, result) => {
  if (result.success) {
    showToast("Shortcut created successfully on your desktop!", "success");
  } else {
    showToast("Error creating shortcut: " + result.error, "error");
  }
});

uploadButton.addEventListener("click", () => {
  uploadInput.click();
});

uploadInput.addEventListener("change", () => {
  const files = Array.from(uploadInput.files);
  if (files.length === 0) return;

  files.forEach((file) => {
    if (!file.name.toLowerCase().endsWith(".ico")) {
      showToast(`Skipped ${file.name}: only .ico files are allowed.`, "error");
      return;
    }

    const destPath = path.join(customPath, path.basename(file.path));
    fs.copyFile(file.path, destPath, (err) => {
      if (err) {
        console.error("Failed to copy file:", err);
      }
    });
  });

  setTimeout(() => {
    loadFolders();
    folderSelect.value = "custom";
    loadIconsFromFolder("custom");
  }, 200);
});

clearCacheButton.addEventListener("click", () => {
    ipcRenderer.send("clear-cache");
});

ipcRenderer.on("cache-cleared", (event, result) => {
    console.log("Cache cleared:", result);
  if (result.success) {
    showToast(
      result.deletedCount > 0
        ? `Cleared ${result.deletedCount} cache folder(s).`
        : "No cache folders found.",
      result.deletedCount > 0 ? "success" : "error"
    );
  } else {
    let errorMsg = result.errors.join("<br>");
    showToast("Error clearing cache: " + errorMsg, "error");
  }
});

// Initial setup
loadFolders();
if (folderSelect.value) {
  loadIconsFromFolder(folderSelect.value);
}
