import { useState, useEffect, useRef } from 'react';
import { Plus, Settings, GripVertical } from 'lucide-react';
import { Button } from '../ui/button';
import KanbanCard from './KanbanCard';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const KanbanBoard = ({ project, tasks, statuses, users, canEdit, onTaskClick, onTaskUpdate, onTaskCreate, onStatusReorder }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Local active copy of statuses to support optimistic UI for column reordering
  const [localStatuses, setLocalStatuses] = useState([]);
  
  useEffect(() => {
    if (Array.isArray(statuses)) {
      setLocalStatuses([...statuses].sort((a, b) => (a.order || 0) - (b.order || 0)));
    }
  }, [statuses]);

  const isAuthorized = project && (
    project.leader_id === user?.id || 
    project.created_by === user?.id || 
    user?.role === 'SuperUser' || 
    user?.role === 'VP'
  );

  // --- Task Drag State ---
  const [dragOverStatusName, setDragOverStatusName] = useState(null);
  const [draggingTaskId, setDraggingTaskId] = useState(null);

  // --- Column Drag State ---
  const dragColumnIndex = useRef(null);
  const [draggingColumnId, setDraggingColumnId] = useState(null);
  const [dragOverColumnId, setDragOverColumnId] = useState(null);

  // -----------------------
  // Task Drag Handlers
  // -----------------------
  const handleTaskDragStart = (e, task) => {
    if (!canEdit) return;
    e.stopPropagation();
    setDraggingTaskId(task.id);
    // Use text/plain for maximum compatibility across browsers/extensions
    e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'task', taskId: task.id, fromStatus: task.status }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleTaskDragEnd = () => {
    setDragOverStatusName(null);
    setDraggingTaskId(null);
  };

  // -----------------------
  // Column Drag Handlers
  // -----------------------
  const handleColumnDragStart = (e, index) => {
    if (!isAuthorized) return;
    dragColumnIndex.current = index;
    setDraggingColumnId(localStatuses[index].id);
    e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'column', index }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleColumnDragEnd = () => {
    setDraggingColumnId(null);
    setDragOverColumnId(null);
    dragColumnIndex.current = null;
  };

  // -----------------------
  // Drag Over & Leave (Container)
  // -----------------------
  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    // Differentiate behavior based on what we are dragging
    if (draggingTaskId && canEdit) {
      setDragOverStatusName(localStatuses[index]?.name);
    } else if (dragColumnIndex.current !== null && isAuthorized) {
      setDragOverColumnId(localStatuses[index]?.id);
    }
  };

  const handleDragLeave = (e) => {
    // Only clear if actually leaving the container
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOverStatusName(null);
      setDragOverColumnId(null);
    }
  };

  const handleDrop = async (e, index) => {
    e.preventDefault();
    setDragOverStatusName(null);
    setDragOverColumnId(null);

    try {
      const p = e.dataTransfer.getData('text/plain');
      if (!p) return;

      const payload = JSON.parse(p);
      
      // Case 1: Dropped a task into a column
      if (payload.type === 'task') {
        const targetStatus = localStatuses[index]?.name;
        if (targetStatus && payload.fromStatus !== targetStatus) {
          onTaskUpdate(payload.taskId, { status: targetStatus });
        }
      } 
      // Case 2: Dropped a column to reorder
      else if (payload.type === 'column') {
        const from = payload.index;
        const to = index;
        
        if (from === null || to === null || from === to) return;

        // Reorder locally
        const reordered = [...localStatuses];
        const [moved] = reordered.splice(from, 1);
        reordered.splice(to, 0, moved);
        setLocalStatuses(reordered);

        // Persist to backend
        try {
          if (onStatusReorder) {
            await onStatusReorder(reordered);
          }
        } catch (err) {
          toast.error('Failed to save column order');
          // Rollback
          setLocalStatuses([...statuses].sort((a, b) => (a.order || 0) - (b.order || 0)));
        }
      }
      // Case 3: Legacy or Malformed
      else if (payload.taskId && payload.fromStatus) {
        const targetStatus = localStatuses[index]?.name;
        if (targetStatus && payload.fromStatus !== targetStatus) {
          onTaskUpdate(payload.taskId, { status: targetStatus });
        }
      }
    } catch (err) {
      console.error('Drop error:', err);
    } finally {
      setDraggingTaskId(null);
      setDraggingColumnId(null);
      dragColumnIndex.current = null;
    }
  };

  return (
    <div data-testid="kanban-board">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-foreground">Board</h2>
          {isAuthorized && (
            <Button 
              variant="outline" 
              size="sm" 
              className="h-7 text-[10px] px-2 gap-1.5"
              onClick={() => navigate(`/projects/${project.id}/settings`)}
            >
              <Settings size={12} />
              Manage Columns
            </Button>
          )}
        </div>
        {canEdit && (
          <Button onClick={() => onTaskCreate()} size="sm" className="shadow-sm">
            <Plus size={16} className="mr-1" />
            Create Issue
          </Button>
        )}
      </div>

      {/* Columns Container */}
      <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: 'calc(100vh - 200px)' }}>
        {localStatuses.map((status, index) => {
          const columnTasks = (tasks || []).filter((t) => t.status === status.name);
          
          const isTaskHovered = dragOverStatusName === status.name && draggingTaskId !== null;
          const isColumnHovered = dragOverColumnId === status.id && draggingColumnId !== null && draggingColumnId !== status.id;
          const isBeingDragged = draggingColumnId === status.id;

          return (
            <div
              key={status.id}
              draggable={isAuthorized && !draggingTaskId && canEdit}
              onDragStart={(e) => handleColumnDragStart(e, index)}
              onDragEnd={handleColumnDragEnd}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, index)}
              className={`flex-shrink-0 w-[300px] bg-secondary/50 rounded-xl flex flex-col transition-all duration-200 border border-transparent
                ${isTaskHovered ? 'ring-2 ring-primary/40 bg-primary/5 border-primary/20' : ''}
                ${isColumnHovered ? 'ring-2 ring-primary/60 scale-[1.02] bg-secondary border-primary/30' : ''}
                ${isBeingDragged ? 'opacity-40' : 'opacity-100'}`}
              data-testid={`kanban-column-${status.name}`}
            >
              {/* Column Header */}
              <div 
                className={`px-3 py-3 flex items-center justify-between ${isAuthorized ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}`}
              >
                <div className="flex items-center gap-2">
                  {isAuthorized && (
                    <GripVertical size={14} className="text-muted-foreground/40" />
                  )}
                  <div
                    className="w-2.5 h-2.5 rounded-full shadow-sm"
                    style={{ backgroundColor: status.color }}
                  />
                  <span className="text-sm font-semibold text-foreground uppercase tracking-wide">
                    {status.name}
                  </span>
                  <span className="text-xs text-muted-foreground bg-background rounded-full px-2 py-0.5 font-medium shadow-sm">
                    {columnTasks.length}
                  </span>
                </div>
              </div>

              {/* Cards Area */}
              <div className="px-2 pb-2 flex-1 space-y-2 overflow-y-auto custom-scrollbar min-h-[100px]">
                {columnTasks.map((task) => (
                  <KanbanCard
                    key={task.id}
                    task={task}
                    isDragging={draggingTaskId === task.id}
                    onDragStart={handleTaskDragStart}
                    onDragEnd={handleTaskDragEnd}
                    onClick={() => onTaskClick(task)}
                  />
                ))}

                {columnTasks.length === 0 && (
                  <div className={`text-center py-8 text-xs text-muted-foreground/50 rounded-lg border-2 border-dashed transition-colors
                    ${isTaskHovered ? 'border-primary/30 bg-primary/5' : 'border-transparent'}`}>
                    {isTaskHovered ? 'Drop task here' : 'No issues'}
                  </div>
                )}
              </div>

              {/* Quick Add Footer */}
              {canEdit && (
                <div className="p-2 pt-0 mt-auto">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-muted-foreground hover:text-primary hover:bg-primary/5 h-8 font-medium text-xs rounded-lg"
                    onClick={(e) => {
                       e.stopPropagation();
                       onTaskCreate({ status: status.name });
                    }}
                  >
                    <Plus size={14} className="mr-1.5" />
                    Quick Add
                  </Button>
                </div>
              )}
            </div>
          );
        })}

        {localStatuses.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center p-10 border-2 border-dashed border-border rounded-xl text-muted-foreground">
            <p className="text-sm">No columns defined for this project.</p>
            {isAuthorized && (
              <Button 
                variant="link" 
                className="mt-2 text-primary"
                onClick={() => navigate(`/projects/${project.id}/settings`)}
              >
                Go to Settings to add columns
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default KanbanBoard;
