import { query } from "../db.js";

export async function listResidents(communityId) {
  const result = await query(
    `
      SELECT
        r.id,
        r.comunidad_id,
        c.nombre AS comunidad_nombre,
        r.nombre_completo,
        r.correo,
        r.telefono,
        r.direccion_interna,
        r.referencia_acceso,
        r.estado,
        r.notas,
        r.creado_en,
        r.actualizado_en
      FROM residentes r
      JOIN comunidades c ON c.id = r.comunidad_id
      WHERE r.comunidad_id = $1
      ORDER BY r.nombre_completo ASC
    `,
    [communityId],
  );

  return result.rows;
}
