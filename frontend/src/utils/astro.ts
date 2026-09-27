import { NIGHT_START_MINUTES, NIGHT_TOTAL_MINUTES, type ObsNight } from '../types/night';
import type { ObsTarget } from '../types/target';

export const DEG = Math.PI / 180;

/** 儒略日 */
export function julianDate(date: Date): number {
  return date.getTime() / 86_400_000 + 2440587.5;
}

/** 本地恒星时（小时，0~24） */
export function localSiderealTime(date: Date, lngDeg: number): number {
  const jd = julianDate(date);
  const t = (jd - 2451545.0) / 36525;
  let gmst = 280.46061837 + 360.98564736629 * (jd - 2451545.0) + 0.000387933 * t * t;
  gmst = ((gmst % 360) + 360) % 360;
  const lst = (((gmst + lngDeg) % 360) + 360) % 360;
  return lst / 15;
}

/** 地平高度角（度）：由赤经赤纬、站点经纬度与时刻计算 */
export function altitudeAt(
  target: Pick<ObsTarget, 'raHours' | 'decDeg'>,
  date: Date,
  latDeg: number,
  lngDeg: number,
): number {
  const lst = localSiderealTime(date, lngDeg);
  let ha = ((lst - target.raHours) * 15) % 360;
  if (ha > 180) ha -= 360;
  if (ha < -180) ha += 360;
  const sinAlt =
    Math.sin(target.decDeg * DEG) * Math.sin(latDeg * DEG) +
    Math.cos(target.decDeg * DEG) * Math.cos(latDeg * DEG) * Math.cos(ha * DEG);
  return Number((Math.asin(Math.max(-1, Math.min(1, sinAlt))) / DEG).toFixed(1));
}

/** 'HH:mm' → 该夜时间轴刻度（18:00 起算的分钟数，跨零点自动 +1440） */
export function axisMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map((v) => Number(v) || 0);
  const clock = h * 60 + m;
  return clock >= NIGHT_START_MINUTES ? clock - NIGHT_START_MINUTES : clock + (1440 - NIGHT_START_MINUTES);
}

/** 时间轴刻度 → 'HH:mm' */
export function minutesToTime(axis: number): string {
  const total = ((NIGHT_START_MINUTES + axis) % 1440 + 1440) % 1440;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** 排程段时长（分钟，支持跨零点） */
export function durationMinutes(startTime: string, endTime: string): number {
  const start = axisMinutes(startTime);
  let end = axisMinutes(endTime);
  if (end <= start) end += 1440;
  return end - start;
}

/** 两个区间重叠分钟数（跨零点安全） */
export function overlapMinutes(aStart: string, aEnd: string, bStart: string, bEnd: string): number {
  const a1 = axisMinutes(aStart);
  let a2 = axisMinutes(aEnd);
  if (a2 <= a1) a2 += 1440;
  const b1 = axisMinutes(bStart);
  let b2 = axisMinutes(bEnd);
  if (b2 <= b1) b2 += 1440;
  return Math.max(0, Math.min(a2, b2) - Math.max(a1, b1));
}

/** 分钟数 → '6h30m' */
export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${h}h${String(m).padStart(2, '0')}m`;
}

/** 可见窗口 */
export interface VisibilityWindow {
  /** 可观测起始时刻 HH:mm */
  startText: string;
  /** 可观测结束时刻 HH:mm */
  endText: string;
  /** 最大地平高度角（度） */
  maxAltitude: number;
  /** 可观测时长（分钟） */
  durationMinutes: number;
}

/**
 * 本地计算目标的可见窗口：从日落到日出每 stepMinutes 采样地平高度角，
 * 取连续满足最小高度阈值的区间。
 */
export function visibilityWindow(target: ObsTarget, night: ObsNight, stepMinutes = 10): VisibilityWindow | null {
  const base = new Date(`${night.date}T18:00:00`);
  const from = axisMinutes(night.sunset);
  const to = axisMinutes(night.sunrise) || NIGHT_TOTAL_MINUTES;
  const samples: Array<{ axis: number; altitude: number }> = [];
  for (let axis = from; axis <= to; axis += stepMinutes) {
    const date = new Date(base.getTime() + axis * 60_000);
    samples.push({ axis, altitude: altitudeAt(target, date, night.siteLat, night.siteLng) });
  }
  const visible = samples.filter((sample) => sample.altitude >= target.minAltitude);
  if (visible.length === 0) return null;
  const startAxis = visible[0].axis;
  const endAxis = visible[visible.length - 1].axis + stepMinutes;
  return {
    startText: minutesToTime(startAxis),
    endText: minutesToTime(endAxis),
    maxAltitude: Number(Math.max(...visible.map((sample) => sample.altitude)).toFixed(1)),
    durationMinutes: endAxis - startAxis,
  };
}

/** 是否低于最小地平高度角阈值（低于阈值排程时自动标灰） */
export function isBelowThreshold(altitude: number, minAltitude: number): boolean {
  return altitude < minAltitude;
}

/** 月相亮度折算（0~1）：月相百分比越高，天空背景越亮 */
export function moonBrightnessFactor(moonPhasePct: number): number {
  return Number((Math.max(0, Math.min(100, moonPhasePct)) / 100).toFixed(2));
}

/** 月相与目标亮度冲突提示（无冲突返回 undefined） */
export function moonConflict(target: Pick<ObsTarget, 'magnitude' | 'name'>, moonPhasePct: number): string | undefined {
  if (moonPhasePct >= 85 && target.magnitude >= 6) {
    return `接近满月（${moonPhasePct}%），目标 ${target.name} 视星等 ${target.magnitude}，建议改为明目标或转备用夜`;
  }
  if (moonPhasePct >= 60 && target.magnitude >= 8) {
    return `月相偏亮（${moonPhasePct}%），暗目标 ${target.name}（${target.magnitude} 等）对比度下降，建议加长曝光或转备用夜`;
  }
  return undefined;
}

/** 夜间时间轴刻度（每 2 小时） */
export function timelineTicks(stepMinutes = 120): number[] {
  const ticks: number[] = [];
  for (let axis = 0; axis <= NIGHT_TOTAL_MINUTES; axis += stepMinutes) {
    ticks.push(axis);
  }
  return ticks;
}

/** 月相文字描述 */
export function moonPhaseText(pct: number): string {
  if (pct <= 5) return '新月';
  if (pct < 45) return '娥眉月';
  if (pct <= 55) return '上下弦';
  if (pct < 95) return '凸月';
  return '满月';
}
