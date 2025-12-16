import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar,
  Box,
  CssBaseline,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Avatar,
  Menu,
  MenuItem,
  Collapse,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  CalendarMonth as CalendarIcon,
  Assignment as AssignmentIcon,
  Weekend as WeekendIcon,
  EventAvailable as AvailableIcon,
  Logout as LogoutIcon,
  Person as PersonIcon,
  Event as EventIcon,
  AutoAwesome as GenerateIcon,
  AttachMoney as RatesIcon,
  Discount as DiscountIcon,
  Work as WorkIcon,
  ExpandLess as ExpandLessIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';
import { useAuthStore } from '../../store/authStore';

const drawerWidth = 260;

interface NavItem {
  text: string;
  icon: React.ReactNode;
  path: string;
  role?: 'ADMIN' | 'DOCTOR';
}

const adminNavItems: NavItem[] = [
  { text: 'Dashboard', icon: <DashboardIcon />, path: '/admin' },
  { text: 'Calendario Mensual', icon: <CalendarIcon />, path: '/admin/calendar' },
  // 'Turnos' and 'Médicos' groups are rendered below as collapsible sections
];

const adminDoctGroup: NavItem[] = [
  { text: 'Gestión de Médicos', icon: <PeopleIcon />, path: '/admin/doctors' },
  { text: 'Tarifas por Hora', icon: <RatesIcon />, path: '/admin/rates' },
  { text: 'Descuentos', icon: <DiscountIcon />, path: '/admin/discounts' },
  { text: 'Horas Externas', icon: <WorkIcon />, path: '/admin/external-hours' },
]

const adminTurnosGroup: NavItem[] = [
  { text: 'Gestión de Turnos', icon: <AssignmentIcon />, path: '/admin/shifts' },
  { text: 'Generar Turnos', icon: <GenerateIcon />, path: '/admin/shifts/generate' },
  { text: 'Feriados', icon: <EventIcon />, path: '/admin/holidays' },
  { text: 'Fines de Semana', icon: <WeekendIcon />, path: '/admin/weekends' },
];

const doctorNavItems: NavItem[] = [
  { text: 'Mis Turnos', icon: <CalendarIcon />, path: '/doctor' },
  { text: 'Turnos Disponibles', icon: <AvailableIcon />, path: '/doctor/available' },
  { text: 'Mi Calendario', icon: <CalendarIcon />, path: '/doctor/calendar' },
  { text: 'Mis Horas Externas', icon: <WorkIcon />, path: '/doctor/external-hours' },
  { text: 'Calendario General', icon: <PeopleIcon />, path: '/doctor/general-calendar' },
];

export const MainLayout: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const location = useLocation();
  
  const { user, logout } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [turnosOpen, setTurnosOpen] = useState(true);
  const [doctOpen, setDoctOpen] = useState(true);

  const navItems = user?.role === 'ADMIN' ? adminNavItems : doctorNavItems;
  const turnosItems = user?.role === 'ADMIN' ? adminTurnosGroup : [];
  const doctItems = user?.role === 'ADMIN' ? adminDoctGroup : [];

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleNavClick = (path: string) => {
    navigate(path);
    if (isMobile) {
      setMobileOpen(false);
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    handleMenuClose();
    await logout();
    navigate('/login');
  };

  const getActiveTitle = () => {
    const active = navItems.find((item) => location.pathname.startsWith(item.path));
    if (active) return active.text;
    const activeSubDoct = doctItems.find((item) => location.pathname.startsWith(item.path));
    if (activeSubDoct) return activeSubDoct.text;
    const activeSub = turnosItems.find((item) => location.pathname.startsWith(item.path));
    if (activeSub) return activeSub.text;
    return 'Sistema de Turnos';
  };

  const drawer = (
    <Box>
      <Toolbar sx={{ justifyContent: 'center' }}>
        <Typography variant="h6" noWrap component="div" color="primary">
          Clínica
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {navItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              selected={location.pathname === item.path}
              onClick={() => handleNavClick(item.path)}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
        {doctItems.length > 0 && (
          <>
            <ListItem disablePadding>
              <ListItemButton onClick={() => setDoctOpen(!doctOpen)}>
                <ListItemIcon>
                  <PeopleIcon />
                </ListItemIcon>
                <ListItemText primary="Médicos" />
                {doctOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </ListItemButton>
            </ListItem>
            <Collapse in={doctOpen} timeout="auto" unmountOnExit>
              <List component="div" disablePadding>
                {doctItems.map((sub) => (
                  <ListItem key={sub.text} sx={{ pl: 4 }} disablePadding>
                    <ListItemButton
                      selected={location.pathname === sub.path}
                      onClick={() => handleNavClick(sub.path)}
                    >
                      <ListItemIcon>{sub.icon}</ListItemIcon>
                      <ListItemText primary={sub.text} />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            </Collapse>
          </>
        )}
        {turnosItems.length > 0 && (
          <>
            <ListItem disablePadding>
              <ListItemButton onClick={() => setTurnosOpen(!turnosOpen)}>
                <ListItemIcon>
                  <AssignmentIcon />
                </ListItemIcon>
                <ListItemText primary="Turnos" />
                {turnosOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </ListItemButton>
            </ListItem>
            <Collapse in={turnosOpen} timeout="auto" unmountOnExit>
              <List component="div" disablePadding>
                {turnosItems.map((sub) => (
                  <ListItem key={sub.text} sx={{ pl: 4 }} disablePadding>
                    <ListItemButton
                      selected={location.pathname === sub.path}
                      onClick={() => handleNavClick(sub.path)}
                    >
                      <ListItemIcon>{sub.icon}</ListItemIcon>
                      <ListItemText primary={sub.text} />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            </Collapse>
          </>
        )}

      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="abrir menú"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            {getActiveTitle()}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" sx={{ display: { xs: 'none', sm: 'block' } }}>
              {user?.name}
            </Typography>
            <IconButton onClick={handleMenuOpen} color="inherit">
              <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main' }}>
                {user?.name?.charAt(0).toUpperCase()}
              </Avatar>
            </IconButton>
          </Box>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            onClick={handleMenuClose}
          >
            <MenuItem disabled>
              <ListItemIcon>
                <PersonIcon fontSize="small" />
              </ListItemIcon>
              {user?.role === 'ADMIN' ? 'Administrador' : 'Médico'}
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleLogout}>
              <ListItemIcon>
                <LogoutIcon fontSize="small" />
              </ListItemIcon>
              Cerrar Sesión
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          mt: 8,
          minHeight: '100vh',
          bgcolor: 'background.default',
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
};

export default MainLayout;
