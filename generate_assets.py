from PIL import Image, ImageDraw, ImageFont
import os

# --- 1. SVG Assets ---
favicon_svg = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <defs>
    <linearGradient id="ntSlateBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1E293B"/>
      <stop offset="100%" stop-color="#0F172A"/>
    </linearGradient>
    <linearGradient id="ntStrokeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="100%" stop-color="#F1F5F9"/>
    </linearGradient>
    <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000000" flood-opacity="0.3"/>
    </filter>
  </defs>
  
  <!-- Squircle Tile -->
  <rect x="2" y="2" width="60" height="60" rx="16" fill="url(#ntSlateBg)" stroke="#334155" stroke-width="1.5"/>
  
  <!-- Fluid Calligraphic NT Monogram -->
  <g fill="none" stroke="url(#ntStrokeGrad)" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round" filter="url(#softGlow)">
    <!-- N: left stem + fluid diagonal sweeping up to right stem -->
    <path d="M18 43.5 V23.5 C18 20.5 20.5 19.5 22.5 21 L33 37.5 V22.5" />
    
    <!-- T: crossbar connected fluidly + calligraphic curved stem -->
    <path d="M28 21.5 H47" />
    <path d="M39 21.5 V38 C39 42 41.5 44 45 42.5" />
  </g>
  
  <!-- Islamic Nuqta / Diamond Accent Dot -->
  <rect x="30" y="11" width="4.5" height="4.5" rx="1" transform="rotate(45 32.25 13.25)" fill="#94A3B8"/>
</svg>
'''

logo_svg = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 56" width="240" height="56">
  <defs>
    <linearGradient id="logoSlateBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1E293B"/>
      <stop offset="100%" stop-color="#0F172A"/>
    </linearGradient>
    <linearGradient id="logoStrokeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="100%" stop-color="#F1F5F9"/>
    </linearGradient>
  </defs>

  <!-- Squircle Icon Mark -->
  <g transform="translate(6, 6)">
    <rect x="0" y="0" width="44" height="44" rx="12" fill="url(#logoSlateBg)" stroke="#334155" stroke-width="1.2"/>
    <g transform="scale(0.6875)" fill="none" stroke="url(#logoStrokeGrad)" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M18 43.5 V23.5 C18 20.5 20.5 19.5 22.5 21 L33 37.5 V22.5" />
      <path d="M28 21.5 H47" />
      <path d="M39 21.5 V38 C39 42 41.5 44 45 42.5" />
      <rect x="30" y="11" width="4.5" height="4.5" rx="1" transform="rotate(45 32.25 13.25)" fill="#94A3B8" stroke="none"/>
    </g>
  </g>

  <!-- Typography: Namaz Tracker -->
  <text x="62" y="29" font-family="'Plus Jakarta Sans', system-ui, -apple-system, sans-serif" font-size="19" font-weight="800" fill="#0F172A" letter-spacing="-0.02em">
    Namaz <tspan fill="#334155" font-weight="600">Tracker</tspan>
  </text>
  <text x="63" y="44" font-family="'Noto Sans Bengali', sans-serif" font-size="11" font-weight="500" fill="#64748B" letter-spacing="0.04em">
    দৈনন্দিন নামায ও কাযা ট্র্যাকিং
  </text>
</svg>
'''

with open('static/favicon.svg', 'w', encoding='utf-8') as f:
    f.write(favicon_svg)

with open('static/logo.svg', 'w', encoding='utf-8') as f:
    f.write(logo_svg)

# --- 2. High-Quality Raster Assets (ICO & PNG) via Pillow Supersampling ---
SCALE = 8
size_hi = 64 * SCALE
img = Image.new("RGBA", (size_hi, size_hi), (0, 0, 0, 0))
draw = ImageDraw.Draw(img)

# Background squircle
pad = 2 * SCALE
rect_box = [pad, pad, size_hi - pad, size_hi - pad]
radius = 16 * SCALE

draw.rounded_rectangle(rect_box, radius=radius, fill=(15, 23, 42, 255), outline=(51, 65, 85, 255), width=int(1.5 * SCALE))

# Foreground NT lines with stroke
sw = int(4.2 * SCALE)
col = (248, 250, 252, 255)

# Path 1: N left vertical stem (18, 43.5) to (18, 23.5)
draw.line([(18 * SCALE, 43.5 * SCALE), (18 * SCALE, 23.5 * SCALE)], fill=col, width=sw)
# Curve N top
draw.line([(18 * SCALE, 23.5 * SCALE), (22.5 * SCALE, 21 * SCALE)], fill=col, width=sw)
# N diagonal to (33, 37.5)
draw.line([(22.5 * SCALE, 21 * SCALE), (33 * SCALE, 37.5 * SCALE)], fill=col, width=sw)
# N right vertical up to (33, 22.5)
draw.line([(33 * SCALE, 37.5 * SCALE), (33 * SCALE, 22.5 * SCALE)], fill=col, width=sw)

# Path 2: T crossbar (28, 21.5) to (47, 21.5)
draw.line([(28 * SCALE, 21.5 * SCALE), (47 * SCALE, 21.5 * SCALE)], fill=col, width=sw)

# Path 3: T stem (39, 21.5) to (39, 38)
draw.line([(39 * SCALE, 21.5 * SCALE), (39 * SCALE, 38 * SCALE)], fill=col, width=sw)
# T hook: (39, 38) to (41.5, 43) to (45, 42.5)
draw.line([(39 * SCALE, 38 * SCALE), (41.5 * SCALE, 43 * SCALE), (45 * SCALE, 42.5 * SCALE)], fill=col, width=sw)

# Nuqta / Diamond
diamond = [
    (32.25 * SCALE, 10.5 * SCALE),
    (35.0 * SCALE, 13.25 * SCALE),
    (32.25 * SCALE, 16.0 * SCALE),
    (29.5 * SCALE, 13.25 * SCALE)
]
draw.polygon(diamond, fill=(148, 163, 184, 255))

# Export ICO (16, 32, 48)
img_32 = img.resize((32, 32), Image.Resampling.LANCZOS)
img_16 = img.resize((16, 16), Image.Resampling.LANCZOS)
img_48 = img.resize((48, 48), Image.Resampling.LANCZOS)
img_180 = img.resize((180, 180), Image.Resampling.LANCZOS)
img_192 = img.resize((192, 192), Image.Resampling.LANCZOS)

img_32.save("static/favicon.png", "PNG")
img_180.save("static/apple-touch-icon.png", "PNG")
img_192.save("static/favicon-192.png", "PNG")

img.save("static/favicon.ico", format="ICO", sizes=[(16, 16), (32, 32), (48, 48)])

print("All logo, favicon (SVG, PNG, ICO) generated successfully!")
