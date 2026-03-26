const AGENDA_QUERIES = {
  create: `
    INSERT INTO EDI.Agenda_Actividades
      (titulo, descripcion, fecha_evento, hora_evento, imagen, estado_publicacion, dias_anticipacion)
    OUTPUT INSERTED.*
    VALUES (@titulo, @descripcion, @fecha_evento, @hora_evento, @imagen, @estado_publicacion, @dias_anticipacion)
  `,
  list: `
    SELECT id_actividad, titulo, descripcion, fecha_evento,
           CONVERT(varchar(5), hora_evento, 108) AS hora_evento,
           imagen, estado_publicacion, fecha_creacion, updated_at, activo
    FROM EDI.Agenda_Actividades
    WHERE (@estado IS NULL OR estado_publicacion = @estado)
      AND (@desde IS NULL OR fecha_evento >= @desde)
      AND (@hasta IS NULL OR fecha_evento <= @hasta)
      AND activo = 1
    ORDER BY fecha_evento DESC, id_actividad DESC
  `,
  update: `
    UPDATE EDI.Agenda_Actividades SET
      titulo             = ISNULL(NULLIF(@titulo, ''), titulo),
      descripcion        = ISNULL(NULLIF(@descripcion, ''), descripcion),
      fecha_evento       = ISNULL(@fecha_evento, fecha_evento),
      hora_evento        = @hora_evento,
      imagen             = ISNULL(@imagen, imagen),
      estado_publicacion = ISNULL(@estado_publicacion, estado_publicacion),
      dias_anticipacion  = ISNULL(@dias_anticipacion, dias_anticipacion),
      updated_at         = GETDATE()
    OUTPUT INSERTED.*
    WHERE id_actividad = @id_actividad
  `,
  remove: `UPDATE EDI.Agenda_Actividades SET activo = 0, updated_at = GETDATE() WHERE id_actividad = @id_actividad`,
  getActiveEvents: `
    SELECT id_actividad as id_evento, titulo, descripcion as mensaje, fecha_evento,
           CONVERT(varchar(5), hora_evento, 108) AS hora_evento, dias_anticipacion, imagen,
           'EVENTO' as tipo, 'Admin' as nombre_rol, 'Administración' as nombre,
           NULL as foto_perfil, 0 as likes_count, 0 as comentarios_count, 0 as is_liked
    FROM EDI.Agenda_Actividades
    WHERE activo = 1 AND estado_publicacion = 'Publicada'
      AND CAST(GETDATE() AS DATE) >= DATEADD(DAY, -dias_anticipacion, fecha_evento)
      AND CAST(GETDATE() AS DATE) <= fecha_evento
    ORDER BY fecha_evento ASC
  `,
  allTokens: `SELECT fcm_token FROM EDI.Usuarios WHERE fcm_token IS NOT NULL AND activo = 1`,
};

