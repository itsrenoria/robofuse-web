from PIL import Image
import os

def create_favicon():
    try:
        # Load the source logo
        # Assuming logo.png is in public/ and has transparency or white background
        source_path = 'public/logo.png'
        
        if not os.path.exists(source_path):
            # Fallback to src/assets if public/logo.png doesn't exist (though we used it in Login.jsx)
            print(f"Error: {source_path} not found.")
            return

        img = Image.open(source_path)
        img = img.convert("RGBA")

        # Resize to standard favicon size (e.g., 64x64 for better quality on high DPI)
        img = img.resize((64, 64), Image.Resampling.LANCZOS)

        # Optional: If the image has a white background, make it transparent
        # This is a simple heuristic: replace white pixels with transparent
        datas = img.getdata()
        newData = []
        for item in datas:
            # Change all white (also shades of whites)
            if item[0] > 240 and item[1] > 240 and item[2] > 240:
                newData.append((255, 255, 255, 0))
            else:
                newData.append(item)

        img.putdata(newData)

        # Save as favicon.png
        output_path = 'public/favicon.png'
        img.save(output_path, "PNG")
        print(f"Successfully created transparent favicon at {output_path}")

    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    create_favicon()
