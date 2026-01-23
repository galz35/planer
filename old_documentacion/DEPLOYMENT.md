# 🚀 Guía de Despliegue - Momentus Planning

## Requisitos Previos
- Instancia EC2 con Amazon Linux 2023
- Grupo de Seguridad con puertos 22, 80, 443 abiertos
- Base de datos SQL Server (RDS o local)

## Despliegue Rápido (3 pasos)

### 1. Clonar y preparar en el servidor
```bash
# Conectarse al servidor
ssh -i tu-llave.pem ec2-user@TU_IP_PUBLICA

# Crear estructura y clonar
mkdir -p ~/app/proyecto
cd ~/app/proyecto
git clone https://tu-repo.git .
```

### 2. Configurar credenciales
```bash
# Backend: Crear archivo .env con credenciales reales
cd backend
cp .env.example .env
nano .env  # Editar con tus credenciales de BD y JWT_SECRET
```

### 3. Ejecutar deploy automático
```bash
cd ~/app/proyecto
chmod +x deploy.sh
./deploy.sh
```

## ¿Qué hace el script deploy.sh?
1. ✅ Instala Node.js 20, Nginx y PM2
2. ✅ Compila el backend (NestJS)
3. ✅ Inicia la API con PM2 (clustering + auto-restart)
4. ✅ Compila el frontend (Vite)  
5. ✅ Configura Nginx como proxy reverso
6. ✅ Habilita auto-inicio en reboot

## Comandos Útiles

| Comando | Descripción |
|---------|-------------|
| `pm2 logs momentus-api` | Ver logs del backend |
| `pm2 restart momentus-api` | Reiniciar backend |
| `pm2 monit` | Monitor en tiempo real |
| `sudo systemctl restart nginx` | Reiniciar Nginx |
| `sudo journalctl -u nginx -f` | Ver logs de Nginx |

## Actualizar después de cambios

Si haces cambios en el código y los subes a GitHub:
```bash
cd ~/app/proyecto
git pull
./deploy.sh  # El script es idempotente
```

## Estructura de Archivos
```
/home/ec2-user/app/proyecto/
├── backend/           # API NestJS
│   ├── .env           # Credenciales (NO en Git)
│   ├── .env.example   # Plantilla
│   └── dist/          # Build compilado
├── clarity-pwa/       # Frontend React+Vite
│   └── dist/          # Build estático
├── deploy.sh          # Script de despliegue
└── DEPLOYMENT.md      # Esta guía
```

## Notas de Seguridad
- El archivo `.env` está en `.gitignore` y NUNCA debe subirse
- Usa JWT_SECRET largo y aleatorio (32+ caracteres)
- En producción, configura HTTPS con Certbot:
  ```bash
  sudo dnf install certbot python3-certbot-nginx
  sudo certbot --nginx -d tu-dominio.com
  ```
