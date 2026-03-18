# GuardIA - OTP por correo

## Estado actual

El proyecto ya incluye:

- Login con correo y contrasena mediante Firebase Auth
- Segundo factor por codigo enviado al correo
- Pantalla de validacion OTP en el frontend
- Cloud Functions para generar y validar el codigo
- Plantilla HTML personalizada para el correo

## Proveedor de correo recomendado

Se usa `Resend` via API HTTP desde `functions/index.js`.

No hace falta instalar otra libreria porque Node 20 ya soporta `fetch`.

## Configuracion requerida

Debes definir estos valores en Firebase Functions:

```bash
firebase functions:config:set guardia_mail.api_key="TU_API_KEY_RESEND"
firebase functions:config:set guardia_mail.from="GuardIA <acceso@tudominio.com>"
firebase functions:config:set guardia_auth.otp_secret="UN_SECRETO_LARGO_Y_PRIVADO"
```

Luego despliega:

```bash
firebase deploy --only functions
```

## Dominio del correo

En Resend debes:

1. Registrar tu dominio
2. Configurar DNS
3. Verificar el remitente
4. Usar ese remitente en `guardia_mail.from`

Ejemplo:

```txt
GuardIA <acceso@guardia.tudominio.com>
```

## Flujo esperado

1. El usuario inicia sesion con Firebase Auth
2. Se genera un codigo OTP de 6 digitos
3. Se envia al correo registrado
4. El usuario captura el codigo
5. Si el codigo es valido, se habilita el acceso al panel

## Modo emulador

Si corres Functions Emulator y no configuras Resend, el backend devuelve `debugCode`.

Eso permite probar el flujo sin enviar correos reales.

## Archivos implicados

- `src/pages/login/Login.tsx`
- `src/context/AuthContext.tsx`
- `src/routes/ProtectedRoute.tsx`
- `functions/index.js`
- `db/init.sql`
