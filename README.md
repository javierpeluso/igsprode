# ⚽ Prode Mundial 2026

App de pronósticos del Mundial 2026 para equipos. Login con Google, pronósticos por partido, ranking en tiempo real.

---

## Stack

- **React 18** (Create React App)
- **Firebase** — Auth (Google) + Firestore (base de datos)
- **Deploy recomendado** — Vercel o Firebase Hosting

---

## Setup en 5 pasos

### PASO 1 — Cloná e instalá dependencias

```bash
npm install
```

---

### PASO 2 — Creá tu proyecto en Firebase

1. Ir a [https://console.firebase.google.com](https://console.firebase.google.com)
2. Clic en **"Agregar proyecto"** → poné un nombre → crear
3. En el menú lateral → **Authentication** → **Sign-in method** → habilitá **Google**
4. En el menú lateral → **Firestore Database** → **Crear base de datos** → elegí modo **producción** → elegí la región más cercana (ej: `us-central1`)

---

### PASO 3 — Configurá las credenciales

1. En Firebase Console → ⚙️ Configuración del proyecto → pestaña **"General"**
2. Bajá hasta "Tus apps" → clic en `</>` para agregar una app web
3. Copiá el objeto `firebaseConfig`
4. Abrí el archivo **`src/lib/firebase.js`** y reemplazá los valores:

```js
const firebaseConfig = {
  apiKey: "tu-api-key-real",
  authDomain: "tu-proyecto.firebaseapp.com",
  projectId: "tu-proyecto",
  storageBucket: "tu-proyecto.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};
```

---

### PASO 4 — Configurá las reglas de Firestore

En Firebase Console → Firestore → pestaña **Reglas**, pegá esto:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Usuarios: cualquier usuario autenticado puede leer, solo el propio puede escribir
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }

    // Pronósticos: solo el propio usuario puede leer/escribir sus pronósticos
    match /predictions/{userId}/matches/{matchId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }

    // Resultados: solo admins pueden escribir, cualquier usuario autenticado puede leer
    match /results/{matchId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid in [
        // Agregá acá los UIDs de los admins (ver Paso 5)
        // "uid-admin-1",
        // "uid-admin-2"
      ];
    }
  }
}
```

> **Nota**: Mientras desarrollás podés usar `allow write: if request.auth != null;` en results para facilitar las pruebas.

---

### PASO 5 — Configurá los admins

Para que el panel Admin sea visible y para poder cargar resultados:

1. Logueate en la app con tu cuenta de Google
2. Abrí la consola del navegador (F12) y ejecutá:
   ```js
   // Después de loguearte:
   import('/firebase/app').then(() => console.log(firebase.auth().currentUser.uid))
   ```
   O más fácil: Firebase Console → **Authentication** → **Users** → copiá el **User UID**

3. Abrí **`src/App.jsx`** y agregá tu UID:
   ```js
   const ADMIN_UIDS = [
     'tu-uid-de-firebase-aqui',
   ];
   ```

4. Hacé lo mismo en las reglas de Firestore (Paso 4)

---

## Correr en desarrollo

```bash
npm start
```

Abre [http://localhost:3000](http://localhost:3000)

---

## Deploy en Vercel (recomendado)

```bash
npm install -g vercel
vercel
```

Seguí los pasos. En configuración:
- Framework: **Create React App**
- Build command: `npm run build`
- Output directory: `build`

---

## Deploy en Firebase Hosting

```bash
npm install -g firebase-tools
firebase login
firebase init hosting
# Public directory: build
# Configure as single-page app: YES
npm run build
firebase deploy
```

---

## Sistema de puntos

| Resultado | Puntos |
|-----------|--------|
| Marcador exacto (ej: pronosticaste 2-1 y salió 2-1) | **3 puntos** |
| Ganador correcto (ej: pronosticaste 2-1, salió 3-0) | **1 punto** |
| Fallo | 0 puntos |

---

## Estructura del proyecto

```
src/
├── App.jsx                 # Componente principal, tabs, auth
├── index.css               # Estilos globales
├── index.js                # Entry point
├── lib/
│   └── firebase.js         # 👈 Configurá tus credenciales acá
├── data/
│   └── fixture.js          # Fixture completo de los 72 partidos
├── hooks/
│   ├── useAuth.js          # Hook de autenticación
│   └── useProde.js         # Hooks de Firestore (pronósticos, resultados, ranking)
└── components/
    ├── LoginPage.jsx        # Pantalla de login
    ├── MatchCard.jsx        # Tarjeta de partido individual
    ├── PronosticosTab.jsx   # Tab de pronósticos
    ├── RankingTab.jsx       # Tab de ranking
    └── AdminTab.jsx         # Tab de admin (cargar resultados)
```

---

## Agregar más participantes

No hace falta hacer nada — cualquier persona que se loguee con Google quedará registrada automáticamente en Firestore y aparecerá en el ranking.

Si querés **restringir el acceso solo a personas de tu empresa** (por ejemplo, solo emails @tuempresa.com), agregá esta verificación en `App.jsx`:

```jsx
// En App.jsx, después de obtener el user:
if (user && !user.email.endsWith('@tuempresa.com')) {
  logout();
  alert('Solo pueden acceder empleados de la empresa');
  return <LoginPage />;
}
```

---

## Fase eliminatoria

El fixture de la fase eliminatoria (dieciseisavos, cuartos, semis, final) no está pre-cargado porque los cruces dependen de cómo terminen los grupos. Podés agregarlo fácilmente en `src/data/fixture.js` siguiendo el mismo formato una vez que se definan los cruces.
