/** 目标类型 */
export type TargetType = '星系' | '星云' | '疏散星团' | '行星' | '月面';

/** 观测优先级 */
export type Priority = 'P1' | 'P2' | 'P3';

/** 推荐滤镜 */
export type FilterName = '无滤镜' | 'L' | 'R' | 'G' | 'B' | 'Ha' | 'OIII' | 'SII';

/** 观测目标 */
export interface ObsTarget {
  id: string;
  /** 目标名（M31、NGC 7000） */
  name: string;
  /** 星表编号 */
  catalog: string;
  /** 赤经（小时，0~24） */
  raHours: number;
  /** 赤纬（度，-90~90） */
  decDeg: number;
  /** 视星等 */
  magnitude: number;
  /** 目标类型 */
  type: TargetType;
  /** 推荐滤镜 */
  filter: FilterName;
  /** 单帧曝光秒数 */
  exposureSec: number;
  /** 建议累计时长（分钟） */
  totalMinutes: number;
  /** 优先级 */
  priority: Priority;
  /** 最小地平高度角阈值（度）：低于该值排程时自动标灰 */
  minAltitude: number;
  /** 备注 */
  remark?: string;
}

export const TARGET_TYPES: TargetType[] = ['星系', '星云', '疏散星团', '行星', '月面'];
export const PRIORITIES: Priority[] = ['P1', 'P2', 'P3'];
export const FILTER_NAMES: FilterName[] = ['无滤镜', 'L', 'R', 'G', 'B', 'Ha', 'OIII', 'SII'];

/** 目标类型配色 */
export const TARGET_COLOR: Record<TargetType, string> = {
  星系: '#7e57c2',
  星云: '#26a69a',
  疏散星团: '#42a5f5',
  行星: '#ef6c00',
  月面: '#8d8d8d',
};
