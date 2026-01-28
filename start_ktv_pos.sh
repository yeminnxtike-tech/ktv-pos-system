#!/bin/bash
cd "$(dirname "$0")"
source venv/bin/activate
(sleep 3 && xdg-open "http://127.0.0.1:5000" 2>/dev/null) &
python3 app.py
