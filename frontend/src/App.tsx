import { useState } from 'react';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CssBaseline from '@mui/material/CssBaseline';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import { Link as RouterLink, Outlet, useLocation } from 'react-router-dom';
import { buildNightPlanText, downloadText } from './utils/export';
import { usePersistentStore } from './hooks/usePersistentStore';
import { useNightStore } from './stores/nightStore';
import { useSessionStore } from './stores/sessionStore';
import { useTargetStore } from './stores/targetStore';
import { useEquipmentStore } from './stores/equipmentStore';

const DRAWER_WIDTH = 224;

const NAV_ITEMS = [
  { path: '/', label: '本夜编排总览' },
  { path: '/targets', label: '观测目标库' },
  { path: '/sessions', label: '排程段与冲突' },
  { path: '/equipment', label: '设备分配视图' },
  { path: '/export', label: '导出观测清单' },
];

/** 应用外壳：左侧导航 + 顶栏快捷导出，负责数据装载就绪判定 */
export default function App() {
  const location = useLocation();
  const { ready, error } = usePersistentStore();
  const nights = useNightStore((s) => s.nights);
  const currentNightId = useNightStore((s) => s.currentNightId);
  const sessions = useSessionStore((s) => s.sessions);
  const targets = useTargetStore((s) => s.targets);
  const telescopes = useEquipmentStore((s) => s.telescopes);
  const instruments = useEquipmentStore((s) => s.instruments);
  const [toast, setToast] = useState(false);

  const night = nights.find((item) => item.id === currentNightId) ?? nights[0];

  const quickExport = () => {
    const text = buildNightPlanText({
      night,
      sessions: sessions.filter((session) => session.nightId === night?.id),
      targets,
      telescopes,
      instruments,
    });
    downloadText(`观测清单-${night?.date ?? 'night'}.txt`, text);
    setToast(true);
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <CssBaseline />
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }} elevation={1}>
        <Toolbar variant="dense">
          <Typography variant="h6" sx={{ flexGrow: 1, fontSize: 17 }}>
            天文观测计划编排台
          </Typography>
          <Chip size="small" sx={{ mr: 1.5, color: '#fff', borderColor: 'rgba(255,255,255,.6)' }} variant="outlined" label={night ? `当前观测夜 ${night.date}` : '未选择观测夜'} />
          <Button color="inherit" onClick={quickExport}>
            快捷导出
          </Button>
        </Toolbar>
      </AppBar>

      <Drawer
        variant="permanent"
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box', bgcolor: '#141a2e', color: '#e8ebf5' },
        }}
      >
        <Toolbar variant="dense" />
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography variant="subtitle2" sx={{ color: '#fff' }}>
            观测夜编排
          </Typography>
          <Typography variant="caption" sx={{ color: '#9aa4c4' }}>
            gbobsplan · 纯前端本地存储
          </Typography>
        </Box>
        <List dense>
          {NAV_ITEMS.map((item) => (
            <ListItemButton
              key={item.path}
              component={RouterLink}
              to={item.path}
              selected={item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path)}
              sx={{
                '&.Mui-selected': { bgcolor: 'rgba(124,140,255,.24)', color: '#fff' },
                '&.Mui-selected:hover': { bgcolor: 'rgba(124,140,255,.32)' },
              }}
            >
              <ListItemText primary={item.label} primaryTypographyProps={{ fontSize: 14 }} />
            </ListItemButton>
          ))}
        </List>
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, p: 3, bgcolor: '#f5f6fa', minHeight: '100vh' }}>
        <Toolbar variant="dense" />
        {error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            本地数据装载失败：{error}
          </Alert>
        ) : null}
        {ready ? (
          <Outlet />
        ) : (
          <Box sx={{ p: 6, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              正在装载本地观测计划数据…
            </Typography>
          </Box>
        )}
        <Box sx={{ mt: 4, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <Typography variant="caption" color="text.secondary">
            数据保存在浏览器 IndexedDB（gbobsplan-db），不使用数据库服务、不挂载命名卷
          </Typography>
        </Box>
      </Box>

      <Snackbar open={toast} autoHideDuration={2400} onClose={() => setToast(false)} message="已导出当晚观测清单文本" />
    </Box>
  );
}
