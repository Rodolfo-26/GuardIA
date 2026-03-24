INSERT INTO comunidades (nombre, tipo, direccion, estado)
VALUES ('Comunidad Demo', 'residencial', 'Parque industrial norte', 'activa')
ON CONFLICT (nombre) DO NOTHING;

WITH comunidad_demo AS (
  SELECT id FROM comunidades WHERE nombre = 'Comunidad Demo' LIMIT 1
)
INSERT INTO sedes (comunidad_id, nombre, direccion)
SELECT comunidad_demo.id, 'Sede Principal', 'Parque industrial norte'
FROM comunidad_demo
WHERE NOT EXISTS (
  SELECT 1 FROM sedes WHERE nombre = 'Sede Principal'
);

WITH sede_principal AS (
  SELECT id FROM sedes WHERE nombre = 'Sede Principal' LIMIT 1
)
INSERT INTO zonas (sede_id, nombre, nivel)
SELECT sede_principal.id, values_table.nombre, values_table.nivel::nivel_riesgo
FROM sede_principal
JOIN (
  VALUES
    ('Acceso Norte', 'alto'),
    ('Patio Logistico', 'medio'),
    ('Pasillo Central', 'medio')
) AS values_table(nombre, nivel) ON true
ON CONFLICT (sede_id, nombre) DO NOTHING;

WITH role_admin AS (
  SELECT id FROM roles WHERE nombre = 'admin' LIMIT 1
),
role_supervisor AS (
  SELECT id FROM roles WHERE nombre = 'supervisor' LIMIT 1
),
role_operador AS (
  SELECT id FROM roles WHERE nombre = 'operador' LIMIT 1
),
comunidad_demo AS (
  SELECT id FROM comunidades WHERE nombre = 'Comunidad Demo' LIMIT 1
)
INSERT INTO usuarios (firebase_uid, comunidad_id, rol_id, nombre_completo, correo, estado, sede_zona, ultimo_login_en)
SELECT values_table.firebase_uid,
       values_table.comunidad_id,
       values_table.rol_id,
       values_table.nombre_completo,
       values_table.correo,
       values_table.estado::estado_usuario,
       values_table.sede_zona,
       now() - values_table.offset_login
FROM (
  SELECT 'firebase-admin-01' AS firebase_uid, (SELECT id FROM comunidad_demo) AS comunidad_id, (SELECT id FROM role_admin) AS rol_id, 'Rodolfo Estrada' AS nombre_completo, 'estradarodolfo81@gmail.com' AS correo, 'activo' AS estado, 'Sede Principal' AS sede_zona, interval '15 minutes' AS offset_login
  UNION ALL
  SELECT 'firebase-supervisor-01', (SELECT id FROM comunidad_demo), (SELECT id FROM role_supervisor), 'Eduardo Ramos', 'eduardo@guardia.local', 'activo', 'Sede Principal', interval '35 minutes'
  UNION ALL
  SELECT 'firebase-operador-01', (SELECT id FROM comunidad_demo), (SELECT id FROM role_operador), 'Giovanni Perez', 'giovanni@guardia.local', 'activo', 'Sede Principal', interval '55 minutes'
  UNION ALL
  SELECT 'firebase-operador-02', (SELECT id FROM comunidad_demo), (SELECT id FROM role_operador), 'Luz Carla', 'luzcarla@guardia.local', 'inactivo', 'Sede Principal', interval '1 day'
) AS values_table
ON CONFLICT (firebase_uid) DO NOTHING;

WITH comunidad_demo AS (
  SELECT id FROM comunidades WHERE nombre = 'Comunidad Demo' LIMIT 1
)
INSERT INTO residentes (comunidad_id, nombre_completo, correo, telefono, direccion_interna, referencia_acceso, estado, notas)
SELECT comunidad_demo.id, values_table.nombre_completo, values_table.correo, values_table.telefono, values_table.direccion_interna, values_table.referencia_acceso, values_table.estado, values_table.notas
FROM comunidad_demo
JOIN (
  VALUES
    ('Maria Fernanda Soto', 'maria.soto@guardia.local', '222-301-4401', 'Casa 12, Calle Norte', 'Porton blanco con camara exterior', 'activo', 'Contacto principal de la vivienda.'),
    ('Jose Luis Ramirez', 'jose.ramirez@guardia.local', '222-301-4402', 'Depto B-4, Torre Central', 'Acceso por lobby sur', 'activo', 'Solicita aviso previo para visitas nocturnas.'),
    ('Ana Paula Cruz', 'ana.cruz@guardia.local', '222-301-4403', 'Casa 7, Privada del Lago', 'Frente al area comun', 'moroso', 'Acceso vehicular restringido hasta regularizar cuota.'),
    ('Carlos Mendoza', NULL, '222-301-4404', 'Cuarto 3, Vecindad Oriente', 'Entrada peatonal lateral', 'visitante', 'Registro temporal de familiar autorizado.')
) AS values_table(nombre_completo, correo, telefono, direccion_interna, referencia_acceso, estado, notas) ON true
WHERE NOT EXISTS (
  SELECT 1 FROM residentes WHERE comunidad_id = comunidad_demo.id
);

