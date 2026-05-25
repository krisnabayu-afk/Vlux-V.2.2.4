import { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { toast } from 'sonner';
import { User as UserIcon, Award, FileText, Download, Star, TrendingUp, Eye } from 'lucide-react';
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

const UserProfile = () => {
  const { userId } = useParams();
  const { user: currentUser } = useAuth();
  
  const [profileData, setProfileData] = useState(null);
  const [certifications, setCertifications] = useState([]);
  const [performance, setPerformance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState({ url: '', title: '' });

  useEffect(() => {
    fetchUserData();
    fetchCertifications();
    fetchPerformance();
  }, [userId]);

  const fetchUserData = async () => {
    try {
      const response = await axios.get(`${API}/users/${userId}`);
      setProfileData(response.data);
    } catch (error) {
      console.error('Failed to fetch user:', error);
      toast.error('Failed to load user profile');
    } finally {
      setLoading(false);
    }
  };

  const fetchCertifications = async () => {
    try {
      const response = await axios.get(`${API}/certifications/${userId}`);
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
      const response = await axios.get(`${API}/users/${userId}/performance`, { params: { year, month } });
      setPerformance(response.data);
    } catch (error) {
      console.error('Failed to fetch performance:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-muted-foreground animate-pulse">Loading profile...</p>
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <UserIcon size={48} className="text-muted-foreground opacity-50" />
        <p className="text-muted-foreground">User not found or you don't have access.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="user-profile-page">
      <div>
        <h1 className="text-4xl font-bold text-foreground mb-2">User Profile</h1>
        <p className="text-muted-foreground">Viewing profile details for {profileData.username}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile Info */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <UserIcon size={20} />
              <span>Personal Information</span>
            </CardTitle>
            <CardDescription>Basic user details</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row items-start md:items-center space-y-6 md:space-y-0 md:space-x-8">
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-gray-500 to-gray-600 flex shrink-0 items-center justify-center overflow-hidden border-4 border-background shadow-lg">
                {profileData.profile_photo ? (
                  <img 
                    src={profileData.profile_photo.startsWith('data:') ? profileData.profile_photo : `data:image/jpeg;base64,${profileData.profile_photo}`} 
                    alt="Profile" 
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  <UserIcon size={48} className="text-white/80" />
                )}
              </div>
              
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Username</p>
                  <p className="text-lg font-semibold text-foreground">{profileData.username}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Email</p>
                  <p className="text-foreground">{profileData.email}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Role</p>
                  <p className="text-foreground flex items-center gap-2">
                    <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-sm font-medium">
                      {profileData.role}
                    </span>
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Department & Division</p>
                  <p className="text-foreground">
                    {profileData.department || '-'} {profileData.division ? `/ ${profileData.division}` : ''}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Region</p>
                  <p className="text-foreground">{profileData.region || '-'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Telegram ID</p>
                  <p className="text-foreground">{profileData.telegram_id || '-'}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Performance Rating Card */}
        {performance && (
          <Card className="md:col-span-2 border-yellow-500/30 bg-gradient-to-br from-yellow-500/5 to-orange-500/5">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-yellow-400">
                <TrendingUp size={20} />
                <span>Performance Rating</span>
              </CardTitle>
              <CardDescription>{profileData.username}'s average report scores</CardDescription>
            </CardHeader>
            <CardContent>
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
              </div>
            </CardContent>
          </Card>
        )}

        {/* Certifications & Rewards */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Award size={20} />
              <span>Certifications & Rewards</span>
            </CardTitle>
            <CardDescription>{profileData.username}'s professional achievements</CardDescription>
          </CardHeader>
          <CardContent>
            {certifications.length === 0 ? (
              <div className="text-center py-8 bg-muted/10 rounded-lg border border-dashed border-border">
                <Award size={32} className="mx-auto text-muted-foreground opacity-30 mb-2" />
                <p className="text-sm text-muted-foreground italic">No certifications listed.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {certifications.map((cert) => (
                  <div key={cert.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-card rounded-lg p-4 border shadow-sm hover:shadow-md transition-shadow">
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
                    {cert.pdf_path && (
                      <div className="mt-4 sm:mt-0 flex shrink-0">
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
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
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

export default UserProfile;
