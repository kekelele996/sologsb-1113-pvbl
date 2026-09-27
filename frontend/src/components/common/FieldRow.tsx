import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

export interface FieldRowProps {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  /** 标签宽度 */
  labelWidth?: number;
  children: ReactNode;
}

/** 统一排版的表单行：标签 + 必填星号 + 错误/提示文案 */
export default function FieldRow({ label, required, error, hint, labelWidth = 132, children }: FieldRowProps) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 1.5 }}>
      <Box sx={{ width: labelWidth, pt: 1, flexShrink: 0, textAlign: 'right' }}>
        <Typography variant="body2" color="text.secondary" component="span">
          {label}
          {required ? (
            <Typography component="span" color="error" sx={{ ml: 0.5 }}>
              *
            </Typography>
          ) : null}
        </Typography>
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        {children}
        {error ? (
          <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.5 }}>
            {error}
          </Typography>
        ) : hint ? (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
            {hint}
          </Typography>
        ) : null}
      </Box>
    </Box>
  );
}
