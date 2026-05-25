import { useState, useRef } from 'react';
import { Bug, CheckSquare, Zap, ArrowUp, ArrowRight, ArrowDown, User, Send, Trash2, Calendar, MessageSquare, X, Pencil, History as HistoryIcon } from 'lucide-react';
import { formatDate } from '../../lib/utils';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { UserCombobox, SearchableSelectCombobox } from '../SelectionComponents';
import { Badge } from '../ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../ui/sheet';
import { Separator } from '../ui/separator';
import MarkdownToolbar from './MarkdownToolbar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { useAuth } from '../../context/AuthContext';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '../ui/tooltip';
import MarkdownView from './MarkdownView';

const typeConfig = {
  Task: { icon: CheckSquare, color: 'text-blue-500', bg: 'bg-blue-50 border-blue-200' },
  Bug: { icon: Bug, color: 'text-red-500', bg: 'bg-red-50 border-red-200' },
  Story: { icon: Zap, color: 'text-green-500', bg: 'bg-green-50 border-green-200' },
};

const priorityConfig = {
  High: { icon: ArrowUp, color: 'text-red-500', label: 'High', bg: 'bg-red-50 text-red-700' },
  Medium: { icon: ArrowRight, color: 'text-orange-500', label: 'Medium', bg: 'bg-orange-50 text-orange-700' },
  Low: { icon: ArrowDown, color: 'text-green-500', label: 'Low', bg: 'bg-green-50 text-green-700' },
};

