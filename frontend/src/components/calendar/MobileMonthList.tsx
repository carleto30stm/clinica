import React from 'react';
import { Box } from '@mui/material';
import MobileDayCard from './MobileDayCard';
import { Shift } from '../../types';
import { format } from 'date-fns';

interface Props {
  days: Date[];
  shifts: Shift[];
  onOpenDayDetails: (date: Date) => void;
  onQuickAssign?: (shift: Shift) => void;
  onCreateShift?: (date: Date) => void;
}

export const MobileMonthList: React.FC<Props> = ({ days, shifts, onOpenDayDetails, onQuickAssign, onCreateShift }) => {
  const getShiftsForDay = (d: Date) => shifts.filter(s => format(new Date(s.startDateTime), 'yyyy-MM-dd') === format(d, 'yyyy-MM-dd'));

  return (
    <Box>
      {days.map((d) => {
        const dayShifts = getShiftsForDay(d);
        const assignedCount = dayShifts.reduce((acc, s) => acc + (s.doctors?.length || (s.doctorId ? 1 : 0)), 0);
        const required = dayShifts.length > 0 ? (dayShifts[0].requiredDoctors || 1) : 1;

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
          />
        );
      })}
    </Box>
  );
};

export default MobileMonthList;
