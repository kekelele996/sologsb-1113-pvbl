import Chip from '@mui/material/Chip';
import { STATUS_CHIP_COLOR, type SessionStatus } from '../../types';

export interface StatusChipProps {
  status: SessionStatus;
  size?: 'small' | 'medium';
}

/** 排程段状态徽标（4 种状态配色） */
export default function StatusChip({ status, size = 'small' }: StatusChipProps) {
  return <Chip label={status} color={STATUS_CHIP_COLOR[status]} size={size} variant={status === '待执行' ? 'outlined' : 'filled'} />;
}