const CHAT_QUERIES = {
  createSala: `
    INSERT INTO EDI.Chat_Salas (nombre, tipo) VALUES (@nombre, @tipo);
    SELECT SCOPE_IDENTITY() as id_sala;
  `,
  addParticipante: `
    INSERT INTO EDI.Chat_Participantes (id_sala, id_usuario, es_admin)
    VALUES (@id_sala, @id_usuario, @es_admin)
  `,
  sendMessage: `
    INSERT INTO EDI.Chat_Mensajes (id_sala, id_usuario, mensaje, tipo_mensaje)
    VALUES (@id_sala, @id_usuario, @mensaje, @tipo_mensaje);
    DECLARE @id_mensaje INT = SCOPE_IDENTITY();
    SELECT m.id_mensaje, m.id_sala, m.id_usuario,
           u.nombre as nombre_remitente, m.mensaje, m.created_at
    FROM EDI.Chat_Mensajes m
    JOIN EDI.Usuarios u ON u.id_usuario = m.id_usuario
    WHERE m.id_mensaje = @id_mensaje
  `,
  getMyChats: `
    SELECT s.id_sala, s.tipo,
           CASE WHEN s.tipo = 'GRUPAL' THEN s.nombre ELSE other.nombre END as titulo_chat,
           CASE WHEN s.tipo = 'GRUPAL' THEN NULL ELSE other.id_usuario END as id_usuario_chat,
           CASE WHEN s.tipo = 'GRUPAL' THEN NULL ELSE other.foto_perfil END as foto_perfil_chat,
           (SELECT TOP 1 m.mensaje FROM EDI.Chat_Mensajes m
            WHERE m.id_sala = s.id_sala ORDER BY m.created_at DESC) as ultimo_mensaje,
           (SELECT TOP 1 m.created_at FROM EDI.Chat_Mensajes m
            WHERE m.id_sala = s.id_sala ORDER BY m.created_at DESC) as fecha_ultimo
    FROM EDI.Chat_Salas s
    JOIN EDI.Chat_Participantes cp ON cp.id_sala = s.id_sala
    OUTER APPLY (
      SELECT TOP 1 u.id_usuario, u.nombre, u.foto_perfil
      FROM EDI.Chat_Participantes cp2
      JOIN EDI.Usuarios u ON u.id_usuario = cp2.id_usuario
      WHERE cp2.id_sala = s.id_sala AND cp2.id_usuario <> @id_usuario
    ) other
    WHERE cp.id_usuario = @id_usuario AND s.activo = 1
    ORDER BY fecha_ultimo DESC
  `,
  getMensajes: `
    SELECT m.id_mensaje, m.id_sala, m.id_usuario,
           u.nombre as nombre_remitente, m.mensaje, m.created_at,
           CASE WHEN m.id_usuario = @id_usuario THEN 1 ELSE 0 END as es_mio
    FROM EDI.Chat_Mensajes m
    JOIN EDI.Usuarios u ON u.id_usuario = m.id_usuario
    WHERE m.id_sala = @id_sala
    ORDER BY m.created_at ASC
  `,
  findPrivateChat: `
    SELECT p1.id_sala
    FROM EDI.Chat_Participantes p1
    JOIN EDI.Chat_Participantes p2 ON p1.id_sala = p2.id_sala
    JOIN EDI.Chat_Salas s ON s.id_sala = p1.id_sala
    WHERE s.tipo = 'PRIVADO' AND p1.id_usuario = @my_id AND p2.id_usuario = @other_id
  `,
  getTokensParaRoom: `
    SELECT u.fcm_token
    FROM EDI.Chat_Participantes cp
    JOIN EDI.Usuarios u ON u.id_usuario = cp.id_usuario
    WHERE cp.id_sala = @idSala AND cp.id_usuario != @senderId
      AND u.fcm_token IS NOT NULL AND LEN(u.fcm_token) > 10
  `,
};

const ESTADO_QUERIES = {
  getCatalog:       `SELECT id_cat_estado, descripcion, color FROM EDI.Cat_Estados WHERE activo = 1`,
  closePrevActives: `UPDATE EDI.Estados_Alumno SET activo = 0, fecha_fin = GETDATE(), updated_at = GETDATE() WHERE id_usuario = @id_usuario AND activo = 1`,
  create: `
    INSERT INTO EDI.Estados_Alumno (id_usuario, id_cat_estado, tipo_estado, fecha_inicio, fecha_fin, activo)
    OUTPUT INSERTED.*
    VALUES (@id_usuario, @id_cat_estado, @tipo_estado, ISNULL(@fecha_inicio, GETDATE()), @fecha_fin, @activo)
  `,
  listByUsuario: `
    SELECT EA.*, CE.descripcion as nombre_estado
    FROM EDI.Estados_Alumno EA
    LEFT JOIN EDI.Cat_Estados CE ON EA.id_cat_estado = CE.id_cat_estado
    WHERE EA.id_usuario = @id_usuario ORDER BY EA.fecha_inicio DESC
  `,
  close:            `UPDATE EDI.Estados_Alumno SET activo = 0, fecha_fin = GETDATE(), updated_at = GETDATE() OUTPUT INSERTED.* WHERE id_estado = @id_estado`,
  updateUserStatus: `UPDATE EDI.Usuarios SET estado = @estado, updated_at = GETDATE() WHERE id_usuario = @id_usuario`,
  getCatalogById:   `SELECT descripcion FROM EDI.Cat_Estados WHERE id_cat_estado = @id`,
};

