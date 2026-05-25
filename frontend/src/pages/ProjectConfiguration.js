import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import {
  Plus, Trash2, Edit3, Save, X, ArrowLeft, Settings2,
  GripVertical, ChevronUp, ChevronDown, Search
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';

const API = `${process.env.REACT_APP_API_URL}/api`;

const ProjectConfiguration = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [presets, setPresets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addName, setAddName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');

  // Guard: SuperUser only
  if (user?.role !== 'SuperUser') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Settings2 size={48} className="mx-auto text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-semibold text-muted-foreground">Access Denied</h3>
          <p className="text-sm text-muted-foreground mt-1">Only SuperUsers can access Project Configuration.</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate('/projects')}>
            <ArrowLeft size={16} className="mr-2" /> Back to Projects
          </Button>
        </div>
      </div>
    );
  }

  const fetchPresets = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/summary-presets`);
      setPresets(res.data || []);
    } catch (err) {
      toast.error('Failed to load summary presets');
    } finally {
      setLoading(false);
    }
  }, []);

  const seedDefaults = useCallback(async () => {
    try {
      const res = await axios.post(`${API}/summary-presets/seed`);
      if (res.data.message.includes('Seeded')) {
        toast.success(res.data.message);
        fetchPresets();
      }
    } catch (err) {
      // Silently fail — presets may already exist
    }
  }, [fetchPresets]);

  useEffect(() => {
    const init = async () => {
      await fetchPresets();
    };
    init();
  }, [fetchPresets]);

  // Auto-seed on first visit if empty
  useEffect(() => {
    if (!loading && presets.length === 0) {
      seedDefaults();
    }
  }, [loading, presets.length, seedDefaults]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!addName.trim()) return;
    try {
      await axios.post(`${API}/summary-presets`, {
        name: addName.trim(),
        order: presets.length,
      });
      toast.success('Preset added');
      setAddName('');
      setShowAddDialog(false);
      fetchPresets();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to add preset');
    }
  };

  const handleEdit = async (id) => {
    if (!editName.trim()) return;
    try {
      const preset = presets.find(p => p.id === id);
      await axios.put(`${API}/summary-presets/${id}`, {
        name: editName.trim(),
        order: preset?.order || 0,
      });
      toast.success('Preset updated');
      setEditingId(null);
      setEditName('');
      fetchPresets();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update preset');
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete preset "${name}"?`)) return;
    try {
      await axios.delete(`${API}/summary-presets/${id}`);
      toast.success('Preset deleted');
      fetchPresets();
    } catch (err) {
      toast.error('Failed to delete preset');
    }
  };

  const handleMoveUp = async (index) => {
    if (index <= 0) return;
    const items = [...presets];
    const temp = items[index].order;
    items[index].order = items[index - 1].order;
    items[index - 1].order = temp;
    try {
      await Promise.all([
        axios.put(`${API}/summary-presets/${items[index].id}`, { name: items[index].name, order: items[index].order }),
        axios.put(`${API}/summary-presets/${items[index - 1].id}`, { name: items[index - 1].name, order: items[index - 1].order }),
      ]);
      fetchPresets();
    } catch (err) {
      toast.error('Failed to reorder');
    }
  };

  const handleMoveDown = async (index) => {
    if (index >= presets.length - 1) return;
    const items = [...presets];
    const temp = items[index].order;
    items[index].order = items[index + 1].order;
    items[index + 1].order = temp;
    try {
      await Promise.all([
        axios.put(`${API}/summary-presets/${items[index].id}`, { name: items[index].name, order: items[index].order }),
        axios.put(`${API}/summary-presets/${items[index + 1].id}`, { name: items[index + 1].name, order: items[index + 1].order }),
      ]);
      fetchPresets();
    } catch (err) {
      toast.error('Failed to reorder');
    }
  };

  const filteredPresets = presets.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-3"></div>
          <p className="text-muted-foreground text-sm">Loading configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto" data-testid="project-configuration-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/projects')} className="h-9 w-9">
            <ArrowLeft size={18} />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Settings2 className="text-primary" size={24} />
              Project Configuration
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">Manage summary presets for project issues</p>
          </div>
        </div>
        <Button onClick={() => setShowAddDialog(true)} className="shadow-md shadow-primary/20">
          <Plus size={18} className="mr-2" />
          Add Preset
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
        <Input
          className="pl-9 h-9 text-sm"
          placeholder="Search presets..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Presets Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        {/* Table Header */}
        <div className="grid grid-cols-[40px_1fr_60px_80px] gap-2 px-4 py-3 bg-secondary/50 border-b border-border">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center">#</span>
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Preset Name</span>
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center">Order</span>
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center">Actions</span>
        </div>

        {filteredPresets.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <GripVertical size={32} className="mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-sm">No summary presets found</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredPresets.map((preset, index) => (
              <div
                key={preset.id}
                className="grid grid-cols-[40px_1fr_60px_80px] gap-2 px-4 py-3 items-center hover:bg-secondary/30 transition-colors group"
                data-testid={`preset-row-${preset.id}`}
              >
                {/* Index */}
                <div className="text-center">
                  <span className="text-xs font-mono text-muted-foreground">{index + 1}</span>
                </div>

                {/* Name */}
                <div>
                  {editingId === preset.id ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleEdit(preset.id);
                          if (e.key === 'Escape') { setEditingId(null); setEditName(''); }
                        }}
                        className="h-8 text-sm"
                        autoFocus
                      />
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600" onClick={() => handleEdit(preset.id)}>
                        <Save size={14} />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground" onClick={() => { setEditingId(null); setEditName(''); }}>
                        <X size={14} />
                      </Button>
                    </div>
                  ) : (
                    <span className="text-sm font-medium text-foreground">{preset.name}</span>
                  )}
                </div>

                {/* Reorder */}
                <div className="flex items-center justify-center gap-0.5">
                  <button
                    onClick={() => handleMoveUp(index)}
                    disabled={index === 0}
                    className="p-0.5 rounded hover:bg-secondary disabled:opacity-30 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ChevronUp size={14} />
                  </button>
                  <button
                    onClick={() => handleMoveDown(index)}
                    disabled={index === filteredPresets.length - 1}
                    className="p-0.5 rounded hover:bg-secondary disabled:opacity-30 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ChevronDown size={14} />
                  </button>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-muted-foreground hover:text-primary"
                    onClick={() => { setEditingId(preset.id); setEditName(preset.name); }}
                  >
                    <Edit3 size={13} />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(preset.id, preset.name)}
                  >
                    <Trash2 size={13} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="text-xs text-muted-foreground bg-secondary/30 rounded-lg p-3 border border-border/50">
        <strong>Note:</strong> These presets are used as the "Summary" dropdown options when creating or editing project issues.
        Renaming a preset does not affect existing issues that already use the old name.
      </div>

      {/* Add Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus size={18} className="text-primary" />
              Add Summary Preset
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Preset Name *</label>
              <Input
                placeholder="e.g. Installasi AP"
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => { setShowAddDialog(false); setAddName(''); }}>
                Cancel
              </Button>
              <Button type="submit">
                <Plus size={16} className="mr-1" /> Add
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProjectConfiguration;
