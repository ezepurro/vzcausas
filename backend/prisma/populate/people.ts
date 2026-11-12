/**
 * Accounts, lawyers and clients of the presentation fixture.
 *
 * The seven developers of the team are the firm's lawyers, with their real
 * mailboxes: the daily run reaches them when `COPY_TO_RESPONSIBLE_LAWYER` is
 * on. The administrator and the secretary are made up, with `.local` addresses
 * that no mail can reach.
 *
 * Every account with the ADMINISTRATOR or LAWYER role is linked to exactly one
 * professional record, and a secretary-only account to none (D-25, Q-07).
 * Registration numbers follow the `<circuit>-<number>` shape of the
 * `RegistrationNumber` value object, already normalized: the `@shared/*`
 * aliases do not resolve under ts-node, so it cannot be imported here.
 *
 * Neither `admin` nor registration number `0-00000` appear on purpose: they
 * belong to `DevSeedService`, which runs when the app boots and would take
 * them over.
 */
export interface DevUser {
  username: string;
  lastName: string;
  firstName: string;
  email: string;
  roles: readonly ('ADMINISTRATOR' | 'LAWYER' | 'SECRETARY')[];
  registrationNumber?: string;
}

export const DEV_USERS: readonly DevUser[] = [
  { username: 'lu.cipolla.del', lastName: 'Cipolla', firstName: 'Luciano', email: 'lu.cipolla.del@gmail.com', roles: ['LAWYER'], registrationNumber: '1-50002' },
  { username: 'facuchofiorani', lastName: 'Fiorani', firstName: 'Facundo', email: 'facuchofiorani@gmail.com', roles: ['LAWYER'], registrationNumber: '1-50003' },
  { username: 'gamondsantiago2', lastName: 'Gamond', firstName: 'Santiago', email: 'gamondsantiago2@gmail.com', roles: ['LAWYER'], registrationNumber: '1-50005' },
  { username: 'ezequiel.purro', lastName: 'Purro', firstName: 'Ezequiel', email: 'ezequiel.purro@gmail.com', roles: ['LAWYER'], registrationNumber: '1-50006' },
  { username: 'teomach047', lastName: 'Machuca', firstName: 'Mateo', email: 'teomach047@gmail.com', roles: ['LAWYER'], registrationNumber: '1-50001' },
  { username: 'matecr361', lastName: 'Castro', firstName: 'Mateo', email: 'matecr361@gmail.com', roles: ['LAWYER'], registrationNumber: '1-50004' },
  { username: 'matumontovani2006', lastName: 'Montovani', firstName: 'Mateo', email: 'matumontovani2006@gmail.com', roles: ['LAWYER'], registrationNumber: '1-50007' },
  // The firm's partner: administers the system and also carries cases.
  { username: 'administrador', lastName: 'Ríos', firstName: 'Andrea', email: 'administrador@estudio.local', roles: ['ADMINISTRATOR', 'LAWYER'], registrationNumber: '1-50008' },
  { username: 'secretaria', lastName: 'Suárez', firstName: 'Carolina', email: 'secretaria@estudio.local', roles: ['SECRETARY'] },
];

/**
 * Pools the clients are drawn from. Generic Argentine names; none belongs to
 * the firm or to the team, and the firm's own names (Vázquez, Zárate,
 * Fernando, Oscar, Mariano) are left out on purpose: the fixture is shown to
 * the firm.
 */
