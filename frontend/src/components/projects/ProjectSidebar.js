import { Link, useLocation } from 'react-router-dom';
import { LayoutGrid, List, ListTodo, ArrowLeft, FolderKanban, CalendarRange, Settings } from 'lucide-react';
import { Badge } from '../ui/badge';
import { useAuth } from '../../context/AuthContext';

const ProjectSidebar = ({ project }) => {
  const { user, isTechOps } = useAuth();
  const location = useLocation();
  const basePath = `/projects/${project.id}`;

  const isAuthorized = project && (
    project.created_by === user?.id || 
    project.leader_id === user?.id || 
    user?.role === 'SuperUser' || 
    (user?.role === 'VP' && isTechOps)
  );

  const navItems = [
    { path: `${basePath}/board`, label: 'Board', icon: LayoutGrid },
    { path: `${basePath}/timeline`, label: 'Timeline', icon: CalendarRange },
    { path: `${basePath}/backlog`, label: 'Backlog', icon: ListTodo },
    { path: `${basePath}/issues`, label: 'Issues', icon: List },
  ];

  if (isAuthorized) {
    navItems.push({ path: `${basePath}/settings`, label: 'Settings', icon: Settings });
  }

  return (
    <div className="w-[240px] min-w-[240px] bg-card border-r border-border flex flex-col h-full" data-testid="project-sidebar">
      {/* Project Header */}
      <div className="p-4 border-b border-border">
        <Link
          to="/projects"
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-3"
        >
          <ArrowLeft size={14} />
          All Projects
        </Link>
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <FolderKanban size={16} className="text-primary" />
          </div>
          <div className="min-w-0">
            <h2 className="font-semibold text-sm text-foreground truncate">{project.name}</h2>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 mt-0.5">
              {project.key}
            </Badge>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="p-3 flex-1">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">
          Planning
        </p>
        <div className="space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200
                  ${isActive
                    ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                  }`}
              >
                <Icon size={16} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Footer info */}
      <div className="p-4 border-t border-border">
        <div className="text-[10px] text-muted-foreground space-y-1">
          {project.site_name && (
            <p className="truncate">Site: {project.site_name}</p>
          )}
          {project.leader_name && (
            <p className="truncate">Lead: {project.leader_name}</p>
          )}
          <p>{project.type} project</p>
          {project.description && (
            <div className="pt-2 mt-2 border-t border-border/50">
              <p className="whitespace-pre-wrap leading-relaxed line-clamp-3" title={project.description}>
                {project.description}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectSidebar;
