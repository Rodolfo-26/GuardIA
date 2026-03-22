import { query } from "../db.js";

const recordingsBaseQuery = `
  SELECT
    g.id,
    g.ruta_archivo,
    g.inicio_en,
    g.fin_en,
    g.duracion_seg,
    g.tamano_mb,
    g.checksum,
    g.archivada,
    c.nombre AS camera_name,
    z.nombre AS zone_name,
    evidence.alert_id,
    evidence.alert_title,
    evidence.event_type,
    evidence.severity,
    evidence.alert_status,
    evidence.confidence_ia,
    evidence.reason AS evidence_reason,
    (evidence.alert_id IS NOT NULL) AS flagged,
    CASE
      WHEN evidence.alert_id IS NOT NULL THEN true
      WHEN g.archivada THEN true
      ELSE false
    END AS reviewed
  FROM grabaciones g
  JOIN camaras c ON c.id = g.camara_id
  JOIN zonas z ON z.id = c.zona_id
  LEFT JOIN LATERAL (
    SELECT
      ve.alerta_id AS alert_id,
      a.titulo AS alert_title,
      a.tipo_evento AS event_type,
      a.severidad AS severity,
      a.estado AS alert_status,
      a.confianza_ia AS confidence_ia,
      ve.motivo AS reason
    FROM vinculos_evidencia ve
    JOIN alertas a ON a.id = ve.alerta_id
    WHERE ve.grabacion_id = g.id
    ORDER BY ve.creado_en DESC
    LIMIT 1
  ) evidence ON true
`;

export async function listRecordings(communityId) {
  const result = await query(
    `${recordingsBaseQuery}
     JOIN sedes s ON s.id = z.sede_id
     WHERE s.comunidad_id = $1
     ORDER BY g.inicio_en DESC`,
    [communityId],
  );
  return result.rows;
}
