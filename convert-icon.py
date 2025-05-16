import os
import subprocess
import tempfile
import shutil

def convert_ico_to_icns(ico_path):
    directory = os.path.dirname(ico_path)
    filename = os.path.splitext(os.path.basename(ico_path))[0]
    icns_path = os.path.join(directory, f"{filename}.icns")

    with tempfile.TemporaryDirectory() as tmpdir:
        iconset_path = os.path.join(tmpdir, "icon.iconset")
        os.makedirs(iconset_path, exist_ok=True)

        extracted_png = os.path.join(iconset_path, "icon.png")

        try:
            # Extract only the first image from the ICO (usually largest or 256x256)
            subprocess.run(["magick", f"{ico_path}[0]", extracted_png], check=True)
        except subprocess.CalledProcessError as e:
            print(f"❌ Failed to extract PNG from {ico_path}: {e}")
            return

        if not os.path.exists(extracted_png):
            print(f"⚠️ No PNG extracted from {ico_path}, skipping.")
            return

        sizes = [16, 32, 64, 128, 256, 512, 1024]
        for size in sizes:
            resized = os.path.join(iconset_path, f"icon_{size}x{size}.png")
            try:
                subprocess.run([
                    "sips", "-z", str(size), str(size),
                    extracted_png, "--out", resized
                ], check=True)

                if size != 1024:
                    half = size // 2
                    at2x = os.path.join(iconset_path, f"icon_{half}x{half}@2x.png")
                    shutil.copy(resized, at2x)

            except subprocess.CalledProcessError as e:
                print(f"⚠️ Failed to resize to {size}x{size} for {ico_path}: {e}")

        try:
            subprocess.run(["iconutil", "-c", "icns", iconset_path, "-o", icns_path], check=True)
            print(f"✅ Converted: {ico_path} → {icns_path}")
        except subprocess.CalledProcessError as e:
            print(f"❌ iconutil failed for {ico_path}: {e}")

def process_directory(root_dir):
    for dirpath, _, filenames in os.walk(root_dir):
        for filename in filenames:
            if filename.lower().endswith(".ico"):
                ico_path = os.path.join(dirpath, filename)
                convert_ico_to_icns(ico_path)

if __name__ == "__main__":
    import sys
    if len(sys.argv) != 2:
        print("Usage: python3 convert-icon.py <root-directory>")
        sys.exit(1)

    root_directory = sys.argv[1]
    if not os.path.isdir(root_directory):
        print("Provided path is not a directory.")
        sys.exit(1)

    process_directory(root_directory)
