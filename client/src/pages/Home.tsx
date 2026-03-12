import { useState, useEffect } from "react";
import { Employee, generateSchedule, ScheduleResult, generateCSV } from "@/lib/scheduler";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Trash2, Users, CalendarDays, CheckCircle2 } from "lucide-react";

export default function Home() {
  const [employees, setEmployees] = useState<Employee[]>(() => {
    const saved = localStorage.getItem("shift_employees");
    return saved ? JSON.parse(saved) : [
      { id: "1", name: "Ahmet Yılmaz", canSunday: true, onlySunday: false },
      { id: "2", name: "Mehmet Demir", canSunday: true, onlySunday: false },
      { id: "3", name: "Ayşe Kaya", canSunday: true, onlySunday: false },
      { id: "4", name: "Fatma Çelik", canSunday: true, onlySunday: false },
      { id: "5", name: "Mustafa Şahin", canSunday: true, onlySunday: false },
      { id: "6", name: "Zeynep Öz", canSunday: true, onlySunday: true }, // Sadece pazar mesaisi
    ];
  });

  const [newName, setNewName] = useState("");
  const [newOnlySunday, setNewOnlySunday] = useState(false);
  const [newCanSunday, setNewCanSunday] = useState(true);

  const [scheduleData, setScheduleData] = useState<ScheduleResult | null>(() => {
    const saved = localStorage.getItem("shift_schedule");
    if (saved) {
      const parsed = JSON.parse(saved);
      return parsed;
    }
    return null;
  });

  useEffect(() => {
    localStorage.setItem("shift_employees", JSON.stringify(employees));
  }, [employees]);

  useEffect(() => {
    if (scheduleData) {
      localStorage.setItem("shift_schedule", JSON.stringify(scheduleData));
    }
  }, [scheduleData]);

  const addEmployee = () => {
    if (!newName.trim()) return;
    
    setEmployees([
      ...employees,
      {
        id: crypto.randomUUID(),
        name: newName.trim(),
        onlySunday: newOnlySunday,
        canSunday: newOnlySunday ? true : newCanSunday
      }
    ]);
    
    setNewName("");
    setNewOnlySunday(false);
    setNewCanSunday(true);
  };

  const removeEmployee = (id: string) => {
    setEmployees(employees.filter(e => e.id !== id));
  };

  const handleGenerate = () => {
    if (employees.length < 5) {
      alert("Sağlıklı bir planlama için en az 5-6 normal çalışan gereklidir.");
      return;
    }
    const result = generateSchedule(employees, new Date());
    setScheduleData(result);
  };

  const handleDownloadCSV = () => {
    if (!scheduleData) return;
    
    const csvContent = "\uFEFF" + generateCSV(scheduleData.weeks, scheduleData.stats, employees); // \uFEFF for UTF-8 BOM (Excel compatibility)
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "vardiya_plani.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">Vardiya Planlayıcı</h1>
          <p className="text-slate-500 mt-2 text-lg">Adalet odaklı, otomatik 14 haftalık çalışma çizelgesi</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Sol Kolon: Personel Yönetimi */}
          <Card className="lg:col-span-1 shadow-sm border-slate-200">
            <CardHeader className="bg-slate-100/50 pb-4 border-b border-slate-100">
              <CardTitle className="flex items-center gap-2 text-lg text-slate-800">
                <Users className="w-5 h-5 text-primary" />
                Personel Listesi
              </CardTitle>
              <CardDescription>
                Çalışanları ekleyin ve mesai kurallarını belirleyin.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              
              {/* Ekleme Formu */}
              <div className="space-y-4 p-4 bg-white border border-slate-100 rounded-xl shadow-sm">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Personel Adı Soyadı</label>
                  <Input 
                    placeholder="Örn: Ali Yılmaz" 
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addEmployee()}
                    data-testid="input-employee-name"
                  />
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="onlySunday" 
                      checked={newOnlySunday}
                      onCheckedChange={(c) => {
                        setNewOnlySunday(!!c);
                        if (c) setNewCanSunday(true);
                      }}
                      data-testid="checkbox-only-sunday"
                    />
                    <label htmlFor="onlySunday" className="text-sm font-medium leading-none text-slate-700 cursor-pointer">
                      Sadece Pazar Mesaisine Yazar
                    </label>
                  </div>
                  
                  {!newOnlySunday && (
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="canSunday" 
                        checked={newCanSunday}
                        onCheckedChange={(c) => setNewCanSunday(!!c)}
                        data-testid="checkbox-can-sunday"
                      />
                      <label htmlFor="canSunday" className="text-sm font-medium leading-none text-slate-700 cursor-pointer">
                        Pazar Mesaisine Girebilir
                      </label>
                    </div>
                  )}
                </div>
                
                <Button onClick={addEmployee} className="w-full bg-primary hover:bg-primary/90" data-testid="button-add-employee">
                  Listeye Ekle
                </Button>
              </div>

              {/* Liste */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Mevcut Personeller ({employees.length})</h3>
                <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2">
                  {employees.length === 0 && (
                    <p className="text-sm text-slate-400 italic text-center py-4">Henüz personel eklenmedi.</p>
                  )}
                  {employees.map(emp => (
                    <div key={emp.id} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg hover:border-primary/30 transition-colors">
                      <div>
                        <p className="font-medium text-slate-800 text-sm">{emp.name}</p>
                        <p className="text-xs text-slate-500">
                          {emp.onlySunday ? "Sadece Pazar Mesaisi" : (emp.canSunday ? "Normal + Pazar" : "Sadece Normal Vardiya")}
                        </p>
                      </div>
                      <Button variant="ghost" size="icon" className="text-slate-400 hover:text-destructive" onClick={() => removeEmployee(emp.id)} data-testid={`button-delete-${emp.id}`}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <Button size="lg" className="w-full shadow-md font-semibold" onClick={handleGenerate} data-testid="button-generate-schedule">
                  <CalendarDays className="w-5 h-5 mr-2" />
                  14 Haftalık Vardiya Oluştur
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Sağ Kolon: Takvim ve Özet */}
          <div className="lg:col-span-2">
            {scheduleData ? (
              <Card className="shadow-sm border-slate-200 h-full">
                <CardHeader className="flex flex-row items-center justify-between bg-slate-100/50 border-b border-slate-100">
                  <div>
                    <CardTitle className="text-xl text-slate-800">Planlama Sonuçları</CardTitle>
                    <CardDescription>14 haftalık vardiya programı başarıyla oluşturuldu.</CardDescription>
                  </div>
                  <Button variant="outline" onClick={handleDownloadCSV} className="bg-white" data-testid="button-download-csv">
                    <Download className="w-4 h-4 mr-2" />
                    Excel / CSV İndir
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  <Tabs defaultValue="schedule" className="w-full">
                    <div className="px-6 py-3 border-b border-slate-100 bg-white">
                      <TabsList className="bg-slate-100/80">
                        <TabsTrigger value="schedule">Haftalık Program</TabsTrigger>
                        <TabsTrigger value="summary">Özet Rapor & Adalet</TabsTrigger>
                      </TabsList>
                    </div>

                    <TabsContent value="schedule" className="p-0 m-0">
                      <div className="space-y-8 bg-white p-4 rounded-xl border border-slate-200">
                        
                        {/* Table 1: Weeks 1-7 */}
                        <div className="border border-[#757575] rounded-t-md overflow-hidden">
                          <div className="bg-[#212121] text-white text-center py-2 font-bold text-sm">
                            KW {scheduleData.weeks[0]?.weekNumber || 10} - KW {scheduleData.weeks[6]?.weekNumber || 16} VARDİYA LİSTESİ ({new Date().getFullYear()}-{new Date().getFullYear() + 1})
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full border-collapse bg-white text-sm">
                              <thead>
                                <tr>
                                  <th className="w-[180px] border border-[#757575] bg-white p-2 text-left"></th>
                                  {scheduleData.weeks.slice(0, 7).map((week, idx) => (
                                    <th key={idx} className="border border-[#757575] bg-white p-2 font-normal text-[#E04545] min-w-[100px] text-left align-top">
                                      KW{week.weekNumber}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                <tr>
                                  <td className="border border-[#757575] bg-[#F4F4F4] p-2 align-top">
                                    <div className="text-[#E04545] font-bold">GÜNDÜZ</div>
                                    <div className="text-xs text-[#E04545]">07:45 - 16:00</div>
                                  </td>
                                  {scheduleData.weeks.slice(0, 7).map((week, idx) => (
                                    <td key={idx} className="border border-[#757575] p-2 align-top text-slate-800">
                                      {week.morning.map(e => <div key={e.id}>{e.name.split(' ')[0]}</div>)}
                                    </td>
                                  ))}
                                </tr>
                                <tr>
                                  <td className="border border-[#757575] bg-[#F4F4F4] p-2 align-top">
                                    <div className="text-[#E04545] font-bold">AKŞAM</div>
                                    <div className="text-xs text-[#E04545]">16:00 - 00:00</div>
                                  </td>
                                  {scheduleData.weeks.slice(0, 7).map((week, idx) => (
                                    <td key={idx} className="border border-[#757575] p-2 align-top text-slate-800">
                                      {week.evening.map(e => <div key={e.id}>{e.name.split(' ')[0]}</div>)}
                                    </td>
                                  ))}
                                </tr>
                                <tr className="bg-[#D9D9D9] h-8">
                                  <td className="border border-[#757575]"></td>
                                  {scheduleData.weeks.slice(0, 7).map((_, idx) => (
                                    <td key={idx} className="border border-[#757575]"></td>
                                  ))}
                                </tr>
                                <tr>
                                  <td className="border border-[#757575] bg-[#F4F4F4] p-2 align-top">
                                    <div className="text-[#E04545] font-bold">GECE(OLURSA)</div>
                                    <div className="text-xs text-[#E04545]">00:00 - 08:00</div>
                                  </td>
                                  {scheduleData.weeks.slice(0, 7).map((week, idx) => (
                                    <td key={idx} className="border border-[#757575] p-2 align-top text-slate-800">
                                      {week.night.map(e => <div key={e.id}>{e.name.split(' ')[0]}</div>)}
                                    </td>
                                  ))}
                                </tr>
                                <tr className="bg-[#D9D9D9] h-8">
                                  <td className="border border-[#757575]"></td>
                                  {scheduleData.weeks.slice(0, 7).map((_, idx) => (
                                    <td key={idx} className="border border-[#757575]"></td>
                                  ))}
                                </tr>
                                <tr>
                                  <td className="border border-[#757575] bg-[#F4F4F4] p-2 align-top">
                                    <div className="text-[#E04545] font-bold">PAZAR</div>
                                  </td>
                                  {scheduleData.weeks.slice(0, 7).map((week, idx) => (
                                    <td key={idx} className="border border-[#757575] p-2 align-top text-slate-800">
                                      {week.sunday.map(e => <div key={e.id}>{e.name.split(' ')[0]}</div>)}
                                    </td>
                                  ))}
                                </tr>
                                <tr className="bg-[#D9D9D9] h-8">
                                  <td className="border border-[#757575]"></td>
                                  {scheduleData.weeks.slice(0, 7).map((_, idx) => (
                                    <td key={idx} className="border border-[#757575]"></td>
                                  ))}
                                </tr>
                                <tr>
                                  <td className="border border-[#757575] bg-[#F4F4F4] p-2 align-top">
                                    <div className="text-[#E04545] font-bold">CUMARTESİ MESAİ</div>
                                  </td>
                                  {scheduleData.weeks.slice(0, 7).map((week, idx) => (
                                    <td key={idx} className="border border-[#757575] p-2 align-top text-slate-800">
                                      {week.saturday.map(e => <div key={e.id}>{e.name.split(' ')[0]}</div>)}
                                    </td>
                                  ))}
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Table 2: Weeks 8-14 */}
                        {scheduleData.weeks.length > 7 && (
                          <div className="border border-[#757575] overflow-hidden">
                            <div className="overflow-x-auto">
                              <table className="w-full border-collapse bg-white text-sm">
                                <thead>
                                  <tr className="bg-[#D9D9D9] h-8">
                                    <th className="w-[180px] border border-[#757575]"></th>
                                    {scheduleData.weeks.slice(7, 14).map((_, idx) => (
                                      <th key={idx} className="border border-[#757575] min-w-[100px]"></th>
                                    ))}
                                  </tr>
                                  <tr>
                                    <th className="w-[180px] border border-[#757575] bg-white p-2 text-left"></th>
                                    {scheduleData.weeks.slice(7, 14).map((week, idx) => (
                                      <th key={idx} className="border border-[#757575] bg-white p-2 font-normal text-[#E04545] min-w-[100px] text-left align-top">
                                        KW{week.weekNumber}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  <tr>
                                    <td className="border border-[#757575] bg-[#F4F4F4] p-2 align-top">
                                      <div className="text-[#E04545] font-bold">GÜNDÜZ</div>
                                      <div className="text-xs text-[#E04545]">07:45 - 16:00</div>
                                    </td>
                                    {scheduleData.weeks.slice(7, 14).map((week, idx) => (
                                      <td key={idx} className="border border-[#757575] p-2 align-top text-slate-800">
                                        {week.morning.map(e => <div key={e.id}>{e.name.split(' ')[0]}</div>)}
                                      </td>
                                    ))}
                                  </tr>
                                  <tr>
                                    <td className="border border-[#757575] bg-[#F4F4F4] p-2 align-top">
                                      <div className="text-[#E04545] font-bold">AKŞAM</div>
                                      <div className="text-xs text-[#E04545]">16:00 - 00:00</div>
                                    </td>
                                    {scheduleData.weeks.slice(7, 14).map((week, idx) => (
                                      <td key={idx} className="border border-[#757575] p-2 align-top text-slate-800">
                                        {week.evening.map(e => <div key={e.id}>{e.name.split(' ')[0]}</div>)}
                                      </td>
                                    ))}
                                  </tr>
                                  <tr className="bg-[#D9D9D9] h-8">
                                    <td className="border border-[#757575]"></td>
                                    {scheduleData.weeks.slice(7, 14).map((_, idx) => (
                                      <td key={idx} className="border border-[#757575]"></td>
                                    ))}
                                  </tr>
                                  <tr>
                                    <td className="border border-[#757575] bg-[#F4F4F4] p-2 align-top">
                                      <div className="text-[#E04545] font-bold">GECE(OLURSA)</div>
                                      <div className="text-xs text-[#E04545]">00:00 - 08:00</div>
                                    </td>
                                    {scheduleData.weeks.slice(7, 14).map((week, idx) => (
                                      <td key={idx} className="border border-[#757575] p-2 align-top text-slate-800">
                                        {week.night.map(e => <div key={e.id}>{e.name.split(' ')[0]}</div>)}
                                      </td>
                                    ))}
                                  </tr>
                                  <tr className="bg-[#D9D9D9] h-8">
                                    <td className="border border-[#757575]"></td>
                                    {scheduleData.weeks.slice(7, 14).map((_, idx) => (
                                      <td key={idx} className="border border-[#757575]"></td>
                                    ))}
                                  </tr>
                                  <tr>
                                    <td className="border border-[#757575] bg-[#F4F4F4] p-2 align-top">
                                      <div className="text-[#E04545] font-bold">PAZAR</div>
                                    </td>
                                    {scheduleData.weeks.slice(7, 14).map((week, idx) => (
                                      <td key={idx} className="border border-[#757575] p-2 align-top text-slate-800">
                                        {week.sunday.map(e => <div key={e.id}>{e.name.split(' ')[0]}</div>)}
                                      </td>
                                    ))}
                                  </tr>
                                  <tr className="bg-[#D9D9D9] h-8">
                                    <td className="border border-[#757575]"></td>
                                    {scheduleData.weeks.slice(7, 14).map((_, idx) => (
                                      <td key={idx} className="border border-[#757575]"></td>
                                    ))}
                                  </tr>
                                  <tr>
                                    <td className="border border-[#757575] bg-[#F4F4F4] p-2 align-top">
                                      <div className="text-[#E04545] font-bold">CUMARTESİ MESAİ</div>
                                    </td>
                                    {scheduleData.weeks.slice(7, 14).map((week, idx) => (
                                      <td key={idx} className="border border-[#757575] p-2 align-top text-slate-800">
                                        {week.saturday.map(e => <div key={e.id}>{e.name.split(' ')[0]}</div>)}
                                      </td>
                                    ))}
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        {/* Personel Özet Tablosu */}
                        <div className="border border-[#757575] rounded-md overflow-hidden mt-8">
                          <div className="bg-[#212121] text-white text-center py-2 font-bold text-sm">
                            PERSONEL VARDİYA ÖZETİ
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full border-collapse bg-white text-sm">
                              <thead>
                                <tr className="bg-[#F4F4F4]">
                                  <th className="border border-[#757575] p-2 text-left text-[#E04545] font-bold">Personel</th>
                                  <th className="border border-[#757575] p-2 text-center text-[#E04545] font-bold">Gündüz</th>
                                  <th className="border border-[#757575] p-2 text-center text-[#E04545] font-bold">Akşam</th>
                                  <th className="border border-[#757575] p-2 text-center text-[#E04545] font-bold">Gece</th>
                                  <th className="border border-[#757575] p-2 text-center text-[#E04545] font-bold">Cumartesi</th>
                                  <th className="border border-[#757575] p-2 text-center text-[#E04545] font-bold">Pazar</th>
                                  <th className="border border-[#757575] p-2 text-center text-[#E04545] font-bold">Toplam</th>
                                </tr>
                              </thead>
                              <tbody>
                                {employees.map(emp => {
                                  const s = scheduleData.stats[emp.id];
                                  if(!s) return null;
                                  return (
                                    <tr key={emp.id} className="hover:bg-slate-50">
                                      <td className="border border-[#757575] p-2 font-medium">
                                        {emp.name}
                                        {emp.onlySunday && <span className="ml-2 text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-500">Sadece Pazar</span>}
                                      </td>
                                      <td className="border border-[#757575] p-2 text-center">{s.morning}</td>
                                      <td className="border border-[#757575] p-2 text-center">{s.evening}</td>
                                      <td className="border border-[#757575] p-2 text-center">{s.night}</td>
                                      <td className="border border-[#757575] p-2 text-center font-medium text-orange-600">{s.saturdayOvertime}</td>
                                      <td className="border border-[#757575] p-2 text-center font-medium text-orange-600">{s.sundayOvertime}</td>
                                      <td className="border border-[#757575] p-2 text-center font-bold">{s.total}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>

                      </div>
                    </TabsContent>

                    <TabsContent value="summary" className="p-6 m-0 space-y-6">
                      
                      <div className="bg-primary/5 border border-primary/20 rounded-xl p-5 flex items-start gap-4">
                        <CheckCircle2 className="w-6 h-6 text-primary mt-0.5 shrink-0" />
                        <div>
                          <h3 className="font-semibold text-primary mb-1">Adalet Özeti</h3>
                          <p className="text-slate-700 leading-relaxed text-sm">
                            {scheduleData.fairnessSummary}
                          </p>
                        </div>
                      </div>

                      <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                        <Table>
                          <TableHeader className="bg-slate-50">
                            <TableRow>
                              <TableHead>Personel</TableHead>
                              <TableHead className="text-center">Gündüz</TableHead>
                              <TableHead className="text-center">Akşam</TableHead>
                              <TableHead className="text-center">Gece</TableHead>
                              <TableHead className="text-center text-orange-600">Pazar Mesaisi</TableHead>
                              <TableHead className="text-center text-orange-600">Cumartesi Mesaisi</TableHead>
                              <TableHead className="text-right font-bold">Toplam</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {employees.map(emp => {
                              const s = scheduleData.stats[emp.id];
                              if(!s) return null;
                              return (
                                <TableRow key={emp.id}>
                                  <TableCell className="font-medium">
                                    {emp.name}
                                    {emp.onlySunday && <span className="ml-2 text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-500">Sadece Pazar</span>}
                                  </TableCell>
                                  <TableCell className="text-center text-slate-600">{s.morning}</TableCell>
                                  <TableCell className="text-center text-slate-600">{s.evening}</TableCell>
                                  <TableCell className="text-center text-slate-600">{s.night}</TableCell>
                                  <TableCell className="text-center text-orange-600 font-medium">{s.sundayOvertime}</TableCell>
                                  <TableCell className="text-center text-orange-600 font-medium">{s.saturdayOvertime}</TableCell>
                                  <TableCell className="text-right font-bold text-primary text-lg">{s.total}</TableCell>
                                </TableRow>
                              )
                            })}
                          </TableBody>
                        </Table>
                      </div>

                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            ) : (
              <div className="h-full border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center p-12 text-center bg-slate-50/50">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                  <CalendarDays className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-xl font-semibold text-slate-700 mb-2">Henüz Plan Oluşturulmadı</h3>
                <p className="text-slate-500 max-w-md">
                  Sol taraftaki panelden personellerinizi ekleyin ve kurallarını belirleyin. Ardından "Vardiya Oluştur" butonuna tıklayarak adil dağılımlı planınızı oluşturabilirsiniz.
                </p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}