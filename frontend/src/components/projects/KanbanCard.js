import { Bug, CheckSquare, Zap, ArrowUp, ArrowRight, ArrowDown, User } from 'lucide-react';
import { Badge } from '../ui/badge';

const typeConfig = {
  Task: { icon: CheckSquare, color: 'text-blue-500', bg: 'bg-blue-50' },
  Bug: { icon: Bug, color: 'text-red-500', bg: 'bg-red-50' },
  Story: { icon: Zap, color: 'text-green-500', bg: 'bg-green-50' },
};

const priorityConfig = {
  High: { icon: ArrowUp, color: 'text-red-500', label: 'High' },
  Medium: { icon: ArrowRight, color: 'text-orange-500', label: 'Medium' },
  Low: { icon: ArrowDown, color: 'text-green-500', label: 'Low' },
};

/**
 * Strip Markdown formatting from a string to produce plain text.
 * Removes: headers, bold/italic markers, links, images, code fences,
 * blockquotes, list markers, horizontal rules, inline code backticks.
 */
const stripMarkdown = (text) => {
  if (!text) return '';
  return text
    .replace(/^#{1,6}\s+/gm, '')          // headers
    .replace(/!\[.*?\]\(.*?\)/g, '')       // images
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // links → keep text
    .replace(/```[\s\S]*?```/g, '')        // code blocks
    .replace(/`([^`]*)`/g, '$1')           // inline code → keep content
    .replace(/(\*\*|__)(.*?)\1/g, '$2')    // bold
    .replace(/(\*|_)(.*?)\1/g, '$2')       // italic
    .replace(/~~(.*?)~~/g, '$1')           // strikethrough
    .replace(/^\s*[-*+]\s+/gm, '')         // unordered list markers
    .replace(/^\s*\d+\.\s+/gm, '')         // ordered list markers
    .replace(/^\s*>\s*/gm, '')             // blockquotes
    .replace(/^---+$/gm, '')               // horizontal rules
    .replace(/\|/g, ' ')                   // table pipes
    .replace(/\n+/g, ' ')                  // collapse newlines
    .replace(/\s+/g, ' ')                  // collapse whitespace
    .trim();
};

/**
 * Get the first meaningful line of a description for preview.
 */
const getDescriptionPreview = (description) => {
  if (!description) return '';
  // Take the first non-empty line
  const firstLine = description.split('\n').find(line => line.trim().length > 0) || '';
  return stripMarkdown(firstLine);
};

const KanbanCard = ({ task, isDragging, onDragStart, onDragEnd, onClick }) => {
  const taskType = typeConfig[task.type] || typeConfig.Task;
  const TaskTypeIcon = taskType.icon;
  const priority = priorityConfig[task.priority] || priorityConfig.Medium;
  const PriorityIcon = priority.icon;
  const descPreview = getDescriptionPreview(task.description);

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, task)}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={`bg-card border border-border rounded-lg p-3 cursor-pointer hover:shadow-md hover:border-primary/20 transition-all duration-200 group
        ${isDragging ? 'opacity-40 rotate-2 scale-95' : 'opacity-100'}`}
      data-testid={`kanban-card-${task.id}`}
    >
      {/* Task number and type */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <TaskTypeIcon size={14} className={taskType.color} />
          <span className="text-xs font-mono font-semibold text-muted-foreground">
            {task.task_number}
          </span>
        </div>
        <PriorityIcon size={14} className={priority.color} />
      </div>

      {/* Title */}
      <p className="text-sm font-medium text-foreground leading-snug mb-1 group-hover:text-primary transition-colors line-clamp-2">
        {task.title}
      </p>

      {/* Description Preview */}
      {descPreview && (
        <p className="text-[11px] text-muted-foreground/70 leading-snug mb-3 line-clamp-1 truncate">
          {descPreview}
        </p>
      )}
      {!descPreview && <div className="mb-3" />}

      {/* Footer */}
      <div className="flex items-center justify-between mt-auto">
        <div className="flex items-center gap-2">
           <Badge
            variant="outline"
            className={`text-[10px] px-1.5 py-0 rounded ${
              task.priority === 'High' ? 'border-red-500 text-red-600 bg-red-50' :
              task.priority === 'Medium' ? 'border-yellow-500 text-yellow-600 bg-yellow-50' :
              'border-blue-500 text-blue-600 bg-blue-50'
            }`}
          >
            {task.priority}
          </Badge>
          <Badge
            variant="outline"
            className={`text-[10px] px-1.5 py-0 ${
              task.type === 'Bug' ? 'border-red-200 text-red-600 bg-red-50' :
              task.type === 'Story' ? 'border-green-200 text-green-600 bg-green-50' :
              'border-blue-200 text-blue-600 bg-blue-50'
            }`}
          >
            {task.type}
          </Badge>
        </div>

        {task.assignee_name ? (
          <div className="flex items-center gap-1.5" title={task.assignee_name}>
            <div className="w-6 h-6 rounded-full bg-primary/20 border border-primary/20 flex items-center justify-center text-[10px] font-bold text-primary uppercase shadow-sm">
              {task.assignee_name.charAt(0)}
            </div>
          </div>
        ) : (
          <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center border border-border">
            <User size={12} className="text-muted-foreground" />
          </div>
        )}
      </div>
    </div>
  );
};

export default KanbanCard;
