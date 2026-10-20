"""Run the research's arcas_fin_check.py with its finwave.py and vd2.py
importable (its own sys.path entry names a scratch folder of the session
that wrote it). Run from this folder:
  python3 -I arcas_rerun.py > arcas_rerun.out"""
import os
import runpy
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
SCRIPTS = os.path.join(HERE, '..', 'total-drag', 'scripts')
sys.path.insert(0, SCRIPTS)
runpy.run_path(os.path.join(SCRIPTS, 'arcas_fin_check.py'), run_name='__main__')
