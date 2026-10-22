/**
 * The U.S. Standard Atmosphere, 1976 (NOAA, NASA and USAF, Washington,
 * D.C., October 1976; NOAA-S/T 76-1562, NASA-TM-X-74335), from 5 km below
 * sea level to the top of the stratopause, 51 km' geopotential (51.41 km
 * geometric): the first five layers of its Part 1, implemented from its
 * defining constants and equations. Copy read: NASA Technical Reports
 * Server, https://ntrs.nasa.gov/citations/19770009539 (the scanned
 * document, its last two of 243 pages an errata sheet: a reader's letter
 * to the NASA STI desk, 2015). Pages below are the document's printed
 * page numbers (15 or 16 fewer than the PDF's).
 *
 * Constants (Table 2, p. 2, with the text where the table's print is
 * wrong, as the errata sheet also says):
 *
 *   R*   = 8.31432e3 N m / (kmol K), the gas constant (p. 3; Table 2
 *          prints it a factor 1e6 too small);
 *   M0   = 28.9644 kg/kmol, the sea-level mean molecular weight, from
 *          Table 3 by eq. (21) (p. 9);
 *   g0'  = 9.80665 m^2 / (s^2 m'), the geopotential meter's constant (p. 3);
 *   r0   = 6356.766 km, the effective Earth radius (p. 4; Table 2 prints
 *          it in km a factor 1e3 too large);
 *   P0   = 101325 N/m^2, T0 = 288.15 K at sea level (Table 2);
 *   gamma = 1.40 (Table 2, p. 4);
 *   beta = 1.458e-6 kg / (s m K^1/2) and S = 110.4 K, Sutherland's
 *          constant, as eq. (51)'s text gives them, "used for computation
 *          of the tables" (p. 19); Table 2 and p. 4 print S as 110 K, and
 *          the tables are missed with it (the tests).
 *
 * Equations (Part 1):
 *
 *   H = r0 Z / (r0 + Z), Z = r0 H / (r0 - H)             (18), (19), p. 8
 *   T_M = T_M,b + L_M,b (H - H_b)                          (23), p. 10
 *   P = P_b [T_M,b / T_M]^(g0' M0 / (R* L_M,b)), L != 0    (33a), p. 12
 *   P = P_b exp(-g0' M0 (H - H_b) / (R* T_M,b)), L = 0     (33b), p. 12
 *   rho = P M0 / (R* T_M)                                  (42), p. 15
 *   C_s = (gamma R* T_M / M0)^(1/2)                        (50), p. 18
 *   mu = beta T^(3/2) / (T + S)                            (51), p. 19
 *   eta = mu / rho                                         (52), p. 19
 *
 * with the layers' H_b and L_M,b of Table 4 (p. 3), and T_M,b and P_b
 * carried up from sea level by (23) and (33), as the document does. Below
 * 80 km the molecular weight is M0 and the kinetic temperature T equals
 * the molecular-scale temperature T_M (p. 9), so T = T_M throughout this
 * range.
 *
 * Tested against the document's own Tables I and III at 22 altitudes
 * (tests/atmosphere/us-standard-1976.test.ts): every value within a unit
 * of its last printed digit; the pressures, which the tables truncate, 0
 * to 0.96 of a unit above the printed ones, and every other value within
 * half a unit but three of 110 (0.51 to 0.52). The record is
 * docs/design/0011-total-drag-on-the-page.md section 9.
 */

/** R*, N m / (kmol K) (p. 3). */
export const GAS_CONSTANT = 8.31432e3;
/** M0, kg/kmol (p. 9). */
export const MOLECULAR_WEIGHT = 28.9644;
/** g0', m^2 / (s^2 m') (p. 3). */
export const GEOPOTENTIAL_CONSTANT = 9.80665;
/** r0, m (p. 4). */
export const EARTH_RADIUS = 6356766;
/** P0, N/m^2 (Table 2). */
export const SEA_LEVEL_PRESSURE = 101325;
/** T0, K (Table 2). */
export const SEA_LEVEL_TEMPERATURE = 288.15;
/** gamma (Table 2, p. 4). */
export const RATIO_OF_SPECIFIC_HEATS = 1.4;
/** beta, kg / (s m K^1/2) (p. 19). */
export const SUTHERLAND_BETA = 1.458e-6;
/** S, K (p. 19, eq. (51)). */
export const SUTHERLAND_CONSTANT = 110.4;

/**
 * The layers served, Table 4 (p. 3): base geopotential altitude H_b (m')
 * and molecular-scale temperature gradient L_M,b (K/m'), from the
 * troposphere to the stratopause.
 */
const LAYER_TABLE: readonly { readonly base: number; readonly lapse: number }[] = [
  { base: 0, lapse: -6.5e-3 },
  { base: 11000, lapse: 0 },
  { base: 20000, lapse: 1.0e-3 },
  { base: 32000, lapse: 2.8e-3 },
  { base: 47000, lapse: 0 },
];

/** The top of the last layer served: the base of the next, 51 km' (Table 4). */
export const TOP_GEOPOTENTIAL_ALTITUDE = 51000;
/** The tables of the document begin 5 km below sea level (Table I, p. 51). */
export const BOTTOM_GEOMETRIC_ALTITUDE = -5000;

