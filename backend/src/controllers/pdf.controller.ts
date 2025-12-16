import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import PDFDocument from 'pdfkit';
import { startOfMonth, endOfMonth, eachDayOfInterval, getDay, format as dfFormat } from 'date-fns';

export const generateSchedulePdf = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { year, month } = req.query;
    const targetYear = year ? parseInt(year as string) : new Date().getFullYear();
    const targetMonth = month ? parseInt(month as string) - 1 : new Date().getMonth();

    const start = startOfMonth(new Date(targetYear, targetMonth, 1));
    const end = endOfMonth(new Date(targetYear, targetMonth, 1));

    const shifts = await prisma.shift.findMany({
      where: {
        startDateTime: {
          gte: start,
          lte: end,
        },
      },
      include: {
        doctors: {
          include: {
            doctor: { select: { id: true, name: true, specialty: true } }
          }
        },
        doctor: { select: { id: true, name: true, specialty: true } },
        holiday: true,
      },
      orderBy: { startDateTime: 'asc' },
    });

    // Create PDF document (landscape for more horizontal space)
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 36 });

    const fileName = `cronograma-${targetYear}-${String(targetMonth + 1).padStart(2, '0')}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    doc.pipe(res);

    // Header
    doc.fontSize(18).text('Cronograma Mensual - Clínica', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(12).text(`Mes: ${targetMonth + 1} / Año: ${targetYear}`, { align: 'center' });
    doc.moveDown(1);

    // Weekly timetable rendering (left column: time slots; right columns: days of week)

    // Precompute shifts map by day string yyyy-MM-dd (UTC)
        // Helper to split a text into lines that fit width using doc.widthOfString
        const splitTextByWidth = (text: string, maxWidth: number) => {
          const words = text.split(' ');
          const lines: string[] = [];
          let current = '';
          for (const w of words) {
            const candidate = current ? current + ' ' + w : w;
            if (doc.widthOfString(candidate) <= maxWidth) {
              current = candidate;
            } else {
              if (current) lines.push(current);
              // if single word longer than maxWidth, split by characters
              if (doc.widthOfString(w) > maxWidth) {
                let acc = '';
                for (const ch of w) {
                  const cand2 = acc + ch;
                  if (doc.widthOfString(cand2) <= maxWidth) {
                    acc = cand2;
                  } else {
                    if (acc) lines.push(acc);
                    acc = ch;
                  }
                }
                if (acc) current = acc; else current = '';
              } else {
                current = w;
              }
            }
          }
          if (current) lines.push(current);
          return lines;
        };
    const shiftsByDay = new Map<string, any[]>();
    for (const s of shifts) {
      const d = new Date(s.startDateTime);
      const key = dfFormat(d, 'yyyy-MM-dd');
      const list = shiftsByDay.get(key) || [];
      list.push(s);
      shiftsByDay.set(key, list);
    }

    // Weekly tables with time slots column on the left
    const days = eachDayOfInterval({ start, end });
    const weeks: (Date | null)[][] = [];
    let weekRow: (Date | null)[] = [];
    const firstWeekday = getDay(days[0]);
    for (let i = 0; i < firstWeekday; i++) weekRow.push(null);
    for (const d of days) {
      weekRow.push(d);
      if (weekRow.length === 7) {
        weeks.push(weekRow);
        weekRow = [];
      }
    }
    if (weekRow.length > 0) {
      while (weekRow.length < 7) weekRow.push(null);
      weeks.push(weekRow);
    }

    const contentWidthX = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const timeColWidth = Math.floor(contentWidthX * 0.18);
    const dayColWidth = Math.floor((contentWidthX - timeColWidth) / 7);
    const tableRowHeight = 44; // increase row height to avoid overcrowding
    const timeSlots = [
      { label: '09:00-15:00', start: 9, end: 15 },
      { label: '15:00-21:00', start: 15, end: 21 },
      { label: '21:00-09:00', start: 21, end: 9 },
    ];

    let y = doc.y + 10;
    for (const wk of weeks) {
        // week title removed (no weekly ranges in PDF)
        const firstDayInWeek = wk.find((d: Date | null) => d !== null) as Date | undefined;
        const lastDayInWeek = (() => { for (let i = wk.length - 1; i >= 0; i--) if (wk[i]) return wk[i] as Date; return undefined; })();
        // Keep a small spacing for visual clarity
        y += 2;
        // Draw header row
        let x = doc.page.margins.left;
        doc.rect(x, y, timeColWidth, tableRowHeight).stroke();
        doc.text('Hora', x + 4, y + 4);
        x += timeColWidth;
        for (let dow = 0; dow < 7; dow++) {
          doc.rect(x, y, dayColWidth, tableRowHeight).stroke();
          const day = wk[dow];
          if (day) {
            doc.text(dfFormat(day, 'EEE dd/MM'), x + 4, y + 4);
          }
          x += dayColWidth;
        }
        y += tableRowHeight;

        // Rows per time slot
        for (const slot of timeSlots) {
          x = doc.page.margins.left;
          // time column
          doc.rect(x, y, timeColWidth, tableRowHeight).stroke();
          doc.font('Helvetica').text(slot.label, x + 4, y + 4);
          x += timeColWidth;
          // days columns
          for (let dow = 0; dow < 7; dow++) {
            doc.rect(x, y, dayColWidth, tableRowHeight).stroke();
            const day = wk[dow];
            if (day) {
              const key = dfFormat(day, 'yyyy-MM-dd');
              const dayShifts = shiftsByDay.get(key) || [];
              const slotDoctors: string[] = [];
              for (const s of dayShifts) {
                const sStart = new Date(s.startDateTime);
                const sEnd = new Date(s.endDateTime);
                const startHour = sStart.getUTCHours();
                const endHour = sEnd.getUTCHours();
                const intersects = slot.start < slot.end ? !(endHour <= slot.start || startHour >= slot.end) : !(endHour <= slot.start && startHour >= slot.end);
                if (intersects) {
                  if (s.doctors && s.doctors.length > 0) (s.doctors as any[]).forEach((d: any) => slotDoctors.push(d.doctor.name));
                  else if (s.doctor) slotDoctors.push(s.doctor.name);
                }
              }
              const uniqueDoctors = Array.from(new Set(slotDoctors));
              doc.fontSize(8).font('Helvetica');
              const cellText = uniqueDoctors.join(', ');
              const allowedWidth = dayColWidth - 8;
              const wrappedLines = splitTextByWidth(cellText, allowedWidth);
              const singleLineHeight = doc.heightOfString('M', { width: allowedWidth });
              const vPadding = 2;
              const maxLines = Math.max(1, Math.floor((tableRowHeight - vPadding * 2) / singleLineHeight));
              if (wrappedLines.length <= maxLines) {
                doc.text(wrappedLines.join('\n'), x + 4, y + 4, { width: allowedWidth });
              } else {
                const toRender = wrappedLines.slice(0, maxLines);
                // Replace last line with overflow indicator
                const remaining = wrappedLines.length - maxLines;
                const lastIdx = toRender.length - 1;
                toRender[lastIdx] = `${toRender[lastIdx]} ... +${remaining}`;
                doc.text(toRender.join('\n'), x + 4, y + 4, { width: allowedWidth });
              }
            }
            x += dayColWidth;
          }
          y += tableRowHeight;
          if (y > doc.page.height - doc.page.margins.bottom - 80) {
            doc.addPage();
            y = doc.page.margins.top + 40;
          }
        }
        y += 8;
        if (y > doc.page.height - doc.page.margins.bottom - 80) {
          doc.addPage();
          y = doc.page.margins.top + 40;
        }
      }
    doc.text('Firma: ____________________________', 40, undefined);
    doc.moveDown(1);
    doc.text('Aprobación Seguridad:', 40, undefined);
    doc.moveDown(2);
    doc.text('Firma: ____________________________', 40, undefined);

    doc.end();
  } catch (error) {
    next(error);
  }
};

export const generatePayrollPdf = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { year, month } = req.query;
    const targetYear = year ? parseInt(year as string) : new Date().getFullYear();
    const targetMonth = month ? parseInt(month as string) : new Date().getMonth() + 1;

    // Query monthly stats to get doctors summary with payment info
    const start = new Date(targetYear, targetMonth - 1, 1);
    const end = endOfMonth(start);

    const shifts = await prisma.shift.findMany({
      where: {
        startDateTime: { gte: start, lte: end },
      },
      include: {
        doctors: { include: { doctor: { select: { id: true, name: true, specialty: true } } } },
        doctor: { select: { id: true, name: true, specialty: true } },
        holiday: true,
      },
      orderBy: { startDateTime: 'asc' },
    });

    // Get current rates
    const rates = await prisma.hourlyRate.findMany();
    const rateMap = new Map<string, number>();
    
    for (const r of rates) {
      rateMap.set(r.periodType, Number(r.rate));
    }

    if (rateMap.size === 0) {
      res.status(400).json({ error: 'No hay tarifas configuradas' });
      return;
    }

    // Get rate values (assuming simple rate structure for now)
    const weekdayRate = rateMap.get('WEEKDAY_DAY') || 0;
    const weekendRate = rateMap.get('WEEKEND_HOLIDAY_DAY') || 0;
    const nightRate = rateMap.get('WEEKDAY_NIGHT') || 0;

    // Calculate hours and payment per doctor (reuse logic from stats.controller)
    const doctorMap = new Map<string, { name: string; specialty: string; weekdayHours: number; weekendHours: number; nightHours: number }>();

    for (const s of shifts) {
      const sStart = new Date(s.startDateTime);
      const sEnd = new Date(s.endDateTime);
      const isWeekend = [0, 6].includes(sStart.getDay());
      const isHoliday = !!s.holiday;

      const doctors = s.doctors && s.doctors.length > 0 ? s.doctors.map((d: any) => d.doctor) : s.doctor ? [s.doctor] : [];

      for (const doc of doctors) {
        if (!doctorMap.has(doc.id)) {
          doctorMap.set(doc.id, { name: doc.name, specialty: doc.specialty, weekdayHours: 0, weekendHours: 0, nightHours: 0 });
        }
        const entry = doctorMap.get(doc.id)!;

        // Calculate hours breakdown
        let dayHours = 0;
        let nightHours = 0;
        const diffMs = sEnd.getTime() - sStart.getTime();
        const totalHours = diffMs / (1000 * 60 * 60);

        const startHour = sStart.getHours();
        const endHour = sEnd.getHours();

        // Simple heuristic: shifts starting 21:00-08:59 are night shifts
        if ((startHour >= 21 || startHour < 9) && totalHours >= 12) {
          nightHours = totalHours;
        } else {
          dayHours = totalHours;
        }

        if (isWeekend || isHoliday) {
          entry.weekendHours += dayHours + nightHours;
        } else {
          entry.weekdayHours += dayHours;
          entry.nightHours += nightHours;
        }
      }
    }

    // Calculate payment for each doctor after accumulating all hours
    const doctorsList = Array.from(doctorMap.entries()).map(([id, data]) => {
      const weekdayPay = data.weekdayHours * weekdayRate;
      const weekendPay = data.weekendHours * weekendRate;
      const nightPay = data.nightHours * nightRate;
      const totalPayment = weekdayPay + weekendPay + nightPay;
      
      return { 
        id, 
        ...data,
        totalPayment 
      };
    });

    // Create PDF document (portrait)
    const pdf = new PDFDocument({ size: 'A4', layout: 'portrait', margin: 50 });

    const fileName = `liquidacion-${targetYear}-${String(targetMonth).padStart(2, '0')}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    pdf.pipe(res);

    // Header
    pdf.fontSize(18).text('Liquidación de Sueldos - Clínica', { align: 'center' });
    pdf.moveDown(0.5);
    pdf.fontSize(12).text(`Mes: ${targetMonth} / Año: ${targetYear}`, { align: 'center' });
    pdf.moveDown(1.5);

    // Table headers
    const tableTop = pdf.y;
    const colWidths = { name: 140, specialty: 100, weekday: 60, weekend: 60, night: 60, total: 80 };
    let x = pdf.page.margins.left;

    pdf.fontSize(10).font('Helvetica-Bold');
    pdf.text('Médico', x, tableTop, { width: colWidths.name, align: 'left' });
    x += colWidths.name;
    pdf.text('Especialidad', x, tableTop, { width: colWidths.specialty, align: 'left' });
    x += colWidths.specialty;
    pdf.text('Hrs Sem', x, tableTop, { width: colWidths.weekday, align: 'center' });
    x += colWidths.weekday;
    pdf.text('Hrs FS', x, tableTop, { width: colWidths.weekend, align: 'center' });
    x += colWidths.weekend;
    pdf.text('Hrs Noc', x, tableTop, { width: colWidths.night, align: 'center' });
    x += colWidths.night;
    pdf.text('Total Pago', x, tableTop, { width: colWidths.total, align: 'right' });

    pdf.moveDown(0.5);
    pdf.strokeColor('#000').lineWidth(1).moveTo(pdf.page.margins.left, pdf.y).lineTo(pdf.page.width - pdf.page.margins.right, pdf.y).stroke();
    pdf.moveDown(0.5);

    // Table rows
    pdf.font('Helvetica').fontSize(9);
    for (const doc of doctorsList) {
      x = pdf.page.margins.left;
      const rowTop = pdf.y;

      pdf.text(doc.name, x, rowTop, { width: colWidths.name, align: 'left' });
      x += colWidths.name;
      pdf.text(doc.specialty, x, rowTop, { width: colWidths.specialty, align: 'left' });
      x += colWidths.specialty;
      pdf.text(doc.weekdayHours.toFixed(1), x, rowTop, { width: colWidths.weekday, align: 'center' });
      x += colWidths.weekday;
      pdf.text(doc.weekendHours.toFixed(1), x, rowTop, { width: colWidths.weekend, align: 'center' });
      x += colWidths.weekend;
      pdf.text(doc.nightHours.toFixed(1), x, rowTop, { width: colWidths.night, align: 'center' });
      x += colWidths.night;
      pdf.text(`$${doc.totalPayment.toFixed(2)}`, x, rowTop, { width: colWidths.total, align: 'right' });

      pdf.moveDown(0.8);

      if (pdf.y > pdf.page.height - pdf.page.margins.bottom - 50) {
        pdf.addPage();
      }
    }

    // Footer with totals
    const totalWeekday = doctorsList.reduce((sum, d) => sum + d.weekdayHours, 0);
    const totalWeekend = doctorsList.reduce((sum, d) => sum + d.weekendHours, 0);
    const totalNight = doctorsList.reduce((sum, d) => sum + d.nightHours, 0);
    const totalPayment = doctorsList.reduce((sum, d) => sum + d.totalPayment, 0);

    pdf.moveDown(1);
    pdf.strokeColor('#000').lineWidth(2).moveTo(pdf.page.margins.left, pdf.y).lineTo(pdf.page.width - pdf.page.margins.right, pdf.y).stroke();
    pdf.moveDown(0.5);

    x = pdf.page.margins.left;
    pdf.fontSize(10).font('Helvetica-Bold');
    pdf.text('TOTALES:', x, pdf.y, { width: colWidths.name + colWidths.specialty, align: 'left' });
    x += colWidths.name + colWidths.specialty;
    pdf.text(totalWeekday.toFixed(1), x, pdf.y, { width: colWidths.weekday, align: 'center' });
    x += colWidths.weekday;
    pdf.text(totalWeekend.toFixed(1), x, pdf.y, { width: colWidths.weekend, align: 'center' });
    x += colWidths.weekend;
    pdf.text(totalNight.toFixed(1), x, pdf.y, { width: colWidths.night, align: 'center' });
    x += colWidths.night;
    pdf.text(`$${totalPayment.toFixed(2)}`, x, pdf.y, { width: colWidths.total, align: 'right' });

    // Signature section
    pdf.moveDown(3);
    pdf.fontSize(10).font('Helvetica');
    pdf.text('Firma Autorización: ____________________________', pdf.page.margins.left, undefined);

    pdf.end();
  } catch (error) {
    next(error);
  }
};

export default { generateSchedulePdf, generatePayrollPdf };
