/** 终端类型 */
export type TerminalType = 'CMOS 相机' | '导星相机' | '光谱仪';

/** 望远镜状态 */
export type TelescopeStatus = '可用' | '维护中' | '外出';

/** 望远镜 */
export interface Telescope {
  id: string;
  /** 编号 */
  code: string;
  /** 口径（mm） */
  apertureMm: number;
  /** 焦距（mm） */
  focalLengthMm: number;
  /** 赤道仪型号 */
  mount: string;
  /** 可用终端 */
  terminals: TerminalType[];
  /** 最大载荷（kg） */
  maxPayloadKg: number;
  /** 当前状态 */
  status: TelescopeStatus;
}

/** 终端（相机 / 导星相机 / 光谱仪） */
export interface Instrument {
  id: string;
  /** 型号 */
  model: string;
  /** 类型 */
  terminalType: TerminalType;
  /** 像元尺寸（μm） */
  pixelSizeUm: number;
  /** 靶面宽（mm） */
  sensorWidthMm: number;
  /** 靶面高（mm） */
  sensorHeightMm: number;
  /** 读出噪声（e-） */
  readNoiseE: number;
  /** 适配望远镜编号 */
  telescopeCode: string;
}

/** 视场角计算结果 */
export interface FieldOfView {
  /** 视场宽（度） */
  widthDeg: number;
  /** 视场高（度） */
  heightDeg: number;
  /** 像元比例（角秒/像素） */
  arcsecPerPixel: number;
  /** 显示文案 */
  text: string;
}

export const TERMINAL_TYPES: TerminalType[] = ['CMOS 相机', '导星相机', '光谱仪'];
export const TELESCOPE_STATUSES: TelescopeStatus[] = ['可用', '维护中', '外出'];
