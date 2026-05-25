import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { toast } from 'sonner';
import { User, Lock, Star, TrendingUp, MessageSquare, Award, FileText, Download, Trash2, Plus, Shield, Eye } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog';
import { Switch } from '../components/ui/switch';
import PDFPreviewDialog from '../components/PDFPreviewDialog';

const API = `${process.env.REACT_APP_API_URL}/api`;

const StarDisplay = ({ rating, size = 16 }) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map(s => (
      <Star
        key={s}
        size={size}
        className={s <= Math.round(rating) ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground'}
      />
    ))}
  </div>
);

const Profile = () => {
  const { user } = useAuth();
  const [profileData, setProfileData] = useState({
    username: user?.username || '',
    telegram_id: user?.telegram_id || '',
    two_factor_enabled: user?.two_factor_enabled || false
  });
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(user?.profile_photo || null);
  const [loading, setLoading] = useState(false);
  const [performance, setPerformance] = useState(null);

  const [certifications, setCertifications] = useState([]);
  const [certForm, setCertForm] = useState({
    title: '',
    date_taken: '',
    description: '',
    pdf_file: null
  });
  const [isCertModalOpen, setIsCertModalOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState({ url: '', title: '' });

  useEffect(() => {
    fetchPerformance();
    fetchCertifications();
  }, [user]);

  const fetchCertifications = async () => {
    if (!user?.id) return;
    try {
      const response = await axios.get(`${API}/certifications/${user.id}`);
      setCertifications(response.data);
    } catch (error) {
      console.error('Failed to fetch certifications:', error);
    }
  };

  const fetchPerformance = async () => {
    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      const response = await axios.get(`${API}/users/me/performance`, { params: { year, month } });
      setPerformance(response.data);
    } catch (error) {
      console.error('Failed to fetch performance:', error);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await axios.put(`${API}/auth/profile`, {
        username: profileData.username,
        telegram_id: profileData.telegram_id,
        two_factor_enabled: profileData.two_factor_enabled
      });
      toast.success('Profile updated successfully! If you changed 2FA, it will take effect next login.');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();

    if (passwordData.new_password !== passwordData.confirm_password) {
      toast.error('New passwords do not match');
      return;
    }

    setLoading(true);

    try {
      await axios.put(`${API}/auth/profile`, {
        current_password: passwordData.current_password,
        new_password: passwordData.new_password,
        confirm_password: passwordData.confirm_password
      });
      toast.success('Password changed successfully!');
      setPasswordData({
        current_password: '',
        new_password: '',
        confirm_password: ''
      });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfilePhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadPhoto = async () => {
    if (!profilePhoto) {
      toast.error('Please select a photo');
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('photo', profilePhoto);

    try {
      await axios.post(`${API}/auth/profile/photo`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Profile photo updated successfully!');
      window.location.reload(); // Reload to update photo in layout
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to upload photo');
    } finally {
      setLoading(false);
    }
  };

  const handleCertSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const formData = new FormData();
    formData.append('title', certForm.title);
    formData.append('date_taken', certForm.date_taken);
    if (certForm.description) formData.append('description', certForm.description);
    if (certForm.pdf_file) formData.append('pdf_file', certForm.pdf_file);

    try {
      await axios.post(`${API}/certifications`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Certification added successfully!');
      setCertForm({ title: '', date_taken: '', description: '', pdf_file: null });
      fetchCertifications();
      setIsCertModalOpen(false);
      // Reset file input
      const fileInput = document.getElementById('cert_pdf');
      if (fileInput) fileInput.value = '';
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add certification');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCert = async (certId) => {
    if (!window.confirm('Are you sure you want to delete this certification?')) return;
    try {
      await axios.delete(`${API}/certifications/${certId}`);
      toast.success('Certification deleted!');
      fetchCertifications();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete certification');
    }
  };

  return (
    <div className="space-y-6" data-testid="profile-page">
      <div>
        <h1 className="text-4xl font-bold text-foreground mb-2">My Profile</h1>
        <p className="text-muted-foreground">Manage your personal information and password</p>
      </div>

      {/* Performance Rating Card */}
      <Card className="border-yellow-500/30 bg-gradient-to-br from-yellow-500/5 to-orange-500/5">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-yellow-400">
            <TrendingUp size={20} />
            <span>Performance Rating</span>
          </CardTitle>
          <CardDescription>Your average report scores from Manager and VP approvals</CardDescription>
        </CardHeader>
        <CardContent>
          {performance ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Monthly */}
                <div className="bg-background/50 rounded-lg p-4 border border-border">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">This Month</p>
                  {performance.monthly_avg != null ? (
                    <>
                      <div className="flex items-center gap-2 mb-1">
                        <StarDisplay rating={performance.monthly_avg} size={20} />
                        <span className="text-2xl font-bold text-yellow-400">{performance.monthly_avg.toFixed(1)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{performance.monthly_count} rated report{performance.monthly_count !== 1 ? 's' : ''}</p>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No rated reports this month</p>
                  )}
                </div>
                {/* Yearly */}
                <div className="bg-background/50 rounded-lg p-4 border border-border">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">This Year</p>
                  {performance.yearly_avg != null ? (
                    <>
                      <div className="flex items-center gap-2 mb-1">
                        <StarDisplay rating={performance.yearly_avg} size={20} />
                        <span className="text-2xl font-bold text-yellow-400">{performance.yearly_avg.toFixed(1)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{performance.yearly_count} rated report{performance.yearly_count !== 1 ? 's' : ''}</p>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No rated reports this year</p>
                  )}
                </div>
              </div>

              {/* Recent Feedback */}
              {performance.recent_feedback && performance.recent_feedback.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold flex items-center gap-2 mb-3">
                    <MessageSquare size={14} className="text-muted-foreground" />
                    Recent Feedback
                  </h4>
                  <div className="space-y-2">
                    {performance.recent_feedback.map((fb, idx) => (
                      <div key={idx} className="bg-background/50 rounded-lg p-3 border border-border text-sm">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-foreground truncate">{fb.title}</span>
                          {fb.final_score != null && (
                            <div className="flex items-center gap-1 ml-2 shrink-0">
                              <Star size={12} className="text-yellow-400 fill-yellow-400" />
                              <span className="text-xs font-bold text-yellow-400">{fb.final_score.toFixed(1)}</span>
                            </div>
                          )}
                        </div>
                        {fb.manager_notes && (
                          <p className="text-xs text-muted-foreground"><span className="font-medium">Manager:</span> "{fb.manager_notes}"</p>
                        )}
                        {fb.vp_notes && (
                          <p className="text-xs text-muted-foreground mt-0.5"><span className="font-medium">VP:</span> "{fb.vp_notes}"</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">Loading performance data...</p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile Photo */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User size={20} />
              <span>Profile Photo</span>
            </CardTitle>
            <CardDescription>Upload your profile picture</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-6">
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-gray-500 to-gray-600 flex items-center justify-center overflow-hidden">
                {photoPreview ? (
                  <img src={photoPreview.startsWith('data:') ? photoPreview : `data:image/jpeg;base64,${photoPreview}`} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <User size={48} className="text-white/80" />
                )}
              </div>
              <div className="flex-1 space-y-3">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  data-testid="photo-input"
                />
                <Button
                  onClick={handleUploadPhoto}
                  disabled={loading || !profilePhoto}
                  data-testid="upload-photo-button"
                >
                  Upload Photo
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User size={20} />
              <span>Personal Information</span>
            </CardTitle>
            <CardDescription>Update your profile details</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={profileData.username}
                  onChange={(e) => setProfileData({ username: e.target.value })}
                  data-testid="username-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="telegram_id">Telegram ID</Label>
                <div className="flex gap-2">
                  <Input
                    id="telegram_id"
                    value={profileData.telegram_id}
                    onChange={(e) => setProfileData({ ...profileData, telegram_id: e.target.value })}
                    placeholder="e.g. 123456789"
                    data-testid="telegram-id-input"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Chat with <a href="https://t.me/userinfobot" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">@userinfobot</a> to get your ID. Please chat <a href="https://t.me/FluxVarnionBot" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">this bot</a> and type /start.
                </p>
              </div>

              <div className="flex items-center justify-between border rounded-lg p-3 my-4">
                <div className="space-y-0.5">
                  <Label htmlFor="two_factor" className="flex items-center gap-2 text-base">
                    <Shield className="w-4 h-4 text-primary" />
                    Two-Factor Authentication
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Require an email verification link to sign in.
                  </p>
                </div>
                <Switch
                  id="two_factor"
                  checked={profileData.two_factor_enabled}
                  onCheckedChange={(checked) => setProfileData({ ...profileData, two_factor_enabled: checked })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  value={user?.email}
                  disabled
                  className="bg-muted text-muted-foreground"
                  data-testid="email-input"
                />
                <p className="text-xs text-muted-foreground">Email cannot be changed</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Input
                  id="role"
                  value={user?.role}
                  disabled
                  className="bg-muted text-muted-foreground"
                  data-testid="role-input"
                />
              </div>

              {user?.division && (
                <div className="space-y-2">
                  <Label htmlFor="division">Division</Label>
                  <Input
                    id="division"
                    value={user.division}
                    disabled
                    className="bg-muted text-muted-foreground"
                    data-testid="division-input"
                  />
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full"
                data-testid="update-profile-button"
              >
                Update Profile
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Change Password */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Lock size={20} />
              <span>Change Password</span>
            </CardTitle>
            <CardDescription>Update your password for security</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current_password">Current Password</Label>
                <Input
                  id="current_password"
                  type="password"
                  value={passwordData.current_password}
                  onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
                  required
                  data-testid="current-password-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new_password">New Password</Label>
                <Input
                  id="new_password"
                  type="password"
                  value={passwordData.new_password}
                  onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                  required
                  minLength={8}
                  data-testid="new-password-input"
                />
                <p className="text-xs text-muted-foreground">Minimum 8 characters</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm_password">Confirm New Password</Label>
                <Input
                  id="confirm_password"
                  type="password"
                  value={passwordData.confirm_password}
                  onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                  required
                  data-testid="confirm-password-input"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-red-500 hover:bg-red-600"
                data-testid="change-password-button"
              >
                Change Password
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Certifications & Rewards */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Award size={20} />
              <span>Certifications & Rewards</span>
            </CardTitle>
            <CardDescription>Track your professional achievements</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex justify-between items-center pb-2">
              <h4 className="font-medium text-lg">Your Certifications</h4>
              <Button onClick={() => setIsCertModalOpen(true)} className="gap-2">
                <Plus size={16} /> Add Certification
              </Button>
            </div>

            <Dialog open={isCertModalOpen} onOpenChange={setIsCertModalOpen}>
              <DialogContent className="bg-card border-border text-foreground md:max-w-xl">
                <DialogHeader>
                  <DialogTitle>Add New Certification</DialogTitle>
                  <DialogDescription>
                    Track your professional achievements.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCertSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                    <div className="space-y-2">
                      <Label htmlFor="cert_title">Title <span className="text-red-500">*</span></Label>
                      <Input
                        id="cert_title"
                        value={certForm.title}
                        onChange={(e) => setCertForm({ ...certForm, title: e.target.value })}
                        required
                        placeholder="e.g., AWS Certified Solutions Architect"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cert_date">Date Taken <span className="text-red-500">*</span></Label>
                      <Input
                        id="cert_date"
                        type="date"
                        value={certForm.date_taken}
                        onChange={(e) => setCertForm({ ...certForm, date_taken: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="cert_desc">Description (Optional)</Label>
                      <Input
                        id="cert_desc"
                        value={certForm.description}
                        onChange={(e) => setCertForm({ ...certForm, description: e.target.value })}
                        placeholder="Brief description of the certification or reward"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="cert_pdf">Certificate PDF (Optional)</Label>
                      <Input
                        id="cert_pdf"
                        type="file"
                        accept=".pdf"
                        onChange={(e) => setCertForm({ ...certForm, pdf_file: e.target.files[0] })}
                      />
                      <p className="text-xs text-muted-foreground mt-1 text-slate-400">Upload a supporting PDF document.</p>
                    </div>
                  </div>
                  <div className="flex justify-end mt-4">
                    <Button type="submit" disabled={loading} className="w-full md:w-auto">
                      Save Certification
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>

            <div className="space-y-4 pt-2 border-t border-border/50 mt-4">
              {certifications.length === 0 ? (
                <div className="text-center py-6 bg-muted/10 rounded-lg border border-dashed border-border">
                  <Award size={32} className="mx-auto text-muted-foreground opacity-30 mb-2" />
                  <p className="text-sm text-muted-foreground italic">No certifications added yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {certifications.map((cert) => (
                    <div key={cert.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-card rounded-lg p-4 border shadow-sm transition-all hover:shadow-md">
                      <div className="space-y-1 w-full max-w-[80%]">
                        <div className="font-semibold text-foreground text-lg flex items-center gap-2">
                          <Award size={16} className="text-primary hidden sm:block" />
                          {cert.title}
                        </div>
                        <div className="text-sm text-muted-foreground flex items-center gap-2">
                          <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs">
                            {new Date(cert.date_taken).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                        {cert.description && (
                          <p className="text-sm text-slate-500 mt-2 italic">"{cert.description}"</p>
                        )}
                        {cert.pdf_name && (
                          <p className="text-xs text-blue-500 mt-1 flex items-center gap-1">
                            <FileText size={12} /> {cert.pdf_name}
                          </p>
                        )}
                      </div>
                      <div className="mt-4 sm:mt-0 flex gap-2 w-full sm:w-auto justify-end">
                        {cert.pdf_path && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="gap-2 border-primary/30 hover:bg-primary/5 text-primary"
                            onClick={() => {
                              setPreviewData({ url: cert.pdf_path, title: cert.title });
                              setPreviewOpen(true);
                            }}
                          >
                            <Eye size={14} />
                            <span className="hidden sm:inline">Preview</span>
                          </Button>
                        )}
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleDeleteCert(cert.id)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 border border-transparent hover:border-red-100"
                          title="Delete certification"
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

      </div>
      <PDFPreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        fileUrl={previewData.url}
        fileName={previewData.title}
      />
    </div>
  );
};

export default Profile;