const MENSAJE_QUERIES = {
  create: `
    INSERT INTO EDI.Mensajes_Chat (id_familia, id_usuario, contenido, activo)
    VALUES (@id_familia, @id_usuario, @mensaje, 1);
    SELECT id_mensaje, contenido as mensaje, created_at, id_usuario
    FROM EDI.Mensajes_Chat WHERE id_mensaje = SCOPE_IDENTITY()
  `,
  listByFamilia: `
    SELECT m.id_mensaje, m.contenido as mensaje, m.created_at, m.id_usuario,
           u.nombre, u.apellido, u.foto_perfil, ISNULL(r.nombre_rol, 'Usuario') as nombre_rol
    FROM EDI.Mensajes_Chat m
    JOIN EDI.Usuarios u ON u.id_usuario = m.id_usuario
    LEFT JOIN EDI.Roles r ON r.id_rol = u.id_rol
    WHERE m.id_familia = @id_familia AND m.activo = 1
    ORDER BY m.created_at ASC
  `,
  getFamilyTokens: `
    SELECT u.fcm_token FROM EDI.Usuarios u
    JOIN EDI.Miembros_Familia mf ON mf.id_usuario = u.id_usuario
    WHERE mf.id_familia = @id_familia AND u.id_usuario != @id_sender
      AND u.activo = 1 AND u.fcm_token IS NOT NULL
  `,
  getSenderName: `SELECT nombre FROM EDI.Usuarios WHERE id_usuario = @id`,
};

