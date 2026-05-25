import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import {
  ShieldCheck,
  ChevronDown,
  Eye,
  EyeOff,
  Edit3,
  Save,
  Loader2,
  Lock,
  Unlock,
  FileText,
  Calendar,
  ClipboardCheck,
  Ticket,
  FileArchive,
  MapPin,
  FolderKanban,
  Zap,
} from 'lucide-react';

const API = `${process.env.REACT_APP_API_URL}/api`;

const MENU_DEFS = [
  { key: 'scheduler',  label: 'Schedule',   icon: Calendar,      hasReport: false },
  { key: 'activity',   label: 'Activity',   icon: ClipboardCheck,hasReport: false },
  { key: 'reports',    label: 'Reports',    icon: FileText,      hasReport: true  },
  { key: 'tickets',    label: 'Tickets',    icon: Ticket,        hasReport: false },
  { key: 'ttb',        label: 'TTB',        icon: FileArchive,   hasReport: false },
  { key: 'sites',      label: 'Sites',      icon: MapPin,        hasReport: false },
  { key: 'projects',   label: 'Projects',   icon: FolderKanban,  hasReport: false },
  { key: 'fiberzone',  label: 'Fiberzone',  icon: Zap,           hasReport: false },
];

const defaultPerm = (menuKey) => ({
  menu_key: menuKey,
  can_view: true,
  can_edit: true,
  report_visibility: 'all',
});

