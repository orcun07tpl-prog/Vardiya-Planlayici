import { addWeeks, getISOWeek, startOfWeek } from "date-fns";

export interface Employee {
  id: string;
  name: string;
  canSunday: boolean;
  onlySunday: boolean;
}

export interface WeeklyShift {
  weekNumber: number;
  morning: Employee[];
  evening: Employee[];
  night: Employee[];
  saturday: Employee[];
  sunday: Employee[];
}

export interface ScheduleResult {
  weeks: WeeklyShift[];
  stats: Record<string, { morning: number; evening: number; night: number; sundayOvertime: number; saturdayOvertime: number; total: number }>;
  fairnessSummary: string;
}

export function generateSchedule(employees: Employee[], startDate: Date): ScheduleResult {
  const weeks: WeeklyShift[] = [];
  const stats: Record<string, { morning: number; evening: number; night: number; sundayOvertime: number; saturdayOvertime: number; total: number }> = {};
  
  employees.forEach(e => {
    stats[e.id] = { morning: 0, evening: 0, night: 0, sundayOvertime: 0, saturdayOvertime: 0, total: 0 };
  });

  let currentDate = startOfWeek(startDate, { weekStartsOn: 1 });

  const regularPool = employees.filter(e => !e.onlySunday);
  const sundayPool = employees.filter(e => e.canSunday);
  const saturdayPool = employees.filter(e => !e.onlySunday); 

  // Karıştır ki her seferinde aynı sırayla başlamasın
  regularPool.sort(() => Math.random() - 0.5);
  sundayPool.sort(() => Math.random() - 0.5);
  saturdayPool.sort(() => Math.random() - 0.5);

  let currentRegularIndex = 0;
  let currentSundayIndex = 0;
  let currentSaturdayIndex = 0;

  for (let w = 0; w < 14; w++) {
    const weekDate = addWeeks(currentDate, w);
    const weekNum = getISOWeek(weekDate);

    const week: WeeklyShift = {
      weekNumber: weekNum,
      morning: [],
      evening: [],
      night: [],
      saturday: [],
      sunday: []
    };

    if (regularPool.length >= 5) {
      // 2 Gündüz, 2 Akşam, 1 Gece
      week.morning.push(regularPool[currentRegularIndex % regularPool.length]);
      currentRegularIndex++;
      week.morning.push(regularPool[currentRegularIndex % regularPool.length]);
      currentRegularIndex++;

      week.evening.push(regularPool[currentRegularIndex % regularPool.length]);
      currentRegularIndex++;
      week.evening.push(regularPool[currentRegularIndex % regularPool.length]);
      currentRegularIndex++;

      week.night.push(regularPool[currentRegularIndex % regularPool.length]);
      currentRegularIndex++;
    }

    if (saturdayPool.length > 0) {
      week.saturday.push(saturdayPool[currentSaturdayIndex % saturdayPool.length]);
      currentSaturdayIndex++;
    }

    if (sundayPool.length > 0) {
      week.sunday.push(sundayPool[currentSundayIndex % sundayPool.length]);
      currentSundayIndex++;
    }

    week.morning.forEach(e => { stats[e.id].morning++; stats[e.id].total++; });
    week.evening.forEach(e => { stats[e.id].evening++; stats[e.id].total++; });
    week.night.forEach(e => { stats[e.id].night++; stats[e.id].total++; });
    week.saturday.forEach(e => { stats[e.id].saturdayOvertime++; stats[e.id].total++; });
    week.sunday.forEach(e => { stats[e.id].sundayOvertime++; stats[e.id].total++; });

    weeks.push(week);
  }

  // Adalet Özeti
  const activeEmployees = employees.filter(e => !e.onlySunday);
  let fairnessSummary = "";
  
  if (activeEmployees.length > 0) {
    const totals = activeEmployees.map(e => stats[e.id].total);
    const maxTotal = Math.max(...totals);
    const minTotal = Math.min(...totals);
    const diff = maxTotal - minTotal;
    
    fairnessSummary = `Normal personeller arasında en çok görev alan kişi ${maxTotal}, en az görev alan kişi ${minTotal} vardiya almıştır. (Fark: ${diff}). Haftalık döngü (Round-robin) ile adil dağılım sağlanmıştır.`;
  } else {
    fairnessSummary = "Yeterli normal personel bulunmuyor.";
  }

  return { weeks, stats, fairnessSummary };
}

export function generateCSV(weeks: WeeklyShift[], stats: Record<string, any>, employees: Employee[]): string {
  let csv = "Hafta,Gündüz (07:45-16:00),Akşam (16:00-00:00),Gece (00:00-08:00),Pazar Mesaisi,Cumartesi Mesaisi\n";
  
  weeks.forEach(week => {
    const morningStr = week.morning.map(e => e.name).join(" & ") || "-";
    const eveningStr = week.evening.map(e => e.name).join(" & ") || "-";
    const nightStr = week.night.map(e => e.name).join(" & ") || "-";
    const sundayStr = week.sunday.map(e => e.name).join(" & ") || "-";
    const saturdayStr = week.saturday.map(e => e.name).join(" & ") || "-";
    
    csv += `KW${week.weekNumber},${morningStr},${eveningStr},${nightStr},${sundayStr},${saturdayStr}\n`;
  });

  csv += "\nPersonel Özet Raporu\n";
  csv += "İsim,Gündüz,Akşam,Gece,Pazar Mesaisi,Cumartesi Mesaisi,Toplam\n";
  
  employees.forEach(emp => {
    const s = stats[emp.id];
    csv += `${emp.name},${s.morning},${s.evening},${s.night},${s.sundayOvertime},${s.saturdayOvertime},${s.total}\n`;
  });

  return csv;
}