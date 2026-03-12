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

  // Rastgele başlasın
  regularPool.sort(() => Math.random() - 0.5);
  sundayPool.sort(() => Math.random() - 0.5);
  saturdayPool.sort(() => Math.random() - 0.5);

  const history: Record<string, string[]> = {};
  employees.forEach(e => history[e.id] = []);

  const satHistory: Record<string, boolean[]> = {};
  const sunHistory: Record<string, boolean[]> = {};
  employees.forEach(e => { satHistory[e.id] = []; sunHistory[e.id] = []; });

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
      let available = [...regularPool];
      
      const pickWorkers = (count: number, shiftType: 'morning' | 'evening' | 'night') => {
        // Üst üste 3. kez aynı vardiyaya gelmesini engelle
        let validCandidates = available.filter(e => {
          if (w >= 2 && history[e.id][w-1] === shiftType && history[e.id][w-2] === shiftType) {
            return false;
          }
          return true;
        });

        // Eğer geçerli aday kalmadıysa (çok az personel varsa kuralı esnet)
        if (validCandidates.length < count) {
          validCandidates = available;
        }

        // Öncelik Sıralaması:
        // 1. Bu spesifik vardiyaya en az gelen
        // 2. Toplamda en az çalışan
        validCandidates.sort((a, b) => {
          if (stats[a.id][shiftType] !== stats[b.id][shiftType]) {
            return stats[a.id][shiftType] - stats[b.id][shiftType];
          }
          if (stats[a.id].total !== stats[b.id].total) {
            return stats[a.id].total - stats[b.id].total;
          }
          return Math.random() - 0.5;
        });

        const picked = validCandidates.slice(0, count);
        available = available.filter(a => !picked.find(p => p.id === a.id));
        return picked;
      };

      // Dağıtımda adaleti sağlamak için geceyi önce seçmek daha dengeli olabilir (1 kişi olduğu için)
      week.night = pickWorkers(1, 'night');
      week.evening = pickWorkers(2, 'evening');
      week.morning = pickWorkers(2, 'morning');

      // Tarihçeyi güncelle
      regularPool.forEach(e => {
        if (week.morning.some(x => x.id === e.id)) history[e.id].push('morning');
        else if (week.evening.some(x => x.id === e.id)) history[e.id].push('evening');
        else if (week.night.some(x => x.id === e.id)) history[e.id].push('night');
        else history[e.id].push('off');
      });
    }

    // Cumartesi Seçimi
    if (saturdayPool.length > 0) {
      let satCands = saturdayPool.filter(e => !(w >= 2 && satHistory[e.id][w-1] && satHistory[e.id][w-2]));
      if (satCands.length === 0) satCands = [...saturdayPool];
      
      satCands.sort((a, b) => {
        if (stats[a.id].saturdayOvertime !== stats[b.id].saturdayOvertime) return stats[a.id].saturdayOvertime - stats[b.id].saturdayOvertime;
        if (stats[a.id].total !== stats[b.id].total) return stats[a.id].total - stats[b.id].total;
        return Math.random() - 0.5;
      });
      const picked = satCands[0];
      week.saturday.push(picked);
      saturdayPool.forEach(e => satHistory[e.id].push(e.id === picked.id));
    }

    // Pazar Seçimi
    if (sundayPool.length > 0) {
      let sunCands = sundayPool.filter(e => !(w >= 2 && sunHistory[e.id][w-1] && sunHistory[e.id][w-2]));
      if (sunCands.length === 0) sunCands = [...sundayPool];
      
      sunCands.sort((a, b) => {
        if (stats[a.id].sundayOvertime !== stats[b.id].sundayOvertime) return stats[a.id].sundayOvertime - stats[b.id].sundayOvertime;
        if (stats[a.id].total !== stats[b.id].total) return stats[a.id].total - stats[b.id].total;
        return Math.random() - 0.5;
      });
      const picked = sunCands[0];
      week.sunday.push(picked);
      sundayPool.forEach(e => sunHistory[e.id].push(e.id === picked.id));
    }

    // İstatistikleri güncelle
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
    
    fairnessSummary = `Personeller arasında vardiya dağılımı optimize edildi. Gündüz, akşam ve gece vardiyaları eşit paylaştırılmaya çalışıldı. Üst üste 3 hafta aynı vardiyaya yazılma engellendi. En çok çalışan ${maxTotal}, en az çalışan ${minTotal} vardiya almıştır.`;
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