const AccessControl = () => {
  const { user } = useAuth();
  const [departments, setDepartments] = useState([]);
  const [selectedDept, setSelectedDept] = useState(null);
  const [perms, setPerms] = useState({});
  const [loadingDepts, setLoadingDepts] = useState(true);
  const [loadingPerms, setLoadingPerms] = useState(false);
  const [saving, setSaving] = useState(false);

  // Fetch all departments
  useEffect(() => {
    if (user?.role !== 'SuperUser') return;
    axios.get(`${API}/departments`)
      .then(res => setDepartments(res.data))
      .catch(() => toast.error('Failed to load departments'))
      .finally(() => setLoadingDepts(false));
  }, [user]);

  // Load permissions for selected department
  const loadDeptPerms = useCallback(async (dept) => {
    setLoadingPerms(true);
    try {
      const res = await axios.get(`${API}/permissions/department/${dept.id}`);
      // Convert array → keyed map
      const map = {};
      res.data.forEach(row => { map[row.menu_key] = { ...row }; });
      // Ensure all menu keys are present
      MENU_DEFS.forEach(m => {
        if (!map[m.key]) map[m.key] = defaultPerm(m.key);
      });
      setPerms(map);
    } catch (err) {
      toast.error('Failed to load permissions');
    } finally {
      setLoadingPerms(false);
    }
  }, []);

  const handleSelectDept = (dept) => {
    setSelectedDept(dept);
    loadDeptPerms(dept);
  };

  const toggleField = (menuKey, field) => {
    setPerms(prev => ({
      ...prev,
      [menuKey]: { ...prev[menuKey], [field]: !prev[menuKey][field] },
    }));
  };

  const setReportVisibility = (menuKey, value) => {
    setPerms(prev => ({
      ...prev,
      [menuKey]: { ...prev[menuKey], report_visibility: value },
    }));
  };

  const handleSave = async () => {
    if (!selectedDept) return;
    setSaving(true);
    try {
      const permList = Object.values(perms).map(p => ({
        menu_key: p.menu_key,
        can_view: p.can_view,
        can_edit: p.can_edit,
        report_visibility: p.report_visibility || 'all',
      }));
      await axios.put(`${API}/permissions/department/${selectedDept.id}`, { permissions: permList });
      toast.success(`Permissions saved for ${selectedDept.name}`);
    } catch (err) {
      toast.error('Failed to save permissions');
    } finally {
      setSaving(false);
    }
  };

  if (user?.role !== 'SuperUser') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-4">
        <Lock size={48} className="text-muted-foreground" />
        <h2 className="text-xl font-semibold text-foreground">Access Denied</h2>
        <p className="text-muted-foreground">Only SuperUser can manage access control.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 fade-in" data-testid="access-control-page">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-primary/10 rounded-xl">
              <ShieldCheck size={24} className="text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">Access Control</h1>
          </div>
          <p className="text-muted-foreground ml-[52px]">
            Configure which menus and features each department can access
          </p>
        </div>
        {selectedDept && (
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-primary hover:bg-primary/90 px-6"
            data-testid="save-permissions-btn"
          >
            {saving ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Save size={16} className="mr-2" />}
            {saving ? 'Saving…' : 'Save Permissions'}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar: Department List */}
        <div className="lg:col-span-1">
          <Card className="sticky top-24 border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Departments</CardTitle>
              <CardDescription className="text-xs">Select a department to configure</CardDescription>
            </CardHeader>
            <CardContent className="p-2">
              {loadingDepts ? (
                <div className="flex justify-center py-6">
                  <Loader2 size={20} className="animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-1">
                  {departments.map(dept => (
                    <button
                      key={dept.id}
                      onClick={() => handleSelectDept(dept)}
                      data-testid={`dept-btn-${dept.id}`}
                      className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                        selectedDept?.id === dept.id
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                      }`}
                    >
                      {dept.name}
                    </button>
                  ))}
                  {departments.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      No departments found
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Main: Permission Matrix */}
        <div className="lg:col-span-3">
          {!selectedDept ? (
            <div className="flex flex-col items-center justify-center h-64 rounded-2xl border border-dashed border-border bg-muted/20 text-center space-y-3">
              <ShieldCheck size={40} className="text-muted-foreground/50" />
              <p className="text-muted-foreground font-medium">Select a department to configure permissions</p>
              <p className="text-sm text-muted-foreground/70">Changes take effect immediately on next page refresh</p>
            </div>
          ) : loadingPerms ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 size={28} className="animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Card className="border-border shadow-sm">
              <CardHeader className="pb-4 border-b border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-bold">{selectedDept.name}</CardTitle>
                    <CardDescription>
                      Configure menu-level access and report visibility for this department
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {selectedDept.divisions?.length || 0} divisions
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {/* Table Header */}
                <div className="grid grid-cols-12 px-6 py-3 bg-muted/40 border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  <div className="col-span-4">Menu / Feature</div>
                  <div className="col-span-2 text-center">Can View</div>
                  <div className="col-span-2 text-center">Can Edit</div>
                  <div className="col-span-4">Report Visibility</div>
                </div>

                {/* Table Rows */}
                <div className="divide-y divide-border">
                  {MENU_DEFS.map((menu) => {
                    const perm = perms[menu.key] || defaultPerm(menu.key);
                    const Icon = menu.icon;

                    return (
                      <div
                        key={menu.key}
                        className={`grid grid-cols-12 items-center px-6 py-4 transition-colors hover:bg-muted/20 ${
                          !perm.can_view ? 'opacity-60' : ''
                        }`}
                        data-testid={`perm-row-${menu.key}`}
                      >
                        {/* Menu Name */}
                        <div className="col-span-4 flex items-center gap-3">
                          <div className={`p-1.5 rounded-lg ${perm.can_view ? 'bg-primary/10' : 'bg-muted'}`}>
                            <Icon size={16} className={perm.can_view ? 'text-primary' : 'text-muted-foreground'} />
                          </div>
                          <div>
                            <p className="font-medium text-sm text-foreground">{menu.label}</p>
                            <p className="text-xs text-muted-foreground capitalize">{menu.key}</p>
                          </div>
                        </div>

                        {/* Can View Toggle */}
                        <div className="col-span-2 flex justify-center">
                          <button
                            onClick={() => toggleField(menu.key, 'can_view')}
                            data-testid={`toggle-view-${menu.key}`}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                              perm.can_view ? 'bg-primary' : 'bg-muted-foreground/30'
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                                perm.can_view ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>

                        {/* Can Edit Toggle */}
                        <div className="col-span-2 flex justify-center">
                          <button
                            onClick={() => toggleField(menu.key, 'can_edit')}
                            disabled={!perm.can_view}
                            data-testid={`toggle-edit-${menu.key}`}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40 ${
                              perm.can_edit && perm.can_view ? 'bg-primary' : 'bg-muted-foreground/30'
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                                perm.can_edit && perm.can_view ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>

                        {/* Report Visibility (only for reports menu) */}
                        <div className="col-span-4">
                          {menu.hasReport ? (
                            <div className="flex flex-col gap-2">
                              <label className={`flex items-center gap-2 cursor-pointer group ${!perm.can_view ? 'opacity-40 pointer-events-none' : ''}`}>
                                <input
                                  type="radio"
                                  name={`report-vis-${menu.key}`}
                                  value="all"
                                  checked={perm.report_visibility !== 'final_only'}
                                  onChange={() => setReportVisibility(menu.key, 'all')}
                                  data-testid={`report-vis-all-${menu.key}`}
                                  className="accent-primary"
                                />
                                <span className="text-xs font-medium text-foreground group-hover:text-primary transition-colors">
                                  All Reports
                                </span>
                                <span className="text-[10px] text-muted-foreground">(Draft, Pending, Final)</span>
                              </label>
                              <label className={`flex items-center gap-2 cursor-pointer group ${!perm.can_view ? 'opacity-40 pointer-events-none' : ''}`}>
                                <input
                                  type="radio"
                                  name={`report-vis-${menu.key}`}
                                  value="final_only"
                                  checked={perm.report_visibility === 'final_only'}
                                  onChange={() => setReportVisibility(menu.key, 'final_only')}
                                  data-testid={`report-vis-final-${menu.key}`}
                                  className="accent-primary"
                                />
                                <span className="text-xs font-medium text-foreground group-hover:text-primary transition-colors">
                                  Final Only
                                </span>
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">restricted</Badge>
                              </label>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground/50 italic">—</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>

              {/* Footer */}
              <div className="px-6 py-4 bg-muted/20 border-t border-border rounded-b-lg">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    Changes take effect immediately after the user refreshes their browser.
                    SuperUser role is always unrestricted.
                  </p>
                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    size="sm"
                    className="bg-primary hover:bg-primary/90"
                    data-testid="save-permissions-footer-btn"
                  >
                    {saving ? <Loader2 size={14} className="mr-1.5 animate-spin" /> : <Save size={14} className="mr-1.5" />}
                    {saving ? 'Saving…' : 'Save'}
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default AccessControl;
