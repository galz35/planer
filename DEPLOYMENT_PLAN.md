# Plan de Despliegue a Producción (AWS VPC + PM2)

Este documento detalla los pasos para desplegar **Momentus Planning** en un entorno de producción seguro y escalable utilizando Amazon Web Services (AWS) y PM2.

## 1. Arquitectura Objetivo
- **Infraestructura:** AWS VPC con subnets públicas/privadas.
- **Servidor de Aplicación:** EC2 (Ubuntu 22.04 o Amazon Linux 2023).
- **Base de Datos:** AWS RDS (SQL Server o PostgreSQL) o Contenedor Docker en la misma EC2 (para instancias pequeñas).
- **Gestor de Procesos:** PM2 para el Backend (Node.js/NestJS).
- **Servidor Web:** Nginx como Reverse Proxy (Backend) y Servidor Estático (Frontend PWA).
- **Seguridad:** Security Groups restringidos y HTTPS con Certbot.

---

## 2. Preparación del Entorno (AWS)

### 2.1. Red (VPC)
1.  Crear una **VPC** (ej. `vpc-momentus-prod`).
2.  Configurar **Internet Gateway** adjunto a la VPC.
3.  Crear **Security Group** (`sg-momentus-web`) permitiendo entrada en:
    *   TCP 80 (HTTP) - Desde `0.0.0.0/0`
    *   TCP 443 (HTTPS) - Desde `0.0.0.0/0`
    *   TCP 22 (SSH) - **Solo desde tu IP**
    *   TCP 3000 (API Backend - Opcional, mejor cerrar y usar Nginx proxy)

### 2.2. Instancia EC2
1.  Lanzar instancia (t3.medium recomendado para Backend+Front+DB local).
2.  Asignar **Elastic IP** para mantener la IP fija.
3.  Conectarse vía SSH: `ssh -i key.pem ubuntu@tu-ip-elastica`.

### 2.3. Configuración Inicial del Servidor (Linux)
```bash
# Actualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Node.js 20 (LTS)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Instalar herramientas esenciales
sudo apt install -y nginx git build-essential

# Instalar PM2 globalmente
sudo npm install -g pm2
pm2 install pm2-logrotate
```

---

## 3. Despliegue del Backend

### 3.1. Preparación del Código
Desde tu máquina local, asegura que el código esté commiteado y subido a tu repo git.

### 3.2. Instalación en Servidor
```bash
# Clonar repo (o usar rsync si no usas git remoto)
git clone <tu-repo-url> momentus
cd momentus/backend

# Instalar dependencias
npm ci

# Construir aplicación
npm run build

# Configurar variables de entorno
cp .env.example .env
nano .env
# --> EDITAR: DB_HOST, DB_USER, DB_PASS, JWT_SECRET
```

### 3.3. Ejecución con PM2
```bash
# Iniciar con ecosystem file
pm2 start ecosystem.config.js

# Guardar lista de procesos para reinicio automático
pm2 save
pm2 startup
```

---

## 4. Despliegue del Frontend

### 4.1. Construcción (Build)
En TIEMPO DE CONSTRUCCIÓN (en tu máquina local o servidor CI), el frontend necesita saber la URL del backend.

```bash
cd clarity-pwa

# Crear archivo de producción
nano .env.production
# --> Poner: VITE_API_URL=https://tu-dominio.com/api

# Construir
npm ci
npm run build
```
Esto generará la carpeta `dist`.

### 4.2. Mover a servidor Web
Copia el contenido de `clarity-pwa/dist` a `/var/www/momentus-pwa`.

```bash
sudo mkdir -p /var/www/momentus-pwa
sudo cp -r dist/* /var/www/momentus-pwa/
sudo chown -R www-data:www-data /var/www/momentus-pwa
```

---

## 5. Configuración de Nginx (Reverse Proxy)

Nginx servirá el Frontend y redirigirá `/api` al Backend local (puerto 3000).

### 5.1. Archivo de Configuración
Crear `/etc/nginx/sites-available/momentus`:

```nginx
server {
    server_name tu-dominio.com www.tu-dominio.com; # O tu IP pública

    root /var/www/momentus-pwa;
    index index.html;

    # Frontend PWA (SPA Routing)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend API Proxy
    location /api/ {
        proxy_pass http://localhost:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 5.2. Activar Sitio
```bash
sudo ln -s /etc/nginx/sites-available/momentus /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

---

## 6. Base de Datos (SQL Server)

Si decides usar SQL Server Express en Docker dentro de la misma instancia (Opción Económica):

```bash
# Instalar Docker
sudo apt install -y docker.io
sudo useradd -aG docker ubuntu

# Ejecutar SQL Server
docker run -e "ACCEPT_EULA=Y" -e "MSSQL_SA_PASSWORD=TuPasswordFuerte123!" \
   -p 1433:1433 --name sql_server \
   -d mcr.microsoft.com/mssql/server:2022-latest

# Recuerda actualizar .env del backend apuntando a 'localhost'
```

---

## 7. Certificado HTTPS (SSL)

Nunca despliegues en producción sin HTTPS.

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d tu-dominio.com -d www.tu-dominio.com
```

---
**✅ Despliegue Completado.**
- Frontend accesible en: `https://tu-dominio.com`
- API accesible en: `https://tu-dominio.com/api`