const TaskDetailPanel = ({ task, open, onClose, onUpdate, onDelete, onAddComment, onUpdateComment, statuses, users, canEdit, summaryPresets = [] }) => {
  const { user, orgConfig } = useAuth();
  
  const isSales = (user?.department_id === orgConfig?.division_mappings?.sales_department_id) || user?.department === 'Sales';
  const effectiveCanEdit = canEdit && !isSales;
  
  const [comment, setComment] = useState('');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [editDesc, setEditDesc] = useState('');
  const [isEditingColor, setIsEditingColor] = useState(false);
  const [editColor, setEditColor] = useState('');
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editCommentText, setEditCommentText] = useState('');
  const descRef = useRef(null);

  if (!task) return null;

  const taskType = typeConfig[task.type] || typeConfig.Task;
  const TaskTypeIcon = taskType.icon;
  const priority = priorityConfig[task.priority] || priorityConfig.Medium;
  const PriorityIcon = priority.icon;

  const handleTitleSave = (newTitle) => {
    const title = newTitle || editTitle;
    if (title.trim() && title !== task.title) {
      onUpdate(task.id, { title: title.trim() });
    }
    setIsEditingTitle(false);
  };

  const handleDescSave = () => {
    if (editDesc !== task.description) {
      onUpdate(task.id, { description: editDesc });
    }
    setIsEditingDesc(false);
  };

  const handleColorSave = () => {
    if (editColor && editColor !== (task.color_hex || '#3b82f6')) {
      onUpdate(task.id, { color_hex: editColor });
    }
    setIsEditingColor(false);
  };

  const handleColorEdit = () => {
    setEditColor(task.color_hex || '#3b82f6');
    setIsEditingColor(true);
  };

  const handleCommentSubmit = (e) => {
    if (e) e.preventDefault();
    if (!comment.trim()) return;
    onAddComment(task.id, comment.trim());
    setComment('');
  };

  const handleCommentKeyDown = (e) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      handleCommentSubmit();
    }
  };

  const handleEditComment = (c) => {
    setEditingCommentId(c.id);
    setEditCommentText(c.comment);
  };

  const handleSaveComment = async () => {
    if (!editCommentText.trim()) return;
    await onUpdateComment(task.id, editingCommentId, editCommentText.trim());
    setEditingCommentId(null);
  };

  const handleDelete = () => {
    if (window.confirm(`Delete task ${task.task_number}? This cannot be undone.`)) {
      onDelete(task.id);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-[480px] sm:max-w-[480px] overflow-y-auto p-0" data-testid="task-detail-panel">
        {/* Header */}
        <div className="sticky top-0 bg-card z-10 border-b border-border px-6 py-4">
          <SheetHeader className="space-y-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TaskTypeIcon size={18} className={taskType.color} />
                <span className="text-sm font-mono font-bold text-muted-foreground">
                  {task.task_number}
                </span>
                <Badge variant="outline" className={`text-[10px] ${taskType.bg}`}>
                  {task.type}
                </Badge>
              </div>
              {effectiveCanEdit && (
                <Button variant="ghost" size="icon" onClick={handleDelete} className="text-muted-foreground hover:text-destructive h-8 w-8">
                  <Trash2 size={14} />
                </Button>
              )}
            </div>
          </SheetHeader>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* Title — Searchable Dropdown or Input */}
          <div>
            {isEditingTitle ? (
              summaryPresets.length > 0 ? (
                <div className="space-y-2">
                  <SearchableSelectCombobox
                    options={summaryPresets}
                    value={editTitle}
                    onChange={(v) => {
                      setEditTitle(v);
                      handleTitleSave(v);
                    }}
                    placeholder="Select summary..."
                    emptyText="No summary preset found."
                  />
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setIsEditingTitle(false)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onBlur={() => handleTitleSave()}
                  onKeyDown={(e) => e.key === 'Enter' && handleTitleSave()}
                  autoFocus
                  className="text-lg font-bold"
                />
              )
            ) : (
              <SheetTitle
                className={`text-lg font-bold text-foreground transition-colors leading-snug ${effectiveCanEdit ? 'cursor-pointer hover:text-primary' : ''}`}
                onClick={() => { if (effectiveCanEdit) { setEditTitle(task.title); setIsEditingTitle(true); } }}
              >
                {task.title}
              </SheetTitle>
            )}
          </div>

          {/* Status & Priority & Assignee Fields */}
          <div className="grid grid-cols-1 gap-3">
            {/* Status */}
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-muted-foreground font-medium w-24">Status</span>
              <Select
                value={task.status}
                disabled={!effectiveCanEdit}
                onValueChange={(v) => onUpdate(task.id, { status: v })}
              >
                <SelectTrigger className="w-[180px] h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map((s) => (
                    <SelectItem key={s.id} value={s.name}>
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                        {s.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Priority */}
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-muted-foreground font-medium w-24">Priority</span>
              <Select
                value={task.priority}
                disabled={!effectiveCanEdit}
                onValueChange={(v) => onUpdate(task.id, { priority: v })}
              >
                <SelectTrigger className="w-[180px] h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="High">
                    <span className="flex items-center gap-2">
                      <ArrowUp size={14} className="text-red-500" /> High
                    </span>
                  </SelectItem>
                  <SelectItem value="Medium">
                    <span className="flex items-center gap-2">
                      <ArrowRight size={14} className="text-orange-500" /> Medium
                    </span>
                  </SelectItem>
                  <SelectItem value="Low">
                    <span className="flex items-center gap-2">
                      <ArrowDown size={14} className="text-green-500" /> Low
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Type */}
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-muted-foreground font-medium w-24">Type</span>
              <Select
                value={task.type}
                disabled={!effectiveCanEdit}
                onValueChange={(v) => onUpdate(task.id, { type: v })}
              >
                <SelectTrigger className="w-[180px] h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Task">
                    <span className="flex items-center gap-2">
                      <CheckSquare size={14} className="text-blue-500" /> Task
                    </span>
                  </SelectItem>
                  <SelectItem value="Bug">
                    <span className="flex items-center gap-2">
                      <Bug size={14} className="text-red-500" /> Bug
                    </span>
                  </SelectItem>
                  <SelectItem value="Story">
                    <span className="flex items-center gap-2">
                      <Zap size={14} className="text-green-500" /> Story
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Assignee */}
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-muted-foreground font-medium w-24">Assignee</span>
              <UserCombobox
                users={users.filter(u => {
                  if (orgConfig?.division_mappings?.tech_ops_department_id && u.department_id === orgConfig.division_mappings.tech_ops_department_id) return true;
                  return u.department === 'Technical Operation';
                })}
                value={task.assignee_id}
                disabled={!effectiveCanEdit}
                onChange={(v) => onUpdate(task.id, { assignee_id: v })}
                placeholder="Unassigned"
                className="w-[180px]"
              />
            </div>

            {/* Reporter */}
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-muted-foreground font-medium w-24">Reporter</span>
              <span className="text-sm text-foreground">{task.reporter_name || 'Unknown'}</span>
            </div>

            {/* Created */}
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-muted-foreground font-medium w-24">Created</span>
              <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                <Calendar size={13} />
                {new Date(task.created_at).toLocaleString()}
              </span>
            </div>

            {/* Start Date */}
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-muted-foreground font-medium w-24">Start Date</span>
              <Input
                type="date"
                value={formatDate(task.start_date)}
                disabled={!effectiveCanEdit}
                onChange={(e) => onUpdate(task.id, { start_date: e.target.value })}
                className="w-[180px] h-8 text-sm px-2"
              />
            </div>

            {/* End Date */}
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-muted-foreground font-medium w-24">End Date</span>
              <Input
                type="date"
                value={formatDate(task.end_date)}
                disabled={!effectiveCanEdit}
                onChange={(e) => onUpdate(task.id, { end_date: e.target.value })}
                className="w-[180px] h-8 text-sm px-2"
              />
            </div>

            {/* Task Color */}
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-muted-foreground font-medium w-24">Color</span>
              {isEditingColor ? (
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={editColor}
                    onChange={(e) => setEditColor(e.target.value)}
                    className="w-12 h-8 rounded-md cursor-pointer border border-border"
                    autoFocus
                  />
                  <span className="text-xs text-muted-foreground font-mono min-w-12">{editColor}</span>
                </div>
              ) : (
                <div 
                  className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => { if (effectiveCanEdit) handleColorEdit(); }}
                >
                  <div 
                    className="w-8 h-8 rounded-md border-2 border-border"
                    style={{ backgroundColor: task.color_hex || '#3b82f6' }}
                  />
                  <span className="text-xs text-muted-foreground font-mono">{task.color_hex || '#3b82f6'}</span>
                </div>
              )}
            </div>

            {isEditingColor && effectiveCanEdit && (
              <div className="flex gap-2 justify-end px-6 -mt-2 mb-2">
                <Button size="sm" variant="outline" onClick={() => setIsEditingColor(false)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleColorSave}>
                  Save Color
                </Button>
              </div>
            )}
          </div>

          <Separator />

          {/* Description with Markdown Toolbar */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-2">Description</h4>
            {isEditingDesc ? (
              <div className="space-y-2">
                <div>
                  <MarkdownToolbar
                    textareaRef={descRef}
                    value={editDesc}
                    onChange={(v) => setEditDesc(v)}
                  />
                  <Textarea
                    ref={descRef}
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    rows={4}
                    className="font-mono text-sm rounded-t-none border-t-0"
                    autoFocus
                  />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleDescSave}>Save</Button>
                  <Button size="sm" variant="outline" onClick={() => setIsEditingDesc(false)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <div
                className={`text-sm text-muted-foreground whitespace-pre-wrap rounded-lg p-3 min-h-[60px] border border-dashed border-border transition-colors ${effectiveCanEdit ? 'cursor-pointer hover:bg-secondary/50' : ''}`}
                onClick={() => { if (effectiveCanEdit) { setEditDesc(task.description || ''); setIsEditingDesc(true); } }}
              >
                {task.description || (effectiveCanEdit ? 'Click to add a description...' : 'No description')}
              </div>
            )}
          </div>

          <Separator />

          {/* Comments */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <MessageSquare size={15} />
              Comments
              <span className="text-xs text-muted-foreground font-normal">({task.comments?.length || 0})</span>
            </h4>

            {/* Comment List */}
            <TooltipProvider delayDuration={300}>
              <div className="space-y-4 mb-6 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                {(task.comments || []).map((c) => {
                  const isOwnComment = c.user_id === user?.id;
                  const isEditing = editingCommentId === c.id;

                  return (
                    <div key={c.id} className="group">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary uppercase flex-shrink-0 mt-0.5">
                          {c.user_name?.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-bold text-foreground">{c.user_name}</span>
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(c.created_at).toLocaleString()}
                            </span>
                            {c.is_edited && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="text-[10px] text-primary/60 font-medium cursor-help hover:underline flex items-center gap-0.5">
                                    (edited)
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-[300px] p-3 space-y-2 bg-white text-slate-950 border border-border shadow-xl dark:bg-slate-900 dark:text-slate-50">
                                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground border-b border-border pb-1">
                                    <HistoryIcon size={12} /> EDIT HISTORY
                                  </div>
                                  {(c.edit_history || []).map((h, idx) => (
                                    <div key={idx} className="text-[10px] space-y-1">
                                      <p className="text-muted-foreground italic">{new Date(h.edited_at).toLocaleString()}:</p>
                                      <p className="text-foreground line-clamp-3">{h.content}</p>
                                      {idx < c.edit_history.length - 1 && <Separator className="my-1 opacity-50" />}
                                    </div>
                                  ))}
                                  {(!c.edit_history || c.edit_history.length === 0) && (
                                    <p className="text-[10px] text-muted-foreground italic">Original content not logged</p>
                                  )}
                                </TooltipContent>
                              </Tooltip>
                            )}
                            {isOwnComment && !isEditing && (
                              <button 
                                onClick={() => handleEditComment(c)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-muted-foreground hover:text-primary"
                              >
                                <Pencil size={12} />
                              </button>
                            )}
                          </div>
                          
                          {isEditing ? (
                            <div className="space-y-2 mt-1">
                              <Textarea
                                value={editCommentText}
                                onChange={(e) => setEditCommentText(e.target.value)}
                                className="text-sm min-h-[80px]"
                                autoFocus
                              />
                              <div className="flex gap-2">
                                <Button size="sm" onClick={handleSaveComment} className="h-7 text-xs px-3">Save Changes</Button>
                                <Button size="sm" variant="ghost" onClick={() => setEditingCommentId(null)} className="h-7 text-xs px-3">Cancel</Button>
                              </div>
                            </div>
                          ) : (
                            <div className="bg-secondary/30 rounded-lg p-3 border border-border/50">
                              <MarkdownView text={c.comment} className="text-sm text-muted-foreground" />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {(!task.comments || task.comments.length === 0) && (
                  <div className="flex flex-col items-center justify-center py-10 text-muted-foreground/50">
                    <MessageSquare size={32} className="mb-2 opacity-20" />
                    <p className="text-xs">No comments yet. Start the conversation!</p>
                  </div>
                )}
              </div>
            </TooltipProvider>

            {/* Add Comment Form */}
            <div className="space-y-2">
              <div className="relative group">
                <Textarea
                  placeholder="Add a comment..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  onKeyDown={handleCommentKeyDown}
                  className="text-sm min-h-[100px] pr-12 resize-none focus-visible:ring-primary/30"
                />
                <Button 
                  type="button"
                  size="icon" 
                  disabled={!comment.trim()} 
                  onClick={() => handleCommentSubmit()}
                  className="absolute bottom-3 right-3 h-8 w-8 rounded-full shadow-lg transition-transform hover:scale-110 active:scale-95"
                >
                  <Send size={14} />
                </Button>
              </div>
              <div className="flex items-center justify-between px-1">
                <p className="text-[10px] text-muted-foreground italic">
                  Use <kbd className="px-1 py-0.5 rounded bg-muted border border-border font-sans font-bold">Shift+Enter</kbd> for new line, <kbd className="px-1 py-0.5 rounded bg-muted border border-border font-sans font-bold">Ctrl+Enter</kbd> to send.
                </p>
                <span className="text-[10px] text-muted-foreground/60 font-medium">Markdown Supported</span>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default TaskDetailPanel;
