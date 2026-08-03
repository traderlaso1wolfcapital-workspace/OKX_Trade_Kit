import sys
from PyQt6 import QtWidgets

app = QtWidgets.QApplication(sys.argv)
w = QtWidgets.QWidget()
w.setStyleSheet("background-color: red; color: yellow;")
lbl = QtWidgets.QLabel("Test Label", w)
lbl.setStyleSheet("color: blue;")

app.setStyleSheet("QWidget { background-color: white !important; color: black !important; }")

lbl.show()
w.show()
# We will just run this and dump the stylesheet to see if it sets.
# Actually we can't test visual without seeing it.
