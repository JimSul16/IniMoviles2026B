---
name: Ionic + Angular standalone + Capacitor
description: Creación y configuración de la app móvil API Explorer: scaffold con ionic start, estructura standalone (R7), rutas, HttpClient, Capacitor y compilación del APK por terminal. Usar en la fase de creación del proyecto, al añadir páginas/servicios base o para compilar el APK de Android.
metadata:
  opencode/autoinvoke: true
---

# Creación de app móvil — Ionic + Angular standalone + Capacitor

## Entorno verificado en esta máquina

| Herramienta | Versión |
|---|---|
| Node | v22.23.2 |
| npm | 10.9.8 |
| Ionic CLI | 7.2.1 (global) |
| Git | 2.55.0 |
| `ng` | **NO global** → usar siempre `npx ng ...` |

## 1. Scaffold (la carpeta NO está vacía)

`ionic start` exige un directorio limpio, y aquí ya hay `PLAN.md`, `HANDOFF.md`, `.opencode/` y `opencode.jsonc`. Se crea en un temporal y se mueve:

```powershell
ionic start _tmp blank --type=angular-standalone --capacitor --no-git
Get-ChildItem -Force _tmp | Move-Item -Destination .   # -Force mueve .gitignore y .editorconfig
Remove-Item -Recurse _tmp
```

- `--type=angular-standalone` → Angular con componentes standalone (sin NgModules).
- `--capacitor` → integra Capacitor desde el inicio.
- `--no-git` → nosotros hacemos el `git init` cuando acuerde el plan (evita doble repo).

## 2. Verificación inmediata

```powershell
npm run build          # debe compilar (equivale a npx ng build)
npx ionic serve        # arranca en el navegador para comprobar la app
```

## 3. Estructura obligatoria (requisito R7)

```
src/app/
├── app.config.ts      ← providers
├── app.routes.ts      ← rutas con loadComponent
├── models/            ← interfaces TypeScript
├── services/          ← TODO el HTTP vive aquí (nunca en una página)
├── components/        ← componentes reutilizables
└── pages/             ← una carpeta por página
```

`app.config.ts` mínimo:

```ts
export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(withFetch()),
    provideAnimationsAsync(),
  ],
};
```

Rutas (lazy por componente standalone):

```ts
export const routes: Routes = [
  { path: '', loadComponent: () => import('./pages/home/home.page').then(m => m.HomePage) },
  { path: 'anime/:id', loadComponent: () => import('./pages/detail/detail.page').then(m => m.DetailPage) },
  { path: '**', redirectTo: '' },
];
```

## 4. Dependencias

```powershell
npm i @capacitor/preferences     # favoritos (R6)
npm ls @capacitor/core           # ya viene con --capacitor; comprobar versión
```

Instalar dependencias **solo** con aprobación del agente de infraestructura (`mimo-infra`).

## 5. APK por terminal (tarea de 🟦 MiMo)

```powershell
npm run build              # 1. compilar la web
npx cap sync android       # 2. copiar www/ al proyecto Android
cd android
.\gradlew.bat assembleDebug    # 3. compilar el APK (Windows)
```

- Salida: `android\app\build\outputs\apk\debug\app-debug.apk`
- Requisitos: Android Studio o Android SDK + `JAVA_HOME` apuntando a un JDK 17+.
- Si `gradlew` falla por entorno, alternativa: `npx cap open android` y compilar desde Android Studio (pero el plan exige **terminal**).
- Comprobación final: `Get-Item ..\android\app\build\outputs\apk\debug\app-debug.apk | Select Length`.

## 6. Comandos de verificación de verde

```powershell
npm run build     # 0 errores de compilación
npx ng lint       # si hay eslint configurado
npx ionic build   # alternativa del CLI
```

## 7. Trampas conocidas

1. Empezar con `ionic start` en carpeta no vacía → error o mezcla de archivos.
2. Usar `ng` sin `npx` → "no se reconoce el comando".
3. Olvidar `provideHttpClient` → error `ReticuloError: NullInjectorError` en runtime.
4. Crear un segundo repo git con el scaffold → usar `--no-git`.
5. Modificar `android/` a mano → `npx cap sync android` lo sobreescribe; solo se toca `android/app/src/main/res` para iconos/splash.
