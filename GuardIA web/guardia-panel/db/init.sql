-- GuardIA PostgreSQL - Esquema inicial
-- Firebase se usa solo para autenticacion; datos operativos viven aqui.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'rol_usuario') THEN
    CREATE TYPE rol_usuario AS ENUM ('admin', 'supervisor', 'operador');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estado_usuario') THEN
    CREATE TYPE estado_usuario AS ENUM ('activo', 'inactivo', 'bloqueado');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estado_camara') THEN
    CREATE TYPE estado_camara AS ENUM ('online', 'offline', 'mantenimiento');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'nivel_riesgo') THEN
    CREATE TYPE nivel_riesgo AS ENUM ('bajo', 'medio', 'alto', 'critico');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'severidad_alerta') THEN
    CREATE TYPE severidad_alerta AS ENUM ('baja', 'media', 'alta', 'critica');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estado_alerta') THEN
    CREATE TYPE estado_alerta AS ENUM ('nueva', 'en_proceso', 'resuelta', 'descartada');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre rol_usuario NOT NULL UNIQUE,
  descripcion text,
  creado_en timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS usuarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firebase_uid text NOT NULL UNIQUE,
  rol_id uuid NOT NULL REFERENCES roles(id),
  nombre_completo text NOT NULL,
  correo text NOT NULL UNIQUE,
  estado estado_usuario NOT NULL DEFAULT 'activo',
  sede_zona text,
  ultimo_login_en timestamptz,
  creado_en timestamptz NOT NULL DEFAULT now(),
  actualizado_en timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sesiones_usuario (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  token_hash text NOT NULL,
  ip inet,
  user_agent text,
  expira_en timestamptz NOT NULL,
  revocado_en timestamptz,
  creado_en timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sedes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  direccion text,
  zona_horaria text NOT NULL DEFAULT 'America/Mexico_City',
  creado_en timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS zonas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sede_id uuid NOT NULL REFERENCES sedes(id) ON DELETE CASCADE,
  nombre text NOT NULL,
  nivel nivel_riesgo NOT NULL DEFAULT 'medio',
  creado_en timestamptz NOT NULL DEFAULT now(),
  UNIQUE (sede_id, nombre)
);

CREATE TABLE IF NOT EXISTS camaras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  zona_id uuid NOT NULL REFERENCES zonas(id) ON DELETE CASCADE,
  codigo text NOT NULL UNIQUE,
  nombre text NOT NULL,
  url_stream text,
  estado estado_camara NOT NULL DEFAULT 'offline',
  sensibilidad int NOT NULL DEFAULT 50 CHECK (sensibilidad BETWEEN 1 AND 100),
  grabacion_habilitada boolean NOT NULL DEFAULT true,
  instalada_en timestamptz,
  actualizado_en timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS historial_estado_camara (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  camara_id uuid NOT NULL REFERENCES camaras(id) ON DELETE CASCADE,
  estado estado_camara NOT NULL,
  latencia_ms int,
  perdida_paquetes numeric(5,2),
  verificado_en timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS grabaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  camara_id uuid NOT NULL REFERENCES camaras(id) ON DELETE CASCADE,
  ruta_archivo text NOT NULL,
  inicio_en timestamptz NOT NULL,
  fin_en timestamptz,
  duracion_seg int,
  tamano_mb numeric(12,2),
  checksum text,
  archivada boolean NOT NULL DEFAULT false,
  creado_en timestamptz NOT NULL DEFAULT now(),
  CHECK (fin_en IS NULL OR fin_en >= inicio_en)
);

CREATE TABLE IF NOT EXISTS alertas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  camara_id uuid NOT NULL REFERENCES camaras(id) ON DELETE CASCADE,
  usuario_asignado_id uuid REFERENCES usuarios(id) ON DELETE SET NULL,
  titulo text NOT NULL,
  tipo_evento text NOT NULL,
  severidad severidad_alerta NOT NULL,
  estado estado_alerta NOT NULL DEFAULT 'nueva',
  confianza_ia numeric(5,4) CHECK (confianza_ia >= 0 AND confianza_ia <= 1),
  descripcion text,
  detectada_en timestamptz NOT NULL DEFAULT now(),
  resuelta_en timestamptz,
  creado_en timestamptz NOT NULL DEFAULT now(),
  CHECK (resuelta_en IS NULL OR resuelta_en >= detectada_en)
);

