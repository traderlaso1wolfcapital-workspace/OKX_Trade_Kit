import re

css = """
QTableWidget { background-color: #1e1e1e; color: #e0e0e0; font-size: 14px; font-weight: normal; gridline-color: #333333; border: 1px solid #333333; }
QTableWidget::item { padding: 4px 10px; font-size: 14px; font-weight: normal; }
QHeaderView::section { background-color: #2d2d2d; color: #e0e0e0; font-weight: bold; font-size: 14px; border: 1px solid #333333; padding: 5px 8px; }
color: white; color: #FFFFFF;
"""

def invert_stylesheet(css, to_light):
    if not css: return css
    
    # Chuẩn bị bộ từ điển thay thế
    if to_light:
        replacements = {
            '#1e1e1e': '#ffffff', '#2d2d2d': '#f4f4f4', '#252526': '#e0e0e0', '#121212': '#dcdcdc',
            '#e0e0e0': '#111111', '#ffffff': '#000000', '#333333': '#cccccc', '#555555': '#aaaaaa',
            '#1a1a1a': '#e0e0e0', '#444444': '#bbbbbb', '#252525': '#f0f0f0', '#3a3a3a': '#dddddd',
            '#141414': '#f4f4f4', '#242424': '#e0e0e0', '#2c2c2c': '#cccccc', '#3d3d3d': '#cccccc',
            '#2a2a2a': '#cccccc', '#2e2e2e': '#dcdcdc',
            'color: white': 'color: black', 'color: #ffffff': 'color: #000000',
            'color: #e0e0e0': 'color: #111111'
        }
    else:
        replacements = {
            '#ffffff': '#1e1e1e', '#f4f4f4': '#2d2d2d', '#e0e0e0': '#252526', '#dcdcdc': '#121212',
            '#111111': '#e0e0e0', '#000000': '#ffffff', '#cccccc': '#333333', '#aaaaaa': '#555555',
            '#bbbbbb': '#444444', '#f0f0f0': '#252525', '#dddddd': '#3a3a3a',
            'color: black': 'color: white', 'color: #000000': 'color: #ffffff',
            'color: #111111': 'color: #e0e0e0'
        }

    pattern = re.compile('|'.join(re.escape(k) for k in replacements.keys()), re.IGNORECASE)
    return pattern.sub(lambda m: replacements[m.group(0).lower()], css)

light = invert_stylesheet(css, True)
print("LIGHT:")
print(light)
print("DARK:")
print(invert_stylesheet(light, False))

