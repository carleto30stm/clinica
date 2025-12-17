import { Request, Response, NextFunction } from 'express';
import prisma from '../config/database';
import PDFDocument from 'pdfkit';
import { startOfMonth, endOfMonth, eachDayOfInterval, getDay, format as dfFormat } from 'date-fns';
import { buildRateMap, calculateShiftPaymentFromRates } from '../utils/paymentHelpers';

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
        doctors: { include: { doctor: { select: { id: true, name: true, specialty: true, hasDiscount: true } } } },
        doctor: { select: { id: true, name: true, specialty: true, hasDiscount: true } },
        holiday: true,
      },
      orderBy: { startDateTime: 'asc' },
    });

    // Use the same rate map as stats.controller
    const rateMap = await buildRateMap();

    if (rateMap.size === 0) {
      res.status(400).json({ error: 'No hay tarifas configuradas' });
      return;
    }

    // Preload holidays for the month (same as stats.controller)
    const holidays = await prisma.holiday.findMany({
      where: {
        OR: [
          { isRecurrent: true },
          { date: { gte: start, lte: end } },
        ],
      },
    });

    const pad = (n: number) => String(n).padStart(2, '0');
    const holidaySet = new Set<string>();
    const recurringSet = new Set<string>();
    holidays.forEach((h) => {
      const d = new Date(h.date);
      if (h.isRecurrent) {
        recurringSet.add(`${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
      } else {
        holidaySet.add(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
      }
    });

    // Calculate hours and payment per doctor using the SAME logic as stats.controller
    interface DoctorPayrollEntry {
      name: string;
      totalHours: number;
      totalPayment: number;
      paymentBreakdown: Array<{ periodType: string; hours: number; amount: number }>;
      externalHours: number;
      externalPayment: number;
      hasDiscount: boolean;
    }
    const doctorMap = new Map<string, DoctorPayrollEntry>();

    for (const shift of shifts) {
      // Build list of assigned doctors (supporting legacy doctorId and new doctors relation)
      const assignedDoctors = (shift.doctors && shift.doctors.length > 0)
        ? shift.doctors.map((d) => ({ id: d.doctorId, name: d.doctor?.name, hasDiscount: d.doctor?.hasDiscount }))
        : (shift.doctorId ? [{ id: shift.doctorId, name: shift.doctor?.name, hasDiscount: shift.doctor?.hasDiscount }] : []);

      if (assignedDoctors.length === 0) continue;

      // Normalize end in case it's earlier than start (overnight shifts)
      let effectiveEnd = new Date(shift.endDateTime);
      while (effectiveEnd.getTime() <= new Date(shift.startDateTime).getTime()) {
        effectiveEnd = new Date(effectiveEnd.getTime() + 24 * 60 * 60 * 1000);
      }
      const hours = (effectiveEnd.getTime() - new Date(shift.startDateTime).getTime()) / (1000 * 60 * 60);

      // Compute payment for the shift using the SAME function as stats.controller
      let shiftTotalAmount = 0;
      let shiftBreakdown: Array<{ type: string; hours: number; amount: number }> = [];
      try {
        const isHolidayOrWeekend = shift.dayCategory === 'WEEKEND' || shift.dayCategory === 'HOLIDAY';
        const payment = calculateShiftPaymentFromRates(rateMap, shift.startDateTime, effectiveEnd, isHolidayOrWeekend, holidaySet, recurringSet);
        shiftTotalAmount = payment.totalAmount;
        shiftBreakdown = payment.breakdown.map((b) => ({ type: b.type, hours: b.hours, amount: b.amount }));
      } catch (e) {
        // ignore calculation error
      }

      // Each doctor receives full hours and full payment (no splitting)
      for (const doc of assignedDoctors) {
        let entry = doctorMap.get(doc.id);
        if (!entry) {
          entry = {
            name: doc.name || 'Desconocido',
            totalHours: 0,
            totalPayment: 0,
            paymentBreakdown: [],
            externalHours: 0,
            externalPayment: 0,
            hasDiscount: doc.hasDiscount || false,
          };
          doctorMap.set(doc.id, entry);
        }

        entry.totalHours += hours;
        entry.totalPayment += shiftTotalAmount;

        // Merge breakdown
        shiftBreakdown.forEach((b) => {
          const prev = entry!.paymentBreakdown.find((p) => p.periodType === b.type);
          if (prev) {
            prev.hours += b.hours;
            prev.amount += b.amount;
          } else {
            entry!.paymentBreakdown.push({ periodType: b.type, hours: b.hours, amount: b.amount });
          }
        });
      }
    }

    // Get external hours for the same period
    const externalHours = await prisma.externalHours.findMany({
      where: {
        date: { gte: start, lte: end },
      },
      include: {
        doctor: { select: { id: true, name: true, hasDiscount: true } },
      },
    });

    // Add external hours to doctor map
    for (const ext of externalHours) {
      const hours = Number(ext.hours);
      const rate = Number(ext.rate);
      const amount = hours * rate;
      
      let entry = doctorMap.get(ext.doctorId);
      if (!entry) {
        entry = {
          name: ext.doctor.name,
          totalHours: 0,
          totalPayment: 0,
          paymentBreakdown: [],
          externalHours: 0,
          externalPayment: 0,
          hasDiscount: ext.doctor.hasDiscount || false,
        };
        doctorMap.set(ext.doctorId, entry);
      }
      entry.externalHours += hours;
      entry.externalPayment += amount;
      entry.totalPayment += amount;
    }

    // Get active discount
    const activeDiscount = await prisma.discount.findFirst({
      where: { isActive: true },
      orderBy: { validFrom: 'desc' },
    });
    const discountAmount = activeDiscount ? Number(activeDiscount.amount) : 0;

    // Build final doctors list with discount applied
    const doctorsList = Array.from(doctorMap.entries()).map(([id, data]) => {
      const brutoPayment = data.totalPayment;
      const appliedDiscount = data.hasDiscount && discountAmount > 0 ? discountAmount : 0;
      const finalPayment = Math.max(0, brutoPayment - appliedDiscount);
      
      return { 
        id, 
        name: data.name,
        totalHours: data.totalHours,
        externalHours: data.externalHours,
        brutoPayment,
        discountAmount: appliedDiscount,
        finalPayment,
        hasDiscount: data.hasDiscount,
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

    // Table headers - simplified to match dashboard columns
    const tableTop = pdf.y;
    const colWidths = { name: 150, hours: 60, external: 60, bruto: 80, discount: 70, final: 80 };
    let x = pdf.page.margins.left;

    pdf.fontSize(9).font('Helvetica-Bold');
    pdf.text('Médico', x, tableTop, { width: colWidths.name, align: 'left' });
    x += colWidths.name;
    pdf.text('H.Turnos', x, tableTop, { width: colWidths.hours, align: 'center' });
    x += colWidths.hours;
    pdf.text('H.Ext', x, tableTop, { width: colWidths.external, align: 'center' });
    x += colWidths.external;
    pdf.text('Bruto', x, tableTop, { width: colWidths.bruto, align: 'right' });
    x += colWidths.bruto;
    pdf.text('Descuento', x, tableTop, { width: colWidths.discount, align: 'right' });
    x += colWidths.discount;
    pdf.text('Neto', x, tableTop, { width: colWidths.final, align: 'right' });

    pdf.moveDown(0.5);
    pdf.strokeColor('#000').lineWidth(1).moveTo(pdf.page.margins.left, pdf.y).lineTo(pdf.page.width - pdf.page.margins.right, pdf.y).stroke();
    pdf.moveDown(0.5);

    // Table rows
    pdf.font('Helvetica').fontSize(8);
    for (const doc of doctorsList) {
      x = pdf.page.margins.left;
      const rowTop = pdf.y;

      pdf.text(doc.name, x, rowTop, { width: colWidths.name, align: 'left' });
      x += colWidths.name;
      pdf.text(doc.totalHours.toFixed(1), x, rowTop, { width: colWidths.hours, align: 'center' });
      x += colWidths.hours;
      pdf.text(doc.externalHours.toFixed(1), x, rowTop, { width: colWidths.external, align: 'center' });
      x += colWidths.external;
      pdf.text(`$${doc.brutoPayment.toFixed(2)}`, x, rowTop, { width: colWidths.bruto, align: 'right' });
      x += colWidths.bruto;
      pdf.text(doc.discountAmount > 0 ? `-$${doc.discountAmount.toFixed(2)}` : '-', x, rowTop, { width: colWidths.discount, align: 'right' });
      x += colWidths.discount;
      pdf.text(`$${doc.finalPayment.toFixed(2)}`, x, rowTop, { width: colWidths.final, align: 'right' });

      pdf.moveDown(0.8);

      if (pdf.y > pdf.page.height - pdf.page.margins.bottom - 50) {
        pdf.addPage();
      }
    }

    // Footer with totals
const totalHours = doctorsList.reduce((sum, d) => sum + d.totalHours, 0);
const totalExternal = doctorsList.reduce((sum, d) => sum + d.externalHours, 0);
const totalBruto = doctorsList.reduce((sum, d) => sum + d.brutoPayment, 0);
const totalDiscounts = doctorsList.reduce((sum, d) => sum + d.discountAmount, 0);
const totalNeto = doctorsList.reduce((sum, d) => sum + d.finalPayment, 0);

pdf.moveDown(1);
pdf
  .strokeColor('#000')
  .lineWidth(2)
  .moveTo(pdf.page.margins.left, pdf.y)
  .lineTo(pdf.page.width - pdf.page.margins.right, pdf.y)
  .stroke();

pdf.moveDown(0.5);

// 🔒 fijamos la Y
const totalsY = pdf.y;
const rowHeight = 16;
x = pdf.page.margins.left;
pdf.fontSize(9).font('Helvetica-Bold');

pdf.text('TOTALES:', x, totalsY, {
  width: colWidths.name,
  align: 'left',
  height: rowHeight,
});
x += colWidths.name;

pdf.text(totalHours.toFixed(1), x, totalsY, {
  width: colWidths.hours,
  align: 'center',
  height: rowHeight,
});
x += colWidths.hours;

pdf.text(totalExternal.toFixed(1), x, totalsY, {
  width: colWidths.external,
  align: 'center',
  height: rowHeight,
});
x += colWidths.external;

pdf.text(`$${totalBruto.toFixed(2)}`, x, totalsY, {
  width: colWidths.bruto,
  align: 'right',
  height: rowHeight,
});
x += colWidths.bruto;

pdf.text(
  totalDiscounts > 0 ? `-$${totalDiscounts.toFixed(2)}` : '-',
  x,
  totalsY,
  {
    width: colWidths.discount,
    align: 'right',
    height: rowHeight,
  }
);
x += colWidths.discount;

pdf.text(`$${totalNeto.toFixed(2)}`, x, totalsY, {
  width: colWidths.final,
  align: 'right',
  height: rowHeight,
});

// Bajamos manualmente una fila
pdf.y = totalsY + rowHeight;

pdf.end();
  } catch (error) {
    next(error);
  }
};

export default { generateSchedulePdf, generatePayrollPdf };
