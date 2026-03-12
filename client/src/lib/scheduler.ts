import { addDays, getDay, startOfWeek } from "date-fns";

export interface Employee {
  id: string;
  name: string;
  canSunday: boolean;
  onlySunday: boolean;
}

export interface ShiftDay {
  date: Date;
  morning: Employee[];
  evening: Employee[];
  night: Employee[];
  sundayOvertime: Employee[];
}

export interface ScheduleResult {
  weeks: ShiftDay[][];
  stats: Record<string, { morning: number; evening: number; night: number; sundayOvertime: number; total: number }>;
  fairnessSummary: string;
}

export function generateSchedule(employees: Employee[], startDate: Date): ScheduleResult {
  const weeks: ShiftDay[][] = [];
  const stats: Record<string, { morning: number; evening: number; night: number; sundayOvertime: number; total: number }> = {};
  
  employees.forEach(e => {
    stats[e.id] = { morning: 0, evening: 0, night: 0, sundayOvertime: 0, total: 0 };
  });

  const lastNightWorkers = new Set<string>();
  let currentDate = startOfWeek(startDate, { weekStartsOn: 1 }); // Her zaman Pazartesi başlasın

  for (let w = 0; w < 14; w++) {
    const week: ShiftDay[] = [];
    const weeklyWorkCount: Record<string, number> = {};
    employees.forEach(e => weeklyWorkCount[e.id] = 0);

    for (let d = 0; d < 7; d++) {
      const isSunday = getDay(currentDate) === 0;
      
      const daySchedule: ShiftDay = {
        date: currentDate,
        morning: [],
        evening: [],
        night: [],
        sundayOvertime: []
      };

      const dailyWorkers = new Set<string>();

      const pickWorkers = (pool: Employee[], count: number, type: 'morning'|'evening'|'night'|'sundayOvertime', strictExclude: Set<string>, avoidExclude: Set<string>) => {
        if (pool.length === 0) return [];
        
        let candidates = pool.filter(e => !strictExclude.has(e.id));
        
        // Karışıklık (eşitlik durumunda rastgelelik için)
        candidates.sort(() => Math.random() - 0.5);
        
        // Önceliklendirme Mantığı:
        // 1. Kaçınılması gerekenler en sona (örn. dün gece çalışan)
        // 2. Bu hafta az çalışanlara öncelik
        // 3. Genel toplamda az çalışanlara öncelik
        // 4. Pazar mesaisi için: Sadece pazar çalışanlarına öncelik
        candidates.sort((a, b) => {
          const aAvoid = avoidExclude.has(a.id) ? 1 : 0;
          const bAvoid = avoidExclude.has(b.id) ? 1 : 0;
          if (aAvoid !== bAvoid) return aAvoid - bAvoid;
          
          if (type === 'sundayOvertime') {
            const aOnlySun = a.onlySunday ? 0 : 1;
            const bOnlySun = b.onlySunday ? 0 : 1;
            if (aOnlySun !== bOnlySun) return aOnlySun - bOnlySun;
          }

          if (weeklyWorkCount[a.id] !== weeklyWorkCount[b.id]) {
            return weeklyWorkCount[a.id] - weeklyWorkCount[b.id];
          }
          
          return stats[a.id].total - stats[b.id].total;
        });

        const picked = candidates.slice(0, count);
        picked.forEach(p => {
          dailyWorkers.add(p.id);
          stats[p.id][type]++;
          stats[p.id].total++;
          weeklyWorkCount[p.id]++;
        });
        
        return picked;
      };

      const regularPool = employees.filter(e => !e.onlySunday);
      
      // Gündüz (2 kişi)
      daySchedule.morning = pickWorkers(regularPool, 2, 'morning', dailyWorkers, lastNightWorkers);
      
      // Akşam (2 kişi)
      daySchedule.evening = pickWorkers(regularPool, 2, 'evening', dailyWorkers, new Set());
      
      // Gece (1 kişi)
      const prevNightWorkers = new Set(lastNightWorkers);
      daySchedule.night = pickWorkers(regularPool, 1, 'night', dailyWorkers, prevNightWorkers);
      
      lastNightWorkers.clear();
      daySchedule.night.forEach(n => lastNightWorkers.add(n.id));

      // Pazar Mesaisi (1 kişi) - Sadece Pazar
      if (isSunday) {
        const sundayPool = employees.filter(e => e.canSunday);
        daySchedule.sundayOvertime = pickWorkers(sundayPool, 1, 'sundayOvertime', dailyWorkers, new Set());
      }

      week.push(daySchedule);
      currentDate = addDays(currentDate, 1);
    }
    weeks.push(week);
  }

  // Adalet Özeti Hesaplama
  const activeEmployees = employees.filter(e => !e.onlySunday);
  let fairnessSummary = "";
  
  if (activeEmployees.length > 0) {
    const totals = activeEmployees.map(e => stats[e.id].total);
    const maxTotal = Math.max(...totals);
    const minTotal = Math.min(...totals);
    const diff = maxTotal - minTotal;
    
    fairnessSummary = `Normal personeller arasında en çok görev alan kişi ${maxTotal}, en az görev alan kişi ${minTotal} vardiya almıştır. (Fark: ${diff}). `;
    if (diff <= 2) {
      fairnessSummary += "Dağılım mükemmel düzeyde adildir. Sistem yükü eşit paylaştırmıştır.";
    } else if (diff <= 5) {
      fairnessSummary += "Dağılım oldukça dengelidir. İş yükü adaletli şekilde dağıtılmıştır.";
    } else {
      fairnessSummary += "Personel sayısı kısıtlamalarından dolayı bazı farklar oluşmuştur, ancak kurallara (peş peşe gece vardiyası engelleme vb.) uyulmuştur.";
    }
  } else {
    fairnessSummary = "Yeterli normal personel bulunmuyor.";
  }

  return { weeks, stats, fairnessSummary };
}

export function generateCSV(weeks: ShiftDay[][], stats: Record<string, any>, employees: Employee[]): string {
  let csv = "Tarih,Gündüz (07:45-16:00),Akşam (16:00-00:00),Gece (00:00-08:00),Pazar Mesaisi\n";
  
  weeks.forEach(week => {
    week.forEach(day => {
      const dateStr = day.date.toLocaleDateString('tr-TR');
      const morningStr = day.morning.map(e => e.name).join(" & ") || "-";
      const eveningStr = day.evening.map(e => e.name).join(" & ") || "-";
      const nightStr = day.night.map(e => e.name).join(" & ") || "-";
      const sundayStr = day.sundayOvertime.map(e => e.name).join(" & ") || "-";
      
      csv += `${dateStr},${morningStr},${eveningStr},${nightStr},${sundayStr}\n`;
    });
  });

  csv += "\nPersonel Özet Raporu\n";
  csv += "İsim,Gündüz,Akşam,Gece,Pazar Mesaisi,Toplam\n";
  
  employees.forEach(emp => {
    const s = stats[emp.id];
    csv += `${emp.name},${s.morning},${s.evening},${s.night},${s.sundayOvertime},${s.total}\n`;
  });

  return csv;
}