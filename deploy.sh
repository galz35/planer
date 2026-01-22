#!/bin/bash
# ═══════════════════════════════════════════════════════════════════
# MOMENTUS PLANNING - Script de Despliegue Automático
# ═══════════════════════════════════════════════════════════════════
# COPIA ESTE ARCHIVO COMPLETO AL SERVIDOR Y EJECÚTALO
# ═══════════════════════════════════════════════════════════════════

set -e

PUBLIC_IP="44.222.103.222"
PROYECTO_DIR="/home/ec2-user/planificacion"
BACKEND_DIR="$PROYECTO_DIR/backend"
FRONTEND_DIR="$PROYECTO_DIR/clarity-pwa"

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║     🚀 MOMENTUS - Iniciando Despliegue                       ║"
echo "╚══════════════════════════════════════════════════════════════╝"

# 1. Instalar dependencias del sistema
echo "📦 [1/7] Instalando Node.js, Nginx, PM2..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
    sudo dnf install -y nodejs
fi
sudo dnf install -y nginx git
sudo npm install -g pm2

# 2. Compilar Backend
echo "⚙️  [2/7] Compilando Backend..."
cd "$BACKEND_DIR"
npm ci --omit=dev
npm run build

# 3. Iniciar Backend con PM2
echo "🔄 [3/7] Iniciando Backend..."
pm2 delete momentus-api 2>/dev/null || true
pm2 start dist/main.js --name "momentus-api" -i max
pm2 save

# 4. Compilar Frontend
echo "🎨 [4/7] Compilando Frontend..."
cd "$FRONTEND_DIR"
cat > .env.production <<EOF
VITE_API_URL=http://$PUBLIC_IP/api
VITE_APP_TITLE=Momentus Planning
EOF
npm ci
npm run build

# 5. Configurar Nginx
echo "🌐 [5/7] Configurando Nginx..."
sudo tee /etc/nginx/conf.d/momentus.conf > /dev/null <<EOF
server {
    listen 80;
    server_name $PUBLIC_IP _;

    root $FRONTEND_DIR/dist;
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_cache_bypass \$http_upgrade;
    }

    gzip on;
    gzip_types text/plain text/css application/json application/javascript;
}
EOF

# 6. Reiniciar Nginx
echo "🔄 [6/7] Activando Nginx..."
sudo rm -f /etc/nginx/conf.d/default.conf 2>/dev/null || true
sudo nginx -t && sudo systemctl restart nginx
sudo systemctl enable nginx

# 7. Configurar auto-inicio
echo "🔧 [7/7] Configurando auto-inicio..."
pm2 startup systemd -u ec2-user --hp /home/ec2-user 2>/dev/null || true
pm2 save

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║     ✅ ¡DESPLIEGUE COMPLETADO!                               ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║  🌐 Abrir en navegador: http://$PUBLIC_IP/                   ║"
echo "║  📚 API Docs: http://$PUBLIC_IP/api/docs                     ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║  Ver logs: pm2 logs momentus-api                             ║"
echo "╚══════════════════════════════════════════════════════════════╝"
