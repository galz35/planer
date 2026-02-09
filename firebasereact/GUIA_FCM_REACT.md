# Firebase Push Notifications para React (clarity-pwa)

## ¿Por Qué Necesitas Esto?

El backend YA envía notificaciones push cuando te asignan tareas:
- `notification.service.ts` → Usa Firebase Admin SDK
- Trigger: Cuando crean tarea asignada a otro usuario

**Pero React (clarity-pwa) NO las recibe** porque no tiene Firebase configurado.

## Cuándo Implementar

Este código es para **después** de terminar Flutter.
Si quieres recibir push en la web, implementa estos archivos.

---

## Paso 1: Instalar Dependencias

```bash
cd clarity-pwa
npm install firebase
```

---

## Paso 2: Crear firebase.config.ts

Crear archivo `src/services/firebase.config.ts`:

```typescript
import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

// Estos valores vienen de Firebase Console → Configuración del proyecto
const firebaseConfig = {
  apiKey: "AIzaSyD1eMZiJCGKdCn729tYoJ7UCX_iKx_yjUE",
  authDomain: "plannerfcm.firebaseapp.com",
  projectId: "plannerfcm",
  storageBucket: "plannerfcm.firebasestorage.app",
  messagingSenderId: "117191663113",
  appId: "1:117191663113:web:GENERAR_EN_FIREBASE_CONSOLE"
};

const app = initializeApp(firebaseConfig);
export const messaging = getMessaging(app);

// Obtener token FCM para registrar en backend
export const getFCMToken = async (): Promise<string | null> => {
  try {
    const token = await getToken(messaging, {
      vapidKey: 'TU_VAPID_KEY_DE_FIREBASE_CONSOLE'
    });
    console.log('📱 FCM Token:', token);
    return token;
  } catch (error) {
    console.error('Error obteniendo FCM token:', error);
    return null;
  }
};

// Escuchar mensajes en foreground
export const onForegroundMessage = (callback: (payload: any) => void) => {
  return onMessage(messaging, (payload) => {
    console.log('📩 Push recibido en foreground:', payload);
    callback(payload);
  });
};
```

---

## Paso 3: Crear Service Worker

Crear archivo `public/firebase-messaging-sw.js`:

```javascript
// Firebase Messaging Service Worker
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyD1eMZiJCGKdCn729tYoJ7UCX_iKx_yjUE",
  authDomain: "plannerfcm.firebaseapp.com",
  projectId: "plannerfcm",
  storageBucket: "plannerfcm.firebasestorage.app",
  messagingSenderId: "117191663113",
  appId: "1:117191663113:web:GENERAR_EN_FIREBASE_CONSOLE"
});

const messaging = firebase.messaging();

// Manejar mensajes en background
messaging.onBackgroundMessage((payload) => {
  console.log('📩 Push en background:', payload);

  const notificationTitle = payload.notification?.title || 'Nueva Notificación';
  const notificationOptions = {
    body: payload.notification?.body || '',
    icon: '/momentus-logo2.png',
    badge: '/momentus-logo2.png',
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const taskId = event.notification.data?.taskId;
  const url = taskId ? `/app/tareas/${taskId}` : '/app/hoy';
  
  event.waitUntil(
    clients.openWindow(url)
  );
});
```

---

## Paso 4: Integrar en App

En `src/App.tsx` o después del login, agregar:

```typescript
import { useEffect } from 'react';
import { getFCMToken, onForegroundMessage } from './services/firebase.config';
import { api } from './services/api';

// Después de login exitoso:
useEffect(() => {
  const setupPush = async () => {
    // 1. Solicitar permiso de notificaciones
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('❌ Permiso de notificaciones denegado');
      return;
    }

    // 2. Obtener token FCM
    const token = await getFCMToken();
    if (!token) return;

    // 3. Registrar token en backend
    try {
      await api.post('/notifications/device-token', {
        token,
        platform: 'web'
      });
      console.log('✅ Token registrado en backend');
    } catch (e) {
      console.error('Error registrando token:', e);
    }
  };

  setupPush();

  // 4. Escuchar mensajes en foreground
  const unsubscribe = onForegroundMessage((payload) => {
    // Mostrar toast o notificación in-app
    // Ejemplo con SweetAlert2:
    import('sweetalert2').then(Swal => {
      Swal.default.fire({
        title: payload.notification?.title || 'Nueva Tarea',
        text: payload.notification?.body,
        icon: 'info',
        toast: true,
        position: 'top-end',
        timer: 5000,
        showConfirmButton: false
      });
    });
  });

  return () => unsubscribe();
}, []);
```

---

## Paso 5: Configurar Firebase Console

1. Ir a [Firebase Console](https://console.firebase.google.com)
2. Proyecto: `plannerfcm`
3. Agregar app Web:
   - Click en icono web `</>`
   - Registrar app "Clarity PWA"
   - Copiar `appId` a los archivos de arriba
4. Cloud Messaging:
   - Generar par de claves VAPID
   - Copiar "Clave web push" a `vapidKey` en `firebase.config.ts`

---

## Paso 6: Desplegar

```bash
npm run build
# Deploy a producción
```

---

## Resultado Esperado

Después de implementar esto:
1. Usuario hace login en React web
2. Token FCM se registra en backend vía `/notifications/device-token`
3. Cuando otro usuario crea tarea asignada a ti:
   - Backend llama a Firebase Admin SDK
   - Push llega a tu navegador (pestaña abierta o cerrada)
   - Ves notificación del sistema con título y cuerpo

---

**NOTA:** Este código es para implementar DESPUÉS de terminar Flutter.
El backend YA está listo para enviar push, solo falta el lado del cliente web.
