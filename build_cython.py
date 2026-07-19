import os
import shutil
from setuptools import setup, Extension
from Cython.Build import cythonize
import glob

# Tắt cảnh báo khi biên dịch
import warnings
warnings.filterwarnings('ignore')

print("=== BAT DAU BIEN DICH CYTHON ===")

# Thu thập tất cả các file cần mã hóa
files_to_compile = [
    "sys_bot_sub1.py",
    "sys_bot_sub2.py"
]
files_to_compile.extend(glob.glob("z_bot_sub1/*.py"))
files_to_compile.extend(glob.glob("z_bot_sub2/*.py"))

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
include_dirs = []
library_dirs = []

if os.name == 'nt':
    include_dirs.append(os.path.join(BASE_DIR, "python_nuget", "tools", "include"))
    library_dirs.append(os.path.join(BASE_DIR, "python_nuget", "tools", "libs"))

extensions = [
    Extension(
        f.replace(".py", "").replace("\\", ".").replace("/", "."), 
        [f],
        include_dirs=include_dirs,
        library_dirs=library_dirs
    ) 
    for f in files_to_compile
]

setup(
    name="TLS1_Bots",
    ext_modules=cythonize(
        extensions,
        compiler_directives={'language_level': "3"},
        build_dir="build_cython",
        annotate=False
    ),
    script_args=["build_ext", "--inplace"]
)

print("=== XOA FILE C TAM THOI ===")
for f in files_to_compile:
    c_file = f.replace(".py", ".c")
    if os.path.exists(c_file):
        os.remove(c_file)

print("=== HOAN THANH CYTHON ===")
