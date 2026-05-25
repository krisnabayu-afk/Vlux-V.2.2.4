import { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { UserCheck, Check, X, Users, Trash2, Shield, Edit, Key, Clock, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { Switch } from '../components/ui/switch';

const API = `${process.env.REACT_APP_API_URL}/api`;

const AccountManagement = () => {
  const { user } = useAuth();
  const [pendingAccounts, setPendingAccounts] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' or 'users'
  const [editingUser, setEditingUser] = useState(null);
  const [editFormData, setEditFormData] = useState({
    role: '',
    department: '',
    division: '',
    region: '',
    account_status: '',
    is_project_leader: false
  });
  const [isEditOpen, setIsEditOpen] = useState(false);

  const [departmentsData, setDepartmentsData] = useState([]);
  const [divisionsData, setDivisionsData] = useState([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'Staff',
    department: '',
    department_id: '',
    division: '',
    division_id: '',
    region: 'Region 1'
  });

  const [isResetOpen, setIsResetOpen] = useState(false);
  const [resetUser, setResetUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');

  // Access Logs state
  const [accessLogs, setAccessLogs] = useState([]);
  const [accessLogsPage, setAccessLogsPage] = useState(1);
  const [accessLogsTotalPages, setAccessLogsTotalPages] = useState(1);
  const [accessLogsTotal, setAccessLogsTotal] = useState(0);
  const [accessLogsLoading, setAccessLogsLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  useEffect(() => {
    fetchPendingAccounts();
    fetchDepartments();
    fetchDivisions();
    if (user?.role === 'SuperUser' || user?.role === 'VP' || user?.role === 'Manager') {
      fetchAllUsers();
    }
  }, [user]);

  useEffect(() => {
    if (activeTab === 'logs' && user?.role === 'SuperUser') {
      fetchAccessLogs(accessLogsPage);
    }
  }, [activeTab, accessLogsPage]);

  const fetchDepartments = async () => {
    try {
      const response = await axios.get(`${API}/departments`);
      setDepartmentsData(response.data);
    } catch (error) {
      console.error('Failed to fetch departments:', error);
    }
  };

  const fetchDivisions = async () => {
    try {
      const response = await axios.get(`${API}/divisions`);
      setDivisionsData(response.data);
    } catch (error) {
      console.error('Failed to fetch divisions:', error);
    }
  };

  const fetchPendingAccounts = async () => {
    try {
      const response = await axios.get(`${API}/accounts/pending`);
      setPendingAccounts(response.data);
    } catch (error) {
      console.error('Failed to fetch pending accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllUsers = async () => {
    try {
      const response = await axios.get(`${API}/users`);
      if (user?.role === 'VP' || user?.role === 'Manager') {
        setAllUsers(response.data.filter(u => u.role !== 'SuperUser'));
      } else {
        setAllUsers(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const fetchAccessLogs = async (page = 1) => {
    setAccessLogsLoading(true);
    try {
      const response = await axios.get(`${API}/users/access-logs?page=${page}&limit=50`);
      setAccessLogs(response.data.items);
      setAccessLogsTotalPages(response.data.total_pages);
      setAccessLogsTotal(response.data.total);
    } catch (error) {
      console.error('Failed to fetch access logs:', error);
    } finally {
      setAccessLogsLoading(false);
    }
  };

  const formatAccessTime = (isoString) => {
    const d = new Date(isoString);
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  };

  const handleReview = async (userId, action) => {
    try {
      await axios.post(`${API}/accounts/review`, {
        user_id: userId,
        action: action
      });
      toast.success(`Account ${action}d successfully!`);
      fetchPendingAccounts();
    } catch (error) {
      toast.error(error.response?.data?.detail || `Failed to ${action} account`);
    }
  };

  const handleDeleteUser = async (userId, username) => {
    if (!window.confirm(`Are you sure you want to permanently delete user "${username}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await axios.delete(`${API}/users/${userId}`);
      toast.success('User deleted successfully!');
      fetchAllUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete user');
    }
  };

  const handleEditClick = (user) => {
    // Resolve IDs if missing (for legacy users)
    let deptId = user.department_id;
    if (!deptId && user.department) {
      const dept = departmentsData.find(d => d.name === user.department);
      if (dept) deptId = dept.id;
    }

    let divId = user.division_id;
    if (!divId && user.division) {
      const div = divisionsData.find(d => d.name === user.division);
      if (div) divId = div.id;
    }

    setEditingUser(user);
    setEditFormData({
      role: user.role,
      department: user.department || '',
      department_id: deptId || '',
      division: user.division || '',
      division_id: divId || '',
      region: user.region || '',
      account_status: user.account_status || 'approved',
      two_factor_enabled: user.two_factor_enabled || false,
      is_project_leader: user.is_project_leader || false
    });
    setIsEditOpen(true);
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${API}/users/${editingUser.id}`, editFormData);
      toast.success('User updated successfully!');
      setIsEditOpen(false);
      setEditingUser(null);
      fetchAllUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update user');
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/users/create`, createFormData);
      toast.success('User created successfully!');
      setIsCreateOpen(false);
      setCreateFormData({
        username: '',
        email: '',
        password: '',
        role: 'Staff',
        department: '',
        department_id: '',
        division: '',
        division_id: '',
        region: 'Region 1'
      });
      fetchAllUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create user');
    }
  };

  const handleResetPasswordClick = (user) => {
    setResetUser(user);
    setNewPassword('');
    setIsResetOpen(true);
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters long');
      return;
    }

    setResetLoading(true);
    try {
      await axios.post(`${API}/users/${resetUser.id}/reset-password`, {
        new_password: newPassword
      });
      toast.success('Password reset successfully!');
      setIsResetOpen(false);
      setResetUser(null);
      setNewPassword('');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to reset password');
    } finally {
      setResetLoading(false);
    }
  };

  const handleExportCSV = async () => {
    setExportLoading(true);
    try {
      const response = await axios.get(`${API}/users/export`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'users_export.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('User list exported successfully!');
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export user list');
    } finally {
      setExportLoading(false);
    }
  };

  const getRoleBadgeColor = (role) => {
    const colors = {
      'SuperUser': 'bg-purple-100 text-purple-800 border-purple-200',
      'VP': 'bg-indigo-100 text-indigo-800 border-indigo-200',
      'Manager': 'bg-gray-700/50 text-gray-200 border-gray-600',
      'SPV': 'bg-green-100 text-green-800 border-green-200',
      'Staff': 'bg-secondary text-secondary-foreground border-border'
    };
    return colors[role] || 'bg-secondary text-secondary-foreground';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="account-management-page">
      <div>
        <h1 className="text-4xl font-bold text-foreground mb-2">Account Management</h1>
        <p className="text-muted-foreground">
          {user?.role === 'SuperUser'
            ? 'Manage user accounts and approve registrations'
            : `Review and approve pending staff registrations${user?.role === 'Manager' ? ` for ${user.division} division` : ''}`
          }
        </p>
      </div>

      <div className="flex justify-between items-center mb-4">
        {(user?.role === 'SuperUser' || user?.role === 'VP' || user?.role === 'Manager') && (
          <div className="flex space-x-2 border-b pb-2">
            <Button
              variant={activeTab === 'pending' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('pending')}
              className={activeTab === 'pending' ? 'bg-gray-600' : ''}
            >
              <UserCheck size={18} className="mr-2" />
              Pending Approvals ({pendingAccounts.length})
            </Button>
            <Button
              variant={activeTab === 'users' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('users')}
              className={activeTab === 'users' ? 'bg-gray-600' : ''}
            >
              <Users size={18} className="mr-2" />
              All Users ({allUsers.length})
            </Button>
            {user?.role === 'SuperUser' && (
              <Button
                variant={activeTab === 'logs' ? 'default' : 'ghost'}
                onClick={() => setActiveTab('logs')}
                className={activeTab === 'logs' ? 'bg-gray-600' : ''}
              >
                <Clock size={18} className="mr-2" />
                Access Logs
              </Button>
            )}
          </div>
        )}

        {user?.role === 'SuperUser' && (
          <div className="flex space-x-2">
            <Button
              onClick={handleExportCSV}
              disabled={exportLoading}
              variant="outline"
              className="border-primary text-primary hover:bg-primary/10"
            >
              <Download size={18} className="mr-2" />
              {exportLoading ? 'Exporting...' : 'Export CSV'}
            </Button>
            <Button onClick={() => setIsCreateOpen(true)} className="bg-primary hover:bg-primary/90">
              Create User
            </Button>
          </div>
        )}
      </div>

      {(activeTab === 'pending' || user?.role !== 'SuperUser') && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pendingAccounts.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <UserCheck size={48} className="mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500">No pending account approvals</p>
            </div>
          ) : (
            pendingAccounts.map((account) => (
              <Card key={account.id} className="hover:shadow-lg transition-shadow border-l-4 border-l-yellow-500" data-testid={`account-card-${account.id}`}>
                <CardHeader>
                  <CardTitle className="text-lg">{account.username}</CardTitle>
                  <CardDescription className="text-sm">
                    {account.email}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="font-semibold text-slate-300">Department:</p>
                      <p className="text-foreground">{account.department || '-'}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-300">Division:</p>
                      <p className="text-foreground">{account.division}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-300">Role:</p>
                      <p className="text-foreground">{account.role}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-300">Region:</p>
                      <p className="text-foreground">{account.region || '-'}</p>
                    </div>
                  </div>

                  <div>
                    <p className="font-semibold text-slate-300 text-sm">Status:</p>
                    <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
                      {account.account_status}
                    </Badge>
                  </div>

                  <div>
                    <p className="text-xs text-slate-400">
                      Registered: {new Date(account.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex flex-col space-y-2 pt-2">
                    <Button
                      onClick={() => window.open(`/profile/${account.id}`, '_blank')}
                      variant="outline"
                      className="w-full text-blue-600 border-blue-200 hover:bg-blue-50"
                    >
                      View Profile
                    </Button>
                    <div className="flex space-x-2">
                      <Button
                        onClick={() => handleReview(account.id, 'approve')}
                        className="flex-1 bg-green-500 hover:bg-green-600"
                        data-testid={`approve-${account.id}`}
                      >
                        <Check size={16} className="mr-1" />
                        Approve
                      </Button>
                      <Button
                        onClick={() => handleReview(account.id, 'reject')}
                        variant="outline"
                        className="flex-1 text-red-600 border-red-600 hover:bg-red-50"
                        data-testid={`reject-${account.id}`}
                      >
                        <X size={16} className="mr-1" />
                        Reject
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {activeTab === 'users' && (user?.role === 'SuperUser' || user?.role === 'VP' || user?.role === 'Manager') && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {allUsers.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <Users size={48} className="mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500">No users found</p>
            </div>
          ) : (
            allUsers.map((u) => (
              <Card key={u.id} className="hover:shadow-lg transition-shadow" data-testid={`user-card-${u.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        {u.username}
                        {u.role === 'SuperUser' && <Shield size={16} className="text-purple-500" />}
                      </CardTitle>
                      <CardDescription className="text-sm">
                        {u.email}
                      </CardDescription>
                    </div>
                    {u.id !== user.id && u.role !== 'SuperUser' && (user?.role === 'SuperUser' || user?.role === 'VP') && (
                      <div className="flex space-x-1">
                        {user?.role === 'SuperUser' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleResetPasswordClick(u)}
                            className="text-amber-500 hover:text-amber-700 hover:bg-amber-50"
                            title="Reset Password"
                          >
                            <Key size={18} />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditClick(u)}
                          className="text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                          data-testid={`edit-user-${u.id}`}
                        >
                          <Edit size={18} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteUser(u.id, u.username)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          data-testid={`delete-user-${u.id}`}
                        >
                          <Trash2 size={18} />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={getRoleBadgeColor(u.role)}>
                      {u.role}
                    </Badge>
                    {(() => {
                      const deptName = u.department_id
                        ? departmentsData.find(d => d.id === u.department_id)?.name
                        : u.department;
                      return deptName ? (
                        <Badge variant="outline" className="border-blue-300 text-blue-600">{deptName}</Badge>
                      ) : null;
                    })()}
                    {(() => {
                      const divName = u.division_id
                        ? divisionsData.find(d => d.id === u.division_id)?.name
                        : u.division;
                      return divName ? (
                        <Badge variant="outline">{divName}</Badge>
                      ) : null;
                    })()}
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-border/50">
                    <Badge
                      className={u.account_status === 'approved'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                      }
                    >
                      {u.account_status || 'approved'}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(`/profile/${u.id}`, '_blank')}
                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    >
                      View Profile
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {activeTab === 'logs' && user?.role === 'SuperUser' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock size={20} />
              User Access Logs
            </CardTitle>
            <CardDescription>Login activity across all users — newest first. Total: {accessLogsTotal} entries.</CardDescription>
          </CardHeader>
          <CardContent>
            {accessLogsLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-muted-foreground">Loading access logs...</div>
              </div>
            ) : accessLogs.length === 0 ? (
              <div className="text-center py-12">
                <Clock size={48} className="mx-auto text-slate-300 mb-4" />
                <p className="text-slate-500">No access logs recorded yet</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/50 border-b border-border">
                        <th className="text-left px-4 py-3 font-semibold text-muted-foreground">#</th>
                        <th className="text-left px-4 py-3 font-semibold text-muted-foreground">User Name</th>
                        <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Email</th>

                        <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Access Date & Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {accessLogs.map((log, idx) => (
                        <tr key={log.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 text-muted-foreground">{(accessLogsPage - 1) * 50 + idx + 1}</td>
                          <td className="px-4 py-3 font-medium text-foreground">{log.user_name}</td>
                          <td className="px-4 py-3 text-muted-foreground">{log.user_email}</td>

                          <td className="px-4 py-3 text-muted-foreground">{formatAccessTime(log.access_time)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {accessLogsTotalPages > 1 && (
                  <div className="flex items-center justify-between pt-4">
                    <p className="text-sm text-muted-foreground">
                      Page {accessLogsPage} of {accessLogsTotalPages}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={accessLogsPage <= 1}
                        onClick={() => setAccessLogsPage((p) => Math.max(1, p - 1))}
                      >
                        <ChevronLeft size={16} className="mr-1" /> Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={accessLogsPage >= accessLogsTotalPages}
                        onClick={() => setAccessLogsPage((p) => p + 1)}
                      >
                        Next <ChevronRight size={16} className="ml-1" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="text-foreground">Edit User: {editingUser?.username}</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Update user role and division.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateUser} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-foreground">Role</Label>
              <Select
                value={editFormData.role}
                onValueChange={(value) => setEditFormData({ ...editFormData, role: value, region: value === 'VP' ? '' : editFormData.region })}
                disabled={editFormData.division === 'Apps' || editFormData.division === 'Fiberzone'}
              >
                <SelectTrigger className="bg-background border-input text-foreground">
                  <SelectValue placeholder="Select Role" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border text-foreground">
                  <SelectItem value="Staff">Staff</SelectItem>
                  <SelectItem value="SPV">SPV</SelectItem>
                  <SelectItem value="Manager">Manager</SelectItem>
                  <SelectItem value="VP">VP</SelectItem>
                  {user?.role === 'SuperUser' && <SelectItem value="SuperUser">SuperUser</SelectItem>}
                </SelectContent>
              </Select>
            </div>

            {editFormData.role !== 'VP' && (
              <div className="space-y-2">
                <Label className="text-foreground">Region</Label>
                <Select
                  value={editFormData.region}
                  onValueChange={(value) => setEditFormData({ ...editFormData, region: value })}
                >
                  <SelectTrigger className="bg-background border-input text-foreground">
                    <SelectValue placeholder="Select Region" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border text-foreground">
                    <SelectItem value="Region 1">Region 1</SelectItem>
                    <SelectItem value="Region 2">Region 2</SelectItem>
                    <SelectItem value="Region 3">Region 3</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-foreground">Department</Label>
              <Select
                value={editFormData.department_id}
                onValueChange={(value) => {
                  const deptObj = departmentsData.find(d => d.id === value);
                  if (!deptObj) return;

                  // Get divisions for this department
                  const filteredDivs = divisionsData.filter(div => div.department_id === value);
                  const firstDiv = filteredDivs[0];

                  setEditFormData({
                    ...editFormData,
                    department_id: value,
                    department: deptObj.name,
                    division_id: firstDiv ? firstDiv.id : '',
                    division: firstDiv ? firstDiv.name : ''
                  });
                }}
              >
                <SelectTrigger className="bg-background border-input text-foreground">
                  <SelectValue placeholder="Select Department" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border text-foreground">
                  {departmentsData.map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-foreground">Division</Label>
              <Select
                value={editFormData.division_id}
                onValueChange={(value) => {
                  const divObj = divisionsData.find(d => d.id === value);
                  if (!divObj) return;

                  let newRole = editFormData.role;
                  if (divObj.name === 'Apps' || divObj.name === 'Fiberzone') {
                    newRole = 'Staff';
                  } else if (divObj.name === 'Admin') {
                    newRole = 'VP';
                  }

                  setEditFormData({
                    ...editFormData,
                    division_id: value,
                    division: divObj.name,
                    role: newRole
                  });
                }}
                disabled={!editFormData.department_id}
              >
                <SelectTrigger className="bg-background border-input text-foreground">
                  <SelectValue placeholder="Select Division" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border text-foreground">
                  {divisionsData.filter(div => div.department_id === editFormData.department_id).map((div) => (
                    <SelectItem key={div.id} value={div.id}>{div.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-foreground">Account Status</Label>
              <Select
                value={editFormData.account_status}
                onValueChange={(value) => setEditFormData({ ...editFormData, account_status: value })}
              >
                <SelectTrigger className="bg-background border-input text-foreground">
                  <SelectValue placeholder="Select Status" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border text-foreground">
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between border rounded-lg p-3 my-2">
              <div className="space-y-0.5">
                <Label htmlFor="two_factor_edit" className="flex items-center gap-2 text-foreground">
                  <Shield className="w-4 h-4 text-primary" />
                  Two-Factor Authentication
                </Label>
                <p className="text-xs text-muted-foreground">
                  Require an email verification link to sign in.
                </p>
              </div>
              <Switch
                id="two_factor_edit"
                checked={editFormData.two_factor_enabled}
                onCheckedChange={(checked) => setEditFormData({ ...editFormData, two_factor_enabled: checked })}
              />
            </div>

            <div className="flex items-center justify-between border rounded-lg p-3 my-2">
              <div className="space-y-0.5">
                <Label htmlFor="project_leader_edit" className="flex items-center gap-2 text-foreground">
                  <Users className="w-4 h-4 text-primary" />
                  Project Leader
                </Label>
                <p className="text-xs text-muted-foreground">
                  Allows this user to lead projects.
                </p>
              </div>
              <Switch
                id="project_leader_edit"
                checked={editFormData.is_project_leader}
                onCheckedChange={(checked) => setEditFormData({ ...editFormData, is_project_leader: checked })}
                disabled={user?.role !== 'SuperUser'}
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)} className="border-border text-foreground hover:bg-accent">
                Cancel
              </Button>
              <Button type="submit" className="bg-green-500 hover:bg-green-600">
                Update User
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create User Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="bg-card border-border text-foreground sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-foreground">Create New User</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Directly create an approved user account. SuperUser only.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-foreground">Username</Label>
                <Input required value={createFormData.username} onChange={e => setCreateFormData({ ...createFormData, username: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label className="text-foreground">Email</Label>
                <Input required type="email" value={createFormData.email} onChange={e => setCreateFormData({ ...createFormData, email: e.target.value })} />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-foreground">Password</Label>
              <Input required type="password" value={createFormData.password} onChange={e => setCreateFormData({ ...createFormData, password: e.target.value })} />
            </div>

            <div className="space-y-2">
              <Label className="text-foreground">Role</Label>
              <Select value={createFormData.role} onValueChange={(value) => setCreateFormData({ ...createFormData, role: value, region: value === 'VP' ? '' : createFormData.region })}>
                <SelectTrigger><SelectValue placeholder="Select Role" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Staff">Staff</SelectItem>
                  <SelectItem value="SPV">SPV</SelectItem>
                  <SelectItem value="Manager">Manager</SelectItem>
                  <SelectItem value="VP">VP</SelectItem>
                  <SelectItem value="SuperUser">SuperUser</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {createFormData.role !== 'VP' && (
              <div className="space-y-2">
                <Label className="text-foreground">Region</Label>
                <Select value={createFormData.region} onValueChange={(value) => setCreateFormData({ ...createFormData, region: value })}>
                  <SelectTrigger><SelectValue placeholder="Select Region" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Region 1">Region 1</SelectItem>
                    <SelectItem value="Region 2">Region 2</SelectItem>
                    <SelectItem value="Region 3">Region 3</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-foreground">Department</Label>
                <Select
                  value={createFormData.department_id}
                  onValueChange={(value) => {
                    const deptObj = departmentsData.find(d => d.id === value);
                    if (!deptObj) return;

                    const filteredDivs = divisionsData.filter(div => div.department_id === value);
                    const firstDiv = filteredDivs[0];

                    setCreateFormData({
                      ...createFormData,
                      department_id: value,
                      department: deptObj.name,
                      division_id: firstDiv ? firstDiv.id : '',
                      division: firstDiv ? firstDiv.name : ''
                    });
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="Select Department" /></SelectTrigger>
                  <SelectContent>
                    {departmentsData.map(d => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-foreground">Division</Label>
                <Select
                  value={createFormData.division_id}
                  onValueChange={(value) => {
                    const divObj = divisionsData.find(d => d.id === value);
                    if (divObj) {
                      setCreateFormData({ ...createFormData, division_id: value, division: divObj.name });
                    }
                  }}
                  disabled={!createFormData.department_id}
                >
                  <SelectTrigger><SelectValue placeholder="Select Division" /></SelectTrigger>
                  <SelectContent>
                    {divisionsData.filter(div => div.department_id === createFormData.department_id).map((div) => (
                      <SelectItem key={div.id} value={div.id}>{div.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-primary hover:bg-primary/90">Create User</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={isResetOpen} onOpenChange={setIsResetOpen}>
        <DialogContent className="bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="text-foreground">Reset Password for {resetUser?.username}</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Directly set a new password for this user.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-foreground">New Password</Label>
              <Input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
              />
            </div>
            <div className="flex justify-end space-x-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsResetOpen(false)} disabled={resetLoading}>
                Cancel
              </Button>
              <Button type="submit" className="bg-primary hover:bg-primary/90" disabled={resetLoading}>
                {resetLoading ? 'Resetting...' : 'Reset Password'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AccountManagement;

