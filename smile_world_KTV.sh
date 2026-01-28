#!/bin/bash
# smile_world_KTV.sh - KTV POS System Starter

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
cd "$SCRIPT_DIR"

# Show notification
notify-send "Smile World KTV" "စနစ်စတင်နေပါသည်..." -i dialog-information

# Check if running in terminal, if not open terminal
if [ -z "$TERM" ]; then
    # Open new terminal window with the script
    gnome-terminal -- bash -c "cd '$SCRIPT_DIR' && source venv/bin/activate && python3 app.py; exec bash"
else
    # Already in terminal, run directly
    source venv/bin/activate
    python3 app.py
fi
