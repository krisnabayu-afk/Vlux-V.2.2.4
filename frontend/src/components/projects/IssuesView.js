import { useState } from 'react';
import { Plus, Bug, CheckSquare, Zap, ArrowUp, ArrowRight, ArrowDown, User, Search, ArrowUpDown } from 'lucide-react';
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
  High: { icon: ArrowUp, color: 'text-red-500', badge: 'bg-red-100 text-red-700 border-red-200' },
  Medium: { icon: ArrowRight, color: 'text-orange-500', badge: 'bg-orange-100 text-orange-700 border-orange-200' },
  Low: { icon: ArrowDown, color: 'text-green-500', badge: 'bg-green-100 text-green-700 border-green-200' },
};

const statusColors = {
  'To Do': 'bg-gray-100 text-gray-700',
  'In Progress': 'bg-blue-100 text-blue-700',
  'Done': 'bg-green-100 text-green-700',
};

const IssuesView = ({ project, tasks, statuses, users, canEdit, onTaskClick, onTaskUpdate, onTaskCreate }) => {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortDir, setSortDir] = useState('desc');

  const filtered = tasks.filter((t) => {
    if (search) {
      const s = search.toLowerCase();
      if (!t.title.toLowerCase().includes(s) && !t.task_number.toLowerCase().includes(s) && !(t.description || '').toLowerCase().includes(s)) return false;
    }
    if (filterStatus !== 'all' && t.status !== filterStatus) return false;
    if (filterType !== 'all' && t.type !== filterType) return false;
    if (filterPriority !== 'all' && t.priority !== filterPriority) return false;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0;
    if (sortBy === 'created_at') {
      cmp = new Date(a.created_at) - new Date(b.created_at);
    } else if (sortBy === 'priority') {
      const order = { High: 0, Medium: 1, Low: 2 };
      cmp = (order[a.priority] || 1) - (order[b.priority] || 1);
    } else if (sortBy === 'title') {
      cmp = a.title.localeCompare(b.title);
    } else if (sortBy === 'task_number') {
      cmp = a.task_number.localeCompare(b.task_number);
    }
    return sortDir === 'desc' ? -cmp : cmp;
  });

  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDir('asc');
    }
  };

  const SortHeader = ({ field, children, className = '' }) => (
    <button
      onClick={() => toggleSort(field)}
      className={`flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors ${className}`}
    >
      {children}
      {sortBy === field && <ArrowUpDown size={12} className="text-primary" />}
    </button>
  );

  return (
    <div data-testid="issues-view">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-bold text-foreground">Issues</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{sorted.length} of {tasks.length} issue(s)</p>
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
            placeholder="Search issues..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[130px] h-9 text-sm">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {statuses.map((s) => (
              <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
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

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-[60px_80px_1fr_120px_100px_100px_120px] gap-2 px-4 py-2.5 bg-secondary/50 border-b border-border">
          <SortHeader field="type" className="justify-center">Type</SortHeader>
          <SortHeader field="task_number">Key</SortHeader>
          <SortHeader field="title">Summary</SortHeader>
          <SortHeader field="status">Status</SortHeader>
          <SortHeader field="priority">Priority</SortHeader>
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Assignee</span>
          <SortHeader field="created_at">Created</SortHeader>
        </div>

        {/* Rows */}
        {sorted.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-sm">No issues found</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {sorted.map((task) => {
              const taskType = typeConfig[task.type] || typeConfig.Task;
              const TaskTypeIcon = taskType.icon;
              const priority = priorityConfig[task.priority] || priorityConfig.Medium;
              const PriorityIcon = priority.icon;

              return (
                <div
                  key={task.id}
                  onClick={() => onTaskClick(task)}
                  className="grid grid-cols-[60px_80px_1fr_120px_100px_100px_120px] gap-2 px-4 py-3 hover:bg-secondary/30 cursor-pointer transition-colors items-center group"
                  data-testid={`issue-row-${task.id}`}
                >
                  <div className="flex justify-center">
                    <TaskTypeIcon size={16} className={taskType.color} />
                  </div>

                  <span className="text-xs font-mono font-semibold text-muted-foreground">
                    {task.task_number}
                  </span>

                  <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                    {task.title}
                  </p>

                  <Badge variant="outline" className={`text-[10px] w-fit ${statusColors[task.status] || 'bg-secondary'}`}>
                    {task.status}
                  </Badge>

                  <div className="flex items-center gap-1.5">
                    <PriorityIcon size={14} className={priority.color} />
                    <span className="text-xs text-muted-foreground">{task.priority}</span>
                  </div>

                  <div className="flex items-center">
                    {task.assignee_name ? (
                      <div className="flex items-center gap-1.5">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary uppercase">
                          {task.assignee_name.charAt(0)}
                        </div>
                        <span className="text-xs text-muted-foreground truncate">{task.assignee_name}</span>
                      </div>
                    ) : (
                      <User size={14} className="text-muted-foreground/30" />
                    )}
                  </div>

                  <span className="text-xs text-muted-foreground">
                    {new Date(task.created_at).toLocaleDateString()}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default IssuesView;
