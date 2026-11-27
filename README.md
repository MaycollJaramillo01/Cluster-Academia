# Cluster Academia y CRM

Aplicación independiente para Academia, CRM interno, sitios publicados desde el panel y Postulaciones. La web comercial sigue en Cluster. La base de referencia de esta extracción es el commit `8b4d7ca` del repositorio Cluster.

## Local y CI

1. Usa Node según `.nvmrc` y ejecuta `npm ci`.
2. Copia `.env.example` a `.env.local`. Define `DATABASE_URL` con una base de pruebas explícita y usa `npm run dev`.
3. Abre `/academia` para alumnos, `/dashboard` para el equipo y `/postulaciones` para reclutamiento.
4. Ejecuta `npx tsc --noEmit`, `npm run build` y `npm run test:lms`. En GitHub Actions, configura el secreto `LMS_TEST_DATABASE_URL` con la base de pruebas. Las pruebas usan un esquema temporal.

Deja `CRM_OPERATIONS_ENABLED=false` en Preview. Carga exclusivamente credenciales de prueba para pagos, correos, mensajes y almacenamiento. En Vercel define `ACADEMIA_BASE_URL` con el origen público en producción. El cliente de base usa únicamente `DATABASE_URL`.

## Enviar eventos y leads de otros sitios

El backend del sitio origen envía un POST a `/api/crm/ingest`. Cada sitio se autoriza por separado con un token de al menos 32 caracteres. Guarda en el destino `CRM_INGEST_KEYS` como un objeto JSON cuyas claves son los hostnames, por ejemplo `{"www.cluster.marketing":"<token-del-sitio>"}`. Guarda la URL del receptor y el token como secretos de servidor en el origen.

Ejemplo de llamada desde el **servidor del sitio origen**. Conserva el mismo ID al reintentar un envío pendiente.

```ts
const response = await fetch(process.env.CRM_INGEST_URL!, {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    'x-crm-source': 'www.cluster.marketing',
    authorization: `Bearer ${process.env.CRM_INGEST_TOKEN}`,
  },
  body: JSON.stringify({
    id: submissionId,
    name: 'lead_submitted',
    path: '/contacto',
    campaign: campaignName,
    lead: { name, email, phone, country, form: 'contacto', details: { servicio } },
  }),
});
if (!response.ok) throw new Error('No se pudo entregar al CRM');
```

Envía `lead_submitted` después de validar el formulario y el consentimiento pertinente. Para medición sin datos personales, envía solo `id`, `name`, `path` y `campaign`. La respuesta es 201 si se acepta el evento y 200 en un reintento ya registrado. **Dashboard → Hoy** agrupa los eventos web de los últimos 30 días por sitio y evento. Los eventos históricos y operativos del LMS siguen en `academia_events`. Los datos de contacto de un lead se almacenan en el CRM. Mantén los tokens fuera de JavaScript de navegador.

## Corte a producción

- Ensaya con una copia aislada de Neon y preserva los IDs, relaciones, claves de deduplicación, trabajos pendientes y órdenes de pago. La inicialización del destino conserva los registros existentes, incluida una base histórica con la marca `seeded`.
- Conecta los llamadores de `captureLead` en el sitio comercial al receptor: contacto, podcast, Ruta Local, acuerdo de proveedores y postulaciones. Activa el origen y verifica un envío por formulario antes de retirar la escritura anterior. Para visitas y otros eventos de navegación, instala el emisor del sitio con el consentimiento pertinente.
- Revisa Blob privado, Bunny y los archivos de Postulaciones. Si cambian de almacén, valida sus referencias y permisos antes de retirar el anterior. Comprueba fotos o videos históricos de cursos con enlaces relativos.
- Actualiza Google OAuth, Stripe, PayPal, Resend, WhatsApp y Twilio. Conserva los enlaces antiguos de cursos, constancias, sitios publicados y bajas con redirecciones o compatibilidad temporal. Para webhooks configura el destino en el proveedor con su firma correspondiente.
- Después de verificar colas, compras, reembolsos, permisos y archivos, detén el cron anterior y activa `CRM_OPERATIONS_ENABLED=true` en el destino. Conserva un respaldo y un plan de reversión antes del cambio.

Consulta [CRM](README-CRM.md) y [LMS](README-LMS.md) para los flujos operativos.
