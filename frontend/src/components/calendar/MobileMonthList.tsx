import React from 'react';
import { Box } from '@mui/material';
import MobileDayCard from './MobileDayCard';
import { Shift } from '../../types';
import { format } from 'date-fns';
import { useHolidays } from '../../hooks/useHolidays';
import { parseArgentinaDate } from '../../utils/dateHelpers';

interface Props {
  days: Date[];
  shifts: Shift[];
  onOpenDayDetails: (date: Date) => void;
  onQuickAssign?: (shift: Shift) => void;
  onCreateShift?: (date: Date) => void;
}

export const MobileMonthList: React.FC<Props> = ({ days, shifts, onOpenDayDetails, onQuickAssign, onCreateShift }) => {
  const getShiftsForDay = (d: Date) => shifts.filter(s => format(new Date(s.startDateTime), 'yyyy-MM-dd') === format(d, 'yyyy-MM-dd'));

  // Load holidays for the month (use year of first day)
  const year = days.length > 0 ? days[0].getFullYear() : new Date().getFullYear();
  const { data: holidays = [] } = useHolidays({ year });
  const isHolidayDate = (date: Date) => {
    return holidays.find((h: any) => {
      const hd = parseArgentinaDate(h.date);
      if (h.isRecurrent) return hd.getMonth() === date.getMonth() && hd.getDate() === date.getDate();
      return hd.getFullYear() === date.getFullYear() && hd.getMonth() === date.getMonth() && hd.getDate() === date.getDate();
    });
  };

  return (
    <Box>
      {days.map((d) => {
        const dayShifts = getShiftsForDay(d);
        const assignedCount = dayShifts.reduce((acc, s) => acc + (s.doctors?.length || (s.doctorId ? 1 : 0)), 0);
        const required = dayShifts.length > 0 ? (dayShifts[0].requiredDoctors || 1) : 1;
        const holiday = isHolidayDate(d);

        return (
          <MobileDayCard
            key={format(d, 'yyyy-MM-dd')}
            date={d}
            shifts={dayShifts}
            assignedCount={assignedCount}
            requiredDoctors={required}
            onOpenDetails={onOpenDayDetails}
            onQuickAssign={onQuickAssign}
            onCreateShift={onCreateShift}
            holidayName={holiday?.name}
          />
        );
      })}
    </Box>
  );
};

export default MobileMonthList;
