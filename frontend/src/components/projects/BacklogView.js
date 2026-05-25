import { useState } from 'react';
import { Plus, Bug, CheckSquare, Zap, ArrowUp, ArrowRight, ArrowDown, User, Search } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

const typeConfig = {
  Task: { icon: CheckSquare, color: 'text-blue-500' },
  Bug: { icon: Bug, color: 'text-red-500' },
  Story: { icon: Zap, color: 'text-green-500' },
};

const priorityConfig = {
  High: { icon: ArrowUp, color: 'text-red-500' },
  Medium: { icon: ArrowRight, color: 'text-orange-500' },
  Low: { icon: ArrowDown, color: 'text-green-500' },
};

const statusColors = {
  'To Do': 'bg-gray-100 text-gray-700',
  'In Progress': 'bg-blue-100 text-blue-700',
  'Done': 'bg-green-100 text-green-700',
};

const BacklogView = ({ project, tasks, statuses, users, canEdit, onTaskClick, onTaskUpdate, onTaskCreate }) => {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');

  // Filter out "Done" tasks for backlog - show everything else
  const backlogTasks = tasks.filter((t) => {
    if (t.status === 'Done') return false;
    if (search) {
      const s = search.toLowerCase();
      if (!t.title.toLowerCase().includes(s) && !t.task_number.toLowerCase().includes(s)) return false;
    }
    if (filterType !== 'all' && t.type !== filterType) return false;
    if (filterPriority !== 'all' && t.priority !== filterPriority) return false;
    return true;
  });

  return (
    <div data-testid="backlog-view">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-bold text-foreground">Backlog</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{backlogTasks.length} issue(s)</p>
        </div>
        {canEdit && (
          <Button onClick={onTaskCreate} size="sm" className="shadow-sm">
            <Plus size={16} className="mr-1" />
            Create Issue
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
          <Input
            className="pl-9 h-9 text-sm"
            placeholder="Search backlog..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[120px] h-9 text-sm">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="Task">Task</SelectItem>
            <SelectItem value="Bug">Bug</SelectItem>
            <SelectItem value="Story">Story</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-[130px] h-9 text-sm">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priority</SelectItem>
            <SelectItem value="High">High</SelectItem>
            <SelectItem value="Medium">Medium</SelectItem>
            <SelectItem value="Low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Task List */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {backlogTasks.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-sm">No issues in backlog</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {backlogTasks.map((task) => {
              const taskType = typeConfig[task.type] || typeConfig.Task;
              const TaskTypeIcon = taskType.icon;
              const priority = priorityConfig[task.priority] || priorityConfig.Medium;
              const PriorityIcon = priority.icon;

              return (
                <div
                  key={task.id}
                  onClick={() => onTaskClick(task)}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 cursor-pointer transition-colors group"
                  data-testid={`backlog-row-${task.id}`}
                >
                  <TaskTypeIcon size={16} className={taskType.color} />

                  <span className="text-xs font-mono font-semibold text-muted-foreground w-[80px] flex-shrink-0">
                    {task.task_number}
                  </span>

                  <p className="flex-1 text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                    {task.title}
                  </p>

                  <Select
                    value={task.status}
                    disabled={!canEdit}
                    onValueChange={(v) => {
                      onTaskUpdate(task.id, { status: v });
                    }}
                  >
                    <SelectTrigger
                      className="h-7 text-xs w-[120px] border-0 bg-transparent hover:bg-secondary"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Badge variant="outline" className={`text-[10px] ${statusColors[task.status] || ''}`}>
                        {task.status}
                      </Badge>
                    </SelectTrigger>
                    <SelectContent>
                      {statuses.map((s) => (
                        <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <PriorityIcon size={16} className={priority.color} />

                  {task.assignee_name ? (
                    <div
                      className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary uppercase flex-shrink-0"
                      title={task.assignee_name}
                    >
                      {task.assignee_name.charAt(0)}
                    </div>
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                      <User size={12} className="text-muted-foreground" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default BacklogView;
