-- =====================================================================
--  Ceibo Libros · Biblioteca  —  Esquema MySQL (3ª forma normal)
--  Compatible con MySQL 8 / MariaDB 10.5+
--
--  Normalización:
--   1FN: todos los campos son atómicos (los libros de un préstamo van en
--        prestamo_items, los participantes de un hilo en hilo_participantes).
--   2FN: las tablas con clave compuesta (hilo_participantes) no tienen
--        atributos que dependan de solo una parte de la clave.
--   3FN: no hay dependencias transitivas. Ej.: el autor y la categoría de un
--        libro viven en sus propias tablas; el stock disponible NO se guarda
--        (se calcula = stock_total - prestados - reservados).
-- =====================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS notificaciones;
DROP TABLE IF EXISTS pedido_items;
DROP TABLE IF EXISTS pedidos_reposicion;
DROP TABLE IF EXISTS distribuidoras;
DROP TABLE IF EXISTS mensajes;
DROP TABLE IF EXISTS hilo_participantes;
DROP TABLE IF EXISTS hilos;
DROP TABLE IF EXISTS prestamo_items;
DROP TABLE IF EXISTS prestamos;
DROP TABLE IF EXISTS reservas;
DROP TABLE IF EXISTS libros;
DROP TABLE IF EXISTS autores;
DROP TABLE IF EXISTS categorias;
DROP TABLE IF EXISTS refresh_tokens;
DROP TABLE IF EXISTS codigos_verificacion;
DROP TABLE IF EXISTS identidades_sociales;
DROP TABLE IF EXISTS usuarios;
DROP TABLE IF EXISTS roles;

SET FOREIGN_KEY_CHECKS = 1;

