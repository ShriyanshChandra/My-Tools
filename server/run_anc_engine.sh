#!/usr/bin/env bash
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." >/dev/null 2>&1 && pwd )"
cd "$DIR"

# Select the most compatible Python 3 interpreter (prefer stable 3.12/3.11 for precompiled wheels)
if command -v python3.12 &> /dev/null; then
    PYTHON_BIN="python3.12"
elif [ -f "/opt/homebrew/bin/python3.12" ]; then
    PYTHON_BIN="/opt/homebrew/bin/python3.12"
elif [ -f "/usr/local/bin/python3.12" ]; then
    PYTHON_BIN="/usr/local/bin/python3.12"
elif command -v python3.11 &> /dev/null; then
    PYTHON_BIN="python3.11"
elif command -v python3 &> /dev/null; then
    PYTHON_BIN="python3"
else
    echo "Error: Python 3 is required but not found."
    exit 1
fi

# Create virtual environment if it doesn't exist or is invalid
if [ ! -f ".venv/bin/python" ]; then
    echo "Creating virtual environment (.venv) using $PYTHON_BIN..."
    "$PYTHON_BIN" -m venv .venv
fi

echo "Verifying / installing dependencies into .venv..."
.venv/bin/python -m pip install -q -r server/requirements.txt

echo "Starting Native CoreAudio ANC Engine on ws://localhost:8765..."
exec .venv/bin/python server/anc_engine.py
