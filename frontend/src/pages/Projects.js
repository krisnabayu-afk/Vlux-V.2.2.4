import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useCanEdit } from '../context/PermissionContext';
import { toast } from 'sonner';
import { Plus, Search, FolderKanban, Users, Calendar, ChevronRight, Briefcase, Trash2, Globe, Layers, Zap, Network, Box, LayoutGrid, FilterX, Settings2, MapPin } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { OptimizedSiteCombobox, ProjectLeadCombobox, SalesUserCombobox } from '../components/SelectionComponents';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '../components/ui/pagination';

const API = `${process.env.REACT_APP_API_URL}/api`;

const Projects = () => {
  const { user, isTechOps, orgConfig } = useAuth();
  const canEditPerm = useCanEdit('projects');
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('active'); // active, archived, finished
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);

  const [filterSiteId, setFilterSiteId] = useState('all');
  const [filterSalesId, setFilterSalesId] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterRegion, setFilterRegion] = useState('all');

  useEffect(() => {
    setCurrentPage(1);
  }, [search, activeTab, filterSiteId, filterSalesId, filterType, filterRegion]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [users, setUsers] = useState([]);
  const [sites, setSites] = useState([]);
  const [createForm, setCreateForm] = useState({
    name: '',
    key: '',
    type: 'WAAS',
    description: '',
    leader_id: '',
    sales_user_id: '',
    site_id: '',
    due_date: '',
  });

  const canManageProject = (p) => {
    if (!user) return false;
    return p.created_by === user.id || 
           user.role === 'SuperUser' || 
           (user.role === 'VP' && isTechOps);
  };

  const fetchProjects = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/projects`, { params: { search: search || undefined, limit: 1000 } });
      setProjects(res.data.items || []);
    } catch (err) {
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, [search]);

  const fetchUsers = async () => {
    try {
      const res = await axios.get(`${API}/users`);
      setUsers(res.data || []);
    } catch (err) {
      console.error('Failed to fetch users');
    }
  };

  const fetchSites = async () => {
    try {
      const res = await axios.get(`${API}/sites`, { params: { limit: 1000 } });
      setSites(res.data.items || res.data || []);
    } catch (err) {
      console.error('Failed to fetch sites');
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    fetchUsers();
    fetchSites();
  }, []);

  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!createForm.name.trim() || !createForm.key.trim()) {
      toast.error('Project name and key are required');
      return;
    }
    try {
      await axios.post(`${API}/projects`, {
        ...createForm,
        leader_id: createForm.leader_id || undefined,
        sales_user_id: createForm.sales_user_id || undefined,
        site_id: createForm.site_id || undefined,
        due_date: createForm.due_date || undefined,
      });
      toast.success('Project created!');
      setShowCreateDialog(false);
      setCreateForm({ name: '', key: '', type: 'WAAS', description: '', leader_id: '', sales_user_id: '', site_id: '', due_date: '' });
      fetchProjects();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create project');
    }
  };

  const handleDeleteProject = async (e, projectId) => {
    e.stopPropagation();
    if (!window.confirm('Delete this project and all its tasks? This cannot be undone.')) return;
    try {
      await axios.delete(`${API}/projects/${projectId}`);
      toast.success('Project deleted');
      fetchProjects();
    } catch (err) {
      toast.error('Failed to delete project');
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'WAAS': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'VLEPO': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'FTTR': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'Internet, WAAS': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
      case 'Internet, Vlepo': return 'bg-sky-100 text-sky-700 border-sky-200';
      case 'Internet, WAAS, Vlepo': return 'bg-teal-100 text-teal-700 border-teal-200';
      case 'All Product': return 'bg-rose-100 text-rose-700 border-rose-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'WAAS': return <FolderKanban size={14} />;
      case 'VLEPO': return <Briefcase size={14} />;
      case 'FTTR': return <Zap size={14} />;
      case 'Internet, WAAS': return <Globe size={14} />;
      case 'Internet, Vlepo': return <Network size={14} />;
      case 'Internet, WAAS, Vlepo': return <Network size={14} />;
      case 'All Product': return <Layers size={14} />;
      default: return <Box size={14} />;
    }
  };

  const filteredProjects = projects.filter(p => {
    // Status tab filter
    if (activeTab === 'active' && (p.status === 'Hold' || p.status === 'Finished' || p.status === 'FINAL / COMPLETED')) return false;
    if (activeTab === 'archived' && p.status !== 'Hold') return false;
    if (activeTab === 'finished' && p.status !== 'Finished' && p.status !== 'FINAL / COMPLETED') return false;

    // Additional filters
    if (filterSiteId !== 'all' && filterSiteId !== '' && p.site_id !== filterSiteId) return false;
    if (filterSalesId !== 'all' && filterSalesId !== '' && p.sales_user_id !== filterSalesId) return false;
    if (filterType !== 'all' && p.type !== filterType) return false;

    if (filterRegion !== 'all') {
      const projectSite = sites.find(s => s.id === p.site_id);
      const siteRegion = projectSite ? projectSite.region : '';
      if (siteRegion !== filterRegion) return false;
    }

    return true;
  }).sort((a, b) => {
    // Sort: Open projects first, Finished projects at bottom
    const getStatusPriority = (status) => {
      if (status === 'Finished' || status === 'FINAL / COMPLETED') return 2;
      if (status === 'Hold') return 1;
      return 0; // Open projects (default/no status)
    };
    
    const priorityA = getStatusPriority(a.status);
    const priorityB = getStatusPriority(b.status);
    
    return priorityA - priorityB;
  });

  const totalPages = Math.ceil(filteredProjects.length / itemsPerPage) || 1;
  const paginatedProjects = filteredProjects.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );


  const isSales = (user?.department_id === orgConfig?.division_mappings?.sales_department_id) || user?.department === 'Sales';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-3"></div>
          <p className="text-muted-foreground text-sm">Loading projects...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="projects-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FolderKanban className="text-primary" size={28} />
            Projects
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your project workspaces</p>
        </div>
        <div className="flex items-center gap-2">
          {user?.role === 'SuperUser' && (
            <Button variant="outline" onClick={() => navigate('/projects/configuration')} className="gap-2">
              <Settings2 size={16} />
              Project Configuration
            </Button>
          )}
        {canEditPerm && !isSales && (
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="shadow-md shadow-primary/20">
              <Plus size={18} className="mr-2" />
              Create Project
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[520px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FolderKanban size={20} className="text-primary" />
                Create New Project
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateProject} className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Project Name *</label>
                  <Input
                    placeholder="My Project"
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Project Key *</label>
                  <Input
                    placeholder="PROJ"
                    value={createForm.key}
                    onChange={(e) => setCreateForm({ ...createForm, key: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6) })}
                    maxLength={6}
                    required
                  />
                  <p className="text-xs text-muted-foreground">Used for task IDs (e.g. {createForm.key || 'PROJ'}-01)</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Project Type</label>
                  <Select
                    value={createForm.type}
                    onValueChange={(v) => setCreateForm({ ...createForm, type: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="WAAS">WAAS</SelectItem>
                      <SelectItem value="VLEPO">VLEPO</SelectItem>
                      <SelectItem value="FTTR">FTTR</SelectItem>
                      <SelectItem value="Internet, WAAS">Internet, WAAS</SelectItem>
                      <SelectItem value="Internet, Vlepo">Internet, Vlepo</SelectItem>
                      <SelectItem value="Internet, WAAS, Vlepo">Internet, WAAS, Vlepo</SelectItem>
                      <SelectItem value="All Product">All Product</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Project Lead</label>
                  <ProjectLeadCombobox
                    users={users}
                    value={createForm.leader_id}
                    onChange={(v) => setCreateForm({ ...createForm, leader_id: v })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Sales Assigned</label>
                  <SalesUserCombobox
                    users={users}
                    value={createForm.sales_user_id}
                    onChange={(v) => setCreateForm({ ...createForm, sales_user_id: v })}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                    <Globe size={14} />
                    Site
                  </label>
                  <OptimizedSiteCombobox
                    sites={sites}
                    value={createForm.site_id}
                    onChange={(v) => setCreateForm({ ...createForm, site_id: v === 'all' ? '' : v })}
                    emptyLabel="No Site"
                    placeholder="Search site..."
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Due Date</label>
                <Input
                  type="date"
                  value={createForm.due_date}
                  onChange={(e) => setCreateForm({ ...createForm, due_date: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Description</label>
                <Textarea
                  placeholder="Describe the project..."
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  <Plus size={16} className="mr-1" />
                  Create Project
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        )}
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col border border-border shadow-sm bg-card rounded-xl overflow-hidden">
        <div className="flex items-center justify-between p-3 border-b border-border bg-secondary/20">
          <div className="flex bg-secondary/50 p-1 rounded-lg">
            <button 
              onClick={() => setActiveTab('active')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'active' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Active Projects
            </button>
            <button 
              onClick={() => setActiveTab('archived')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'archived' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Archived (Hold)
            </button>
            <button 
              onClick={() => setActiveTab('finished')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'finished' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Finished
            </button>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <Input
                className="pl-9 h-9 text-sm"
                placeholder="Search projects..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            {(filterSiteId !== 'all' || filterSalesId !== 'all' || filterType !== 'all' || filterRegion !== 'all') && (
              <Button variant="ghost" size="sm" onClick={() => { setFilterSiteId('all'); setFilterSalesId('all'); setFilterType('all'); setFilterRegion('all'); }} className="h-9 px-2 text-muted-foreground">
                <FilterX size={16} />
              </Button>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-4 p-3 bg-card items-center">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <Globe className="text-muted-foreground flex-shrink-0" size={16} />
            <div className="flex-1">
              <OptimizedSiteCombobox
                sites={sites}
                value={filterSiteId}
                onChange={(v) => setFilterSiteId(v || 'all')}
                emptyLabel="All Sites"
                placeholder="Filter by Site..."
              />
            </div>
          </div>
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <Briefcase className="text-muted-foreground flex-shrink-0" size={16} />
            <div className="flex-1">
              <SalesUserCombobox
                users={users}
                value={filterSalesId === 'all' ? '' : filterSalesId}
                onChange={(v) => setFilterSalesId(v || 'all')}
              />
            </div>
          </div>
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <Box className="text-muted-foreground flex-shrink-0" size={16} />
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="flex-1 h-10"><SelectValue placeholder="All Types" /></SelectTrigger>
              <SelectContent className="bg-popover border-border text-popover-foreground">
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="WAAS">WAAS</SelectItem>
                <SelectItem value="VLEPO">VLEPO</SelectItem>
                <SelectItem value="FTTR">FTTR</SelectItem>
                <SelectItem value="Internet, WAAS">Internet, WAAS</SelectItem>
                <SelectItem value="Internet, Vlepo">Internet, Vlepo</SelectItem>
                <SelectItem value="Internet, WAAS, Vlepo">Internet, WAAS, Vlepo</SelectItem>
                <SelectItem value="All Product">All Product</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <MapPin className="text-muted-foreground flex-shrink-0" size={16} />
            <Select value={filterRegion} onValueChange={setFilterRegion}>
              <SelectTrigger className="flex-1 h-10"><SelectValue placeholder="All Regions" /></SelectTrigger>
              <SelectContent className="bg-popover border-border text-popover-foreground">
                <SelectItem value="all">All Regions</SelectItem>
                <SelectItem value="Region 1">Region 1</SelectItem>
                <SelectItem value="Region 2">Region 2</SelectItem>
                <SelectItem value="Region 3">Region 3</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Project Grid */}
      {filteredProjects.length === 0 ? (
        <div className="text-center py-20 bg-card rounded-xl border border-border">
          <FolderKanban size={48} className="mx-auto text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-semibold text-muted-foreground">No projects found</h3>
          <p className="text-sm text-muted-foreground mt-1">Try adjusting your filters or search</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedProjects.map((project) => {
            const projectSite = sites.find(s => s.id === project.site_id);
            const siteRegion = projectSite ? projectSite.region : '';
            return (
              <div
                key={project.id}
                onClick={() => window.open(`/projects/${project.id}/board`, '_blank')}
                className="group bg-card border border-border rounded-xl p-5 hover:shadow-lg hover:shadow-primary/5 hover:border-primary/30 transition-all duration-300 cursor-pointer relative"
                data-testid={`project-card-${project.id}`}
              >
              {/* Delete button — hidden when can_edit=false or unauthorized */}
              {canEditPerm && canManageProject(project) && (
              <button
                onClick={(e) => handleDeleteProject(e, project.id)}
                className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
              >
                <Trash2 size={14} />
              </button>
              )}

              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  {getTypeIcon(project.type)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                      {project.name}
                    </h3>
                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 font-medium ${
                      project.status === 'Hold' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                      project.status === 'Finished' ? 'bg-indigo-100 text-indigo-700 border-indigo-200' :
                      'bg-emerald-100 text-emerald-700 border-emerald-200'
                    }`}>
                      {project.status || 'Open'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="outline" className={`text-xs px-1.5 py-0 ${getTypeColor(project.type)}`}>
                      {project.key}
                    </Badge>
                    <Badge variant="outline" className="text-xs px-1.5 py-0">
                      {project.type}
                    </Badge>
                  </div>
                </div>
              </div>

              {project.description && (
                <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                  {project.description}
                </p>
              )}

              {project.due_date && (
                <div className="mb-3">
                  <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded border border-red-200">
                    Dead Line : {new Date(project.due_date).toLocaleDateString('en-GB').replace(/\//g, '-')}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border pt-3 mt-auto">
                <div className="flex items-center gap-3">
                  {project.leader_name && (
                    <span className="flex items-center gap-1">
                      <Users size={12} />
                      {project.leader_name}
                    </span>
                  )}
                  {project.sales_user_name && (
                    <span className="flex items-center gap-1">
                      <Briefcase size={12} />
                      {project.sales_user_name}
                    </span>
                  )}
                  {project.site_name && (
                    <span className="flex items-center gap-1" title={siteRegion ? `Region: ${siteRegion}` : ''}>
                      <Globe size={12} />
                      {project.site_name} {siteRegion ? `(${siteRegion})` : ''}
                    </span>
                  )}
                </div>
                <span className="flex items-center gap-1">
                  <Calendar size={12} />
                  {new Date(project.created_at).toLocaleDateString()}
                </span>
              </div>

              {/* Hover arrow */}
              <ChevronRight
                size={18}
                className="absolute right-3 bottom-5 opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-1 text-primary"
              />
            </div>
          );
          })}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center mt-6">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      className={currentPage === 1 ? "pointer-events-none opacity-50 cursor-pointer" : "cursor-pointer"}
                    />
                  </PaginationItem>
                  {[...Array(totalPages)].map((_, i) => (
                    <PaginationItem key={i}>
                      <PaginationLink 
                        isActive={currentPage === i + 1}
                        onClick={() => setCurrentPage(i + 1)}
                        className="cursor-pointer"
                      >
                        {i + 1}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  <PaginationItem>
                    <PaginationNext 
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      className={currentPage === totalPages ? "pointer-events-none opacity-50 cursor-pointer" : "cursor-pointer"}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Projects;
