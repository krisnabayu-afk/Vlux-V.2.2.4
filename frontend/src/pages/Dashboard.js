import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Zap } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../context/PermissionContext';
import { useIsEnterpriseSolution } from '../hooks/useIsEnterpriseSolution';
import { toast } from 'sonner';
import ExcelPreviewDialog from '../components/ExcelPreviewDialog';

// Modular Components
import { DashboardHeader } from '../components/dashboard/DashboardHeader';
import { DayAtGlance } from '../components/dashboard/DayAtGlance';
import { SchedulesCard } from '../components/dashboard/SchedulesCard';
import { ApprovalsCard } from '../components/dashboard/ApprovalsCard';
import { TicketsCard } from '../components/dashboard/TicketsCard';
import { StarlinkAlert } from '../components/dashboard/StarlinkAlert';

// Shared Report Dialogs
import { ViewReportDialog } from '../components/reports/ViewReportDialog';
import { PdfPreviewDialog } from '../components/reports/PdfPreviewDialog';
import { RatingDialog } from '../components/reports/RatingDialog';
import { VpConfirmDialog } from '../components/reports/VpConfirmDialog';

const API = `${process.env.REACT_APP_API_URL}/api`;

const Dashboard = () => {
  const { user, isTechOps } = useAuth();
  const { canView } = usePermissions();
  const [dashboardData, setDashboardData] = useState({
    schedules_today: [],
    pending_approvals: [],
    open_tickets: [],
    expiring_starlinks: [],
    weekly_counts: []
  });
  const [loading, setLoading] = useState(true);
  const [isStarlinkDialogOpen, setIsStarlinkDialogOpen] = useState(false);

  // ... (Report Modal State and other states remain the same)
  const [viewOpen, setViewOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewName, setPreviewName] = useState('');
  const [commentText, setCommentText] = useState('');

  const [showVpConfirmDialog, setShowVpConfirmDialog] = useState(false);
  const [pendingApprovalAction, setPendingApprovalAction] = useState(null);

  const [excelPreviewOpen, setExcelPreviewOpen] = useState(false);
  const [excelPreviewUrl, setExcelPreviewUrl] = useState(null);
  const [excelPreviewName, setExcelPreviewName] = useState(null);

  const [revisions, setRevisions] = useState([]);
  const [selectedVersionData, setSelectedVersionData] = useState(null);
  const [selectedVersion, setSelectedVersion] = useState('');

  const [showRatingDialog, setShowRatingDialog] = useState(false);
  const [pendingRatingAction, setPendingRatingAction] = useState(null);
  const [approvalRating, setApprovalRating] = useState(0);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [hoverRating, setHoverRating] = useState(0);

  const isEnterpriseSolution = useIsEnterpriseSolution();
  const navigate = useNavigate();

  // Safeguard: Redirect Enterprise Solution users if they somehow reach this component
  useEffect(() => {
    if (isEnterpriseSolution) {
      toast.error('Access Denied', {
        description: 'Enterprise Solution users are restricted from accessing the main dashboard. Redirecting to Fiberzone Dashboard.',
        duration: 3000,
      });
      navigate('/fiberzone', { replace: true });
    }
  }, [isEnterpriseSolution, navigate]);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const response = await axios.get(`${API}/dashboard`);
      setDashboardData(response.data);
    } catch (error) {
      console.error('Failed to fetch dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  // Find active or next visit logic
  const getNextVisit = () => {
    if (!dashboardData.schedules_today || dashboardData.schedules_today.length === 0) return null;
    const now = new Date();
    
    // 1. Check for CURRENT active schedule
    const currentSchedule = dashboardData.schedules_today.find(s => {
      const start = new Date(s.start_date);
      const end = new Date(s.end_date);
      return now >= start && now <= end;
    });
    
    if (currentSchedule) return { ...currentSchedule, is_current: true };

    // 2. Check for NEXT upcoming schedule
    const futureSchedules = dashboardData.schedules_today
      .filter(s => new Date(s.start_date) > now)
      .sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
    
    return futureSchedules[0] || null;
  };

  useEffect(() => {
    if (isTechOps && dashboardData.expiring_starlinks && dashboardData.expiring_starlinks.length > 0) {
      const lastAlert = localStorage.getItem('lastStarlinkAlert');
      const now = Date.now();
      const oneHour = 3600000; // 1 hour in ms

      if (!lastAlert || (now - parseInt(lastAlert)) > oneHour) {
        setIsStarlinkDialogOpen(true);
        localStorage.setItem('lastStarlinkAlert', now.toString());
      }
    }
  }, [dashboardData.expiring_starlinks, user?.department]);

  // ... (handlers handleViewReport, handleVersionChange, handleApproval, etc. remain the same)
  const handleViewReport = async (reportId) => {
    try {
      const response = await axios.get(`${API}/reports/${reportId}`);
      setSelectedReport(response.data);
      setSelectedVersionData(null);
      setSelectedVersion('current');
      setViewOpen(true);

      try {
        const revResponse = await axios.get(`${API}/reports/${reportId}/revisions`);
        setRevisions(revResponse.data);
      } catch (revError) {
        console.error('Failed to fetch revisions:', revError);
        setRevisions([]);
      }
    } catch (error) {
      toast.error('Failed to load report');
    }
  };

  const handleVersionChange = async (versionVal) => {
    setSelectedVersion(versionVal);
    if (versionVal === 'current') {
      setSelectedVersionData(null);
      return;
    }

    try {
      const response = await axios.get(`${API}/reports/${selectedReport.id}/revisions/${versionVal}`);
      setSelectedVersionData(response.data);
    } catch (error) {
      toast.error('Failed to load version data');
    }
  };

  const handleApproval = async (reportId, action) => {
    if (action === 'revisi') {
      const comment = prompt('Please provide a reason for revision:');
      if (!comment) {
        toast.error('Revision reason is required');
        return;
      }
      try {
        await axios.post(`${API}/reports/approve`, { report_id: reportId, action, comment });
        toast.success('Report sent for revision');
        fetchDashboard();
        if (viewOpen && selectedReport?.id === reportId) {
          const response = await axios.get(`${API}/reports/${reportId}`);
          setSelectedReport(response.data);
        }
      } catch (error) {
        toast.error(error.response?.data?.detail || 'Failed to process approval');
      }
      return;
    }

    if (action === 'approve' && ['Manager', 'VP'].includes(user.role)) {
      const report = dashboardData.pending_approvals.find(r => r.id === reportId) || selectedReport;
      if (user.role === 'VP' && report && report.status !== 'Pending VP' && report.status !== 'Final') {
        setPendingApprovalAction({ reportId, action });
        setShowVpConfirmDialog(true);
        return;
      }
      setPendingRatingAction({ reportId, action });
      setApprovalRating(0);
      setApprovalNotes('');
      setHoverRating(0);
      setShowRatingDialog(true);
      return;
    }

    try {
      await axios.post(`${API}/reports/approve`, { report_id: reportId, action: 'approve' });
      toast.success('Report approved!');
      fetchDashboard();
      if (viewOpen && selectedReport?.id === reportId) {
        const response = await axios.get(`${API}/reports/${reportId}`);
        setSelectedReport(response.data);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to process approval');
    }
  };

  const handleRatingApprovalSubmit = async () => {
    if (!pendingRatingAction) return;
    if (approvalRating < 1 || approvalRating > 5) {
      toast.error('Please provide a rating (1-5 stars)');
      return;
    }
    const { reportId, action } = pendingRatingAction;
    try {
      await axios.post(`${API}/reports/approve`, {
        report_id: reportId,
        action: 'approve',
        rating: approvalRating,
        notes: approvalNotes.trim() || undefined
      });
      toast.success('Report approved!');
      setShowRatingDialog(false);
      setPendingRatingAction(null);
      fetchDashboard();
      if (viewOpen && selectedReport?.id === reportId) {
        const response = await axios.get(`${API}/reports/${reportId}`);
        setSelectedReport(response.data);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to process approval');
    }
  };

  const handleVpConfirmApproval = async () => {
    if (!pendingApprovalAction) return;
    const { reportId, action } = pendingApprovalAction;
    setShowVpConfirmDialog(false);
    setPendingApprovalAction(null);
    setPendingRatingAction({ reportId, action });
    setApprovalRating(0);
    setApprovalNotes('');
    setHoverRating(0);
    setShowRatingDialog(true);
  };

  const handleCancelApproval = async (reportId) => {
    if (!window.confirm('Are you sure you want to cancel this approval?')) return;
    try {
      await axios.post(`${API}/reports/cancel-approval`, { report_id: reportId });
      toast.success('Approval cancelled successfully');
      fetchDashboard();
      if (viewOpen) setViewOpen(false);
    } catch (error) {
      let errorMessage = 'Failed to cancel approval';
      if (error.response?.data?.detail) {
        errorMessage = typeof error.response.data.detail === 'string'
          ? error.response.data.detail
          : error.response.data.detail[0]?.msg || errorMessage;
      }
      toast.error(errorMessage);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    try {
      await axios.post(`${API}/reports/${selectedReport.id}/comments`, { text: commentText });
      toast.success('Comment added!');
      setCommentText('');
      const response = await axios.get(`${API}/reports/${selectedReport.id}`);
      setSelectedReport(response.data);
    } catch (error) {
      toast.error('Failed to add comment');
    }
  };

  const downloadFile = (fileUrl, fileData, fileName) => {
    if (fileUrl) {
      const link = document.createElement('a');
      link.href = `${process.env.REACT_APP_API_URL}${fileUrl}`;
      link.download = fileName;
      link.target = "_blank";
      link.click();
    } else if (fileData) {
      const link = document.createElement('a');
      link.href = `data:application/octet-stream;base64,${fileData}`;
      link.download = fileName;
      link.click();
    } else {
      toast.error("File not available");
    }
  };

  const canApprove = (report) => {
    if (report && typeof report.can_approve === 'boolean') {
      return report.can_approve;
    }
    if (!['SPV', 'Manager', 'VP'].includes(user?.role)) return false;
    if (report.status === 'Final' || report.status === 'Revisi') return false;
    if (user.role === 'VP') return true;
    if (user.role === 'Manager' && ['Pending SPV', 'Pending Manager'].includes(report.status)) return true;
    if (report.current_approver === user.id) return true;
    return false;
  };

  const canCancelApproval = (report) => {
    if (report && typeof report.can_cancel_approval === 'boolean') {
      return report.can_cancel_approval;
    }
    if (['Pending SPV', 'Pending Manager', 'Revisi'].includes(report.status)) return false;
    if (user.role === 'Manager' && report.status === 'Pending VP') return true;
    if (user.role === 'VP' && report.status === 'Final') return true;
    return false;
  };

  const getStatusColor = (status) => {
    const colors = {
      'Pending SPV': 'bg-purple-50 text-purple-700 border-purple-200',
      'Pending Manager': 'bg-purple-50 text-purple-700 border-purple-200',
      'Pending VP': 'bg-indigo-50 text-indigo-700 border-indigo-200',
      'Final': 'bg-green-50 text-green-700 border-green-200',
      'Revisi': 'bg-orange-50 text-orange-700 border-orange-200'
    };
    return colors[status] || 'bg-slate-50 text-slate-700 border-slate-200';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#F3F4F6]">
        <div className="text-xl font-bold text-gray-400 animate-pulse">Initializing Dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F3F4F6] px-8 pt-2 pb-2 overflow-x-hidden" data-testid="dashboard">
      <div className="max-w-[1600px] mx-auto space-y-3">
        <DashboardHeader user={user} />

        <DayAtGlance 
          nextVisit={getNextVisit()} 
          totalSchedules={dashboardData.schedules_today.length} 
        />

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 items-stretch">
          {canView('tickets') && (
            <div className="w-full">
              <TicketsCard
                openTickets={dashboardData.open_tickets}
              />
            </div>
          )}

          {['SPV', 'Manager', 'VP'].includes(user?.role) && canView('reports') && (
            <div className="w-full">
              <ApprovalsCard
                pendingApprovals={dashboardData.pending_approvals}
                handleViewReport={handleViewReport}
                getStatusColor={getStatusColor}
              />
            </div>
          )}

          <div className="w-full">
            <SchedulesCard 
              schedulesToday={Array(dashboardData.global_persons_today_count || 0).fill({})} 
              weeklyCounts={dashboardData.weekly_counts}
            />
          </div>
        </div>

        {isTechOps && (
          <StarlinkAlert
            isOpen={isStarlinkDialogOpen}
            onOpenChange={setIsStarlinkDialogOpen}
            expiringStarlinks={dashboardData.expiring_starlinks}
          />
        )}

      </div>

      {/* Shared Dialogs */}
      <ViewReportDialog
        viewOpen={viewOpen}
        setViewOpen={setViewOpen}
        selectedReport={selectedReport}
        selectedVersionData={selectedVersionData}
        selectedVersion={selectedVersion}
        handleVersionChange={handleVersionChange}
        revisions={revisions}
        downloadFile={downloadFile}
        setPreviewUrl={setPreviewUrl}
        setPreviewName={setPreviewName}
        setPreviewOpen={setPreviewOpen}
        setExcelPreviewUrl={setExcelPreviewUrl}
        setExcelPreviewName={setExcelPreviewName}
        setExcelPreviewOpen={setExcelPreviewOpen}
        canApprove={canApprove}
        handleApproval={handleApproval}
        canCancelApproval={canCancelApproval}
        handleCancelApproval={handleCancelApproval}
        handleAddComment={handleAddComment}
        commentText={commentText}
        setCommentText={setCommentText}
        canEditReport={() => false} // No edit from dashboard currently
        handleDeleteReport={() => { }} // No delete from dashboard currently
        getStatusColor={getStatusColor}
      />

      <PdfPreviewDialog
        previewOpen={previewOpen}
        setPreviewOpen={setPreviewOpen}
        previewUrl={previewUrl}
        previewName={previewName}
        downloadFile={() => downloadFile(previewUrl, null, previewName)}
      />

      <ExcelPreviewDialog
        open={excelPreviewOpen}
        onOpenChange={setExcelPreviewOpen}
        fileUrl={excelPreviewUrl}
        fileName={excelPreviewName}
        downloadFile={() => downloadFile(excelPreviewUrl, null, excelPreviewName)}
      />

      <VpConfirmDialog
        showVpConfirmDialog={showVpConfirmDialog}
        setShowVpConfirmDialog={setShowVpConfirmDialog}
        handleVpConfirmApproval={handleVpConfirmApproval}
        setPendingApprovalAction={setPendingApprovalAction}
      />

      <RatingDialog
        showRatingDialog={showRatingDialog}
        setShowRatingDialog={setShowRatingDialog}
        setPendingRatingAction={setPendingRatingAction}
        approvalRating={approvalRating}
        setApprovalRating={setApprovalRating}
        hoverRating={hoverRating}
        setHoverRating={setHoverRating}
        approvalNotes={approvalNotes}
        setApprovalNotes={setApprovalNotes}
        handleRatingApprovalSubmit={handleRatingApprovalSubmit}
      />
    </div>
  );
};

export default Dashboard;
