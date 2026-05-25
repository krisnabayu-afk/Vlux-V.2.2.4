import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  format, 
  addDays, 
  eachDayOfInterval, 
  startOfDay, 
  isSameDay, 
  isToday, 
  differenceInDays, 
  addMonths, 
  startOfMonth, 
  endOfMonth,
  eachMonthOfInterval,
  startOfWeek,
  endOfWeek,
  eachWeekOfInterval,
  isSameMonth,
  addWeeks
} from 'date-fns';
import { formatDate, parseDate } from '../../lib/utils';
import { 
  ChevronLeft, 
  ChevronRight, 
  Users, 
  ListTodo, 
  CalendarDays,
  CalendarRange,
  CalendarFold,
  Maximize2,
  Minimize2,
  Plus
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

const TimelineView = ({ project, tasks, statuses, users, onTaskClick, onTaskUpdate, onTaskCreate }) => {
  const [viewMode, setViewMode] = useState('Day'); // Day, Week, Month
  const [groupBy, setGroupBy] = useState('Status'); // Status, Assignee
  const [currentDate, setCurrentDate] = useState(new Date());
  const [draggingTask, setDraggingTask] = useState(null);
  const [resizingTask, setResizingTask] = useState(null); // 'start' or 'end'
  const containerRef = useRef(null);

  // --- Date Range Calculation ---
  const { dateRange, days } = useMemo(() => {
    let start, end;
    if (viewMode === 'Day') {
      start = startOfWeek(addDays(currentDate, -7));
      end = addDays(start, 28); // 4 weeks
    } else if (viewMode === 'Week') {
      start = startOfWeek(addMonths(currentDate, -1));
      end = addWeeks(start, 20); // 20 weeks
    } else {
      start = startOfMonth(addMonths(currentDate, -3));
      end = addMonths(start, 12); // 1 year
    }
    
    const dayInterval = eachDayOfInterval({ start, end });
    return { dateRange: { start, end }, days: dayInterval };
  }, [currentDate, viewMode]);

  // --- Grouping Logic ---
  const groups = useMemo(() => {
    if (groupBy === 'Status') {
      return statuses.map(s => ({
        id: s.id,
        name: s.name,
        color: s.color,
        tasks: tasks.filter(t => t.status === s.name)
      }));
    } else {
      const assigned = users.map(u => ({
        id: u.id,
        name: u.username,
        color: '#3b82f6',
        tasks: tasks.filter(t => t.assignee_id === u.id)
      }));
      const unassigned = {
        id: 'unassigned',
        name: 'Unassigned',
        color: '#6b7280',
        tasks: tasks.filter(t => !t.assignee_id)
      };
      return [...assigned, unassigned].filter(g => g.tasks.length > 0 || g.id === 'unassigned');
    }
  }, [groupBy, tasks, statuses, users]);

  // --- Interaction Handlers ---
  const handleMouseDown = (e, task, type) => {
    e.stopPropagation();
    if (type === 'move') {
      setDraggingTask({ 
        task, 
        startX: e.clientX, 
        originalStart: parseDate(task.start_date) || new Date(),
        originalEnd: parseDate(task.end_date) || addDays(new Date(), 1)
      });
    } else {
      setResizingTask({ 
        task, 
        type, 
        startX: e.clientX,
        originalDate: type === 'start' ? (parseDate(task.start_date) || new Date()) : (parseDate(task.end_date) || addDays(new Date(), 1))
      });
    }
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!draggingTask && !resizingTask) return;

      const cellWidth = 40; // Approx px per day in Day view
      const diffX = e.clientX - (draggingTask?.startX || resizingTask?.startX);
      const dayDiff = Math.round(diffX / cellWidth);

      if (dayDiff === 0) return;

      if (draggingTask) {
        // Debounce update or just show ghost? For simplicity, we'll update on mouseup
      }
    };

    const handleMouseUp = (e) => {
      if (draggingTask) {
        const cellWidth = 40;
        const dayDiff = Math.round((e.clientX - draggingTask.startX) / cellWidth);
        const newStart = addDays(draggingTask.originalStart, dayDiff);
        const newEnd = addDays(draggingTask.originalEnd, dayDiff);
        
        onTaskUpdate(draggingTask.task.id, { 
          start_date: formatDate(newStart),
          end_date: formatDate(newEnd)
        });
        setDraggingTask(null);
      }
      if (resizingTask) {
        const cellWidth = 40;
        const dayDiff = Math.round((e.clientX - resizingTask.startX) / cellWidth);
        const newDate = addDays(resizingTask.originalDate, dayDiff);
        
        const updates = resizingTask.type === 'start' 
          ? { start_date: formatDate(newDate) }
          : { end_date: formatDate(newDate) };
          
        onTaskUpdate(resizingTask.task.id, updates);
        setResizingTask(null);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingTask, resizingTask, onTaskUpdate]);

  // --- Rendering Helpers ---
  const getTaskPos = (task) => {
    const start = parseDate(task.start_date) || new Date();
    const end = parseDate(task.end_date) || addDays(new Date(), 1);
    
    const leftDays = differenceInDays(start, dateRange.start);
    const widthDays = differenceInDays(end, start) + 1;
    
    return {
      left: `${leftDays * 40}px`,
      width: `${widthDays * 40}px`
    };
  };

  return (
    <div className="flex flex-col h-full bg-background rounded-xl border border-border shadow-sm overflow-hidden" data-testid="timeline-view">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-card/50">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 bg-secondary/50 p-1 rounded-lg">
            <Button 
              variant={viewMode === 'Day' ? 'secondary' : 'ghost'} 
              size="sm" 
              onClick={() => setViewMode('Day')}
              className="h-8 px-3 text-xs"
            >
              Day
            </Button>
            <Button 
              variant={viewMode === 'Week' ? 'secondary' : 'ghost'} 
              size="sm" 
              onClick={() => setViewMode('Week')}
              className="h-8 px-3 text-xs"
            >
              Week
            </Button>
            <Button 
              variant={viewMode === 'Month' ? 'secondary' : 'ghost'} 
              size="sm" 
              onClick={() => setViewMode('Month')}
              className="h-8 px-3 text-xs"
            >
              Month
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentDate(addDays(currentDate, -14))}>
              <ChevronLeft size={16} />
            </Button>
            <h3 className="text-sm font-semibold min-w-32 text-center">
              {format(currentDate, 'MMMM yyyy')}
            </h3>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentDate(addDays(currentDate, 14))}>
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Select value={groupBy} onValueChange={setGroupBy}>
            <SelectTrigger className="w-36 h-8 text-xs">
              <div className="flex items-center gap-2">
                {groupBy === 'Status' ? <ListTodo size={14} /> : <Users size={14} />}
                <SelectValue />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Status">Group by Status</SelectItem>
              <SelectItem value="Assignee">Group by Assignee</SelectItem>
            </SelectContent>
          </Select>

          <Button size="sm" className="h-8 text-xs shadow-sm" onClick={onTaskCreate}>
            <Plus size={14} className="mr-1" />
            New Task
          </Button>
        </div>
      </div>

      {/* Gantt Area */}
      <div className="flex-1 overflow-auto custom-scrollbar" ref={containerRef}>
        <div className="inline-block min-w-full">
          {/* Calendar Header */}
          <div className="flex sticky top-0 z-20 bg-card border-b border-border shadow-sm">
            <div className="w-64 flex-shrink-0 border-r border-border p-4 bg-card/80 backdrop-blur-sm">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                {groupBy === 'Status' ? 'Status' : 'Assignee'}
              </span>
            </div>
            <div className="flex">
              {days.map((day, i) => (
                <div 
                  key={i} 
                  className={`w-10 h-14 flex-shrink-0 flex flex-col items-center justify-center border-r border-border/50 text-[10px]
                  ${isToday(day) ? 'bg-[hsl(100,100%,50%,0.15)]' : ''}
                  ${day.getDay() === 0 || day.getDay() === 6 ? 'bg-secondary/20' : ''}`}
                >
                  <span className="text-muted-foreground font-medium">{format(day, 'EEE')}</span>
                  <span className={`mt-1 font-bold w-6 h-6 flex items-center justify-center rounded-full ${isToday(day) ? 'bg-[hsl(100,100%,50%)] text-black' : 'text-foreground'}`}>
                    {format(day, 'd')}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Groups & Tasks - Discrete Rows Per Task */}
          {groups.map((group) => (
            <div key={group.id}>
              {/* Group Header */}
              <div className="flex border-b border-border/50 bg-secondary/5 hover:bg-secondary/10 transition-colors">
                <div className="w-64 flex-shrink-0 border-r border-border p-3 flex flex-col justify-center">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: group.color }} />
                    <span className="text-sm font-semibold truncate text-foreground">{group.name}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground ml-4">{group.tasks.length} task{group.tasks.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="flex-1 border-l border-border/30"></div>
              </div>

              {/* Individual Task Rows */}
              {group.tasks.map((task, taskIndex) => {
                const pos = getTaskPos(task);
                const taskColor = task.color_hex || '#3b82f6';
                
                return (
                  <div key={task.id} className="flex border-b border-border/30 hover:bg-primary/5 transition-colors group/task">
                    {/* Task Label Cell */}
                    <div className="w-64 flex-shrink-0 border-r border-border p-2 flex flex-col justify-center text-xs">
                      <span className="font-mono font-bold text-muted-foreground">{task.task_number}</span>
                      <span className="font-medium text-foreground truncate">{task.title}</span>
                    </div>
                    
                    {/* Task Timeline Cell */}
                    <div className="relative flex-1 min-h-[48px] py-1.5">
                      {/* Vertical grid lines */}
                      <div className="absolute inset-0 flex pointer-events-none">
                        {days.map((day, i) => (
                          <div key={i} className={`w-10 flex-shrink-0 border-r border-border/20 ${day.getDay() === 0 || day.getDay() === 6 ? 'bg-secondary/5' : ''}`} />
                        ))}
                      </div>

                      {/* Today marker */}
                      <div 
                        className="absolute top-0 bottom-0 w-0.5 bg-[hsl(100,100%,50%)] z-10 opacity-60" 
                        style={{ left: `${differenceInDays(startOfDay(new Date()), dateRange.start) * 40 + 20}px` }}
                      />

                      {/* Due Date marker */}
                      {project.due_date && (
                        <div 
                          className="absolute top-0 bottom-0 w-[2px] bg-red-500 z-20 shadow-[0_0_8px_rgba(239,68,68,0.6)]" 
                          style={{ left: `${differenceInDays(parseDate(project.due_date), dateRange.start) * 40 + 20}px` }}
                          title={`Deadline: ${new Date(project.due_date).toLocaleDateString()}`}
                        />
                      )}

                      {/* Task Bar */}
                      {task.start_date && (
                        <div 
                          className="absolute h-8 rounded-md shadow-md border-2 flex items-center px-2 cursor-move group/bar hover:shadow-lg transition-all z-10"
                          style={{ 
                            left: pos.left, 
                            width: pos.width,
                            backgroundColor: taskColor + '20',
                            borderColor: taskColor,
                            top: '50%',
                            transform: 'translateY(-50%)'
                          }}
                          onClick={(e) => { e.stopPropagation(); onTaskClick(task); }}
                          onMouseDown={(e) => handleMouseDown(e, task, 'move')}
                        >
                          {/* Resize handles */}
                          <div 
                            className="absolute left-0 top-0 bottom-0 w-1.5 cursor-ew-resize hover:bg-opacity-100 rounded-l-md opacity-0 group-hover/bar:opacity-100 transition-opacity"
                            style={{ backgroundColor: taskColor + '50' }}
                            onMouseDown={(e) => handleMouseDown(e, task, 'start')}
                          />
                          <div 
                            className="absolute right-0 top-0 bottom-0 w-1.5 cursor-ew-resize hover:bg-opacity-100 rounded-r-md opacity-0 group-hover/bar:opacity-100 transition-opacity"
                            style={{ backgroundColor: taskColor + '50' }}
                            onMouseDown={(e) => handleMouseDown(e, task, 'end')}
                          />

                          <span className="text-[10px] font-bold truncate text-foreground select-none">
                            {task.title}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TimelineView;
