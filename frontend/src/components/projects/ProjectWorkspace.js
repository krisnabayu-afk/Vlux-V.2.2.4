import { useEffect, useState, useCallback } from 'react';
import { Routes, Route, Navigate, useParams, useLocation, Link } from 'react-router-dom';
import { LayoutGrid, CalendarRange, ListTodo, List, CheckCircle } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';
import ProjectSidebar from './ProjectSidebar';
import KanbanBoard from './KanbanBoard';
import TimelineView from './TimelineView';
import BacklogView from './BacklogView';
import IssuesView from './IssuesView';
import TaskDetailPanel from './TaskDetailPanel';
import CreateIssueDialog from './CreateIssueDialog';
import ProjectSettings from './ProjectSettings';
import ProjectActivityLogView from './ProjectActivityLogView';
import { Settings, History } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCanEdit } from '../../context/PermissionContext';

const API = `${process.env.REACT_APP_API_URL}/api`;

const ProjectWorkspace = () => {
  const { projectId } = useParams();
  const location = useLocation();
  const { user, isTechOps, orgConfig } = useAuth();
  const canEditProjects = useCanEdit('projects');
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showTaskPanel, setShowTaskPanel] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createInitialData, setCreateInitialData] = useState(null);
  const [summaryPresets, setSummaryPresets] = useState([]);

  const canEdit = canEditProjects;
  const isSales = (user?.department_id === orgConfig?.division_mappings?.sales_department_id) || user?.department === 'Sales';

  const isAuthorized = project && !isSales && (
    project.created_by === user?.id || 
    project.leader_id === user?.id || 
    user?.role === 'SuperUser' || 
    (user?.role === 'VP' && isTechOps)
  );

  const isTechVP = user?.role === 'VP' && (
    (user?.department_id === orgConfig?.division_mappings?.tech_ops_department_id) || 
    user?.department === 'Technical Operation'
  );

  const isSalesVP = user?.role === 'VP' && (
    (user?.department_id === orgConfig?.division_mappings?.sales_department_id) || 
    user?.department === 'Sales'
  );

  const fetchProject = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/projects/${projectId}`);
      setProject(res.data);
    } catch (err) {
      toast.error('Failed to load project');
    }
  }, [projectId]);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/projects/${projectId}/tasks`);
      setTasks(res.data || []);
    } catch (err) {
      toast.error('Failed to load tasks');
    }
  }, [projectId]);

  const fetchStatuses = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/projects/${projectId}/statuses`);
      setStatuses(res.data || []);
    } catch (err) {
      console.error('Failed to load statuses');
    }
  }, [projectId]);

  const fetchUsers = async () => {
    try {
      const res = await axios.get(`${API}/users`);
      setUsers(res.data || []);
    } catch (err) {
      console.error('Failed to fetch users');
    }
  };

  const fetchSummaryPresets = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/summary-presets`);
      setSummaryPresets((res.data || []).map(p => p.name));
    } catch (err) {
      console.error('Failed to fetch summary presets');
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchProject(), fetchTasks(), fetchStatuses(), fetchUsers(), fetchSummaryPresets()]);
      setLoading(false);
    };
    init();
  }, [fetchProject, fetchTasks, fetchStatuses, fetchSummaryPresets]);

  const handleTaskClick = (task) => {
    setSelectedTask(task);
    setShowTaskPanel(true);
  };

  const handleTaskUpdate = async (taskId, updates) => {
    try {
      await axios.put(`${API}/projects/${projectId}/tasks/${taskId}`, updates);
      await fetchTasks();
      // Refresh selected task if open
      if (selectedTask?.id === taskId) {
        const res = await axios.get(`${API}/projects/${projectId}/tasks/${taskId}`);
        setSelectedTask(res.data);
      }
    } catch (err) {
      toast.error('Failed to update task');
    }
  };

  const handleTaskCreate = async (data) => {
    try {
      const res = await axios.post(`${API}/projects/${projectId}/tasks`, data);
      toast.success(`Task ${res.data.task_number} created!`);
      setShowCreateDialog(false);
      await fetchTasks();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create task');
    }
  };

  const handleTaskDelete = async (taskId) => {
    try {
      await axios.delete(`${API}/projects/${projectId}/tasks/${taskId}`);
      toast.success('Task deleted');
      if (selectedTask?.id === taskId) {
        setShowTaskPanel(false);
        setSelectedTask(null);
      }
      await fetchTasks();
    } catch (err) {
      toast.error('Failed to delete task');
    }
  };

  const handleAddComment = async (taskId, comment) => {
    try {
      await axios.post(`${API}/projects/${projectId}/tasks/${taskId}/comments`, { comment });
      toast.success('Comment added');
      // Refresh
      const res = await axios.get(`${API}/projects/${projectId}/tasks/${taskId}`);
      setSelectedTask(res.data);
      await fetchTasks();
    } catch (err) {
      toast.error('Failed to add comment');
    }
  };

  const handleUpdateComment = async (taskId, commentId, comment) => {
    try {
      await axios.put(`${API}/projects/${projectId}/tasks/${taskId}/comments/${commentId}`, { comment });
      toast.success('Comment updated');
      // Refresh
      const res = await axios.get(`${API}/projects/${projectId}/tasks/${taskId}`);
      setSelectedTask(res.data);
      await fetchTasks();
    } catch (err) {
      toast.error('Failed to update comment');
    }
  };

  const handleProjectUpdate = async (updates) => {
    try {
      await axios.put(`${API}/projects/${projectId}`, updates);
      await fetchProject();
    } catch (err) {
      throw err;
    }
  };

  const handleStatusCreate = async (data) => {
    try {
      await axios.post(`${API}/projects/${projectId}/statuses`, data);
      await fetchStatuses();
    } catch (err) {
      throw err;
    }
  };

  const handleStatusUpdate = async (statusId, data) => {
    try {
      await axios.put(`${API}/projects/${projectId}/statuses/${statusId}`, data);
      await fetchStatuses();
    } catch (err) {
      throw err;
    }
  };

  const handleStatusDelete = async (statusId) => {
    try {
      await axios.delete(`${API}/projects/${projectId}/statuses/${statusId}`);
      await fetchStatuses();
    } catch (err) {
      throw err;
    }
  };

  const handleStatusReorder = async (reorderedStatuses) => {
    try {
      await axios.put(`${API}/projects/${projectId}/statuses/reorder`, {
        statuses: reorderedStatuses.map((s, index) => ({ id: s.id, order: index })),
      });
      await fetchStatuses();
    } catch (err) {
      throw err;
    }
  };

  const handleApprove = async (type) => {
    try {
      await axios.post(`${API}/projects/${projectId}/approve`, { type });
      toast.success('Approval recorded');
      await fetchProject();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to approve project');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-3"></div>
          <p className="text-muted-foreground text-sm">Loading workspace...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="text-center py-20">
        <p className="text-lg text-muted-foreground">Project not found</p>
      </div>
    );
  }

  const sharedProps = {
    project,
    tasks,
    statuses,
    users,
    canEdit: canEdit && !isSales,
    onTaskClick: handleTaskClick,
    onTaskUpdate: handleTaskUpdate,
    onTaskCreate: (data) => {
      setCreateInitialData(data || null);
      setShowCreateDialog(true);
    },
    onTaskDelete: handleTaskDelete,
    onStatusReorder: handleStatusReorder,
  };

  return (
    <div className="flex gap-0 -mx-6 -mt-4 min-h-[calc(100vh-80px)]" data-testid="project-workspace">
      <ProjectSidebar project={project} />

      <div className="flex-1 p-6 overflow-auto">
        {/* Project Approvals Section */}
        {(project.status === 'Finished' || project.status === 'FINAL / COMPLETED') && (
          <div className="mb-6 p-4 bg-background border border-border rounded-xl shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <CheckCircle size={16} className="text-primary" />
                Final Project Approvals
              </h3>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                  project.status === 'FINAL / COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                }`}>
                  {project.status}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Technical Approval */}
              <div className={`p-4 rounded-lg border ${project.tech_vp_approved_at ? 'bg-green-50/30 border-green-200' : 'bg-secondary/20 border-border'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Technical Approval</p>
                    {project.tech_vp_approved_at ? (
                      <div>
                        <p className="text-sm font-bold text-green-700">Approved by VP Teknis</p>
                        <p className="text-[10px] text-muted-foreground">
                          {project.tech_vp_user_name} • {new Date(project.tech_vp_approved_at).toLocaleString()}
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm font-medium text-amber-600">Waiting for Technical Approval</p>
                    )}
                  </div>
                  {isTechVP && !project.tech_vp_approved_at && project.status === 'Finished' && (
                    <button 
                      onClick={() => handleApprove('tech')}
                      className="px-4 py-1.5 bg-primary text-primary-foreground text-xs font-bold rounded-md hover:opacity-90 transition-all shadow-sm"
                    >
                      Approve (Tech)
                    </button>
                  )}
                </div>
              </div>

              {/* Sales Approval */}
              <div className={`p-4 rounded-lg border ${project.sales_vp_approved_at ? 'bg-green-50/30 border-green-200' : 'bg-secondary/20 border-border'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Sales Approval</p>
                    {project.sales_vp_approved_at ? (
                      <div>
                        <p className="text-sm font-bold text-green-700">Approved by VP Sales</p>
                        <p className="text-[10px] text-muted-foreground">
                          {project.sales_vp_user_name} • {new Date(project.sales_vp_approved_at).toLocaleString()}
                        </p>
                      </div>
                    ) : (
                      <p className="text-sm font-medium text-amber-600">Waiting for Sales Approval</p>
                    )}
                  </div>
                  {isSalesVP && !project.sales_vp_approved_at && project.status === 'Finished' && (
                    <button 
                      onClick={() => handleApprove('sales')}
                      className="px-4 py-1.5 bg-primary text-primary-foreground text-xs font-bold rounded-md hover:opacity-90 transition-all shadow-sm"
                    >
                      Approve (Sales)
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* View Switcher */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-1 bg-secondary/50 p-1 rounded-lg border border-border/50">
            <Link 
              to={`/projects/${projectId}/board`} 
              className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-semibold transition-all
                ${location.pathname.endsWith('/board') ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <LayoutGrid size={14} /> Board
            </Link>
            <Link 
              to={`/projects/${projectId}/timeline`} 
              className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-semibold transition-all
                ${location.pathname.endsWith('/timeline') ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <CalendarRange size={14} /> Timeline
            </Link>
            <Link 
              to={`/projects/${projectId}/backlog`} 
              className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-semibold transition-all
                ${location.pathname.endsWith('/backlog') ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <ListTodo size={14} /> Backlog
            </Link>
            <Link 
              to={`/projects/${projectId}/issues`} 
              className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-semibold transition-all
                ${location.pathname.endsWith('/issues') ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <List size={14} /> List
            </Link>
            <Link 
              to={`/projects/${projectId}/activity`} 
              className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-semibold transition-all
                ${location.pathname.endsWith('/activity') ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <History size={14} /> Activity
            </Link>
            {isAuthorized && (
              <Link 
                to={`/projects/${projectId}/settings`} 
                className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-semibold transition-all
                  ${location.pathname.endsWith('/settings') ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <Settings size={14} /> Settings
              </Link>
            )}
          </div>
        </div>

        <Routes>
          <Route path="board" element={<KanbanBoard {...sharedProps} />} />
          <Route path="timeline" element={<TimelineView {...sharedProps} />} />
          <Route path="backlog" element={<BacklogView {...sharedProps} />} />
          <Route path="issues" element={<IssuesView {...sharedProps} />} />
          <Route path="activity" element={<ProjectActivityLogView project={project} />} />
          {isAuthorized && (
            <Route 
              path="settings" 
              element={
                <ProjectSettings 
                  {...sharedProps} 
                  onProjectUpdate={handleProjectUpdate}
                  onStatusCreate={handleStatusCreate}
                  onStatusUpdate={handleStatusUpdate}
                  onStatusDelete={handleStatusDelete}
                  onStatusReorder={handleStatusReorder}
                />
              } 
            />
          )}
          <Route path="*" element={<Navigate to={`/projects/${projectId}/board`} replace />} />
        </Routes>
      </div>

      {/* Task Detail Panel */}
      <TaskDetailPanel
        task={selectedTask}
        open={showTaskPanel}
        onClose={() => { setShowTaskPanel(false); setSelectedTask(null); }}
        onUpdate={handleTaskUpdate}
        onDelete={handleTaskDelete}
        onAddComment={handleAddComment}
        onUpdateComment={handleUpdateComment}
        statuses={statuses}
        users={users}
        canEdit={canEdit}
        summaryPresets={summaryPresets}
      />

      {/* Create Issue Dialog */}
      <CreateIssueDialog
        open={showCreateDialog}
        onClose={() => {
          setShowCreateDialog(false);
          setCreateInitialData(null);
        }}
        onSubmit={handleTaskCreate}
        statuses={statuses}
        users={users}
        projectKey={project.key}
        initialData={createInitialData}
        summaryPresets={summaryPresets}
      />
    </div>
  );
};

export default ProjectWorkspace;
