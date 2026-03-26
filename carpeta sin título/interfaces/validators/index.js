const Joi = require('joi');

// ─── Auth ────────────────────────────────────────────────────────────────────
const loginSchema = Joi.object({
  login: Joi.alternatives()
    .try(Joi.string().email(), Joi.string().pattern(/^\d+$/))
    .required(),
  password: Joi.string().min(6).required(),
});

// ─── Usuario ─────────────────────────────────────────────────────────────────
const createUserSchema = Joi.object({
  nombre:    Joi.string().min(1).max(100).required(),
  apellido:  Joi.string().allow('', null).max(100),
  correo:    Joi.string().email().required().when('tipo_usuario', {
    is: 'EXTERNO',
    then: Joi.string(),
    otherwise: Joi.string()
      .regex(/@ulv\.edu\.mx$/)
      .message('El correo debe ser institucional (@ulv.edu.mx)'),
  }),
  contrasena:  Joi.string().min(6).required(),
  foto_perfil: Joi.string().uri().allow('', null),
  tipo_usuario:Joi.string().valid('ALUMNO', 'EMPLEADO', 'EXTERNO').required(),
  id_rol:      Joi.number().integer().required(),
  matricula:   Joi.when('tipo_usuario', {
    is: 'ALUMNO',
    then: Joi.number().integer().required(),
    otherwise: Joi.allow(null),
  }),
  num_empleado: Joi.when('tipo_usuario', {
    is: 'EMPLEADO',
    then: Joi.number().integer().required(),
    otherwise: Joi.allow(null),
  }),
  telefono:         Joi.string().allow('', null).max(20),
  residencia:       Joi.string().valid('Interna', 'Externa').allow(null),
  direccion:        Joi.string().allow('', null).max(200),
  fecha_nacimiento: Joi.date().iso().allow(null),
  carrera:          Joi.string().allow('', null).max(120),
}).options({ stripUnknown: true });

const updateUserSchema = Joi.object({
  nombre:           Joi.string().allow(null, ''),
  apellido:         Joi.string().allow(null, ''),
  foto_perfil:      Joi.string().uri().allow(null, ''),
  estado:           Joi.string().allow(null, ''),
  activo:           Joi.boolean().allow(null),
  telefono:         Joi.string().allow(null, ''),
  residencia:       Joi.string().valid('Interna', 'Externa').allow(null),
  direccion:        Joi.string().allow(null, ''),
  fecha_nacimiento: Joi.date().iso().allow(null),
  carrera:          Joi.string().allow(null, ''),
});

// ─── Familia ──────────────────────────────────────────────────────────────────
const residenciaEnum = Joi.string().valid('INTERNA', 'EXTERNA');

const createFamiliaSchema = Joi.object({
  nombre_familia: Joi.string().max(100).required(),
  residencia:     residenciaEnum.required(),
  direccion: Joi.when('residencia', {
    is: 'EXTERNA',
    then: Joi.string().trim().min(5).max(255).required(),
    otherwise: Joi.string().allow(null, '').optional(),
  }),
  papa_id:     Joi.number().integer().allow(null),
  mama_id:     Joi.number().integer().allow(null),
  hijos:       Joi.array().items(Joi.number().integer()).optional(),
  descripcion: Joi.string().max(255).allow(null, ''),
}).options({ stripUnknown: true });

const updateFamiliaSchema = Joi.object({
  nombre_familia: Joi.string().max(100),
  residencia:     residenciaEnum,
  direccion: Joi.when('residencia', {
    is: 'EXTERNA',
    then: Joi.string().trim().min(5).max(255).required(),
    otherwise: Joi.string().allow(null, ''),
  }),
  papa_id:     Joi.number().integer().allow(null),
  mama_id:     Joi.number().integer().allow(null),
  descripcion: Joi.string().max(255).allow(null, ''),
}).options({ stripUnknown: true });

// ─── Miembro ──────────────────────────────────────────────────────────────────
const addMiembroSchema = Joi.object({
  id_familia:   Joi.number().integer().required(),
  id_usuario:   Joi.number().integer().required(),
  tipo_miembro: Joi.string().valid('PADRE', 'MADRE', 'HIJO', 'ALUMNO_ASIGNADO').required(),
}).options({ stripUnknown: true });