/** Geometric altitude Z (m) to geopotential altitude H (m'), eq. (18). */
export function geopotentialAltitude(geometric: number): number {
  return (EARTH_RADIUS * geometric) / (EARTH_RADIUS + geometric);
}

/** Geopotential altitude H (m') to geometric altitude Z (m), eq. (19). */
export function geometricAltitude(geopotential: number): number {
  return (EARTH_RADIUS * geopotential) / (EARTH_RADIUS - geopotential);
}

/** The range served, in geometric altitude, m. */
export const ALTITUDE_RANGE = [
  BOTTOM_GEOMETRIC_ALTITUDE,
  geometricAltitude(TOP_GEOPOTENTIAL_ALTITUDE),
] as const;

const GMR = (GEOPOTENTIAL_CONSTANT * MOLECULAR_WEIGHT) / GAS_CONSTANT;

interface Layer {
  readonly base: number;
  readonly lapse: number;
  readonly baseTemperature: number;
  readonly basePressure: number;
}

/** Temperature and pressure at H in a layer, eqs. (23), (33a), (33b). */
function inLayer(layer: Layer, h: number): { temperature: number; pressure: number } {
  const dh = h - layer.base;
  if (layer.lapse === 0) {
    return {
      temperature: layer.baseTemperature,
      pressure: layer.basePressure * Math.exp((-GMR * dh) / layer.baseTemperature),
    };
  }
  const temperature = layer.baseTemperature + layer.lapse * dh;
  return {
    temperature,
    pressure: layer.basePressure * (layer.baseTemperature / temperature) ** (GMR / layer.lapse),
  };
}

/** Each layer with its base temperature and pressure, carried up from sea level. */
const LAYERS: readonly Layer[] = LAYER_TABLE.reduce<Layer[]>((layers, row, k) => {
  if (k === 0) {
    layers.push({
      ...row,
      baseTemperature: SEA_LEVEL_TEMPERATURE,
      basePressure: SEA_LEVEL_PRESSURE,
    });
  } else {
    const below = inLayer(layers[k - 1]!, row.base);
    layers.push({ ...row, baseTemperature: below.temperature, basePressure: below.pressure });
  }
  return layers;
}, []);

/** The standard atmosphere at one altitude, SI units. */
export interface StandardAtmosphere {
  /** Z, m above mean sea level. */
  readonly geometricAltitude: number;
  /** H, m'. */
  readonly geopotentialAltitude: number;
  /** T (= T_M here), K. */
  readonly temperature: number;
  /** P, N/m^2. */
  readonly pressure: number;
  /** rho, kg/m^3. */
  readonly density: number;
  /** C_s, m/s. */
  readonly speedOfSound: number;
  /** mu, N s / m^2. */
  readonly dynamicViscosity: number;
  /** eta = mu / rho, m^2/s. */
  readonly kinematicViscosity: number;
}

/**
 * The atmosphere at a geopotential altitude H, m'. Throws a RangeError
 * outside the range served (5 km below sea level to 51 km').
 */
export function atmosphereAtGeopotential(geopotential: number): StandardAtmosphere {
  const bottom = geopotentialAltitude(BOTTOM_GEOMETRIC_ALTITUDE);
  if (!(geopotential >= bottom && geopotential <= TOP_GEOPOTENTIAL_ALTITUDE)) {
    throw new RangeError(
      `the standard atmosphere is served from ${BOTTOM_GEOMETRIC_ALTITUDE} m to ` +
        `${TOP_GEOPOTENTIAL_ALTITUDE} m' geopotential, asked ${geopotential} m'`,
    );
  }
  let layer = LAYERS[0]!;
  for (const l of LAYERS) if (geopotential >= l.base) layer = l;
  const { temperature, pressure } = inLayer(layer, geopotential);
  const density = (pressure * MOLECULAR_WEIGHT) / (GAS_CONSTANT * temperature);
  const dynamicViscosity =
    (SUTHERLAND_BETA * temperature ** 1.5) / (temperature + SUTHERLAND_CONSTANT);
  return {
    geometricAltitude: geometricAltitude(geopotential),
    geopotentialAltitude: geopotential,
    temperature,
    pressure,
    density,
    speedOfSound: Math.sqrt(
      (RATIO_OF_SPECIFIC_HEATS * GAS_CONSTANT * temperature) / MOLECULAR_WEIGHT,
    ),
    dynamicViscosity,
    kinematicViscosity: dynamicViscosity / density,
  };
}

/**
 * The atmosphere at a geometric altitude Z, m above mean sea level.
 * Throws a RangeError outside `ALTITUDE_RANGE`.
 */
export function standardAtmosphere(geometric: number): StandardAtmosphere {
  if (!(geometric >= ALTITUDE_RANGE[0] && geometric <= ALTITUDE_RANGE[1])) {
    throw new RangeError(
      `the standard atmosphere is served from ${ALTITUDE_RANGE[0]} m to ` +
        `${Math.floor(ALTITUDE_RANGE[1])} m geometric, asked ${geometric} m`,
    );
  }
  return {
    ...atmosphereAtGeopotential(geopotentialAltitude(geometric)),
    geometricAltitude: geometric,
  };
}
