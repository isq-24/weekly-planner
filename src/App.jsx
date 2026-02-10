import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Calendar, CheckSquare, Square, Printer, RotateCcw, Loader } from 'lucide-react';
import { startOfWeek, addDays, format } from 'date-fns';
import { ko } from 'date-fns/locale';

// 구글 Apps Script 웹 앱 URL
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzssMwrDnQdhQSAn7tZSfqe7ZbptzgRWWn-BdORa9bIV89C9xr1x-yHiWSZ0QSkTrHT/exec";

// 현재 주의 날짜를 기반으로 요일 배열 생성
const getWeekDays = () => {
  const today = new Date();
  const startOfThisWeek = startOfWeek(today, { weekStartsOn: 1 }); // 월요일 시작

  const weekDayKeys = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

  return weekDayKeys.map((key, index) => {
    const date = addDays(startOfThisWeek, index);
    return {
      key,
      label: format(date, 'M/d (EEE)', { locale: ko }) // 예: 5/27 (월)
    };
  });
};

const App = () => {
  // 동적으로 생성된 요일 배열 사용
  const days = getWeekDays();

  // 초기 상태 정의
  const [tasks, setTasks] = useState(() => {
    const initial = {};
    days.forEach(day => initial[day.key] = []);
    return initial;
  });
  const [weekGoal, setWeekGoal] = useState('');
  const [memo, setMemo] = useState('');
  const [currentInput, setCurrentInput] = useState({ day: '', text: '' });
  
  // 로딩 및 저장 상태 관리
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // 1. 처음 실행 시 구글 시트에서 데이터 불러오기
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(GOOGLE_SCRIPT_URL);
        const data = await response.json();
        
        if (data) {
            // 데이터 구조가 일치하는지 확인하고, 비어있지 않은 경우에만 상태 설정
            if (data.tasks && Object.keys(data.tasks).length > 0) {
                setTasks(data.tasks);
            }
            if (data.weekGoal) setWeekGoal(data.weekGoal);
            if (data.memo) setMemo(data.memo);
        }
      } catch (error) {
        console.error("데이터 로드 실패:", error);
        alert("데이터를 불러오는데 실패했습니다. 구글 시트 URL을 확인해주세요.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // 2. 데이터 저장 함수
    const saveDataToSheet = async (newTasks, newGoal, newMemo) => {
    if(isLoading) return; // 데이터 로딩 중에는 저장 방지
    setIsSaving(true);
    try {
      await fetch(GOOGLE_SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tasks: newTasks,
          weekGoal: newGoal,
          memo: newMemo
        }),
      });
    } catch (error) {
      console.error("저장 실패:", error);
      alert("데이터 저장에 실패했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  // 데이터 변경 시 자동 저장 (Debounce)
  useEffect(() => {
    if (isLoading) return;

    const handler = setTimeout(() => {
      saveDataToSheet(tasks, weekGoal, memo);
    }, 1500); // 1.5초 후 저장

    return () => {
      clearTimeout(handler);
    };
  }, [tasks, weekGoal, memo]);


  // --- 핸들러 함수들 ---

  const addTask = (dayKey) => {
    if (!currentInput.text.trim() || currentInput.day !== dayKey) return;
    const newTask = { id: Date.now(), text: currentInput.text, completed: false };
    setTasks(prev => ({ ...prev, [dayKey]: [...prev[dayKey], newTask] }));
    setCurrentInput({ day: '', text: '' });
  };

  const toggleTask = (dayKey, taskId) => {
    setTasks(prev => ({
      ...prev,
      [dayKey]: prev[dayKey].map(task => 
        task.id === taskId ? { ...task, completed: !task.completed } : task
      )
    }));
  };

  const deleteTask = (dayKey, taskId) => {
    setTasks(prev => ({
      ...prev,
      [dayKey]: prev[dayKey].filter(task => task.id !== taskId)
    }));
  };

  const resetAll = () => {
    if (window.confirm('모든 할 일과 메모를 초기화하시겠습니까? (구글 시트 데이터도 변경됩니다)')) {
      const initialTasks = {};
      days.forEach(day => initialTasks[day.key] = []);
      setTasks(initialTasks);
      setWeekGoal('');
      setMemo('');
      // 초기화된 상태를 즉시 저장
      saveDataToSheet(initialTasks, '', '');
    }
  };

  const handlePrint = () => window.print();

  // --- 화면 렌더링 ---

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <Loader className="w-10 h-10 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600">주간 계획 데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8 font-sans print:bg-white print:p-0">
      <div className="max-w-5xl mx-auto bg-white shadow-xl rounded-xl overflow-hidden print:shadow-none print:max-w-none">
        
        {/* Header */}
        <header className="bg-indigo-600 p-6 text-white flex justify-between items-center print:bg-white print:text-black print:border-b-2 print:border-gray-300">
          <div className="flex items-center space-x-3">
            <Calendar className="w-8 h-8" />
            <h1 className="text-2xl font-bold">주간 할 일 플래너</h1>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="text-sm font-medium mr-2 flex items-center print:hidden">
              {isSaving ? (
                <span className="text-indigo-200 flex items-center"><Loader className="w-3 h-3 animate-spin mr-1"/> 저장 중...</span>
              ) : (
                <span className="text-indigo-200 opacity-80">☁️ 자동 저장됨</span>
              )}
            </div>

            <div className="flex space-x-2 print:hidden">
              <button onClick={resetAll} title="모든 데이터 초기화" className="flex items-center space-x-1 px-3 py-2 bg-indigo-700 hover:bg-indigo-800 rounded-lg transition text-sm">
                <RotateCcw className="w-4 h-4" />
                <span>초기화</span>
              </button>
              <button onClick={handlePrint} title="플래너 인쇄" className="flex items-center space-x-1 px-3 py-2 bg-white text-indigo-600 hover:bg-gray-100 rounded-lg transition text-sm font-semibold">
                <Printer className="w-4 h-4" />
                <span>인쇄</span>
              </button>
            </div>
          </div>
        </header>

        {/* Weekly Goal Area */}
        <section className="p-6 border-b border-gray-200 bg-indigo-50 print:bg-white print:border-b">
          <label htmlFor="week-goal" className="block text-sm font-bold text-indigo-900 mb-2">🏆 이번 주 목표</label>
          <input 
            id="week-goal"
            type="text" 
            value={weekGoal}
            onChange={(e) => setWeekGoal(e.target.value)}
            placeholder="이번 주의 가장 중요한 목표를 설정해보세요..."
            className="w-full p-3 border border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white print:border-gray-300"
          />
        </section>

        {/* Main Grid */}
        <main className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6 print:grid-cols-2 print:gap-4">
          {days.map((day) => (
            <section key={day.key} className="bg-gray-50 rounded-xl border border-gray-200 flex flex-col h-full print:bg-white print:border-gray-300">
              <h2 className="p-3 border-b border-gray-200 bg-gray-100 font-semibold text-gray-700 flex justify-between items-center print:bg-gray-50">
                <span>{day.label}</span>
                <span className="text-xs bg-white px-2 py-1 rounded-full text-gray-500 border border-gray-200 print:hidden">
                  {tasks[day.key]?.filter(t => t.completed).length || 0}/{tasks[day.key]?.length || 0}
                </span>
              </h2>
              
              <div className="p-3 flex-grow min-h-[150px]">
                {tasks[day.key]?.length === 0 ? (
                  <div className="text-center text-gray-400 text-sm py-8 print:hidden">할 일이 비어있습니다.</div>
                ) : (
                  <ul className="space-y-2">
                    {tasks[day.key]?.map((task) => (
                      <li key={task.id} className="group flex items-start space-x-2 bg-white p-2 rounded shadow-sm border border-transparent hover:border-indigo-100 print:shadow-none print:border-0">
                        <button onClick={() => toggleTask(day.key, task.id)} className={`mt-0.5 flex-shrink-0 transition-colors ${task.completed ? 'text-green-500' : 'text-gray-300 hover:text-indigo-400'}`}>
                          {task.completed ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                        </button>
                        <span className={`flex-grow text-sm break-all ${task.completed ? 'text-gray-400 line-through' : 'text-gray-800'}`}>{task.text}</span>
                        <button onClick={() => deleteTask(day.key, task.id)} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-opacity print:hidden">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="p-3 border-t border-gray-200 bg-white rounded-b-xl print:hidden">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={currentInput.day === day.key ? currentInput.text : ''}
                    onChange={(e) => setCurrentInput({ day: day.key, text: e.target.value })}
                    onKeyPress={(e) => e.key === 'Enter' && addTask(day.key)}
                    placeholder="새로운 할 일..."
                    className="flex-grow text-sm p-2 border border-gray-200 rounded focus:outline-none focus:border-indigo-500"
                  />
                  <button onClick={() => addTask(day.key)} className="p-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50" disabled={!currentInput.text.trim() || currentInput.day !== day.key}>
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </section>
          ))}

          {/* Memo Section */}
          <section className="bg-yellow-50 rounded-xl border border-yellow-200 flex flex-col h-full md:col-span-2 lg:col-span-1 print:bg-white print:border-gray-300">
            <h2 className="p-3 border-b border-yellow-200 bg-yellow-100 font-semibold text-yellow-800 print:bg-gray-50 print:text-black print:border-gray-300">
              📝 주간 메모 및 회고
            </h2>
            <div className="p-3 flex-grow h-full">
              <textarea
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="이번 주에 대한 생각, 아이디어, 감사한 일 등을 자유롭게 기록해보세요."
                className="w-full h-full min-h-[150px] bg-transparent resize-none focus:outline-none text-sm leading-relaxed"
              ></textarea>
            </div>
          </section>
        </main>
        
        <footer className="p-4 text-center text-xs text-gray-400 bg-gray-50 border-t print:hidden">
          데이터는 Google Sheet와 실시간으로 동기화됩니다.
        </footer>
      </div>
    </div>
  );
};

export default App;
