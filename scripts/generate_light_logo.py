import os
from PIL import Image

logo_path = "/home/mrlogic/Documents/GitHubs/talk2me-ai/public/assets/logo.png"
img = Image.open(logo_path)
img = img.convert("RGBA")
width, height = img.size

# Create the light mode version
light_img = img.copy()
data = light_img.load()

# The bubbles are on the left. The text is on the right.
# Let's find where the text starts. We can safely assume text is x > 150.
# Let's inspect pixels and change white/near-white to dark slate (15, 23, 42)
for y in range(height):
    for x in range(width):
        if x > 140:  # Only modify the text area
            r, g, b, a = data[x, y]
            if a > 30:  # If it's not transparent
                # Check if it's white or near-white/gray
                # In the logo, the white text has a subtle outline/shading.
                # We can check if it's close to white or gray (R, G, B are all close to each other, and not strongly saturated blue/magenta)
                is_near_white = (r > 180 and g > 180 and b > 180)
                is_gray_shading = (abs(r - g) < 20 and abs(g - b) < 20 and abs(r - b) < 20 and r < 180 and r > 50)
                
                if is_near_white or is_gray_shading:
                    # Scale the dark slate color by how bright the pixel was, to preserve anti-aliasing/shading
                    brightness = (r + g + b) / 3.0
                    factor = brightness / 255.0
                    
                    # Target color: dark slate (15, 23, 42)
                    # For white pixels (factor ~ 1.0), we want it to be dark slate (15, 23, 42).
                    # For darker/shading pixels, we want it to be even darker or keep the relative shading.
                    # Let's just map it:
                    nr = int(15 + (255 - 15) * (1 - factor))
                    ng = int(23 + (255 - 23) * (1 - factor))
                    nb = int(42 + (255 - 42) * (1 - factor))
                    
                    data[x, y] = (nr, ng, nb, a)

# Save the light mode logo
light_logo_path = "/home/mrlogic/Documents/GitHubs/talk2me-ai/public/assets/logo-light.png"
light_img.save(light_logo_path, "PNG")
print(f"Saved light mode logo to {light_logo_path}")

# Also save the original logo as logo-dark.png
dark_logo_path = "/home/mrlogic/Documents/GitHubs/talk2me-ai/public/assets/logo-dark.png"
img.save(dark_logo_path, "PNG")
print(f"Saved dark mode logo to {dark_logo_path}")