-- ---------------------------------------------------------------------
-- Roles y usuarios
-- ---------------------------------------------------------------------
CREATE TABLE roles (
  id      TINYINT UNSIGNED PRIMARY KEY,
  nombre  VARCHAR(20) NOT NULL UNIQUE          -- dueno | bibliotecario | usuario
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO roles (id, nombre) VALUES (1, 'dueno'), (2, 'bibliotecario'), (3, 'usuario');

CREATE TABLE usuarios (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre            VARCHAR(60)  NOT NULL,
  apellido          VARCHAR(60)  NOT NULL DEFAULT '',
  email             VARCHAR(120) NOT NULL UNIQUE,
  password_hash     VARCHAR(100) NULL,           -- NULL si solo entra con red social
  rol_id            TINYINT UNSIGNED NOT NULL DEFAULT 3,
  estado            ENUM('activo','bloqueado') NOT NULL DEFAULT 'activo',
  motivo_bloqueo    VARCHAR(255) NULL,           -- mensaje que ve el usuario bloqueado
  bloqueado_en      DATETIME NULL,
  telefono          VARCHAR(30)  NULL,
  curso             VARCHAR(40)  NULL,           -- se pide al reservar / pedir un préstamo
  dni               VARCHAR(15)  NULL,
  foto_url          MEDIUMTEXT   NULL,           -- URL o imagen subida (data:image/jpeg;base64,...)
  email_verificado  TINYINT(1) NOT NULL DEFAULT 0,
  dos_pasos_activo  TINYINT(1) NOT NULL DEFAULT 0,
  creado_en         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_usuarios_rol FOREIGN KEY (rol_id) REFERENCES roles(id),
  INDEX idx_usuarios_rol (rol_id),
  INDEX idx_usuarios_estado (estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Cuentas de redes sociales vinculadas (Google, GitHub, Discord)
CREATE TABLE identidades_sociales (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  usuario_id     INT UNSIGNED NOT NULL,
  proveedor      ENUM('google','github','discord') NOT NULL,
  proveedor_uid  VARCHAR(100) NOT NULL,
  creado_en      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_identidad (proveedor, proveedor_uid),
  CONSTRAINT fk_identidad_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Códigos de un solo uso enviados por email (verificación, 2 pasos, reset)
CREATE TABLE codigos_verificacion (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  usuario_id   INT UNSIGNED NOT NULL,
  proposito    ENUM('verificar_email','login_2fa','reset_password') NOT NULL,
  codigo_hash  CHAR(64) NOT NULL,                -- SHA-256, nunca el código en claro
  intentos     TINYINT UNSIGNED NOT NULL DEFAULT 0,
  expira_en    DATETIME NOT NULL,
  usado        TINYINT(1) NOT NULL DEFAULT 0,
  creado_en    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_codigos_usuario (usuario_id, proposito),
  CONSTRAINT fk_codigos_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tokens de renovación (se guarda solo el hash)
CREATE TABLE refresh_tokens (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  usuario_id  INT UNSIGNED NOT NULL,
  token_hash  CHAR(64) NOT NULL UNIQUE,
  expira_en   DATETIME NOT NULL,
  revocado    TINYINT(1) NOT NULL DEFAULT 0,
  creado_en   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_refresh_usuario (usuario_id),
  CONSTRAINT fk_refresh_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- Catálogo
-- ---------------------------------------------------------------------
CREATE TABLE categorias (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  codigo       VARCHAR(5)   NOT NULL UNIQUE,     -- abreviatura del boceto: cn, H, F, CF...
  nombre       VARCHAR(60)  NOT NULL UNIQUE,
  descripcion  VARCHAR(255) NULL,
  icono        VARCHAR(40)  NOT NULL DEFAULT 'book',
  color        CHAR(7)      NOT NULL DEFAULT '#8FAE8B'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE autores (
  id      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre  VARCHAR(120) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE libros (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  titulo        VARCHAR(160) NOT NULL,
  autor_id      INT UNSIGNED NOT NULL,
  categoria_id  INT UNSIGNED NOT NULL,
  descripcion   TEXT NULL,
  portada_url   VARCHAR(500) NULL,
  stock_total   INT UNSIGNED NOT NULL DEFAULT 1,  -- ejemplares que tiene la biblioteca
  activo        TINYINT(1) NOT NULL DEFAULT 1,    -- "eliminar" = desactivar (baja lógica)
  creado_en     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_libros_autor     FOREIGN KEY (autor_id)     REFERENCES autores(id),
  CONSTRAINT fk_libros_categoria FOREIGN KEY (categoria_id) REFERENCES categorias(id),
  INDEX idx_libros_categoria (categoria_id, activo),
  FULLTEXT KEY ft_libros_titulo (titulo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- Reservas y préstamos
-- ---------------------------------------------------------------------
CREATE TABLE reservas (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  usuario_id   INT UNSIGNED NOT NULL,
  libro_id     INT UNSIGNED NOT NULL,
  tipo         ENUM('sala','retiro') NOT NULL,    -- sala = leer en la biblioteca · retiro = llevarlo
  estado       ENUM('activa','cumplida','cancelada','vencida') NOT NULL DEFAULT 'activa',
  creada_en    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_limite DATETIME NOT NULL,
  visita_en    DATETIME NOT NULL,                 -- día y hora (UTC) en que la persona va a ir a la biblioteca
  codigo_retiro CHAR(6) NOT NULL,                 -- código que se muestra en la biblioteca para retirar
  UNIQUE KEY uq_reservas_codigo (codigo_retiro),
  INDEX idx_reservas_visita (visita_en),
  CONSTRAINT fk_reservas_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
  CONSTRAINT fk_reservas_libro   FOREIGN KEY (libro_id)   REFERENCES libros(id),
  INDEX idx_reservas_usuario (usuario_id, estado),
  INDEX idx_reservas_libro (libro_id, estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE prestamos (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  usuario_id        INT UNSIGNED NOT NULL,        -- quien se lleva los libros
  registrado_por    INT UNSIGNED NOT NULL,        -- bibliotecario / dueño que lo cargó
  fecha_inicio      DATE NOT NULL,
  fecha_vencimiento DATE NOT NULL,
  estado            ENUM('activo','cerrado') NOT NULL DEFAULT 'activo',  -- "vencido" se calcula
  cerrado_en        DATETIME NULL,
  visita_en         DATETIME NOT NULL,            -- día y hora (UTC) de la visita / retiro en la biblioteca
  codigo_retiro     CHAR(6) NOT NULL,             -- el de la reserva de origen o uno nuevo
  UNIQUE KEY uq_prestamos_codigo (codigo_retiro),
  INDEX idx_prestamos_visita (visita_en),
  CONSTRAINT fk_prestamos_usuario FOREIGN KEY (usuario_id)     REFERENCES usuarios(id),
  CONSTRAINT fk_prestamos_staff   FOREIGN KEY (registrado_por) REFERENCES usuarios(id),
  INDEX idx_prestamos_usuario (usuario_id, estado),
  INDEX idx_prestamos_vencimiento (estado, fecha_vencimiento)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE prestamo_items (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  prestamo_id  INT UNSIGNED NOT NULL,
  libro_id     INT UNSIGNED NOT NULL,
  devuelto_en  DATETIME NULL,                     -- NULL = todavía lo tiene el usuario
  UNIQUE KEY uq_prestamo_libro (prestamo_id, libro_id),
  CONSTRAINT fk_items_prestamo FOREIGN KEY (prestamo_id) REFERENCES prestamos(id) ON DELETE CASCADE,
  CONSTRAINT fk_items_libro    FOREIGN KEY (libro_id)    REFERENCES libros(id),
  INDEX idx_items_libro (libro_id, devuelto_en)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- Mensajería (consultas usuario→biblioteca y mensajes internos dueño↔bibliotecario)
-- ---------------------------------------------------------------------
CREATE TABLE hilos (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tipo        ENUM('consulta','interno') NOT NULL,
  asunto      VARCHAR(140) NOT NULL,
  creado_por  INT UNSIGNED NOT NULL,
  creado_en   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_hilos_creador FOREIGN KEY (creado_por) REFERENCES usuarios(id),
  INDEX idx_hilos_tipo (tipo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Quién participa de cada hilo y hasta qué mensaje leyó (para los "no leídos")
CREATE TABLE hilo_participantes (
  hilo_id          INT UNSIGNED NOT NULL,
  usuario_id       INT UNSIGNED NOT NULL,
  ultimo_leido_id  INT UNSIGNED NULL,
  PRIMARY KEY (hilo_id, usuario_id),
  CONSTRAINT fk_hp_hilo    FOREIGN KEY (hilo_id)    REFERENCES hilos(id)    ON DELETE CASCADE,
  CONSTRAINT fk_hp_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE mensajes (
  id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  hilo_id       INT UNSIGNED NOT NULL,
  remitente_id  INT UNSIGNED NOT NULL,
  cuerpo        TEXT NOT NULL,
  creado_en     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_mensajes_hilo      FOREIGN KEY (hilo_id)      REFERENCES hilos(id) ON DELETE CASCADE,
  CONSTRAINT fk_mensajes_remitente FOREIGN KEY (remitente_id) REFERENCES usuarios(id),
  INDEX idx_mensajes_hilo (hilo_id, id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- Reposición de stock (dueño → distribuidora)
-- ---------------------------------------------------------------------
CREATE TABLE distribuidoras (
  id        INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre    VARCHAR(100) NOT NULL,
  email     VARCHAR(120) NOT NULL,
  telefono  VARCHAR(30)  NULL,
  activo    TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE pedidos_reposicion (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  distribuidora_id INT UNSIGNED NOT NULL,
  dueno_id         INT UNSIGNED NOT NULL,
  mensaje          TEXT NULL,
  estado_envio     ENUM('enviado','error') NOT NULL,
  creado_en        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_pedidos_distribuidora FOREIGN KEY (distribuidora_id) REFERENCES distribuidoras(id),
  CONSTRAINT fk_pedidos_dueno         FOREIGN KEY (dueno_id)         REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Si el libro ya existe se referencia por libro_id; si es un título nuevo va solo el texto
CREATE TABLE pedido_items (
  id                 INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  pedido_id          INT UNSIGNED NOT NULL,
  libro_id           INT UNSIGNED NULL,
  titulo_solicitado  VARCHAR(160) NULL,
  cantidad           INT UNSIGNED NOT NULL DEFAULT 1,
  CONSTRAINT fk_pitems_pedido FOREIGN KEY (pedido_id) REFERENCES pedidos_reposicion(id) ON DELETE CASCADE,
  CONSTRAINT fk_pitems_libro  FOREIGN KEY (libro_id)  REFERENCES libros(id),
  CONSTRAINT ck_pitems_origen CHECK (libro_id IS NOT NULL OR titulo_solicitado IS NOT NULL)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- Notificaciones dentro de la app (recordatorios de devolución, bloqueos...)
-- ---------------------------------------------------------------------
CREATE TABLE notificaciones (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  usuario_id  INT UNSIGNED NOT NULL,
  tipo        ENUM('recordatorio_devolucion','vencimiento','bloqueo','desbloqueo','reserva','sistema') NOT NULL,
  titulo      VARCHAR(140) NOT NULL,
  cuerpo      VARCHAR(500) NOT NULL,
  prestamo_id INT UNSIGNED NULL,
  leida       TINYINT(1) NOT NULL DEFAULT 0,
  creada_en   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  -- evita avisar dos veces lo mismo del mismo préstamo (los NULL no chocan entre sí)
  UNIQUE KEY uq_notif_prestamo (usuario_id, prestamo_id, tipo),
  INDEX idx_notif_usuario (usuario_id, leida),
  CONSTRAINT fk_notif_usuario  FOREIGN KEY (usuario_id)  REFERENCES usuarios(id) ON DELETE CASCADE,
  CONSTRAINT fk_notif_prestamo FOREIGN KEY (prestamo_id) REFERENCES prestamos(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