WITH operador_demo AS (
  SELECT id FROM usuarios WHERE firebase_uid = 'firebase-operador-01' LIMIT 1
)
INSERT INTO reportes (created_by_user_id, role, type, priority, description, status, created_at, updated_at)
SELECT operador_demo.id, values_table.role, values_table.type, values_table.priority, values_table.description, values_table.status, now() - values_table.offset_created, now() - values_table.offset_updated
FROM operador_demo
JOIN (
  VALUES
    ('operador', 'sospechoso', 'alta', 'Persona merodeando repetidamente en acceso norte sin identificacion visible.', 'sent', interval '18 minutes', interval '18 minutes'),
    ('operador', 'robo', 'alta', 'Reporte preliminar de extravio de paqueteria en caseta de recepcion.', 'in_review', interval '2 hours', interval '95 minutes'),
    ('operador', 'incendio', 'media', 'Olor a quemado y humo ligero reportado cerca del cuarto electrico.', 'closed', interval '1 day', interval '22 hours')
) AS values_table(role, type, priority, description, status, offset_created, offset_updated) ON true
WHERE NOT EXISTS (
  SELECT 1 FROM reportes WHERE description = values_table.description
);

WITH actor AS (
  SELECT id FROM usuarios WHERE firebase_uid = 'firebase-admin-01' LIMIT 1
),
target_supervisor AS (
  SELECT id FROM usuarios WHERE firebase_uid = 'firebase-supervisor-01' LIMIT 1
),
target_operador AS (
  SELECT id FROM usuarios WHERE firebase_uid = 'firebase-operador-01' LIMIT 1
)
INSERT INTO bitacora_auditoria (actor_usuario_id, afectado_usuario_id, accion, entidad, cambios_json, creado_en)
SELECT actor.id, target_supervisor.id, 'update_role', 'usuarios', '{"role":"Supervisor"}'::jsonb, now() - interval '50 minutes'
FROM actor, target_supervisor
UNION ALL
SELECT actor.id, target_operador.id, 'close_sessions', 'usuarios', '{"reason":"revision administrativa"}'::jsonb, now() - interval '32 minutes'
FROM actor, target_operador
UNION ALL
SELECT actor.id, target_operador.id, 'update_status', 'usuarios', '{"status":"Activo"}'::jsonb, now() - interval '12 minutes'
FROM actor, target_operador;

WITH zona_norte AS (
  SELECT z.id FROM zonas z WHERE z.nombre = 'Acceso Norte' LIMIT 1
),
zona_logistica AS (
  SELECT z.id FROM zonas z WHERE z.nombre = 'Patio Logistico' LIMIT 1
),
zona_pasillo AS (
  SELECT z.id FROM zonas z WHERE z.nombre = 'Pasillo Central' LIMIT 1
)
INSERT INTO camaras (zona_id, codigo, nombre, protocolo, resolucion, url_stream, perfiles_ia, retencion_dias, estado, sensibilidad, grabacion_habilitada, instalada_en)
SELECT zona_norte.id, 'CAM-001', 'Entrada principal', 'RTSP', '1080p', 'rtsp://10.0.1.20/live', '["Deteccion de intrusos","Zona prohibida"]'::jsonb, 30, 'online', 80, true, now() - interval '120 days'
FROM zona_norte
ON CONFLICT (codigo) DO NOTHING;

WITH zona_logistica AS (
  SELECT z.id FROM zonas z WHERE z.nombre = 'Patio Logistico' LIMIT 1
)
INSERT INTO camaras (zona_id, codigo, nombre, protocolo, resolucion, url_stream, perfiles_ia, retencion_dias, estado, sensibilidad, grabacion_habilitada, instalada_en)
SELECT zona_logistica.id, 'CAM-002', 'Carga y descarga', 'ONVIF', '4K', 'rtsp://10.0.1.32/live', '["Deteccion de vehiculos","Conteo de personas"]'::jsonb, 45, 'online', 72, true, now() - interval '90 days'
FROM zona_logistica
ON CONFLICT (codigo) DO NOTHING;

