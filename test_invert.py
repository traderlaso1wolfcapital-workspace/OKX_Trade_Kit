import re

css = """
QTableWidget { background-color: #1e1e1e; color: #e0e0e0; font-size: 14px; font-weight: normal; gridline-color: #333333; border: 1px solid #333333; }
QTableWidget::item { padding: 4px 10px; font-size: 14px; font-weight: normal; }
QHeaderView::section { background-color: #2d2d2d; color: #e0e0e0; font-weight: bold; font-size: 14px; border: 1px solid #333333; padding: 5px 8px; }
color: white; color: #FFFFFF;
"""

def invert_stylesheet(css, to_light):
    if not css: return css
    if to_light:
        css = re.sub(r'(?i)#1e1e1e', '#ffffff', css)
        css = re.sub(r'(?i)#2d2d2d', '#f4f4f4', css)
        css = re.sub(r'(?i)#252526', '#e0e0e0', css)
        css = re.sub(r'(?i)#121212', '#dcdcdc', css)
        css = re.sub(r'(?i)#e0e0e0', '#111111', css)
        css = re.sub(r'(?i)#ffffff', '#000000', css)
        css = re.sub(r'(?i)#333333', '#cccccc', css)
        css = re.sub(r'(?i)#555555', '#aaaaaa', css)
        css = re.sub(r'(?i)color:\s*white', 'color: black', css)
    else:
        css = re.sub(r'(?i)#ffffff', '#1e1e1e', css)
        css = re.sub(r'(?i)#f4f4f4', '#2d2d2d', css)
        css = re.sub(r'(?i)#e0e0e0', '#252526', css)
        css = re.sub(r'(?i)#dcdcdc', '#121212', css)
        css = re.sub(r'(?i)#111111', '#e0e0e0', css)
        css = re.sub(r'(?i)#000000', '#ffffff', css)
        css = re.sub(r'(?i)#cccccc', '#333333', css)
        css = re.sub(r'(?i)#aaaaaa', '#555555', css)
        css = re.sub(r'(?i)color:\s*black', 'color: white', css)
    return css

light = invert_stylesheet(css, True)
print("LIGHT:")
print(light)
print("DARK:")
print(invert_stylesheet(light, False))

