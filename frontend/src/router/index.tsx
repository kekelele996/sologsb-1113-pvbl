import type { RouteObject } from 'react-router-dom';
import { Box, Button, Typography } from '@mui/material';
import App from '../App';
import OverviewPage from '../pages/OverviewPage';
import TargetsPage from '../pages/TargetsPage';
import SessionsPage from '../pages/SessionsPage';
import EquipmentPage from '../pages/EquipmentPage';
import ExportPage from '../pages/ExportPage';

function NotFound() {
  return (
    <Box sx={{ p: 4, textAlign: 'center' }}>
      <Typography variant="h5" sx={{ mb: 1 }}>
        页面不存在
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        请从左侧导航进入天文观测计划编排台的各功能页
      </Typography>
      <Button variant="contained" href="/">
        返回本夜编排总览
      </Button>
    </Box>
  );
}

/** 全部路由：编排总览 + 目标库 / 排程段 / 设备分配 / 导出 */
export const routes: RouteObject[] = [
  {
    path: '/',
    element: <App />,
    children: [
      { index: true, element: <OverviewPage /> },
      { path: 'targets', element: <TargetsPage /> },
      { path: 'sessions', element: <SessionsPage /> },
      { path: 'equipment', element: <EquipmentPage /> },
      { path: 'export', element: <ExportPage /> },
      { path: '*', element: <NotFound /> },
    ],
  },
];

export default routes;
