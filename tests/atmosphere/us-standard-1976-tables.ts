/**
 * Rows of the U.S. Standard Atmosphere, 1976 (NOAA-S/T 76-1562,
 * NASA-TM-X-74335; the NTRS scan, https://ntrs.nasa.gov/citations/19770009539),
 * typed from the page images, each value as printed (the tables print
 * "1.1393 + 3" for 1.1393e3). Table I: temperature, pressure (millibars,
 * 100 N/m^2) and density; Table III: speed of sound, dynamic and kinematic
 * viscosity; metric units. Pages are the printed page numbers.
 */

export interface Row {
  /** Printed page of Table I, and of Table III. */
  readonly pages: readonly [number, number];
  /** Z (m) for the geometric tables, H (m') for the geopotential ones. */
  readonly altitude: number;
  /** The other altitude, as printed (H for the geometric tables, Z for the geopotential). */
  readonly other: string;
  /** Table I: T (K), P (mb), rho (kg/m^3). */
  readonly t: string;
  readonly p: string;
  readonly rho: string;
  /** Table III: C_s (m/s), mu (N s/m^2), eta (m^2/s). */
  readonly cs: string;
  readonly mu: string;
  readonly eta: string;
}

/**
 * By geometric altitude (Table I, pp. 51 to 65; Table III, pp. 101 to
 * 113): sea level, a point inside each layer, the layer bases as geometric
 * rows fall near them, and the stratopause.
 */
export const GEOMETRIC: readonly Row[] = [
  // Below sea level, in the tables' extension of the first layer.
  {
    pages: [53, 101],
    altitude: -1000,
    other: '-1000',
    t: '294.651',
    p: '1.1393e3',
    rho: '1.3470',
    cs: '344.11',
    mu: '1.8206e-5',
    eta: '1.3516e-5',
  },
  // Sea level: the defining values.
  {
    pages: [53, 101],
    altitude: 0,
    other: '0',
    t: '288.150',
    p: '1.01325e3',
    rho: '1.2250',
    cs: '340.29',
    mu: '1.7894e-5',
    eta: '1.4607e-5',
  },
  {
    pages: [53, 101],
    altitude: 500,
    other: '500',
    t: '284.900',
    p: '9.5461e2',
    rho: '1.1673',
    cs: '338.37',
    mu: '1.7737e-5',
    eta: '1.5195e-5',
  },
  {
    pages: [55, 103],
    altitude: 5500,
    other: '5495',
    t: '252.431',
    p: '5.0539e2',
    rho: '6.9747e-1',
    cs: '318.50',
    mu: '1.6116e-5',
    eta: '2.3107e-5',
  },
  {
    pages: [57, 105],
    altitude: 10500,
    other: '10483',
    t: '220.013',
    p: '2.4540e2',
    rho: '3.8857e-1',
    cs: '297.35',
    mu: '1.4400e-5',
    eta: '3.7060e-5',
  },
  // 19 m below the tropopause (H = 10981 m').
  {
    pages: [59, 107],
    altitude: 11000,
    other: '10981',
    t: '216.774',
    p: '2.2699e2',
    rho: '3.6480e-1',
    cs: '295.15',
    mu: '1.4223e-5',
    eta: '3.8988e-5',
  },
  {
    pages: [59, 107],
    altitude: 15500,
    other: '15462',
    t: '216.650',
    p: '1.1197e2',
    rho: '1.8006e-1',
    cs: '295.07',
    mu: '1.4216e-5',
    eta: '7.8953e-5',
  },
  {
    pages: [61, 109],
    altitude: 20000,
    other: '19937',
    t: '216.650',
    p: '5.5293e1',
    rho: '8.8910e-2',
    cs: '295.07',
    mu: '1.4216e-5',
    eta: '1.5989e-4',
  },
  {
    pages: [61, 109],
    altitude: 25000,
    other: '24902',
    t: '221.552',
    p: '2.5492e1',
    rho: '4.0084e-2',
    cs: '298.39',
    mu: '1.4484e-5',
    eta: '3.6135e-4',
  },
  {
    pages: [63, 111],
    altitude: 30000,
    other: '29859',
    t: '226.509',
    p: '1.1970e1',
    rho: '1.8410e-2',
    cs: '301.71',
    mu: '1.4753e-5',
    eta: '8.0134e-4',
  },
  {
    pages: [63, 111],
    altitude: 32000,
    other: '31840',
    t: '228.490',
    p: '8.8906',
    rho: '1.3555e-2',
    cs: '303.02',
    mu: '1.4859e-5',
    eta: '1.0962e-3',
  },
  {
    pages: [63, 111],
    altitude: 35000,
    other: '34808',
    t: '236.513',
    p: '5.7459',
    rho: '8.4634e-3',
    cs: '308.30',
    mu: '1.5287e-5',
    eta: '1.8062e-3',
  },
  {
    pages: [65, 113],
    altitude: 40000,
    other: '39750',
    t: '250.350',
    p: '2.8714',
    rho: '3.9957e-3',
    cs: '317.19',
    mu: '1.6009e-5',
    eta: '4.0066e-3',
  },
  {
    pages: [65, 113],
    altitude: 46000,
    other: '45669',
    t: '266.925',
    p: '1.3134',
    rho: '1.7142e-3',
    cs: '327.52',
    mu: '1.6851e-5',
    eta: '9.8305e-3',
  },
  {
    pages: [65, 113],
    altitude: 47000,
    other: '46655',
    t: '269.684',
    p: '1.1585',
    rho: '1.4965e-3',
    cs: '329.21',
    mu: '1.6989e-5',
    eta: '1.1352e-2',
  },
  // Inside the stratopause.
  {
    pages: [65, 113],
    altitude: 47400,
    other: '47049',
    t: '270.650',
    p: '1.1022',
    rho: '1.4187e-3',
    cs: '329.80',
    mu: '1.7037e-5',
    eta: '1.2009e-2',
  },
  {
    pages: [65, 113],
    altitude: 50000,
    other: '49610',
    t: '270.650',
    p: '7.9779e-1',
    rho: '1.0269e-3',
    cs: '329.80',
    mu: '1.7037e-5',
    eta: '1.6591e-2',
  },
];

