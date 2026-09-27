import { useState } from 'react';
import Chip from '@mui/material/Chip';
import Popover from '@mui/material/Popover';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import type { ConflictItem } from '../../types';

export interface ConflictBadgeProps {
  conflicts: ConflictItem[];
  /** 点击冲突明细中的条目（用于一键跳转到对应排程段） */
  onSelect?: (sessionId: string) => void;
  compact?: boolean;
}

/** 冲突提示徽标：点击展开冲突明细 */
export default function ConflictBadge({ conflicts, onSelect, compact = false }: ConflictBadgeProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  if (conflicts.length === 0) {
    return <Chip label="无冲突" size="small" color="success" variant="outlined" />;
  }

  return (
    <>
      <Chip
        label={compact ? `冲突 ${conflicts.length}` : `设备冲突 ${conflicts.length} 处`}
        size="small"
        color="error"
        onClick={(event) => setAnchorEl(event.currentTarget)}
      />
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Box sx={{ p: 1.5, maxWidth: 380 }}>
          <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
            冲突明细（同一望远镜时段重叠）
          </Typography>
          <List dense disablePadding>
            {conflicts.map((conflict) => (
              <ListItemButton
                key={`${conflict.sessionId}-${conflict.otherId}`}
                onClick={() => {
                  onSelect?.(conflict.otherId);
                  setAnchorEl(null);
                }}
              >
                <ListItemText
                  primary={`排程段 ${conflict.otherId}`}
                  secondary={`望远镜 ${conflict.telescopeId} · ${conflict.overlapText}`}
                />
              </ListItemButton>
            ))}
          </List>
        </Box>
      </Popover>
    </>
  );
}
