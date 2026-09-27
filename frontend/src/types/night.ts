/** 观测夜 */
export interface ObsNight {
  id: string;
  /** 日期 YYYY-MM-DD */
  date: string;
  /** 站点名 */
  siteName: string;
  /** 站点纬度（度） */
  siteLat: number;
  /** 站点经度（度） */
  siteLng: number;
  /** 月相百分比（0~100，100 为满月） */
  moonPhasePct: number;
  /** 月出时刻 HH:mm */
  moonrise: string;
  /** 月落时刻 HH:mm */
  moonset: string;
  /** 日落时刻 HH:mm */
  sunset: string;
  /** 日出时刻 HH:mm */
  sunrise: string;
  /** 云量文字预报 */
  cloudText: string;
  /** 是否启用为主夜 */
  primary: boolean;
  /** 备用夜标记 */
  backup: boolean;
  /** 值班人 */
  dutyOfficer: string;
  /** 备注 */
  remark?: string;
}

export const CLOUD_TEXTS: string[] = ['晴', '少云', '多云', '阴', '有雨'];

/** 站点预设 */
export const SITE_PRESETS: Array<{ name: string; lat: number; lng: number }> = [
  { name: '兴隆观测站', lat: 40.3958, lng: 117.5772 },
  { name: '冷湖赛什腾山', lat: 38.6069, lng: 93.8961 },
  { name: '丽江高美古', lat: 26.6951, lng: 100.0301 },
  { name: '校园天文台', lat: 39.9042, lng: 116.4074 },
];

/** 夜间时间轴范围（18:00 → 次日 06:00，共 720 分钟） */
export const NIGHT_START_MINUTES = 18 * 60;
export const NIGHT_TOTAL_MINUTES = 12 * 60;
