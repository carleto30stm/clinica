import React, { useEffect, useState } from 'react';
// DnD kit
import { 
  DndContext, 
  PointerSensor, 
  useSensor, 
  useSensors, 
  DragEndEvent, 
  DragStartEvent,
  DragOverlay,
  useDraggable, 
  useDroppable,
  pointerWithin,
} from '@dnd-kit/core';
import { shiftApi } from '../../api/shifts';
import { userApi } from '../../api/users';
import { QuickAssignModal } from '../../components/shifts/QuickAssignModal';
import { CreateShiftModal } from '../../components/shifts/CreateShiftModal';
import { Shift, DoctorOption, CreateShiftData } from '../../types';
import { useAuthStore } from '../../store/authStore';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';

const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

const getShiftColor = (shift: Shift, doctors: DoctorOption[]): string => {
  if (!shift.doctorId) return '#e0e0e0';
  const doctorIndex = doctors.findIndex((d) => d.id === shift.doctorId);
  const colors = ['#bbdefb', '#c8e6c9', '#fff9c4', '#ffccbc', '#d1c4e9', '#b2dfdb', '#f8bbd0', '#ffe0b2'];
  return colors[doctorIndex % colors.length];
};

const getShiftTime = (shift: Shift): string => {
  const start = new Date(shift.startDateTime);
  const end = new Date(shift.endDateTime);
  return `${format(start, 'HH:mm')} - ${format(end, 'HH:mm')}`;
};
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Chip,
  Tooltip,
  CircularProgress,
  Avatar,
  Alert,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  useMediaQuery,
  useTheme,
  Stack,
  Card,
  CardContent,
  Badge,
  Drawer,
  Skeleton,
  Snackbar,
  Fade,
} from '@mui/material';
import { Check as CheckIcon } from '@mui/icons-material';
import { getInitials, getDoctorColor } from '../../utils/helpers';
import {
  ChevronLeft as PrevIcon,
  ChevronRight as NextIcon,
  Today as TodayIcon,
  ExpandMore as ExpandMoreIcon,
  Assignment as AssignmentIcon,
  Close as CloseIcon,
  PersonAdd as PersonAddIcon,
  Add as AddIcon,
} from '@mui/icons-material';
// DnD kit imports
// DnD kit will be added later. For now, we implement a Unassigned pool + move modal as fallback.
export const MonthlyCalendar: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [doctors, setDoctors] = useState<DoctorOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterDoctor, setFilterDoctor] = useState<string>('');
  // Modal state for moving shifts (must be before any early return)
  const [moveModalOpen, setMoveModalOpen] = useState(false);
  const [shiftToMove, setShiftToMove] = useState<Shift | null>(null);
  const [moveDate, setMoveDate] = useState<string>('');
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'ADMIN';

  // Responsive design
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // State for expanded day view (mobile)
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  // State for unassigned shifts drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  
  // State for Quick Assign Modal
  const [quickAssignOpen, setQuickAssignOpen] = useState(false);
  const [quickAssignDate, setQuickAssignDate] = useState<Date | null>(null);
  
  // State for Create Shift Modal
  const [createShiftOpen, setCreateShiftOpen] = useState(false);
  const [createShiftDate, setCreateShiftDate] = useState<Date | null>(null);
  
  // Snackbar state for success/error feedback
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });
  
  // Loading state for individual operations
  const [savingShiftId, setSavingShiftId] = useState<string | null>(null);
  // Selected shift to show assigned doctors list
  const [selectedShiftDetails, setSelectedShiftDetails] = useState<Shift | null>(null);
  
  // State for active drag item (for DragOverlay)
  const [activeShift, setActiveShift] = useState<Shift | null>(null);

  // DnD sensors with activation constraint to prevent accidental drags
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Requiere mover 8px antes de activar el drag
      },
    })
  );

  

  useEffect(() => {
    loadData();
  }, [currentDate]);

  const loadData = async () => {
    setLoading(true);
    try {
      const start = startOfMonth(currentDate);
      const end = endOfMonth(currentDate);
      
      const [shiftsData, doctorsData] = await Promise.all([
        shiftApi.getAll({
          startDate: start.toISOString(),
          endDate: end.toISOString(),
        }),
        userApi.getDoctors(),
      ]);
      
      setShifts(shiftsData);
      setDoctors(doctorsData);
    } catch (err) {
      setError('Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const handleGoToToday = () => setCurrentDate(new Date());
  
  // Check if a date is today
  const isToday = (date: Date): boolean => {
    const today = new Date();
    return format(date, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');
  };
  
  // Check if current month contains today
  const isCurrentMonth = format(currentDate, 'yyyy-MM') === format(new Date(), 'yyyy-MM');

  const days = eachDayOfInterval({
    start: startOfMonth(currentDate),
    end: endOfMonth(currentDate),
  });

  const getShiftsForDay = (date: Date): Shift[] => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return shifts.filter((shift) => {
      const shiftDate = format(new Date(shift.startDateTime), 'yyyy-MM-dd');
      if (filterDoctor && shift.doctorId !== filterDoctor) return false;
      return shiftDate === dateStr;
    });
  };

  // Get shifts without doctors for the unassigned pool
  const getUnassignedShifts = (): Shift[] => {
    return shifts.filter(s => !s.doctorId).slice(0, 50);
  };

  const firstDayOfMonth = getDay(startOfMonth(currentDate));

  if (loading) {
    return (
      <Box>
        {/* Skeleton header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Skeleton variant="text" width={200} height={40} />
          <Skeleton variant="rectangular" width={300} height={40} sx={{ borderRadius: 1 }} />
        </Box>
        
        {/* Skeleton calendar */}
        <Paper sx={{ p: isMobile ? 1 : 2 }}>
          <Grid container spacing={isMobile ? 0.5 : 1}>
            {/* Day headers skeleton */}
            {dayNames.map((day) => (
              <Grid item xs={12 / 7} key={day}>
                <Skeleton variant="rectangular" height={32} sx={{ borderRadius: 1 }} />
              </Grid>
            ))}
            
            {/* Day cells skeleton */}
            {Array.from({ length: 35 }).map((_, index) => (
              <Grid item xs={12 / 7} key={index}>
                <Skeleton 
                  variant="rectangular" 
                  height={isMobile ? 60 : 120} 
                  sx={{ borderRadius: 1 }} 
                />
              </Grid>
            ))}
          </Grid>
        </Paper>
      </Box>
    );
  }

  // Modal handlers for moving shifts
  const openMoveModal = (shift: Shift) => {
    setShiftToMove(shift);
    setMoveDate(format(new Date(shift.startDateTime), 'yyyy-MM-dd'));
    setMoveModalOpen(true);
  };
  const closeMoveModal = () => {
    setMoveModalOpen(false);
    setShiftToMove(null);
    setMoveDate('');
  };

  const handleConfirmMove = async () => {
    if (!shiftToMove) return;
    setSavingShiftId(shiftToMove.id);
    const origStart = new Date(shiftToMove.startDateTime);
    const duration = new Date(shiftToMove.endDateTime).getTime() - origStart.getTime();
    const newStart = new Date(moveDate);
    newStart.setHours(origStart.getHours(), origStart.getMinutes(), 0, 0);
    const newEnd = new Date(newStart.getTime() + duration);

    const prevShifts = [...shifts];
    setShifts(prev => prev.map(s => s.id === shiftToMove.id ? { ...s, startDateTime: newStart.toISOString(), endDateTime: newEnd.toISOString() } : s));
    try {
      const updated = await shiftApi.update(shiftToMove.id, { startDateTime: newStart.toISOString(), endDateTime: newEnd.toISOString() });
      setShifts(prev => prev.map(s => s.id === shiftToMove.id ? updated : s));
      setSnackbar({ open: true, message: 'Turno movido correctamente', severity: 'success' });
      closeMoveModal();
    } catch (err: any) {
      setShifts(prevShifts);
      setSnackbar({ open: true, message: err.response?.data?.error || 'Error al mover el turno', severity: 'error' });
    } finally {
      setSavingShiftId(null);
    }
  };

  // Quick Assign Modal handlers
  const openQuickAssign = (date: Date) => {
    setQuickAssignDate(date);
    setQuickAssignOpen(true);
  };

  const closeQuickAssign = () => {
    setQuickAssignOpen(false);
    setQuickAssignDate(null);
  };

  const handleQuickAssignSave = async (updates: Array<{ shiftId: string; doctorIds: string[] }>) => {
    const updatedShifts = await shiftApi.batchAssign(updates);
    // Update local state with the updated shifts
    setShifts(prev => {
      const updatedMap = new Map(updatedShifts.map(s => [s.id, s]));
      return prev.map(s => updatedMap.get(s.id) || s);
    });
    const totalDoctors = updates.reduce((sum, u) => sum + u.doctorIds.length, 0);
    setSnackbar({ open: true, message: `${totalDoctors} médico(s) asignado(s) en ${updates.length} turno(s)`, severity: 'success' });
  };

  // Get shifts for the selected quick assign date
  const getQuickAssignShifts = (): Shift[] => {
    if (!quickAssignDate) return [];
    return getShiftsForDay(quickAssignDate);
  };

  // Create Shift Modal handlers
  const openCreateShift = (date: Date) => {
    setCreateShiftDate(date);
    setCreateShiftOpen(true);
  };

  const closeCreateShift = () => {
    setCreateShiftOpen(false);
    setCreateShiftDate(null);
  };

  const handleCreateShiftSave = async (data: CreateShiftData) => {
    try {
      const newShift = await shiftApi.create(data);
      setShifts(prev => [...prev, newShift]);
      setSnackbar({ open: true, message: 'Turno creado correctamente', severity: 'success' });
      closeCreateShift();
    } catch (err: any) {
      setSnackbar({ 
        open: true, 
        message: err.response?.data?.error || 'Error al crear el turno', 
        severity: 'error' 
      });
      throw err; // Re-throw to let modal handle loading state
    }
  };
  
  // Note: Click handlers open details via setSelectedShiftDetails directly

  // Draggable Shift component
  const ClickableShift: React.FC<{ shift: Shift }> = ({ shift }) => {
    return (
      <Chip
        label={`${format(new Date(shift.startDateTime), 'HH:mm')} ${shift.doctor?.name ? `- ${shift.doctor.name}` : '- Sin asignar'}`}
        size="small"
        sx={{ mb: 0.5, bgcolor: shift.doctorId ? getShiftColor(shift, doctors) : '#e0e0e0' }}
        onClick={() => setSelectedShiftDetails(shift)}
      />
    );
  };

  // DnD draggable component
  const DraggableShift: React.FC<{ shift: Shift }> = ({ shift }) => {
    // Use dnd-kit draggable hooks
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: `shift-${shift.id}` });
    const style = transform ? { transform: `translate(${transform.x}px, ${transform.y}px)` } : undefined;
    const isSaving = savingShiftId === shift.id;
    
    return (
      <div 
        ref={setNodeRef as any} 
        style={{ 
          ...style, 
          cursor: isDragging ? 'grabbing' : 'grab', 
          opacity: isDragging ? 0.6 : 1,
          transition: isDragging ? 'none' : 'transform 0.2s ease',
        }} 
        {...attributes} 
        {...listeners}
      >
        <Chip
          label={
            isSaving ? (
              <Box display="flex" alignItems="center" gap={0.5}>
                <CircularProgress size={12} color="inherit" />
                Guardando...
              </Box>
            ) : (
              `${format(new Date(shift.startDateTime), 'HH:mm')} ${shift.doctor?.name ? `- ${shift.doctor.name}` : '- Sin asignar'}`
            )
          }
          size="small"
          sx={{ 
            mb: 0.5, 
            bgcolor: shift.doctorId ? getShiftColor(shift, doctors) : '#e0e0e0',
            boxShadow: isDragging ? 3 : 0,
            transform: isDragging ? 'scale(1.05)' : 'scale(1)',
            transition: 'box-shadow 0.2s ease, transform 0.2s ease',
          }}
          onClick={() => setSelectedShiftDetails(shift)}
        />
      </div>
    );
  };

  // Day cell component (separate to avoid hooks in map loop)
  const DayCell: React.FC<{ day: Date; dayShifts: Shift[]; isWeekend: boolean }> = ({ day, dayShifts, isWeekend }) => {
    const { setNodeRef: setDroppableRef, isOver: isOverDrop } = useDroppable({ id: `day-${format(day, 'yyyy-MM-dd')}` });
    const dayKey = format(day, 'yyyy-MM-dd');
    const isTodayCell = isToday(day);
    const isExpanded = expandedDay === dayKey;
    const shiftsToShow = isMobile ? (isExpanded ? dayShifts : dayShifts.slice(0, 2)) : dayShifts.slice(0, 3);
    const hasMore = isMobile ? dayShifts.length > 2 && !isExpanded : dayShifts.length > 3;
    
    const handleCellClick = () => {
      // On mobile, expand/collapse. On desktop, single click does nothing special
      if (isMobile && dayShifts.length > 2) {
        setExpandedDay(isExpanded ? null : dayKey);
      }
    };
    
    const handleCellDoubleClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (isAdmin && dayShifts.length > 0) {
        openQuickAssign(day);
      }
    };
    
    return (
      <Grid item xs={isMobile ? 12/7 : 12 / 7} key={day.toISOString()}>
        <Fade in timeout={300}>
        <Box
          sx={{
            minHeight: isMobile ? 60 : 120,
            border: isOverDrop ? '2px dashed' : isTodayCell ? '2px solid' : '1px solid',
            borderColor: isOverDrop ? 'primary.main' : isTodayCell ? 'primary.main' : isWeekend ? 'error.light' : 'divider',
            borderRadius: 1,
            p: 0.5,
            bgcolor: isOverDrop ? 'primary.50' : isTodayCell ? 'primary.50' : isWeekend ? 'error.50' : 'background.paper',
            boxShadow: isOverDrop ? 'inset 0 0 8px rgba(25,118,210,0.3)' : isTodayCell ? 2 : undefined,
            cursor: isAdmin && dayShifts.length > 0 ? 'pointer' : (isMobile && dayShifts.length > 0 ? 'pointer' : 'default'),
            transition: 'all 0.2s ease',
            transform: isOverDrop ? 'scale(1.02)' : 'scale(1)',
            position: 'relative',
            '&:hover': {
              bgcolor: isTodayCell ? 'primary.100' : isWeekend ? 'error.100' : 'grey.50',
            },
          }}
          ref={setDroppableRef}
          onClick={handleCellClick}
          onDoubleClick={handleCellDoubleClick}
        >
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography
              variant={isMobile ? 'caption' : 'subtitle2'}
              sx={{
                fontWeight: isTodayCell ? 'bold' : 'medium',
                bgcolor: isTodayCell ? 'primary.main' : undefined,
                color: isTodayCell ? 'white' : isWeekend ? 'error.main' : 'text.primary',
                borderRadius: isTodayCell ? '50%' : undefined,
                width: isTodayCell ? 24 : undefined,
                height: isTodayCell ? 24 : undefined,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {format(day, 'd')}
            </Typography>
            {dayShifts.length > 0 && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Badge badgeContent={dayShifts.length} color="primary" sx={{ display: isMobile ? 'flex' : 'none' }} />
                {/* Quick assign button - visible on hover (desktop) or always on mobile */}
                {isAdmin && dayShifts.length > 0 && (
                  <Tooltip title="Asignar médicos">
                    <IconButton 
                      size="small" 
                      onClick={(e) => { e.stopPropagation(); openQuickAssign(day); }}
                      sx={{ 
                        p: 0.25,
                        opacity: isMobile ? 1 : 0,
                        transition: 'opacity 0.2s',
                        '.MuiBox-root:hover &': { opacity: 1 },
                      }}
                    >
                      <PersonAddIcon sx={{ fontSize: isMobile ? 14 : 16 }} color="primary" />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
            )}
            {/* Create shift button - always visible for admins */}
            {isAdmin && (
              <Tooltip title="Crear turno">
                <IconButton 
                  size="small" 
                  onClick={(e) => { e.stopPropagation(); openCreateShift(day); }}
                  sx={{ 
                    p: 0.25,
                    opacity: isMobile ? 1 : 0,
                    transition: 'opacity 0.2s',
                    '.MuiBox-root:hover &': { opacity: 1 },
                  }}
                >
                  <AddIcon sx={{ fontSize: isMobile ? 14 : 16 }} color="success" />
                </IconButton>
              </Tooltip>
            )}
          </Box>
          <Box sx={{ mt: 0.5 }}>
            {shiftsToShow.map((shift) => (
              <Tooltip
                key={shift.id}
                title={`${shift.doctors && shift.doctors.length > 0 ? shift.doctors.map(d => d.doctor.name).join(', ') : (shift.doctor?.name || 'Sin asignar')} - ${getShiftTime(shift)}`}
              >
                <div>
                  {isAdmin && !isMobile ? (
                    <DraggableShift shift={shift} />
                  ) : (
                    <ClickableShift shift={shift} />
                  )}
                </div>
              </Tooltip>
            ))}
            {hasMore && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center' }}>
                +{dayShifts.length - (isMobile ? 2 : 3)} más
              </Typography>
            )}
          </Box>
        </Box>
        </Fade>
      </Grid>
    );
  };

    const closeShiftDetails = () => setSelectedShiftDetails(null);

  return (
    <React.Fragment>
    <Box>
      {/* Header - Responsive */}
      <Box 
        display="flex" 
        flexDirection={isMobile ? 'column' : 'row'}
        justifyContent="space-between" 
        alignItems={isMobile ? 'stretch' : 'center'} 
        gap={2}
        mb={3}
      >
        <Typography variant={isMobile ? 'h5' : 'h4'}>Calendario Mensual</Typography>
        
        {/* Navigation and filters */}
        <Stack direction={isMobile ? 'column' : 'row'} spacing={2} alignItems="center">
          {/* Doctor filter - hidden on mobile, shown in a simpler way */}
          {!isMobile && (
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Filtrar por médico</InputLabel>
              <Select
                value={filterDoctor}
                label="Filtrar por médico"
                onChange={(e) => setFilterDoctor(e.target.value)}
              >
                <MenuItem value="">Todos</MenuItem>
                {doctors.map((doctor) => (
                  <MenuItem key={doctor.id} value={doctor.id}>
                    {doctor.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
          
          {/* Month navigation */}
          <Box display="flex" alignItems="center" justifyContent="center">
            <IconButton onClick={handlePrevMonth} size={isMobile ? 'small' : 'medium'}>
              <PrevIcon />
            </IconButton>
            
            {/* Today button */}
            {!isCurrentMonth && (
              <Tooltip title="Ir a hoy">
                <IconButton onClick={handleGoToToday} color="primary" size={isMobile ? 'small' : 'medium'}>
                  <TodayIcon />
                </IconButton>
              </Tooltip>
            )}
            
            <Typography 
              variant={isMobile ? 'body1' : 'h6'} 
              sx={{ 
                mx: 1, 
                minWidth: isMobile ? 120 : 180, 
                textAlign: 'center',
                fontWeight: 'medium',
                textTransform: 'capitalize',
              }}
            >
              {format(currentDate, isMobile ? 'MMM yyyy' : 'MMMM yyyy', { locale: es })}
            </Typography>
            <IconButton onClick={handleNextMonth} size={isMobile ? 'small' : 'medium'}>
              <NextIcon />
            </IconButton>
          </Box>
          
          {/* Unassigned shifts button for mobile */}
          {isMobile && isAdmin && (
            <Button
              variant="outlined"
              startIcon={
                <Badge badgeContent={getUnassignedShifts().length} color="warning">
                  <AssignmentIcon />
                </Badge>
              }
              onClick={() => setDrawerOpen(true)}
              size="small"
              fullWidth
            >
              Turnos sin asignar
            </Button>
          )}

          {/* Desktop: open unassigned shifts drawer */}
          {!isMobile && isAdmin && (
            <IconButton onClick={() => setDrawerOpen(true)} size={isMobile ? 'small' : 'medium'} color="primary">
              <Badge badgeContent={getUnassignedShifts().length} color="warning">
                <AssignmentIcon />
              </Badge>
            </IconButton>
          )}
        </Stack>
      </Box>
      
      {/* Mobile filter */}
      {isMobile && (
        <FormControl size="small" fullWidth sx={{ mb: 2 }}>
          <InputLabel>Filtrar por médico</InputLabel>
          <Select
            value={filterDoctor}
            label="Filtrar por médico"
            onChange={(e) => setFilterDoctor(e.target.value)}
          >
            <MenuItem value="">Todos</MenuItem>
            {doctors.map((doctor) => (
              <MenuItem key={doctor.id} value={doctor.id}>
                {doctor.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}
      
      {/* Desktop: Unassigned shifts panel - now available via Drawer on the right */}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={(event: DragStartEvent) => {
          const activeId = event.active.id as string;
          if (activeId?.startsWith('shift-')) {
            const shiftId = activeId.replace('shift-', '');
            const shift = shifts.find(s => s.id === shiftId);
            setActiveShift(shift || null);
          }
        }}
        onDragEnd={(event: DragEndEvent) => {
          setActiveShift(null);
          const { active, over } = event;
          if (!over) return;
          const activeId = active.id as string;
          const overId = over.id as string;
          if (!activeId?.startsWith('shift-') || !overId?.startsWith('day-')) return;
          const shiftId = activeId.replace('shift-', '');
          const dayStr = overId.replace('day-', '');
          const shift = shifts.find(s => s.id === shiftId);
          if (!shift) return;
          
          // Check if dropping on same day - skip if no change
          const currentDayStr = format(new Date(shift.startDateTime), 'yyyy-MM-dd');
          if (currentDayStr === dayStr) return;
          
          // Set saving state
          setSavingShiftId(shift.id);
          
          // Move shift to date dayStr
          const prevShifts = [...shifts];
          const origStart = new Date(shift.startDateTime);
          const duration = new Date(shift.endDateTime).getTime() - origStart.getTime();
          const newStart = new Date(dayStr);
          newStart.setHours(origStart.getHours(), origStart.getMinutes(), 0, 0);
          const newEnd = new Date(newStart.getTime() + duration);
          setShifts(prev => prev.map(s => s.id === shift.id ? { ...s, startDateTime: newStart.toISOString(), endDateTime: newEnd.toISOString() } : s));
          shiftApi.update(shift.id, { startDateTime: newStart.toISOString(), endDateTime: newEnd.toISOString() }).then((updated) => {
            setShifts(prev => prev.map(s => s.id === updated.id ? updated : s));
            setSnackbar({ open: true, message: 'Turno movido correctamente', severity: 'success' });
          }).catch((err) => {
            setShifts(prevShifts);
            setSnackbar({ open: true, message: err.response?.data?.error || 'Error al mover el turno', severity: 'error' });
          }).finally(() => {
            setSavingShiftId(null);
          });
        }}
        onDragCancel={() => setActiveShift(null)}
      >
      <Paper sx={{ p: isMobile ? 1 : 2 }}>
        <Grid container spacing={isMobile ? 0.5 : 1}>
          {/* Day headers */}
          {dayNames.map((day, index) => (
            <Grid item xs={12 / 7} key={day}>
              <Box
                sx={{
                  textAlign: 'center',
                  fontWeight: 'bold',
                  py: isMobile ? 0.5 : 1,
                  fontSize: isMobile ? '0.7rem' : 'inherit',
                  bgcolor: index === 0 || index === 6 ? 'error.light' : 'primary.light',
                  color: 'white',
                  borderRadius: 1,
                }}
              >
                {isMobile ? day.charAt(0) : day}
              </Box>
            </Grid>
          ))}

          {/* Empty cells for days before first of month */}
          {Array.from({ length: firstDayOfMonth }).map((_, index) => (
            <Grid item xs={12 / 7} key={`empty-${index}`}>
              <Box sx={{ minHeight: isMobile ? 60 : 120 }} />
            </Grid>
          ))}

          {/* Calendar days */}
          {days.map((day) => {
            const dayShifts = getShiftsForDay(day);
            const isWeekend = getDay(day) === 0 || getDay(day) === 6;
            return <DayCell key={day.toISOString()} day={day} dayShifts={dayShifts} isWeekend={isWeekend} />;
          })}
        </Grid>
      </Paper>
      
      {/* DragOverlay - muestra el elemento siendo arrastrado */}
      <DragOverlay dropAnimation={null}>
        {activeShift ? (
          <Chip
            label={`${format(new Date(activeShift.startDateTime), 'HH:mm')} ${activeShift.doctor?.name ? `- ${activeShift.doctor.name}` : '- Sin asignar'}`}
            size="small"
            sx={{ 
              bgcolor: activeShift.doctorId ? getShiftColor(activeShift, doctors) : '#e0e0e0',
              boxShadow: 4,
              cursor: 'grabbing',
            }}
          />
        ) : null}
      </DragOverlay>
      </DndContext>

      {/* Legend - hide on mobile */}
      {!isMobile && (
        <Box mt={2} display="flex" gap={2} flexWrap="wrap">
          {doctors.map((doctor, index) => {
            const colors = ['#bbdefb', '#c8e6c9', '#fff9c4', '#ffccbc', '#d1c4e9', '#b2dfdb', '#f8bbd0', '#ffe0b2'];
            return (
              <Chip
                key={doctor.id}
                label={doctor.name}
                sx={{ bgcolor: colors[index % colors.length] }}
              />
            );
          })}
          <Chip label="Disponible" sx={{ bgcolor: '#e0e0e0' }} />
        </Box>
      )}
      
      {/* Drawer for unassigned shifts (mobile bottom, desktop right) */}
      <Drawer
        anchor={isMobile ? 'bottom' : 'right'}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{
          sx: isMobile ? { maxHeight: '70vh', borderTopLeftRadius: 16, borderTopRightRadius: 16 } : { width: 360 },
        }}
      >
        <Box sx={{ p: 2 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6">Turnos sin asignar</Typography>
            <IconButton onClick={() => setDrawerOpen(false)}>
              {isMobile ? <ExpandMoreIcon /> : <CloseIcon />}
            </IconButton>
          </Box>
          <Box sx={{ maxHeight: '50vh', overflow: 'auto' }}>
            {getUnassignedShifts().map((shift) => (
              <Card key={shift.id} sx={{ mb: 1 }} variant="outlined">
                <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
                  <Typography variant="body2" fontWeight="medium">
                    {format(new Date(shift.startDateTime), 'EEEE d MMM', { locale: es })}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {getShiftTime(shift)}
                  </Typography>
                  <Box mt={1}>
                    <Button 
                      size="small" 
                      variant="outlined" 
                      onClick={() => {
                        openMoveModal(shift);
                        setDrawerOpen(false);
                      }}
                    >
                      Asignar fecha
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            ))}
            {getUnassignedShifts().length === 0 && (
              <Typography variant="body2" color="text.secondary" textAlign="center" py={4}>
                No hay turnos sin asignar
              </Typography>
            )}
          </Box>
        </Box>
      </Drawer>
      {/* Move Shift Modal */}
      <Dialog open={moveModalOpen} onClose={closeMoveModal} maxWidth="xs" fullWidth>
        <DialogTitle>Mover Turno</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              label="Nueva fecha"
              type="date"
              value={moveDate}
              onChange={(e) => setMoveDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
          </Box>
        </DialogContent>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, p: 2 }}>
          <Button onClick={closeMoveModal} disabled={!!savingShiftId}>Cancelar</Button>
          <Button 
            variant="contained" 
            onClick={handleConfirmMove}
            disabled={!!savingShiftId}
            startIcon={savingShiftId ? <CircularProgress size={16} color="inherit" /> : null}
          >
            {savingShiftId ? 'Guardando...' : 'Confirmar'}
          </Button>
        </Box>
      </Dialog>
      
      {/* Snackbar for feedback */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))} 
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
          icon={snackbar.severity === 'success' ? <CheckIcon /> : undefined}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
      
      {/* Quick Assign Modal */}
      <QuickAssignModal
        open={quickAssignOpen}
        onClose={closeQuickAssign}
        date={quickAssignDate}
        shifts={getQuickAssignShifts()}
        doctors={doctors}
        onSave={handleQuickAssignSave}
      />
      
      {/* Create Shift Modal */}
            <Dialog open={!!selectedShiftDetails} onClose={closeShiftDetails} fullWidth maxWidth="xs">
              <DialogTitle>Médicos asignados</DialogTitle>
              <DialogContent>
                {selectedShiftDetails ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1 }}>
                    {selectedShiftDetails.doctors && selectedShiftDetails.doctors.length > 0 ? (
                      selectedShiftDetails.doctors.map((assignment) => (
                        <Box key={assignment.doctor.id} display="flex" alignItems="center" gap={1}>
                          <Avatar sx={{ bgcolor: getDoctorColor(assignment.doctor.id), width: 32, height: 32 }}>
                            {getInitials(assignment.doctor.name)}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight="medium">{assignment.doctor.name}</Typography>
                            {assignment.doctor.specialty && (
                              <Typography variant="caption" color="text.secondary">{assignment.doctor.specialty}</Typography>
                            )}
                          </Box>
                          <Box sx={{ ml: 'auto' }}>
                            {assignment.isSelfAssigned && (
                              <Chip label="Auto-asignado" size="small" variant="outlined" />
                            )}
                          </Box>
                        </Box>
                      ))
                    ) : selectedShiftDetails.doctor ? (
                      <Box display="flex" alignItems="center" gap={1}>
                        <Avatar sx={{ bgcolor: getDoctorColor(selectedShiftDetails.doctor.id), width: 32, height: 32 }}>
                          {getInitials(selectedShiftDetails.doctor.name)}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight="medium">{selectedShiftDetails.doctor.name}</Typography>
                          {selectedShiftDetails.doctor.specialty && (
                            <Typography variant="caption" color="text.secondary">{selectedShiftDetails.doctor.specialty}</Typography>
                          )}
                        </Box>
                      </Box>
                    ) : (
                      <Typography variant="body2">No hay médicos asignados a este turno</Typography>
                    )}
                  </Box>
                ) : null}
              </DialogContent>
            </Dialog>
      <CreateShiftModal
        open={createShiftOpen}
        onClose={closeCreateShift}
        date={createShiftDate}
        doctors={doctors}
        onSave={handleCreateShiftSave}
      />
    </Box>
    </React.Fragment>
  );
};

export default MonthlyCalendar;