const PUBLICACION_QUERIES = {
  create: `
    INSERT INTO EDI.Publicaciones
      (id_familia, id_usuario, categoria_post, mensaje, url_imagen, estado, tipo, activo, created_at)
    VALUES (@id_familia, @id_usuario, @categoria_post, @mensaje, @url_imagen, @estado, @tipo, 1, GETDATE());
    SELECT * FROM EDI.Publicaciones WHERE id_post = SCOPE_IDENTITY()
  `,
  getUserRole:   `SELECT r.nombre_rol, u.nombre, u.apellido FROM EDI.Usuarios u JOIN EDI.Roles r ON r.id_rol = u.id_rol WHERE u.id_usuario = @id_usuario`,
  getTokensPadres: `
    SELECT u.fcm_token FROM EDI.Usuarios u
    JOIN EDI.Miembros_Familia mf ON mf.id_usuario = u.id_usuario
    JOIN EDI.Roles r ON r.id_rol = u.id_rol
    WHERE mf.id_familia = @id_familia AND mf.activo = 1 AND u.activo = 1
      AND r.nombre_rol IN ('Padre','Madre','Tutor','Admin','PapaEDI','MamaEDI')
      AND u.fcm_token IS NOT NULL
  `,
  listByFamilia: `
    SELECT p.*, u.nombre, u.apellido, u.foto_perfil, f.nombre_familia,
           (SELECT COUNT(*) FROM EDI.Publicaciones_Likes pl WHERE pl.id_post = p.id_post) as likes_count,
           (SELECT COUNT(*) FROM EDI.Publicaciones_Comentarios pc WHERE pc.id_post = p.id_post AND pc.activo = 1) as comentarios_count,
           CASE WHEN EXISTS (SELECT 1 FROM EDI.Publicaciones_Likes pl WHERE pl.id_post = p.id_post AND pl.id_usuario = @current_user_id) THEN 1 ELSE 0 END as is_liked
    FROM EDI.Publicaciones p
    JOIN EDI.Usuarios u ON u.id_usuario = p.id_usuario
    LEFT JOIN EDI.Familias_EDI f ON f.id_familia = p.id_familia
    WHERE p.id_familia = @id_familia AND p.activo = 1 AND (p.estado = 'Publicado' OR p.estado = 'Aprobada')
    ORDER BY p.created_at DESC, p.id_post DESC
    OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
  `,
  listGlobal: `
    SELECT p.id_post, p.id_familia, p.id_usuario, p.mensaje, p.url_imagen, p.estado, p.tipo, p.created_at,
           u.nombre, u.apellido, u.foto_perfil, f.nombre_familia,
           (SELECT COUNT(*) FROM EDI.Publicaciones_Likes pl WHERE pl.id_post = p.id_post) AS likes_count,
           (SELECT COUNT(*) FROM EDI.Publicaciones_Comentarios pc WHERE pc.id_post = p.id_post AND pc.activo = 1) AS comentarios_count,
           CASE WHEN EXISTS (SELECT 1 FROM EDI.Publicaciones_Likes pl WHERE pl.id_post = p.id_post AND pl.id_usuario = @current_user_id) THEN 1 ELSE 0 END AS is_liked
    FROM EDI.Publicaciones p
    INNER JOIN EDI.Usuarios u ON u.id_usuario = p.id_usuario
    LEFT JOIN EDI.Familias_EDI f ON f.id_familia = p.id_familia
    WHERE p.activo = 1 AND (p.estado = 'Publicado' OR p.estado = 'Aprobada')
    ORDER BY p.created_at DESC, p.id_post DESC
    OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
  `,
  listInstitucional: `
    SELECT p.*, u.nombre, u.apellido FROM EDI.Publicaciones p
    JOIN EDI.Usuarios u ON u.id_usuario = p.id_usuario
    WHERE p.id_familia IS NULL AND p.categoria_post = N'Institucional' AND p.activo = 1
    ORDER BY p.fecha_publicacion DESC
  `,
  listPendientesPorFamilia: `
    SELECT p.*, u.nombre, u.apellido, u.foto_perfil FROM EDI.Publicaciones p
    JOIN EDI.Usuarios u ON u.id_usuario = p.id_usuario
    WHERE p.id_familia = @id_familia AND p.estado = 'Pendiente' AND p.activo = 1
  `,
  listByUsuario: `
    SELECT p.*, u.nombre, u.apellido FROM EDI.Publicaciones p
    JOIN EDI.Usuarios u ON u.id_usuario = p.id_usuario
    WHERE p.id_usuario = @id_usuario AND p.activo = 1
    ORDER BY p.created_at DESC
  `,
  setEstado: `
    UPDATE EDI.Publicaciones SET estado = @estado, updated_at = GETDATE() WHERE id_post = @id_post;
    SELECT * FROM EDI.Publicaciones WHERE id_post = @id_post
  `,
  softDelete: `UPDATE EDI.Publicaciones SET activo = 0, updated_at = GETDATE() WHERE id_post = @id_post`,
  toggleLike: `
    IF EXISTS (SELECT 1 FROM EDI.Publicaciones_Likes WHERE id_post = @id_post AND id_usuario = @id_usuario)
    BEGIN DELETE FROM EDI.Publicaciones_Likes WHERE id_post = @id_post AND id_usuario = @id_usuario; SELECT 0 as liked; END
    ELSE BEGIN INSERT INTO EDI.Publicaciones_Likes (id_post, id_usuario) VALUES (@id_post, @id_usuario); SELECT 1 as liked; END
  `,
  addComentario: `
    INSERT INTO EDI.Publicaciones_Comentarios (id_post, id_usuario, contenido)
    VALUES (@id_post, @id_usuario, @contenido);
    SELECT SCOPE_IDENTITY() as id_comentario
  `,
  getComentarios: `
    SELECT c.*, u.nombre, u.apellido, u.foto_perfil
    FROM EDI.Publicaciones_Comentarios c
    JOIN EDI.Usuarios u ON u.id_usuario = c.id_usuario
    WHERE c.id_post = @id_post AND c.activo = 1 ORDER BY c.created_at ASC
  `,
  getPostOwner: `
    SELECT p.id_post, p.id_usuario, p.id_familia, u.nombre, u.fcm_token
    FROM EDI.Publicaciones p JOIN EDI.Usuarios u ON u.id_usuario = p.id_usuario
    WHERE p.id_post = @id_post AND p.activo = 1
  `,
  getFamilyTokensForNotif: `
    SELECT DISTINCT u.id_usuario, u.fcm_token, u.nombre
    FROM EDI.Miembros_Familia mf JOIN EDI.Usuarios u ON u.id_usuario = mf.id_usuario
    WHERE mf.id_familia = @id_familia AND mf.activo = 1 AND u.activo = 1
      AND u.fcm_token IS NOT NULL AND u.id_usuario <> @id_usuario_excluir
  `,
  getGlobalTokensForNotif: `
    SELECT u.id_usuario, u.fcm_token, u.nombre FROM EDI.Usuarios u
    WHERE u.activo = 1 AND u.fcm_token IS NOT NULL AND u.id_usuario <> @id_usuario_excluir
  `,
  getUserBasicInfo: `SELECT id_usuario, nombre, apellido FROM EDI.Usuarios WHERE id_usuario = @id_usuario`,
  getPostInfo:      `SELECT p.id_usuario, p.id_familia, u.fcm_token, u.nombre FROM EDI.Publicaciones p JOIN EDI.Usuarios u ON u.id_usuario = p.id_usuario WHERE p.id_post = @id_post`,
  getCommentOwner:  `SELECT id_usuario FROM EDI.Publicaciones_Comentarios WHERE id_comentario = @id`,
  softDeleteComment:`UPDATE EDI.Publicaciones_Comentarios SET activo = 0 WHERE id_comentario = @id`,
};

