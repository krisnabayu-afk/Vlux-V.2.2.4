import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { 
  Settings, 
  Save, 
  Trash2, 
  Plus, 
  GripVertical, 
  AlertTriangle,
  Globe,
  Edit2
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { OptimizedSiteCombobox, ProjectLeadCombobox, SalesUserCombobox } from '../SelectionComponents';
import { useAuth } from '../../context/AuthContext';

const API = `${process.env.REACT_APP_API_URL}/api`;

const ProjectSettings = ({ project, statuses, users, onProjectUpdate, onStatusCreate, onStatusUpdate, onStatusDelete, onStatusReorder }) => {
  const navigate = useNavigate();
  const { user, isTechOps } = useAuth();
  const [activeTab, setActiveTab] = useState('general');
  const [isSaving, setIsSaving] = useState(false);

  const isFullAdmin = project.created_by === user?.id || 
                      user?.role === 'SuperUser' || 
                      (user?.role === 'VP' && isTechOps);
  const isOnlyLead = !isFullAdmin && project.leader_id === user?.id;
  
  // Project Form State
  const [projectForm, setProjectForm] = useState({
    name: project.name || '',
    type: project.type || 'WAAS',
    description: project.description || '',
    leader_id: project.leader_id || '',
    sales_user_id: project.sales_user_id || '',
    site_id: project.site_id || '',
    status: project.status || 'Open',
    due_date: project.due_date ? project.due_date.split('T')[0] : ''
  });

  // Status list (local sorted copy for optimistic DnD)
  const [localStatuses, setLocalStatuses] = useState([]);
  
  useEffect(() => {
    if (Array.isArray(statuses)) {
        setLocalStatuses([...statuses].sort((a, b) => (a.order || 0) - (b.order || 0)));
    }
  }, [statuses]);

  // Status Form State
  const [editingStatusId, setEditingStatusId] = useState(null);
  const [statusForm, setStatusForm] = useState({ name: '', color: '#6b7280', order: 0 });
  const [isAddingStatus, setIsAddingStatus] = useState(false);

  // DnD state
  const dragIndex = useRef(null);
  const [dragOverId, setDragOverId] = useState(null);

  const [sites, setSites] = useState([]);

  useEffect(() => {
    const fetchSites = async () => {
      try {
        const res = await axios.get(`${API}/sites`, { params: { limit: 1000 } });
        setSites(res.data.items || res.data || []);
      } catch (err) {
        console.error('Failed to fetch sites');
      }
    };
    fetchSites();
  }, []);

  const handleUpdateProject = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (onProjectUpdate) await onProjectUpdate(projectForm);
      toast.success('Project updated successfully');
    } catch (err) {
      toast.error('Failed to update project');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!window.confirm('Are you absolutely sure? This will delete the project, all its tasks, and board statuses. This cannot be undone.')) return;
    try {
      await axios.delete(`${API}/projects/${project.id}`);
      toast.success('Project deleted');
      navigate('/projects');
    } catch (err) {
      toast.error('Failed to delete project');
    }
  };

  const handleCreateStatus = async (e) => {
    e.preventDefault();
    if (!statusForm.name.trim()) return;
    try {
      const nextOrder = localStatuses.length > 0 ? Math.max(...localStatuses.map(s => s.order || 0)) + 1 : 0;
      if (onStatusCreate) await onStatusCreate({ ...statusForm, order: nextOrder });
      setIsAddingStatus(false);
      setStatusForm({ name: '', color: '#6b7280', order: 0 });
      toast.success('Status added');
    } catch (err) {
      toast.error('Failed to add status');
    }
  };

  const handleUpdateStatus = async () => {
    if (!statusForm.name.trim()) return;
    try {
      if (onStatusUpdate) await onStatusUpdate(editingStatusId, statusForm);
      setEditingStatusId(null);
      toast.success('Status updated');
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const handleDeleteStatus = async (status) => {
    if (!window.confirm(`Delete "${status.name}" status? Tasks using it cannot be deleted.`)) return;
    try {
      if (onStatusDelete) await onStatusDelete(status.id);
      toast.success('Status deleted');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to delete status');
    }
  };

  // ─── Drag & Drop handlers (Vertical List) ──────────────────────────────────
  const handleDragStart = (e, index) => {
    dragIndex.current = index;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', JSON.stringify({ index }));
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverId(localStatuses[index]?.id);
  };

  const handleDrop = async (e, toIndex) => {
    e.preventDefault();
    setDragOverId(null);

    const fromIndex = dragIndex.current;
    if (fromIndex === null || toIndex === null || fromIndex === toIndex) return;

    const reordered = [...localStatuses];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    setLocalStatuses(reordered);

    dragIndex.current = null;

    try {
      if (onStatusReorder) await onStatusReorder(reordered);
    } catch (err) {
      toast.error('Failed to save order');
      setLocalStatuses([...statuses].sort((a, b) => (a.order || 0) - (b.order || 0)));
    }
  };

  const handleDragEnd = () => {
    setDragOverId(null);
    dragIndex.current = null;
  };
  // ─────────────────────────────────────────────────────────────────────────


  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-10">
      <div className="flex items-center gap-3 border-b border-border pb-4">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Settings size={24} className="text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Project Settings</h1>
          <p className="text-sm text-muted-foreground">Manage your project preferences and board structure</p>
        </div>
      </div>

      <div className="flex gap-8">
        {/* Sidebar Nav */}
        <aside className="w-1/4 space-y-1">
          <button
            onClick={() => setActiveTab('general')}
            className={`w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'general' ? 'bg-secondary text-primary' : 'text-muted-foreground hover:bg-secondary/50'
            }`}
          >
            General Details
          </button>
          {!isOnlyLead && (
            <>
              <button
                onClick={() => setActiveTab('statuses')}
                className={`w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'statuses' ? 'bg-secondary text-primary' : 'text-muted-foreground hover:bg-secondary/50'
                }`}
              >
                Board Columns
              </button>
              <button
                onClick={() => setActiveTab('danger')}
                className={`w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'danger' ? 'bg-destructive/10 text-destructive' : 'text-muted-foreground hover:bg-destructive/5'
                }`}
              >
                Danger Zone
              </button>
            </>
          )}
        </aside>

        {/* Content Area */}
        <main className="flex-1 bg-card border border-border rounded-xl p-6 shadow-sm">
          {activeTab === 'general' && (
            <form onSubmit={handleUpdateProject} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">Project Name</label>
                  <Input 
                    value={projectForm.name}
                    onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
                    required
                    disabled={isOnlyLead}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">Project Key</label>
                  <Input value={project.key} disabled className="bg-secondary/50" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">Project Status</label>
                  <Select value={projectForm.status} onValueChange={(v) => setProjectForm({ ...projectForm, status: v })}>
                    <SelectTrigger className={
                      projectForm.status === 'Hold' ? 'bg-yellow-50 text-yellow-700' :
                      projectForm.status === 'Finished' ? 'bg-indigo-50 text-indigo-700' :
                      'bg-emerald-50 text-emerald-700'
                    }><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Open">Open</SelectItem>
                      <SelectItem value="Hold">Hold</SelectItem>
                      <SelectItem value="Finished">Finished</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">Project Type</label>
                  <Select value={projectForm.type} disabled={isOnlyLead} onValueChange={(v) => setProjectForm({ ...projectForm, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="WAAS">WAAS</SelectItem>
                      <SelectItem value="VLEPO">VLEPO</SelectItem>
                      <SelectItem value="FTTR">FTTR</SelectItem>
                      <SelectItem value="Internet, Vlepo">Internet, Vlepo</SelectItem>
                      <SelectItem value="Internet, WAAS">Internet, WAAS</SelectItem>
                      <SelectItem value="Internet, WAAS, Vlepo">Internet, WAAS, Vlepo</SelectItem>
                      <SelectItem value="All Product">All Product</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">Project Lead</label>
                  <ProjectLeadCombobox
                    users={users}
                    value={projectForm.leader_id}
                    onChange={(v) => setProjectForm({ ...projectForm, leader_id: v })}
                    disabled={isOnlyLead}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold flex items-center gap-2 text-foreground">
                    Sales Assigned
                  </label>
                  <SalesUserCombobox
                    users={users}
                    value={projectForm.sales_user_id}
                    onChange={(v) => setProjectForm({ ...projectForm, sales_user_id: v })}
                    disabled={isOnlyLead}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold flex items-center gap-2 text-foreground">
                    <Globe size={14} /> Site
                  </label>
                  <OptimizedSiteCombobox
                    sites={sites}
                    value={projectForm.site_id}
                    onChange={(v) => setProjectForm({ ...projectForm, site_id: v === 'all' ? '' : v })}
                    disabled={isOnlyLead}
                    emptyLabel="No Site"
                    placeholder="Search site..."
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Due Date</label>
                <Input 
                  type="date"
                  value={projectForm.due_date}
                  onChange={(e) => setProjectForm({ ...projectForm, due_date: e.target.value })}
                  disabled={isOnlyLead}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Description</label>
                <Textarea 
                  value={projectForm.description}
                  onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                  rows={4}
                  disabled={isOnlyLead}
                />
              </div>

              <div className="flex justify-end pt-4 border-t border-border mt-6">
                <Button type="submit" disabled={isSaving} className="gap-2">
                  <Save size={18} />
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          )}

          {activeTab === 'statuses' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-foreground text-sm">Board Columns</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Drag to rearrange column order</p>
                </div>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => setIsAddingStatus(true)}
                  disabled={isAddingStatus || !!editingStatusId}
                >
                  <Plus size={16} className="mr-1" /> Add Column
                </Button>
              </div>

              <div className="space-y-2">
                {/* Add Status */}
                {isAddingStatus && (
                  <div className="bg-secondary/30 border border-primary/20 rounded-lg p-3 space-y-4">
                    <div className="flex gap-2">
                      <Input 
                        placeholder="Column Name" 
                        value={statusForm.name}
                        onChange={(e) => setStatusForm({ ...statusForm, name: e.target.value })}
                        autoFocus
                      />
                      <input 
                        type="color" 
                        value={statusForm.color}
                        onChange={(e) => setStatusForm({ ...statusForm, color: e.target.value })}
                        className="w-10 h-10 rounded cursor-pointer border border-border bg-transparent"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setIsAddingStatus(false)}>Cancel</Button>
                      <Button size="sm" onClick={handleCreateStatus}>Add status</Button>
                    </div>
                  </div>
                )}

                {/* Status List */}
                {localStatuses.map((status, index) => (
                  <div
                    key={status.id}
                    draggable={!editingStatusId}
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDrop={(e) => handleDrop(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-all duration-150
                      ${dragOverId === status.id ? 'border-primary/50 bg-primary/5' : 'bg-secondary/20 border-border'}
                      ${editingStatusId === status.id ? 'bg-background shadow-lg' : ''}
                    `}
                  >
                    {editingStatusId === status.id ? (
                      <div className="flex-1 space-y-3">
                        <div className="flex gap-2">
                          <Input 
                            value={statusForm.name}
                            onChange={(e) => setStatusForm({ ...statusForm, name: e.target.value })}
                            autoFocus
                          />
                          <input 
                            type="color" 
                            value={statusForm.color}
                            onChange={(e) => setStatusForm({ ...statusForm, color: e.target.value })}
                            className="w-10 h-10 rounded cursor-pointer border border-border bg-transparent"
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => setEditingStatusId(null)}>Cancel</Button>
                          <Button size="sm" onClick={handleUpdateStatus}>Update</Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-3">
                          <div className="text-muted-foreground/30 border-r border-border/50 pr-2 cursor-grab active:cursor-grabbing">
                            <GripVertical size={16} />
                          </div>
                          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: status.color }} />
                          <span className="font-medium text-sm text-foreground">{status.name}</span>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 hover:bg-background"
                            onClick={() => {
                              setEditingStatusId(status.id);
                              setStatusForm({ name: status.name, color: status.color, order: status.order });
                            }}
                          >
                            <Edit2 size={14} />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-destructive hover:bg-destructive/10"
                            onClick={() => handleDeleteStatus(status)}
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'danger' && (
            <div className="space-y-6">
              <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-4 flex gap-4">
                <AlertTriangle className="text-destructive flex-shrink-0" size={24} />
                <div>
                  <h3 className="font-bold text-destructive">Archive Project</h3>
                  <p className="text-sm text-destructive/80 mt-1 line-clamp-2">
                    This will set the project's status to <strong>Hold</strong>. It will be moved to the Archived section.
                  </p>
                </div>
              </div>

              <div className="pt-4 flex justify-start">
                <Button variant="destructive" onClick={handleDeleteProject} className="gap-2 shadow-lg shadow-destructive/20">
                  <Trash2 size={18} />
                  Delete Project (Archive)
                </Button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default ProjectSettings;