WITH zona_pasillo AS (
  SELECT z.id FROM zonas z WHERE z.nombre = 'Pasillo Central' LIMIT 1
)
INSERT INTO camaras (zona_id, codigo, nombre, protocolo, resolucion, url_stream, perfiles_ia, retencion_dias, estado, sensibilidad, grabacion_habilitada, instalada_en)
SELECT zona_pasillo.id, 'CAM-003', 'Puerta lateral', 'RTSP', '720p', 'rtsp://10.0.1.41/live', '["Reconocimiento facial"]'::jsonb, 15, 'online', 65, true, now() - interval '75 days'
FROM zona_pasillo
ON CONFLICT (codigo) DO NOTHING;

WITH cam_1 AS (
  SELECT id FROM camaras WHERE codigo = 'CAM-001' LIMIT 1
),
cam_2 AS (
  SELECT id FROM camaras WHERE codigo = 'CAM-002' LIMIT 1
),
cam_3 AS (
  SELECT id FROM camaras WHERE codigo = 'CAM-003' LIMIT 1
)
INSERT INTO grabaciones (camara_id, ruta_archivo, inicio_en, fin_en, duracion_seg, tamano_mb, checksum, archivada)
SELECT cam_1.id, 'https://storage.guardia.local/records/CAM-001/clip-20260321-001.mp4', now() - interval '12 minutes', now() - interval '11 minutes 13 seconds', 47, 18.40, 'chk-cam001-001', false
FROM cam_1
WHERE NOT EXISTS (SELECT 1 FROM grabaciones WHERE ruta_archivo = 'https://storage.guardia.local/records/CAM-001/clip-20260321-001.mp4')
UNION ALL
SELECT cam_2.id, 'https://storage.guardia.local/records/CAM-002/clip-20260321-002.mp4', now() - interval '31 minutes', now() - interval '29 minutes 37 seconds', 83, 31.15, 'chk-cam002-002', false
FROM cam_2
WHERE NOT EXISTS (SELECT 1 FROM grabaciones WHERE ruta_archivo = 'https://storage.guardia.local/records/CAM-002/clip-20260321-002.mp4')
UNION ALL
SELECT cam_3.id, 'https://storage.guardia.local/records/CAM-003/clip-20260321-003.mp4', now() - interval '42 minutes', now() - interval '41 minutes 29 seconds', 31, 12.75, 'chk-cam003-003', true
FROM cam_3
WHERE NOT EXISTS (SELECT 1 FROM grabaciones WHERE ruta_archivo = 'https://storage.guardia.local/records/CAM-003/clip-20260321-003.mp4');

WITH cam_1 AS (
  SELECT id FROM camaras WHERE codigo = 'CAM-001' LIMIT 1
),
cam_2 AS (
  SELECT id FROM camaras WHERE codigo = 'CAM-002' LIMIT 1
),
cam_3 AS (
  SELECT id FROM camaras WHERE codigo = 'CAM-003' LIMIT 1
),
admin_user AS (
  SELECT id FROM usuarios WHERE firebase_uid = 'firebase-admin-01' LIMIT 1
),
supervisor_user AS (
  SELECT id FROM usuarios WHERE firebase_uid = 'firebase-supervisor-01' LIMIT 1
),
operator_user AS (
  SELECT id FROM usuarios WHERE firebase_uid = 'firebase-operador-01' LIMIT 1
)
INSERT INTO alertas (
  camara_id,
  usuario_asignado_id,
  titulo,
  tipo_evento,
  severidad,
  estado,
  confianza_ia,
  descripcion,
  detectada_en
)
SELECT cam_1.id, NULL, 'Ingreso no autorizado', 'intrusion', 'critica'::severidad_alerta, 'nueva'::estado_alerta, 0.94, 'Cruce detectado en carril restringido con permanencia superior a 18 segundos.', now() - interval '8 minutes'
FROM cam_1
WHERE NOT EXISTS (SELECT 1 FROM alertas WHERE titulo = 'Ingreso no autorizado')
UNION ALL
SELECT cam_2.id, supervisor_user.id, 'Objeto abandonado', 'objeto_abandonado', 'alta'::severidad_alerta, 'en_proceso'::estado_alerta, 0.86, 'Elemento inmovil junto a zona de maniobra con trafico activo.', now() - interval '21 minutes'
FROM cam_2, supervisor_user
WHERE NOT EXISTS (SELECT 1 FROM alertas WHERE titulo = 'Objeto abandonado')
UNION ALL
SELECT cam_3.id, operator_user.id, 'Rostro no reconocido', 'biometria', 'media'::severidad_alerta, 'en_proceso'::estado_alerta, 0.81, 'Intento de acceso sin coincidencia en credenciales biometrizadas.', now() - interval '33 minutes'
FROM cam_3, operator_user
WHERE NOT EXISTS (SELECT 1 FROM alertas WHERE titulo = 'Rostro no reconocido');