const addMiembrosBulkSchema = Joi.object({
  id_familia:  Joi.number().integer().required(),
  id_usuarios: Joi.array().items(Joi.number().integer()).min(1).required(),
}).options({ stripUnknown: true });

// ─── Publicacion ──────────────────────────────────────────────────────────────
const createPublicacionSchema = Joi.object({
  id_familia:     Joi.number().integer().allow(null),
  id_usuario:     Joi.number().integer().required(),
  categoria_post: Joi.string().valid('Familiar', 'Institucional').required(),
  mensaje:        Joi.string().max(500).allow(null, ''),
});

const setEstadoPublicacionSchema = Joi.object({
  estado: Joi.string().valid('Pendiente', 'Aprobada', 'Rechazada', 'Publicado').required(),
});

// ─── Agenda ───────────────────────────────────────────────────────────────────
const createActividadSchema = Joi.object({
  titulo:             Joi.string().max(150).required(),
  descripcion:        Joi.string().max(500).allow(null, ''),
  fecha_evento:       Joi.date().iso().required(),
  hora_evento:        Joi.string().pattern(/^\d{2}:\d{2}(:\d{2})?$/).allow(null, ''),
  imagen:             Joi.string().uri().allow(null, ''),
  estado_publicacion: Joi.string().valid('Programada', 'Publicada', 'Finalizada').default('Programada'),
  dias_anticipacion:  Joi.number().integer().default(3),
});

const updateActividadSchema = Joi.object({
  titulo:             Joi.string().max(150),
  descripcion:        Joi.string().max(500).allow(null, ''),
  fecha_evento:       Joi.date().iso(),
  hora_evento:        Joi.string().pattern(/^\d{2}:\d{2}(:\d{2})?$/).allow(null, ''),
  imagen:             Joi.string().uri().allow(null, ''),
  estado_publicacion: Joi.string().valid('Programada', 'Publicada', 'Finalizada'),
  dias_anticipacion:  Joi.number().integer(),
});

// ─── Estado ───────────────────────────────────────────────────────────────────
const createEstadoSchema = Joi.object({
  id_usuario:     Joi.number().integer().required(),
  id_cat_estado:  Joi.number().integer().required(),
  tipo_estado:    Joi.string().max(50).allow('', null),
  fecha_inicio:   Joi.date().iso().optional(),
  fecha_fin:      Joi.date().iso().allow(null),
  unico_vigente:  Joi.boolean().default(true),
});

// ─── Solicitud ────────────────────────────────────────────────────────────────
const createSolicitudSchema = Joi.object({
  id_familia:     Joi.number().integer().required(),
  id_usuario:     Joi.number().integer().required(),
  tipo_solicitud: Joi.string().valid('Solicitud', 'Invitación').required(),
});

const setEstadoSolicitudSchema = Joi.object({
  estado: Joi.string().valid('Pendiente', 'Aceptada', 'Rechazada').required(),
});

// ─── Provision ────────────────────────────────────────────────────────────────
const createProvisionSchema = Joi.object({
  id_familia:     Joi.number().integer().required(),
  fecha:          Joi.date().iso().required(),
  cantidad_cenas: Joi.number().integer().min(0).required(),
  comentario:     Joi.string().max(255).allow(null, ''),
});

// ─── Detalle Provision ────────────────────────────────────────────────────────
const markAsistenciaSchema = Joi.object({
  id_provision: Joi.number().integer().required(),
  id_usuario:   Joi.number().integer().required(),
  asistio:      Joi.number().valid(0, 1).required(),
});

// ─── Foto ─────────────────────────────────────────────────────────────────────
const addFotoSchema = Joi.object({
  id_post:  Joi.number().integer().required(),
  url_foto: Joi.string().uri().required(),
});

module.exports = {
  loginSchema,
  createUserSchema,
  updateUserSchema,
  createFamiliaSchema,
  updateFamiliaSchema,
  addMiembroSchema,
  addMiembrosBulkSchema,
  createPublicacionSchema,
  setEstadoPublicacionSchema,
  createActividadSchema,
  updateActividadSchema,
  createEstadoSchema,
  createSolicitudSchema,
  setEstadoSolicitudSchema,
  createProvisionSchema,
  markAsistenciaSchema,
  addFotoSchema,
};
