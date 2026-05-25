import { useState, useEffect, useRef } from 'react';
import { Plus, Bug, CheckSquare, Zap } from 'lucide-react';
import { formatDate } from '../../lib/utils';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { UserCombobox, SearchableSelectCombobox } from '../SelectionComponents';
import MarkdownToolbar from './MarkdownToolbar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { useAuth } from '../../context/AuthContext';

const CreateIssueDialog = ({ open, onClose, onSubmit, statuses, users, projectKey, initialData, summaryPresets = [] }) => {
  const { orgConfig } = useAuth();
  const descRef = useRef(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    type: 'Task',
    status: 'To Do',
    priority: 'Medium',
    assignee_id: '',
    start_date: formatDate(new Date()),
    end_date: formatDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
    color_hex: '#3b82f6',
  });

  useEffect(() => {
    if (open && initialData) {
      setForm(prev => ({ 
        ...prev, 
        ...initialData,
        // Ensure dates are formatted correctly using the local-safe utility
        start_date: initialData.start_date ? formatDate(initialData.start_date) : prev.start_date,
        end_date: initialData.end_date ? formatDate(initialData.end_date) : prev.end_date,
      }));
    }
  }, [open, initialData]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    onSubmit({
      ...form,
      assignee_id: form.assignee_id || undefined,
    });
    setForm({ 
      title: '', 
      description: '', 
      type: 'Task', 
      status: 'To Do', 
      priority: 'Medium', 
      assignee_id: '',
      start_date: formatDate(new Date()),
      end_date: formatDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
      color_hex: '#3b82f6',
    });
  };

  const handleClose = () => {
    setForm({ 
      title: '', 
      description: '', 
      type: 'Task', 
      status: 'To Do', 
      priority: 'Medium', 
      assignee_id: '',
      start_date: formatDate(new Date()),
      end_date: formatDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
      color_hex: '#3b82f6',
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Plus size={20} className="text-primary" />
            Create Issue
            <span className="text-xs text-muted-foreground font-mono ml-1">({projectKey})</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Issue Type & Priority */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Issue Type</label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Task">
                    <span className="flex items-center gap-2">
                      <CheckSquare size={14} className="text-blue-500" />
                      Task
                    </span>
                  </SelectItem>
                  <SelectItem value="Bug">
                    <span className="flex items-center gap-2">
                      <Bug size={14} className="text-red-500" />
                      Bug
                    </span>
                  </SelectItem>
                  <SelectItem value="Story">
                    <span className="flex items-center gap-2">
                      <Zap size={14} className="text-green-500" />
                      Story
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Priority</label>
              <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="High">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-500" />
                      High
                    </span>
                  </SelectItem>
                  <SelectItem value="Medium">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-orange-500" />
                      Medium
                    </span>
                  </SelectItem>
                  <SelectItem value="Low">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-500" />
                      Low
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Status</label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger>
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
          </div>

          {/* Summary — Searchable Dropdown */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Summary *</label>
            {summaryPresets.length > 0 ? (
              <SearchableSelectCombobox
                options={summaryPresets}
                value={form.title}
                onChange={(v) => setForm({ ...form, title: v })}
                placeholder="Select summary..."
                emptyText="No summary preset found."
              />
            ) : (
              <Input
                placeholder="What needs to be done?"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
                autoFocus
              />
            )}
          </div>

          {/* Description with Markdown Toolbar */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Description</label>
            <div>
              <MarkdownToolbar
                textareaRef={descRef}
                value={form.description}
                onChange={(v) => setForm({ ...form, description: v })}
              />
              <Textarea
                ref={descRef}
                placeholder="Add a description... (Markdown supported)"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={4}
                className="font-mono text-sm rounded-t-none border-t-0"
              />
            </div>
          </div>

          {/* Assignee */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Assignee</label>
            <UserCombobox 
              users={users.filter(u => {
                if (orgConfig?.division_mappings?.tech_ops_department_id && u.department_id === orgConfig.division_mappings.tech_ops_department_id) return true;
                return u.department === 'Technical Operation';
              })}
              value={form.assignee_id}
              onChange={(v) => setForm({ ...form, assignee_id: v })}
              placeholder="Unassigned"
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Start Date</label>
              <Input
                type="date"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">End Date</label>
              <Input
                type="date"
                value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
              />
            </div>
          </div>

          {/* Task Color */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Task Color</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={form.color_hex}
                onChange={(e) => setForm({ ...form, color_hex: e.target.value })}
                className="w-12 h-8 rounded-md cursor-pointer border border-border"
              />
              <span className="text-xs text-muted-foreground font-mono">{form.color_hex}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!form.title.trim()}>
              <Plus size={16} className="mr-1" />
              Create Issue
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateIssueDialog;
