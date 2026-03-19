# GuardIA - OTP por correo

## Estado actual

El proyecto ya incluye:

- Login con correo y contrasena mediante Firebase Auth
- Segundo factor por codigo enviado al correo
- Pantalla de validacion OTP en el frontend
- Cloud Functions para generar y validar el codigo
- Plantilla HTML personalizada para el correo

## Proveedor de correo

El backend ahora soporta proveedores configurables via API HTTP desde `functions/index.js`.

Proveedores soportados:

- `resend`
- `brevo`
- `smtp`

No hace falta instalar otra libreria porque Node 20 ya soporta `fetch`.

## Configuracion requerida

Debes definir estos valores en Firebase Functions:

```bash
firebase functions:config:set guardia_mail.provider="smtp"
firebase functions:config:set guardia_mail.from="GuardIA <acceso@tudominio.com>"
firebase functions:config:set guardia_auth.otp_secret="UN_SECRETO_LARGO_Y_PRIVADO"
```

Opcional:

```bash
firebase functions:config:set guardia_mail.reply_to="soporte@tudominio.com"
```

Configuracion adicional por proveedor:

Si vas a usar `Resend`:

```bash
firebase functions:config:set guardia_mail.provider="resend"
firebase functions:config:set guardia_mail.api_key="TU_API_KEY_RESEND"
```

Si vas a usar `Brevo`:

```bash
firebase functions:config:set guardia_mail.provider="brevo"
firebase functions:config:set guardia_mail.api_key="TU_API_KEY_BREVO"
```

Si vas a usar `SMTP`:

```bash
firebase functions:config:set guardia_mail.provider="smtp"
firebase functions:config:set guardia_mail.smtp_host="smtp.tuservidor.com"
firebase functions:config:set guardia_mail.smtp_port="587"
firebase functions:config:set guardia_mail.smtp_secure="false"
firebase functions:config:set guardia_mail.smtp_user="usuario_smtp"
firebase functions:config:set guardia_mail.smtp_pass="password_smtp"
```

Luego despliega:

```bash
firebase deploy --only functions
```

## Recomendacion para enviar a cualquier correo

Si necesitas que el MFA llegue a cuentas de Gmail, Outlook, Hotmail, dominios corporativos y otros proveedores sin depender de una lista cerrada de destinatarios, conviene usar una plataforma transaccional dedicada con dominio verificado.

Las opciones mas directas en este proyecto son:

1. Verificar tu dominio en `Brevo`, `Resend` o en tu proveedor `SMTP`
2. Configurar SPF, DKIM y, si es posible, DMARC
3. Usar un remitente del mismo dominio verificado
4. Desactivar cualquier modo sandbox o de pruebas del proveedor

## Dominio del correo

En `Resend`, `Brevo` o tu proveedor `SMTP` debes:

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

Si corres Functions Emulator y no configuras proveedor de correo, el backend devuelve `debugCode`.

Eso permite probar el flujo sin enviar correos reales.

Importante: el fallback de debug ya no queda activo por defecto fuera del emulador. Si quieres forzarlo manualmente, define:

```bash
GUARDIA_ALLOW_EMAIL_DEBUG_FALLBACK=true
```

## Archivos implicados

- `src/pages/login/Login.tsx`
- `src/context/AuthContext.tsx`
- `src/routes/ProtectedRoute.tsx`
- `functions/index.js`
- `db/init.sql`
