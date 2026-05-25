import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

// Modular Components
import { TicketHeader } from '../components/ticket-detail/TicketHeader';
import { TicketDetailsCard } from '../components/ticket-detail/TicketDetailsCard';
import { LinkedReportCard } from '../components/ticket-detail/LinkedReportCard';
import { CommentsSection } from '../components/ticket-detail/CommentsSection';
import { TicketActions } from '../components/ticket-detail/TicketActions';
import { TicketDialogs } from '../components/ticket-detail/TicketDialogs';
import { TicketReportsSection } from '../components/ticket-detail/TicketReportsSection';

// Shared Dialogs
import CreateScheduleDialog from '../components/CreateScheduleDialog';
import { SubmitReportDialog } from '../components/reports/SubmitReportDialog';
import { ViewReportDialog } from '../components/reports/ViewReportDialog';
import { RatingDialog } from '../components/reports/RatingDialog';
import { VpConfirmDialog } from '../components/reports/VpConfirmDialog';

const API = `${process.env.REACT_APP_API_URL}/api`;


const TicketDetail = () => {
  const { ticketId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [ticket, setTicket] = useState(null);
  const [comment, setComment] = useState('');

  const [showEditDialog, setShowEditDialog] = useState(false);


  const [sites, setSites] = useState([]);
  const [users, setUsers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [reports, setReports] = useState([]);
  const [linkedReport, setLinkedReport] = useState(null);
  const [loading, setLoading] = useState(true);

  // Workflow Dialog States
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [showReportUploadDialog, setShowReportUploadDialog] = useState(false);
  const [showViewReportDialog, setShowViewReportDialog] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  
  // Action Confirmation States
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Approval Workflow States
  const [showVpConfirmDialog, setShowVpConfirmDialog] = useState(false);
  const [pendingApprovalAction, setPendingApprovalAction] = useState(null);
  const [showRatingDialog, setShowRatingDialog] = useState(false);
  const [pendingRatingAction, setPendingRatingAction] = useState(null);
  const [approvalRating, setApprovalRating] = useState(0);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [hoverRating, setHoverRating] = useState(0);

  const [reportFormData, setReportFormData] = useState({
    category_id: '',
    title: '',
    description: '',
    site_id: '',
    ticket_id: '',
    file: null,
    file_2: null
  });


  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    priority: '',
    assigned_to_division: '',
    site_id: undefined,
    ticket_number: '',
    link: '',
    category: ''
  });

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([
        fetchTicket(), 
        fetchSites(), 
        fetchReports(),
        fetchUsers(),
        fetchCategories()
      ]);
      setLoading(false);
    };
    init();
  }, [ticketId]);



  const fetchTicket = async () => {
    try {
      const response = await axios.get(`${API}/tickets/${ticketId}`);
      setTicket(response.data);
      if (response.data.linked_report_id) {
        try {
          const reportRes = await axios.get(`${API}/reports/${response.data.linked_report_id}`);
          setLinkedReport(reportRes.data);
        } catch (reportError) {
          console.error('Failed to fetch linked report:', reportError);
          if (reportError.response?.status === 404) {
            toast.error('Linked report not found');
          }
        }
      }
    } catch (error) {
      toast.error('Failed to load ticket');
    }
  };



  const fetchSites = async () => {
    try {
      const response = await axios.get(`${API}/sites`, { params: { limit: 1000 } });
      setSites(response.data.items || response.data);
    } catch (error) {
      console.error('Failed to fetch sites:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API}/users`);
      setUsers(response.data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API}/activity-categories`);
      setCategories(response.data);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const fetchReports = async () => {
    try {
      const response = await axios.get(`${API}/reports`, { params: { ticket_id: ticketId } });
      setReports(response.data.items || response.data);
    } catch (error) {
      console.error('Failed to fetch reports:', error);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    try {
      await axios.post(`${API}/tickets/${ticketId}/comments`, { ticket_id: ticketId, comment });
      toast.success('Comment added');
      setComment('');
      fetchTicket();
    } catch (error) {
      toast.error('Failed to add comment');
    }
  };



  const handleCloseTicket = () => {
    setShowCloseConfirm(true);
  };

  const confirmCloseTicket = async () => {
    try {
      await axios.post(`${API}/tickets/${ticketId}/close`);
      toast.success('Ticket closed!');
      setShowCloseConfirm(false);
      fetchTicket();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Cannot close ticket');
    }
  };

  const handleReopenTicket = async () => {
    try {
      await axios.post(`${API}/tickets/${ticketId}/reopen`);
      toast.success('Ticket reopened!');
      fetchTicket();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to reopen ticket');
    }
  };

  const handleDeleteTicket = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDeleteTicket = async () => {
    try {
      await axios.delete(`${API}/tickets/${ticketId}`);
      toast.success('Ticket deleted successfully');
      setShowDeleteConfirm(false);
      navigate('/tickets');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete ticket');
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      await axios.patch(`${API}/tickets/${ticketId}`, { status: newStatus });
      toast.success('Status updated');
      fetchTicket();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleEditTicket = () => {
    setEditForm({
      title: ticket.title,
      description: ticket.description,
      assigned_to_division: ticket.assigned_to_division,
      site_id: ticket.site_id || undefined,
      ticket_number: ticket.ticket_number || '',
      link: ticket.link || '',
      category: ticket.category || ''
    });
    setShowEditDialog(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${API}/tickets/${ticketId}`, editForm);
      toast.success('Ticket updated!');
      setShowEditDialog(false);
      fetchTicket();
    } catch (error) {
      toast.error('Failed to update ticket');
    }
  };

  // Workflow Handlers
  const handleAssignSchedule = () => {
    setShowScheduleDialog(true);
  };

  const handleUploadReport = () => {
    setReportFormData({
      category_id: '',
      title: ticket.title,
      description: ticket.description,
      site_id: ticket.site_id || '',
      ticket_id: ticketId,
      file: null,
      file_2: null
    });
    setShowReportUploadDialog(true);
  };

  const handleReportSubmit = async (e) => {
    e.preventDefault();
    if (!reportFormData.file) {
      toast.error('File is required');
      return;
    }

    const data = new FormData();
    if (reportFormData.category_id) data.append('category_id', reportFormData.category_id);
    data.append('title', reportFormData.title);
    data.append('description', reportFormData.description);
    if (reportFormData.site_id) data.append('site_id', reportFormData.site_id);
    if (reportFormData.ticket_id) data.append('ticket_id', reportFormData.ticket_id);
    data.append('file', reportFormData.file);
    if (reportFormData.file_2) data.append('file_2', reportFormData.file_2);

    try {
      await axios.post(`${API}/reports`, data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Report submitted successfully!');
      setShowReportUploadDialog(false);
      fetchReports();
      fetchTicket(); // Refresh to see linked_report_id update
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to submit report');
    }
  };

  const handleViewReport = async (reportId) => {
    try {
      const response = await axios.get(`${API}/reports/${reportId}`);
      setSelectedReport(response.data);
      setShowViewReportDialog(true);
    } catch (error) {
      toast.error('Failed to load report details');
    }
  };

  const handleApproval = async (reportId, action) => {
    if (action === 'revisi') {
      const comment = prompt('Please provide a reason for revision:');
      if (!comment) return;
      try {
        await axios.post(`${API}/reports/approve`, { report_id: reportId, action, comment });
        toast.success('Report sent for revision');
        fetchReports();
        if (selectedReport?.id === reportId) handleViewReport(reportId);
      } catch (error) {
        toast.error('Failed to process revision');
      }
      return;
    }

    if (action === 'approve' && ['Manager', 'VP'].includes(user.role)) {
      const report = reports.find(r => r.id === reportId) || selectedReport;
      if (user.role === 'VP' && report && report.status !== 'Pending VP' && report.status !== 'Final') {
        setPendingApprovalAction({ reportId, action });
        setShowVpConfirmDialog(true);
        return;
      }
      setPendingRatingAction({ reportId, action });
      setApprovalRating(0);
      setApprovalNotes('');
      setShowRatingDialog(true);
      return;
    }

    try {
      await axios.post(`${API}/reports/approve`, { report_id: reportId, action: 'approve' });
      toast.success('Report approved!');
      fetchReports();
      if (selectedReport?.id === reportId) handleViewReport(reportId);
    } catch (error) {
      toast.error('Failed to approve report');
    }
  };

  const handleRatingApprovalSubmit = async () => {
    if (!pendingRatingAction) return;
    if (approvalRating < 1) {
      toast.error('Please provide a rating');
      return;
    }
    try {
      await axios.post(`${API}/reports/approve`, {
        report_id: pendingRatingAction.reportId,
        action: 'approve',
        rating: approvalRating,
        notes: approvalNotes
      });
      toast.success('Report approved!');
      setShowRatingDialog(false);
      fetchReports();
      if (selectedReport?.id === pendingRatingAction.reportId) handleViewReport(pendingRatingAction.reportId);
    } catch (error) {
      toast.error('Failed to process approval');
    }
  };

  const handleVpConfirmApproval = () => {
    const { reportId, action } = pendingApprovalAction;
    setShowVpConfirmDialog(false);
    setPendingRatingAction({ reportId, action });
    setShowRatingDialog(true);
  };

  const getStatusColor = (status) => {
    const colors = {
      'INTERNAL': 'bg-slate-100 text-slate-800 dark:bg-gray-700/50 dark:text-gray-300',
      'PENJADWALAN': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      'BRIEFING': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
      'DISPATCH': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      'FIBERZONE': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
      'DONE': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      'Open': 'bg-slate-100 text-slate-800 dark:bg-gray-700/50 dark:text-gray-300',
      'In Progress': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      'Closed': 'bg-slate-200 text-slate-600 dark:bg-gray-800 dark:text-gray-400'
    };
    return colors[status] || 'bg-secondary text-muted-foreground';
  };

  if (loading || !ticket) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-muted-foreground">Loading ticket details...</div>
      </div>
    );
  }

  const canManage = !!user?.role;
  const canEdit = user?.role ? true : false;
  const canClose = user?.role && ticket.status !== 'Closed';
  const canDelete = ['Admin', 'SuperUser', 'Manager', 'VP'].includes(user?.role);
  const canAssignSchedule = ['SPV', 'Manager', 'SuperUser', 'VP'].includes(user?.role);

  return (
    <div className="space-y-6" data-testid="ticket-detail-page">
      <TicketHeader
        ticket={ticket}
        navigate={navigate}
        getStatusColor={getStatusColor}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <TicketDetailsCard ticket={ticket} />

          <LinkedReportCard linkedReport={linkedReport} />

          <CommentsSection
            ticket={ticket}
            comment={comment}
            setComment={setComment}
            handleAddComment={handleAddComment}
          />

          <TicketReportsSection 
            reports={reports}
            onUploadReport={handleUploadReport}
            onViewReport={handleViewReport}
            getStatusColor={getStatusColor}
          />
        </div>

        <TicketActions
          ticket={ticket}
          canManage={canManage}
          canEdit={canEdit}
          canClose={canClose}
          canDelete={canDelete}
          canAssignSchedule={canAssignSchedule}
          handleStatusChange={handleStatusChange}
          handleEditTicket={handleEditTicket}
          handleCloseTicket={handleCloseTicket}
          handleReopenTicket={handleReopenTicket}
          handleDeleteTicket={handleDeleteTicket}
          handleAssignSchedule={handleAssignSchedule}
        />
      </div>

      <TicketDialogs
        ticket={ticket}
        showEditDialog={showEditDialog}
        setShowEditDialog={setShowEditDialog}
        editForm={editForm}
        setEditForm={setEditForm}
        handleEditSubmit={handleEditSubmit}
        sites={sites}
        showCloseConfirm={showCloseConfirm}
        setShowCloseConfirm={setShowCloseConfirm}
        confirmCloseTicket={confirmCloseTicket}
        showDeleteConfirm={showDeleteConfirm}
        setShowDeleteConfirm={setShowDeleteConfirm}
        confirmDeleteTicket={confirmDeleteTicket}
      />

      <CreateScheduleDialog 
        open={showScheduleDialog}
        onOpenChange={setShowScheduleDialog}
        user={user}
        users={users}
        sites={sites}
        categories={categories}
        onScheduleCreated={() => toast.success('Schedule assigned!')}
        prefillData={{
          site_id: ticket.site_id,
          site_name: ticket.site_name,
          title: ticket.title,
          description: ticket.description,
          ticket_id: ticketId
        }}
      />

      <SubmitReportDialog 
        hideTrigger={true}
        open={showReportUploadDialog}
        setOpen={setShowReportUploadDialog}
        handleSubmit={handleReportSubmit}
        formData={reportFormData}
        setFormData={setReportFormData}
        categories={categories}
        sites={sites}
        tickets={[ticket]}
      />

      <ViewReportDialog 
        viewOpen={showViewReportDialog}
        setViewOpen={setShowViewReportDialog}
        selectedReport={selectedReport}
        getStatusColor={getStatusColor}
        canApprove={(report) => {
          if (report && typeof report.can_approve === 'boolean') {
            return report.can_approve;
          }
          if (!['SPV', 'Manager', 'VP'].includes(user?.role)) return false;
          if (report.status === 'Final' || report.status === 'Revisi') return false;
          if (user.role === 'VP') return true;
          if (user.role === 'Manager') {
            if (report.status === 'Pending SPV') return true;
            if (report.status === 'Pending Manager') {
              return !report.current_approver || report.current_approver === user.id;
            }
          }
          if (report.current_approver === user.id) return true;
          return false;
        }}
        handleApproval={handleApproval}
        handleAddComment={async (e) => {
          e.preventDefault();
          // Simplified comment for now
          toast.info('Comment feature in modal pending');
        }}
        downloadFile={(url, data, name) => {
          const link = document.createElement('a');
          link.href = url ? `${process.env.REACT_APP_API_URL}${url}` : `data:application/octet-stream;base64,${data}`;
          link.download = name;
          link.target = "_blank";
          link.click();
        }}
      />

      <RatingDialog 
        showRatingDialog={showRatingDialog}
        setShowRatingDialog={setShowRatingDialog}
        approvalRating={approvalRating}
        setApprovalRating={setApprovalRating}
        approvalNotes={approvalNotes}
        setApprovalNotes={setApprovalNotes}
        hoverRating={hoverRating}
        setHoverRating={setHoverRating}
        handleRatingApprovalSubmit={handleRatingApprovalSubmit}
      />

      <VpConfirmDialog 
        showVpConfirmDialog={showVpConfirmDialog}
        setShowVpConfirmDialog={setShowVpConfirmDialog}
        handleVpConfirmApproval={handleVpConfirmApproval}
      />
    </div>
  );
};

export default TicketDetail;
