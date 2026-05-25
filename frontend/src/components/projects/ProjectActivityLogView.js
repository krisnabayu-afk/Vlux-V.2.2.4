import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { History, MessageSquare, CheckSquare, Settings, Calendar, RefreshCcw } from 'lucide-react';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_API_URL}/api`;

const ProjectActivityLogView = ({ project }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/projects/${project.id}/activities`, { params: { limit: 100 } });
      setLogs(res.data.items || []);
    } catch (err) {
      toast.error('Failed to load activity logs');
    } finally {
      setLoading(false);
    }
  }, [project.id]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const getIconForCategory = (category) => {
    switch (category) {
      case 'Task': return <CheckSquare size={16} className="text-blue-500" />;
      case 'Comment': return <MessageSquare size={16} className="text-emerald-500" />;
      case 'General': return <Settings size={16} className="text-purple-500" />;
      default: return <History size={16} className="text-muted-foreground" />;
    }
  };

  const getBgForCategory = (category) => {
    switch (category) {
      case 'Task': return 'bg-blue-100 border-blue-200';
      case 'Comment': return 'bg-emerald-100 border-emerald-200';
      case 'General': return 'bg-purple-100 border-purple-200';
      default: return 'bg-secondary border-border';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-10">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <History size={24} className="text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Project History</h1>
            <p className="text-sm text-muted-foreground">Timeline of activities and updates for {project.name}</p>
          </div>
        </div>
        <button 
          onClick={fetchLogs}
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-primary transition-colors bg-secondary/50 rounded-lg border border-border hover:border-primary/30"
        >
          <RefreshCcw size={14} /> Refresh
        </button>
      </div>

      {logs.length === 0 ? (
        <div className="text-center py-20 bg-card rounded-xl border border-border">
          <History size={48} className="mx-auto text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-semibold text-muted-foreground">No activities yet</h3>
          <p className="text-sm text-muted-foreground mt-1">Actions on this project will appear here.</p>
        </div>
      ) : (
        <div className="relative pl-6 space-y-8 before:absolute before:inset-0 before:ml-6 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
          {logs.map((log) => (
            <div key={log.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
              {/* Timeline marker */}
              <div className={`flex items-center justify-center w-8 h-8 rounded-full border shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 absolute left-0 md:left-1/2 -ml-4 md:ml-0 ${getBgForCategory(log.action_category)}`}>
                {getIconForCategory(log.action_category)}
              </div>
              
              <div className="w-[calc(100%-3rem)] md:w-[calc(50%-2.5rem)] bg-card border border-border p-4 rounded-xl shadow-sm group-hover:border-primary/30 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-sm text-foreground">{log.user_name}</span>
                  <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                    <Calendar size={12} />
                    {new Date(log.created_at).toLocaleString()}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground leading-relaxed">
                  {log.action_description}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProjectActivityLogView;