CREATE TABLE IF NOT EXISTS acciones_alerta (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alerta_id uuid NOT NULL REFERENCES alertas(id) ON DELETE CASCADE,
  usuario_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  tipo_accion text NOT NULL,
  nota text,
  creado_en timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS vinculos_evidencia (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alerta_id uuid NOT NULL REFERENCES alertas(id) ON DELETE CASCADE,
  grabacion_id uuid NOT NULL REFERENCES grabaciones(id) ON DELETE CASCADE,
  clip_inicio_en timestamptz,
  clip_fin_en timestamptz,
  motivo text,
  creado_en timestamptz NOT NULL DEFAULT now(),
  CHECK (clip_fin_en IS NULL OR clip_inicio_en IS NULL OR clip_fin_en >= clip_inicio_en)
);

CREATE TABLE IF NOT EXISTS bitacora_auditoria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_usuario_id uuid REFERENCES usuarios(id) ON DELETE SET NULL,
  afectado_usuario_id uuid REFERENCES usuarios(id) ON DELETE SET NULL,
  accion text NOT NULL,
  entidad text NOT NULL,
  cambios_json jsonb,
  creado_en timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_usuarios_firebase_uid ON usuarios(firebase_uid);
CREATE INDEX IF NOT EXISTS idx_usuarios_rol_id ON usuarios(rol_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_estado ON usuarios(estado);
CREATE INDEX IF NOT EXISTS idx_sesiones_usuario_id ON sesiones_usuario(usuario_id);
CREATE INDEX IF NOT EXISTS idx_sesiones_expira_en ON sesiones_usuario(expira_en);
CREATE INDEX IF NOT EXISTS idx_zonas_sede_id ON zonas(sede_id);
CREATE INDEX IF NOT EXISTS idx_camaras_zona_id ON camaras(zona_id);
CREATE INDEX IF NOT EXISTS idx_camaras_estado ON camaras(estado);
CREATE INDEX IF NOT EXISTS idx_historial_camara_id ON historial_estado_camara(camara_id);
CREATE INDEX IF NOT EXISTS idx_grabaciones_camara_id ON grabaciones(camara_id);
CREATE INDEX IF NOT EXISTS idx_grabaciones_inicio_en ON grabaciones(inicio_en);
CREATE INDEX IF NOT EXISTS idx_alertas_camara_id ON alertas(camara_id);
CREATE INDEX IF NOT EXISTS idx_alertas_asignado_id ON alertas(usuario_asignado_id);
CREATE INDEX IF NOT EXISTS idx_alertas_estado ON alertas(estado);
CREATE INDEX IF NOT EXISTS idx_alertas_detectada_en ON alertas(detectada_en);
CREATE INDEX IF NOT EXISTS idx_acciones_alerta_id ON acciones_alerta(alerta_id);
CREATE INDEX IF NOT EXISTS idx_acciones_usuario_id ON acciones_alerta(usuario_id);
CREATE INDEX IF NOT EXISTS idx_evidencia_alerta_id ON vinculos_evidencia(alerta_id);
CREATE INDEX IF NOT EXISTS idx_evidencia_grabacion_id ON vinculos_evidencia(grabacion_id);
CREATE INDEX IF NOT EXISTS idx_bitacora_actor ON bitacora_auditoria(actor_usuario_id);
CREATE INDEX IF NOT EXISTS idx_bitacora_afectado ON bitacora_auditoria(afectado_usuario_id);
CREATE INDEX IF NOT EXISTS idx_bitacora_creado_en ON bitacora_auditoria(creado_en);

INSERT INTO roles (nombre, descripcion)
VALUES
  ('admin', 'Control total del panel y gestion de usuarios'),
  ('supervisor', 'Supervision operativa y gestion de alertas'),
  ('operador', 'Operacion diaria y respuesta a eventos')
ON CONFLICT (nombre) DO NOTHING;
