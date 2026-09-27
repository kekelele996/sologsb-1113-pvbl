import Box from '@mui/material/Box';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';
import { minutesToTime } from '../../utils/astro';

export interface TimelineBar {
  id: string;
  /** 起始刻度（18:00 起算分钟） */
  startMinute: number;
  /** 结束刻度 */
  endMinute: number;
  label: string;
  color: string;
  tooltip?: string;
  dimmed?: boolean;
}

export interface TimelineProps {
  bars: TimelineBar[];
  ticks: number[];
  /** 时间轴总分钟数 */
  totalMinutes: number;
  /** 每像素代表的分钟数 */
  minutesPerPixel?: number;
  /** 时间轴上方条带（如月相与月出月落） */
  strip?: ReactNode;
  height?: number;
  conflictIds?: Set<string>;
  onBarClick?: (id: string) => void;
  /** 插槽：额外叠加层 */
  children?: ReactNode;
}

/** 可横向滚动的时间轴容器，接收时段与子元素插槽（编排总览、导出页消费） */
export default function Timeline({
  bars,
  ticks,
  totalMinutes,
  minutesPerPixel = 2.2,
  strip,
  height = 96,
  conflictIds,
  onBarClick,
  children,
}: TimelineProps) {
  /** 内容最小宽度（窄屏横向滚动），定位统一用百分比，保证刻度、排程段与条带严格对齐 */
  const minWidth = Math.round(totalMinutes / minutesPerPixel);

  return (
    <Box sx={{ overflowX: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1, bgcolor: 'background.paper' }}>
      <Box sx={{ minWidth, p: 1, position: 'relative' }}>
        {strip ? <Box sx={{ mb: 1 }}>{strip}</Box> : null}
        <Box sx={{ position: 'relative', height }}>
          {/* 刻度 */}
          {ticks.map((tick) => (
            <Box
              key={tick}
              sx={{
                position: 'absolute',
                left: `${(tick / totalMinutes) * 100}%`,
                top: 0,
                bottom: 18,
                borderLeft: '1px dashed',
                borderColor: 'divider',
              }}
            >
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  position: 'absolute',
                  top: '100%',
                  whiteSpace: 'nowrap',
                  transform: tick === 0 ? 'translateX(0)' : tick >= totalMinutes ? 'translateX(-100%)' : 'translateX(-50%)',
                }}
              >
                {minutesToTime(tick)}
              </Typography>
            </Box>
          ))}

          {/* 排程段 */}
          {bars.map((bar) => {
            const leftPct = (bar.startMinute / totalMinutes) * 100;
            const widthPct = ((bar.endMinute - bar.startMinute) / totalMinutes) * 100;
            const conflict = conflictIds?.has(bar.id) ?? false;
            return (
              <Tooltip key={bar.id} title={bar.tooltip ?? bar.label}>
                <Box
                  onClick={() => onBarClick?.(bar.id)}
                  sx={{
                    position: 'absolute',
                    left: `${leftPct}%`,
                    top: 18,
                    width: `${widthPct}%`,
                    minWidth: 56,
                    height: height - 34,
                    bgcolor: conflict ? 'error.main' : bar.color,
                    color: '#fff',
                    borderRadius: 1,
                    px: 0.75,
                    py: 0.5,
                    cursor: onBarClick ? 'pointer' : 'default',
                    opacity: bar.dimmed ? 0.42 : 1,
                    border: conflict ? '2px solid' : '1px solid rgba(255,255,255,.35)',
                    borderColor: conflict ? 'error.dark' : undefined,
                    overflow: 'hidden',
                    boxShadow: 1,
                  }}
                >
                  <Typography variant="caption" sx={{ display: 'block', fontWeight: 600, whiteSpace: 'nowrap' }}>
                    {bar.label}
                  </Typography>
                  <Typography variant="caption" sx={{ display: 'block', whiteSpace: 'nowrap', opacity: 0.9 }}>
                    {minutesToTime(bar.startMinute)}-{minutesToTime(bar.endMinute)}
                  </Typography>
                </Box>
              </Tooltip>
            );
          })}
          {children}
        </Box>
      </Box>
    </Box>
  );
}