/**
 * By geopotential altitude, at the layer bases of Table 4 above sea
 * level and the top of the range served (Table I, pp. 58 to 64; Table
 * III, pp. 106 to 112).
 */
export const GEOPOTENTIAL: readonly Row[] = [
  {
    pages: [58, 106],
    altitude: 11000,
    other: '11019',
    t: '216.650',
    p: '2.2632e2',
    rho: '3.6392e-1',
    cs: '295.07',
    mu: '1.4216e-5',
    eta: '3.9064e-5',
  },
  {
    pages: [60, 108],
    altitude: 20000,
    other: '20063',
    t: '216.650',
    p: '5.4748e1',
    rho: '8.8035e-2',
    cs: '295.07',
    mu: '1.4216e-5',
    eta: '1.6148e-4',
  },
  {
    pages: [62, 110],
    altitude: 32000,
    other: '32162',
    t: '228.650',
    p: '8.6801',
    rho: '1.3225e-2',
    cs: '303.13',
    mu: '1.4868e-5',
    eta: '1.1242e-3',
  },
  {
    pages: [64, 112],
    altitude: 47000,
    other: '47350',
    t: '270.650',
    p: '1.1090',
    rho: '1.4275e-3',
    cs: '329.80',
    mu: '1.7037e-5',
    eta: '1.1934e-2',
  },
  {
    pages: [64, 112],
    altitude: 51000,
    other: '51413',
    t: '270.650',
    p: '6.6938e-1',
    rho: '8.6160e-4',
    cs: '329.80',
    mu: '1.7037e-5',
    eta: '1.9773e-2',
  },
];
