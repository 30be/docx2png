#!/bin/bash
set -e

# 1. Install System Dependencies
echo "Installing system dependencies..."
apt-get update
apt-get install -y libreoffice poppler-utils python3-full python3-pip python3-venv unzip curl gnupg debian-keyring debian-archive-keyring apt-transport-https

# 2. Install Bun
if ! command -v bun &> /dev/null; then
    echo "Installing Bun..."
    curl -fsSL https://bun.sh/install | bash
    export BUN_INSTALL="$HOME/.bun"
    export PATH="$BUN_INSTALL/bin:$PATH"
else
    echo "Bun is already installed."
    export BUN_INSTALL="$HOME/.bun"
    export PATH="$BUN_INSTALL/bin:$PATH"
fi

# 3. Install Caddy
if ! command -v caddy &> /dev/null; then
    echo "Installing Caddy..."
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
    apt-get update
    apt-get install -y caddy
else
    echo "Caddy is already installed."
fi

# 4. Setup Backend
echo "Setting up Backend..."
cd backend
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi
source venv/bin/activate
pip install fastapi uvicorn python-multipart
cd ..

# 5. Setup Frontend
echo "Setting up Frontend..."
cd frontend
bun install
bun run build
cd ..

# 6. Setup Systemd Service
echo "Setting up Systemd Service..."
cp docx2png.service /etc/systemd/system/docx2png.service
systemctl daemon-reload
systemctl enable docx2png
systemctl restart docx2png

# 7. Setup Caddy
echo "Setting up Caddy..."
# Backup existing Caddyfile if it exists and isn't a symlink to ours (optional, but safer to just overwrite for this task)
cat Caddyfile > /etc/caddy/Caddyfile
systemctl reload caddy

echo "Installation complete!"