export const CLIENT_LAST_NAMES = [
  'ACOSTA', 'AGÜERO', 'ALBORNOZ', 'ALMADA', 'ARCE', 'ÁVILA', 'BARRIONUEVO', 'BAZÁN', 'BENÍTEZ', 'BRAVO',
  'BRITOS', 'BUSTAMANTE', 'CABRAL', 'CÁCERES', 'CALDERÓN', 'CARRIZO', 'CASAS', 'CEJAS', 'CHAVES', 'CORDERO',
  'CORIA', 'CUELLO', 'DÍAZ', 'DOMÍNGUEZ', 'ESCOBAR', 'ESCUDERO', 'FARÍAS', 'FERREYRA', 'FIGUEROA', 'FLORES',
  'FUNES', 'GAITÁN', 'GALLARDO', 'GODOY', 'GÓMEZ', 'GUZMÁN', 'HEREDIA', 'HERRERA', 'IBARRA', 'JUÁREZ',
  'LEDESMA', 'LUNA', 'MALDONADO', 'MANSILLA', 'MÁRQUEZ', 'MEDINA', 'MOLINA', 'MONTENEGRO', 'MORENO', 'MOYANO',
  'NAVARRO', 'NIETO', 'OLMOS', 'OVIEDO', 'PAEZ', 'PALACIOS', 'PERALTA', 'PONCE', 'QUINTEROS', 'RAMOS',
  'REYNOSO', 'ROLDÁN', 'ROMERO', 'SALAS', 'SÁNCHEZ', 'SEGURA', 'SORIA', 'TOLEDO', 'TORRES', 'VEGA',
  'VERA', 'VILLARREAL', 'VIDELA', 'YAPUR',
] as const;

export const CLIENT_FIRST_NAMES = [
  'Agustina', 'Alejandro', 'Ana Laura', 'Ariel', 'Belén', 'Brenda', 'Bruno', 'Camila', 'Carla', 'Claudio',
  'Cristian', 'Daniela', 'Diego', 'Emilia', 'Esteban', 'Federico', 'Florencia', 'Gabriel', 'Gisela', 'Gonzalo',
  'Graciela', 'Héctor', 'Ignacio', 'Jesica', 'Joaquín', 'Jorge Luis', 'Julieta', 'Julián', 'Leandro', 'Liliana',
  'Lorena', 'Lucas', 'Lucía', 'Marcela', 'Marcos', 'María José', 'Martina', 'Matías', 'Melina', 'Micaela',
  'Miguel Ángel', 'Natalia', 'Nicolás', 'Noelia', 'Pablo', 'Patricia', 'Ramiro', 'Raúl', 'Roberto', 'Rocío',
  'Romina', 'Rubén', 'Silvia', 'Sofía', 'Sergio', 'Tamara', 'Tomás', 'Valentina', 'Verónica', 'Walter',
] as const;

/** Streets and neighbourhoods of the city of Córdoba, for made-up addresses. */
export const STREETS = [
  'Av. Colón', 'Av. Vélez Sarsfield', 'Bv. San Juan', 'Av. Rafael Núñez', 'Obispo Trejo', 'Duarte Quirós',
  'Av. Hipólito Yrigoyen', 'Deán Funes', 'Av. General Paz', 'Bv. Chacabuco', 'Av. Castro Barros', 'Av. Fuerza Aérea',
  'Av. Sabattini', 'Av. Juan B. Justo', 'Av. Monseñor Pablo Cabrera', 'Rondeau', 'Belgrano', 'Ituzaingó',
  'Av. Recta Martinoli', 'Av. Donato Álvarez', 'Lima', 'Santa Rosa', 'Av. Richieri', 'Av. Armada Argentina',
] as const;

export const NEIGHBOURHOODS = [
  'Nueva Córdoba', 'Centro', 'Alberdi', 'General Paz', 'Cofico', 'Alta Córdoba', 'Cerro de las Rosas',
  'Argüello', 'Villa Belgrano', 'Jardín', 'San Vicente', 'Barrio Jardín', 'Villa Cabrera', 'Güemes',
  'Los Plátanos', 'Ituzaingó', 'Yofre Norte', 'Marqués de Sobremonte',
] as const;

/** Foreign clients identified by passport (D-108): `[last name, first name, passport]`. */
export const PASSPORT_CLIENTS = [
  ['QUISPE MAMANI', 'Rosa', 'BO7845123'],
  ['DA SILVA', 'Thiago', 'FX482915'],
  ['ESPINOZA', 'Carlos Andrés', 'PE5521789'],
] as const;