WITH alert_1 AS (
  SELECT id FROM alertas WHERE titulo = 'Ingreso no autorizado' LIMIT 1
),
alert_2 AS (
  SELECT id FROM alertas WHERE titulo = 'Objeto abandonado' LIMIT 1
),
alert_3 AS (
  SELECT id FROM alertas WHERE titulo = 'Rostro no reconocido' LIMIT 1
),
admin_user AS (
  SELECT id FROM usuarios WHERE firebase_uid = 'firebase-admin-01' LIMIT 1
),
supervisor_user AS (
  SELECT id FROM usuarios WHERE firebase_uid = 'firebase-supervisor-01' LIMIT 1
),
operator_user AS (
  SELECT id FROM usuarios WHERE firebase_uid = 'firebase-operador-01' LIMIT 1
)
INSERT INTO acciones_alerta (alerta_id, usuario_id, tipo_accion, nota, creado_en)
SELECT alert_1.id, admin_user.id, 'registrar', 'Movimiento fuera de ventana horaria permitida.', now() - interval '7 minutes'
FROM alert_1, admin_user
WHERE NOT EXISTS (SELECT 1 FROM acciones_alerta WHERE alerta_id = alert_1.id)
UNION ALL
SELECT alert_2.id, supervisor_user.id, 'despachar', 'Objeto estatico detectado por mas de 3 minutos.', now() - interval '18 minutes'
FROM alert_2, supervisor_user
WHERE NOT EXISTS (SELECT 1 FROM acciones_alerta WHERE alerta_id = alert_2.id)
UNION ALL
SELECT alert_3.id, operator_user.id, 'registrar', 'No coincide con lista de personal autorizado.', now() - interval '30 minutes'
FROM alert_3, operator_user
WHERE NOT EXISTS (SELECT 1 FROM acciones_alerta WHERE alerta_id = alert_3.id);

WITH alert_1 AS (
  SELECT id FROM alertas WHERE titulo = 'Ingreso no autorizado' LIMIT 1
),
alert_2 AS (
  SELECT id FROM alertas WHERE titulo = 'Objeto abandonado' LIMIT 1
),
alert_3 AS (
  SELECT id FROM alertas WHERE titulo = 'Rostro no reconocido' LIMIT 1
),
rec_1 AS (
  SELECT id FROM grabaciones WHERE ruta_archivo = 'https://storage.guardia.local/records/CAM-001/clip-20260321-001.mp4' LIMIT 1
),
rec_2 AS (
  SELECT id FROM grabaciones WHERE ruta_archivo = 'https://storage.guardia.local/records/CAM-002/clip-20260321-002.mp4' LIMIT 1
),
rec_3 AS (
  SELECT id FROM grabaciones WHERE ruta_archivo = 'https://storage.guardia.local/records/CAM-003/clip-20260321-003.mp4' LIMIT 1
)
INSERT INTO vinculos_evidencia (alerta_id, grabacion_id, clip_inicio_en, clip_fin_en, motivo)
SELECT alert_1.id, rec_1.id, now() - interval '12 minutes', now() - interval '11 minutes 13 seconds', 'Cruce de perimetro detectado en carril restringido.'
FROM alert_1, rec_1
WHERE NOT EXISTS (
  SELECT 1
  FROM vinculos_evidencia
  WHERE alerta_id = alert_1.id AND grabacion_id = rec_1.id
)
UNION ALL
SELECT alert_2.id, rec_2.id, now() - interval '31 minutes', now() - interval '29 minutes 37 seconds', 'Objeto inmovil validado cerca de zona de maniobra.'
FROM alert_2, rec_2
WHERE NOT EXISTS (
  SELECT 1
  FROM vinculos_evidencia
  WHERE alerta_id = alert_2.id AND grabacion_id = rec_2.id
)
UNION ALL
SELECT alert_3.id, rec_3.id, now() - interval '42 minutes', now() - interval '41 minutes 29 seconds', 'Intento de acceso sin coincidencia biometrica.'
FROM alert_3, rec_3
WHERE NOT EXISTS (
  SELECT 1
  FROM vinculos_evidencia
  WHERE alerta_id = alert_3.id AND grabacion_id = rec_3.id
);
