import { query } from "../db.js";

const camerasBaseQuery = `
  SELECT
    c.id,
    c.codigo,
    c.nombre,
    z.nombre AS zone_name,
    c.estado,
    c.protocolo,
    c.resolucion,
    c.url_stream,
    c.perfiles_ia,
    c.retencion_dias
  FROM camaras c
  JOIN zonas z ON z.id = c.zona_id
`;

export async function listCameras() {
  const result = await query(`${camerasBaseQuery} ORDER BY c.nombre ASC`);
  return result.rows;
}

async function ensureZone(zoneName) {
  const existing = await query(`SELECT id FROM zonas WHERE nombre = $1 LIMIT 1`, [zoneName]);
  if (existing.rows[0]?.id) return existing.rows[0].id;

  const sede = await query(`SELECT id FROM sedes ORDER BY creado_en ASC LIMIT 1`);
  const sedeId = sede.rows[0]?.id;
  if (!sedeId) {
    throw new Error("NO_SEDE");
  }

  const created = await query(
    `
      INSERT INTO zonas (sede_id, nombre, nivel)
      VALUES ($1, $2, 'medio'::nivel_riesgo)
      RETURNING id
    `,
    [sedeId, zoneName],
  );

  return created.rows[0].id;
}

export async function createCamera(input) {
  const zoneId = await ensureZone(input.zone);
  const codeResult = await query(`SELECT COUNT(*)::int AS total FROM camaras`);
  const nextNumber = String((codeResult.rows[0]?.total ?? 0) + 1).padStart(3, "0");
  const codigo = `CAM-${nextNumber}`;

  const result = await query(
    `
      INSERT INTO camaras (
        zona_id,
        codigo,
        nombre,
        protocolo,
        resolucion,
        url_stream,
        perfiles_ia,
        retencion_dias,
        estado,
        sensibilidad,
        grabacion_habilitada,
        instalada_en
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, 'online', 50, true, now())
      RETURNING id
    `,
    [
      zoneId,
      codigo,
      input.name,
      input.protocol,
      input.resolution,
      input.streamUrl,
      JSON.stringify(input.aiProfiles),
      input.retentionDays,
    ],
  );

  return result.rows[0]?.id ?? null;
}

export async function updateCamera(cameraId, input) {
  const zoneId = await ensureZone(input.zone);

  const result = await query(
    `
      UPDATE camaras
      SET
        zona_id = $2,
        nombre = $3,
        protocolo = $4,
        resolucion = $5,
        url_stream = $6,
        perfiles_ia = $7::jsonb,
        retencion_dias = $8,
        estado = 'online',
        actualizado_en = now()
      WHERE id = $1
      RETURNING id
    `,
    [
      cameraId,
      zoneId,
      input.name,
      input.protocol,
      input.resolution,
      input.streamUrl,
      JSON.stringify(input.aiProfiles),
      input.retentionDays,
    ],
  );

  return result.rows[0] ?? null;
}