const SOLICITUD_QUERIES = {
  create:        `INSERT INTO EDI.Solicitudes_Familia (id_familia, id_usuario, tipo_solicitud) OUTPUT INSERTED.* VALUES (@id_familia, @id_usuario, @tipo_solicitud)`,
  listByFamilia: `SELECT s.*, u.nombre, u.apellido FROM EDI.Solicitudes_Familia s JOIN EDI.Usuarios u ON u.id_usuario = s.id_usuario WHERE s.id_familia = @id_familia AND s.activo = 1 ORDER BY s.fecha_solicitud DESC`,
  setEstado:     `UPDATE EDI.Solicitudes_Familia SET estado = @estado, fecha_respuesta = GETDATE(), updated_at = GETDATE() OUTPUT INSERTED.* WHERE id_solicitud = @id_solicitud`,
};

const PROVISION_QUERIES = {
  create:        `INSERT INTO EDI.Provisiones_Alimento (id_familia, fecha, cantidad_cenas, comentario) OUTPUT INSERTED.* VALUES (@id_familia, @fecha, @cantidad_cenas, @comentario)`,
  listByFamilia: `SELECT * FROM EDI.Provisiones_Alimento WHERE id_familia = @id_familia AND (@desde IS NULL OR fecha >= @desde) AND (@hasta IS NULL OR fecha <= @hasta) AND activo = 1 ORDER BY fecha DESC, id_provision DESC`,
};

const DET_PROVISION_QUERIES = {
  upsert: `
    MERGE EDI.Detalle_Provision AS tgt
    USING (SELECT @id_provision AS id_provision, @id_usuario AS id_usuario) AS src
      ON tgt.id_provision = src.id_provision AND tgt.id_usuario = src.id_usuario
    WHEN MATCHED THEN UPDATE SET asistio = @asistio, updated_at = GETDATE()
    WHEN NOT MATCHED THEN INSERT (id_provision, id_usuario, asistio) VALUES (@id_provision, @id_usuario, @asistio)
    OUTPUT inserted.*
  `,
  listByProvision: `
    SELECT d.*, u.nombre, u.apellido FROM EDI.Detalle_Provision d
    JOIN EDI.Usuarios u ON u.id_usuario = d.id_usuario
    WHERE d.id_provision = @id_provision ORDER BY u.nombre
  `,
};

const FOTO_QUERIES = {
  add:         `INSERT INTO EDI.Fotos_Publicacion (id_post, url_foto) OUTPUT INSERTED.* VALUES (@id_post, @url_foto)`,
  listByPost:  `SELECT * FROM EDI.Fotos_Publicacion WHERE id_post = @id_post ORDER BY id_foto ASC`,
  getByFamilia: `
    SELECT id_post, url_imagen, mensaje, created_at FROM EDI.Publicaciones
    WHERE id_familia = @id_familia AND url_imagen IS NOT NULL AND url_imagen != ''
      AND (estado = 'Publicado' OR estado = 'Aprobada') AND activo = 1
    ORDER BY created_at DESC
  `,
  getPostFamilia: `SELECT id_familia FROM EDI.Publicaciones WHERE id_post = @id_post`,
};

const MIEMBRO_QUERIES = {
  listByFamilia: `
    SELECT mf.*, u.nombre, u.apellido, u.tipo_usuario, u.matricula, u.num_empleado,
           u.fecha_nacimiento, u.telefono, u.carrera, u.foto_perfil AS foto_perfil_url
    FROM EDI.Miembros_Familia mf
    JOIN EDI.Usuarios u ON u.id_usuario = mf.id_usuario
    WHERE mf.id_familia = @id_familia AND mf.activo = 1
  `,
  getFamiliaById:    `SELECT id_familia FROM EDI.Miembros_Familia WHERE id_miembro = @id`,
  getFamiliaNombre:  `SELECT nombre_familia FROM EDI.Familias_EDI WHERE id_familia = @id`,
  getUsersByIds:     (ids) => `SELECT id_usuario, fcm_token FROM EDI.Usuarios WHERE id_usuario IN (${ids})`,
  getPadresFamilia: `
    SELECT u.id_usuario, u.fcm_token FROM EDI.Miembros_Familia mf
    JOIN EDI.Usuarios u ON mf.id_usuario = u.id_usuario
    JOIN EDI.Roles r ON u.id_rol = r.id_rol
    WHERE mf.id_familia = @idFam AND mf.activo = 1
      AND r.nombre_rol IN ('Padre','Madre','Tutor','PapaEDI','MamaEDI')
  `,
};

module.exports = {
  AGENDA_QUERIES,
  CHAT_QUERIES,
  ESTADO_QUERIES,
  MENSAJE_QUERIES,
  PUBLICACION_QUERIES,
  SOLICITUD_QUERIES,
  PROVISION_QUERIES,
  DET_PROVISION_QUERIES,
  FOTO_QUERIES,
  MIEMBRO_QUERIES,
};
