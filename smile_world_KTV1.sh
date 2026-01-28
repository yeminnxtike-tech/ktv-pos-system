#!/bin/bash

# smile_world_KTV1.sh - Simple KTV POS System Starter

cd "$(dirname "$0")"

echo "Starting KTV POS System..."

# Activate virtual environment
source venv/bin/activate

# Open browser after 2 seconds
(sleep 2 && python3 -c "import webbrowser; webbrowser.open('http://127.0.0.1:5000')") &

# Start Flask app
python3 app.py

deactivate
echo "App stopped."
