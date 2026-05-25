import { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { toast } from 'sonner';
import { Plus, Trash2, History, Edit2, X, MessageSquare, Send, CheckCircle, XCircle, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Shield, Lightbulb } from 'lucide-react';

const API = `${process.env.REACT_APP_API_URL}/api`;

// ─── Feedback Tab Component ───────────────────────────────────────────
const FeedbackTab = ({ user }) => {
    const [feedbacks, setFeedbacks] = useState([]);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 15;

    // Track expanded feedback for comments
    const [expandedId, setExpandedId] = useState(null);
    const [comments, setComments] = useState({});
    const [commentText, setCommentText] = useState('');
    const [commentLoading, setCommentLoading] = useState(false);

    const isSuperUser = user?.role === 'SuperUser';

    useEffect(() => {
        fetchFeedbacks();
    }, []);

    const fetchFeedbacks = async () => {
        try {
            const response = await axios.get(`${API}/feedbacks`);
            setFeedbacks(response.data);
        } catch (error) {
            console.error('Failed to fetch feedbacks:', error);
            toast.error('Failed to load feedbacks');
        }
    };

    const fetchComments = async (feedbackId) => {
        try {
            const response = await axios.get(`${API}/feedbacks/${feedbackId}/comments`);
            setComments(prev => ({ ...prev, [feedbackId]: response.data }));
        } catch (error) {
            console.error('Failed to fetch comments:', error);
        }
    };

    const handleToggleComments = (feedbackId) => {
        if (expandedId === feedbackId) {
            setExpandedId(null);
        } else {
            setExpandedId(feedbackId);
            fetchComments(feedbackId);
        }
        setCommentText('');
    };

    const handleSubmitFeedback = async (e) => {
        e.preventDefault();
        if (!title.trim()) { toast.error('Title is required'); return; }
        if (!description.trim()) { toast.error('Description is required'); return; }

        setLoading(true);
        try {
            await axios.post(`${API}/feedbacks`, { title: title.trim(), description: description.trim() });
            toast.success('Feedback submitted successfully!');
            setOpen(false);
            setTitle('');
            setDescription('');
            fetchFeedbacks();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to submit feedback');
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (feedbackId, newStatus) => {
        try {
            await axios.put(`${API}/feedbacks/${feedbackId}/status`, { status: newStatus });
            toast.success(`Feedback marked as ${newStatus}`);
            fetchFeedbacks();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to update status');
        }
    };

    const handleDeleteFeedback = async (feedbackId) => {
        if (!window.confirm('Are you sure you want to delete this feedback and all its comments?')) return;
        try {
            await axios.delete(`${API}/feedbacks/${feedbackId}`);
            toast.success('Feedback deleted successfully');
            if (expandedId === feedbackId) setExpandedId(null);
            fetchFeedbacks();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to delete feedback');
        }
    };

    const handleSubmitComment = async (feedbackId) => {
        if (!commentText.trim()) return;
        setCommentLoading(true);
        try {
            await axios.post(`${API}/feedbacks/${feedbackId}/comments`, { content: commentText.trim() });
            setCommentText('');
            fetchComments(feedbackId);
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to add comment');
        } finally {
            setCommentLoading(false);
        }
    };

    const handleDeleteComment = async (feedbackId, commentId) => {
        if (!window.confirm('Delete this comment?')) return;
        try {
            await axios.delete(`${API}/feedbacks/${feedbackId}/comments/${commentId}`);
            toast.success('Comment deleted');
            fetchComments(feedbackId);
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to delete comment');
        }
    };

    return (
        <div className="space-y-4">
            {/* Header with Add Feedback button */}
            <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                    Share your suggestions, report issues, or request new features.
                </p>
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-emerald-600 hover:bg-emerald-700" data-testid="add-feedback-button">
                            <Plus size={18} className="mr-2" />
                            New Feedback
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg" data-testid="feedback-dialog">
                        <DialogHeader>
                            <DialogTitle>Submit Feedback</DialogTitle>
                            <DialogDescription>
                                Share your idea, report an issue, or suggest an improvement.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleSubmitFeedback} className="space-y-4 pt-4">
                            <div className="space-y-2">
                                <Label htmlFor="feedback-title">Title</Label>
                                <Input
                                    id="feedback-title"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="Brief summary of your feedback"
                                    required
                                    data-testid="feedback-title-input"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="feedback-description">Description</Label>
                                <textarea
                                    id="feedback-description"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Provide details about your feedback..."
                                    required
                                    rows={4}
                                    className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                                    data-testid="feedback-description-input"
                                />
                            </div>
                            <div className="flex justify-end space-x-2 pt-4">
                                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700" disabled={loading}>
                                    {loading ? 'Submitting...' : 'Submit Feedback'}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Feedback List */}
            {(() => {
                // Sort: Open first, then Closed; within each group sort by newest first
                const sorted = [...feedbacks].sort((a, b) => {
                    if (a.status === 'Open' && b.status === 'Closed') return -1;
                    if (a.status === 'Closed' && b.status === 'Open') return 1;
                    return new Date(b.created_at) - new Date(a.created_at);
                });
                const totalPages = Math.ceil(sorted.length / ITEMS_PER_PAGE);
                const paginated = sorted.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

                if (feedbacks.length === 0) {
                    return (
                        <div className="text-center py-12 text-slate-500 bg-card rounded-lg border border-dashed border-border">
                            <Lightbulb size={48} className="mx-auto mb-4 opacity-20" />
                            No feedback yet. Be the first to share your thoughts!
                        </div>
                    );
                }

                return (
                    <>
                        {paginated.map((fb) => {
                            const isClosed = fb.status === 'Closed';
                            const isExpanded = expandedId === fb.id;
                            const fbComments = comments[fb.id] || [];

                            return (
                                <Card
                                    key={fb.id}
                                    className={`overflow-hidden shadow-sm transition-all duration-200 ${isClosed ? 'opacity-60 border-l-4 border-l-green-500/50' : 'border-l-4 border-l-emerald-500'}`}
                                    data-testid={`feedback-card-${fb.id}`}
                                >
                                    <CardHeader className="pb-3 bg-muted/30">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex items-start gap-3 min-w-0">
                                                <div className={`p-2 rounded-lg shrink-0 ${isClosed ? 'bg-green-500/10 text-green-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                                                    <Lightbulb size={20} />
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <CardTitle className="text-lg">{fb.title}</CardTitle>
                                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${isClosed ? 'bg-green-500/15 text-green-400 border border-green-500/30' : 'bg-blue-500/15 text-blue-400 border border-blue-500/30'}`}>
                                                            {isClosed ? <><CheckCircle size={12} /> Resolved</> : 'Open'}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        By {fb.user_name}
                                                        {fb.user_role === 'SuperUser' && (
                                                            <span className="ml-1.5 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                                                                <Shield size={10} /> Developer
                                                            </span>
                                                        )}
                                                        <span className="mx-1">•</span>
                                                        {new Date(fb.created_at).toLocaleDateString(undefined, { dateStyle: 'long' })}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* SuperUser actions */}
                                            {isSuperUser && (
                                                <div className="flex items-center gap-1 shrink-0">
                                                    {isClosed ? (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleStatusChange(fb.id, 'Open')}
                                                            className="text-blue-400 hover:text-blue-300 hover:bg-blue-900/10 text-xs h-8"
                                                            title="Reopen feedback"
                                                        >
                                                            <XCircle size={14} className="mr-1" /> Reopen
                                                        </Button>
                                                    ) : (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleStatusChange(fb.id, 'Closed')}
                                                            className="text-green-400 hover:text-green-300 hover:bg-green-900/10 text-xs h-8"
                                                            title="Mark as resolved"
                                                        >
                                                            <CheckCircle size={14} className="mr-1" /> Close
                                                        </Button>
                                                    )}
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleDeleteFeedback(fb.id)}
                                                        className="text-red-500 hover:text-red-700 hover:bg-red-900/10 h-8 w-8"
                                                        title="Delete feedback"
                                                    >
                                                        <Trash2 size={14} />
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </CardHeader>

                                    <CardContent className="pt-4">
                                        <p className="text-sm text-foreground/85 whitespace-pre-wrap">{fb.description}</p>

                                        {/* Comments toggle button */}
                                        <button
                                            onClick={() => handleToggleComments(fb.id)}
                                            className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                            <MessageSquare size={14} />
                                            <span>Comments</span>
                                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                        </button>

                                        {/* Expanded comment section */}
                                        {isExpanded && (
                                            <div className="mt-3 pt-3 border-t border-border space-y-3">
                                                {/* Existing comments */}
                                                {fbComments.length === 0 ? (
                                                    <p className="text-xs text-muted-foreground italic">No comments yet.</p>
                                                ) : (
                                                    fbComments.map((c) => (
                                                        <div key={c.id} className="flex items-start gap-2 text-sm group">
                                                            <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-semibold shrink-0 mt-0.5">
                                                                {c.user_name?.charAt(0)?.toUpperCase()}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                                    <span className="font-medium text-xs">{c.user_name}</span>
                                                                    {c.user_role === 'SuperUser' && (
                                                                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                                                                            <Shield size={9} /> Developer
                                                                        </span>
                                                                    )}
                                                                    <span className="text-[11px] text-muted-foreground">
                                                                        {new Date(c.created_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                                                                    </span>
                                                                    {isSuperUser && (
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            onClick={() => handleDeleteComment(fb.id, c.id)}
                                                                            className="h-5 w-5 text-red-500 hover:text-red-700 hover:bg-red-900/10 opacity-0 group-hover:opacity-100 transition-opacity"
                                                                            title="Delete comment"
                                                                        >
                                                                            <Trash2 size={11} />
                                                                        </Button>
                                                                    )}
                                                                </div>
                                                                <p className="text-foreground/80 mt-0.5 whitespace-pre-wrap">{c.content}</p>
                                                            </div>
                                                        </div>
                                                    ))
                                                )}

                                                {/* Add comment input */}
                                                <div className="flex gap-2 pt-1">
                                                    <Input
                                                        value={commentText}
                                                        onChange={(e) => setCommentText(e.target.value)}
                                                        placeholder="Write a comment..."
                                                        className="text-sm h-9"
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                                e.preventDefault();
                                                                handleSubmitComment(fb.id);
                                                            }
                                                        }}
                                                        data-testid={`comment-input-${fb.id}`}
                                                    />
                                                    <Button
                                                        size="icon"
                                                        className="h-9 w-9 bg-emerald-600 hover:bg-emerald-700 shrink-0"
                                                        onClick={() => handleSubmitComment(fb.id)}
                                                        disabled={commentLoading || !commentText.trim()}
                                                    >
                                                        <Send size={14} />
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            );
                        })}

                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-between pt-4 border-t border-border">
                                <p className="text-sm text-muted-foreground">
                                    Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, sorted.length)} of {sorted.length} feedbacks
                                </p>
                                <div className="flex items-center gap-1">
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                    >
                                        <ChevronLeft size={16} />
                                    </Button>
                                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                        <Button
                                            key={page}
                                            variant={currentPage === page ? 'default' : 'outline'}
                                            size="icon"
                                            className={`h-8 w-8 text-xs ${currentPage === page ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
                                            onClick={() => setCurrentPage(page)}
                                        >
                                            {page}
                                        </Button>
                                    ))}
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages}
                                    >
                                        <ChevronRight size={16} />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </>
                );
            })()}
        </div>
    );
};

// ─── Main Page Component ──────────────────────────────────────────────
const VersionUpdates = () => {
    const { user } = useAuth();
    const [updates, setUpdates] = useState([]);
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    // Form state
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [version, setVersion] = useState('');
    const [changes, setChanges] = useState(['']);

    useEffect(() => {
        fetchUpdates();
    }, []);

    const fetchUpdates = async () => {
        try {
            const response = await axios.get(`${API}/version-updates`);
            setUpdates(response.data);
        } catch (error) {
            console.error('Failed to fetch updates:', error);
            toast.error('Failed to load version updates');
        }
    };

    const handleAddChange = () => {
        setChanges([...changes, '']);
    };

    const handleRemoveChange = (index) => {
        const newChanges = changes.filter((_, i) => i !== index);
        setChanges(newChanges);
    };

    const handleChangeText = (index, value) => {
        const newChanges = [...changes];
        newChanges[index] = value;
        setChanges(newChanges);
    };

    const resetForm = () => {
        setVersion('');
        setChanges(['']);
        setIsEditing(false);
        setEditingId(null);
    };

    const handleOpenChange = (isOpen) => {
        setOpen(isOpen);
        if (!isOpen) resetForm();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const filteredChanges = changes.filter(c => c.trim() !== '');
        if (!version.trim()) {
            toast.error('Version title is required');
            return;
        }
        if (filteredChanges.length === 0) {
            toast.error('At least one change description is required');
            return;
        }

        setLoading(true);
        try {
            const payload = {
                version: version.trim(),
                changes: filteredChanges
            };

            if (isEditing) {
                await axios.put(`${API}/version-updates/${editingId}`, payload);
                toast.success('Version update updated successfully!');
            } else {
                await axios.post(`${API}/version-updates`, payload);
                toast.success('Version update added successfully!');
            }

            setOpen(false);
            resetForm();
            fetchUpdates();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to save version update');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (update) => {
        setVersion(update.version);
        setChanges(update.changes.length > 0 ? update.changes : ['']);
        setEditingId(update.id);
        setIsEditing(true);
        setOpen(true);
    };

    const handleDelete = async (updateId, versionTitle) => {
        if (!window.confirm(`Are you sure you want to delete "${versionTitle}" update?`)) {
            return;
        }

        try {
            await axios.delete(`${API}/version-updates/${updateId}`);
            toast.success('Version update deleted successfully!');
            fetchUpdates();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to delete version update');
        }
    };

    const isSuperUser = user?.role === 'SuperUser';

    return (
        <div className="space-y-6" data-testid="version-updates-page">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-bold text-foreground mb-2">Updates & Feedback</h1>
                    <p className="text-muted-foreground">Track changes and share your suggestions</p>
                </div>
            </div>

            <Tabs defaultValue="updates" className="w-full">
                <TabsList className="grid w-full grid-cols-2 max-w-md">
                    <TabsTrigger value="updates" className="gap-2" data-testid="tab-updates">
                        <History size={16} />
                        Update Logs
                    </TabsTrigger>
                    <TabsTrigger value="feedback" className="gap-2" data-testid="tab-feedback">
                        <Lightbulb size={16} />
                        User Feedback
                    </TabsTrigger>
                </TabsList>

                {/* ─── Tab 1: Update Logs ──────────────────────────────── */}
                <TabsContent value="updates" className="mt-4">
                    {isSuperUser && (
                        <div className="flex justify-end mb-4">
                            <Dialog open={open} onOpenChange={handleOpenChange}>
                                <DialogTrigger asChild>
                                    <Button className="bg-gray-600 hover:bg-gray-700" data-testid="add-update-button">
                                        <Plus size={18} className="mr-2" />
                                        Add Update
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-lg" data-testid="update-dialog">
                                    <DialogHeader>
                                        <DialogTitle>{isEditing ? 'Edit Version Update' : 'Add New Version Update'}</DialogTitle>
                                        <DialogDescription>
                                            Enter the version name and list of changes for this update.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="version-title">Version Title</Label>
                                            <Input
                                                id="version-title"
                                                value={version}
                                                onChange={(e) => setVersion(e.target.value)}
                                                placeholder="e.g., Vlux Version 1.1"
                                                required
                                                data-testid="version-title-input"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Changes</Label>
                                            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                                                {changes.map((change, index) => (
                                                    <div key={index} className="flex gap-2">
                                                        <Input
                                                            value={change}
                                                            onChange={(e) => handleChangeText(index, e.target.value)}
                                                            placeholder={`Change #${index + 1}`}
                                                            required={index === 0}
                                                        />
                                                        {changes.length > 1 && (
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => handleRemoveChange(index)}
                                                                className="text-red-500 hover:text-red-700 hover:bg-red-900/10 shrink-0"
                                                            >
                                                                <X size={16} />
                                                            </Button>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={handleAddChange}
                                                className="w-full mt-2"
                                            >
                                                <Plus size={14} className="mr-1" /> Add Change Item
                                            </Button>
                                        </div>

                                        <div className="flex justify-end space-x-2 pt-4">
                                            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                                                Cancel
                                            </Button>
                                            <Button type="submit" className="bg-gray-600 hover:bg-gray-700" disabled={loading}>
                                                {loading ? 'Saving...' : (isEditing ? 'Update Log' : 'Save Log')}
                                            </Button>
                                        </div>
                                    </form>
                                </DialogContent>
                            </Dialog>
                        </div>
                    )}

                    <div className="space-y-4">
                        {updates.length === 0 ? (
                            <div className="text-center py-12 text-slate-500 bg-card rounded-lg border border-dashed border-border">
                                <History size={48} className="mx-auto mb-4 opacity-20" />
                                No version updates recorded yet.
                            </div>
                        ) : (
                            updates.map((update) => (
                                <Card key={update.id} className="border-l-4 border-l-primary/50 overflow-hidden shadow-sm" data-testid={`update-card-${update.id}`}>
                                    <CardHeader className="pb-3 bg-muted/30">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                                    <History size={20} />
                                                </div>
                                                <div>
                                                    <CardTitle className="text-xl">{update.version}</CardTitle>
                                                    <p className="text-xs text-muted-foreground">
                                                        By {update.created_by} • {new Date(update.created_at).toLocaleDateString(undefined, { dateStyle: 'long' })}
                                                    </p>
                                                </div>
                                            </div>

                                            {isSuperUser && (
                                                <div className="flex items-center gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleEdit(update)}
                                                        className="text-muted-foreground hover:text-foreground"
                                                        title="Edit update"
                                                    >
                                                        <Edit2 size={16} />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleDelete(update.id, update.version)}
                                                        className="text-red-500 hover:text-red-700 hover:bg-red-900/10"
                                                        title="Delete update"
                                                    >
                                                        <Trash2 size={16} />
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </CardHeader>
                                    <CardContent className="pt-4">
                                        <ul className="space-y-2">
                                            {update.changes.map((change, idx) => (
                                                <li key={idx} className="flex items-start gap-2 text-sm text-foreground/90">
                                                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                                                    <span>{change}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </div>
                </TabsContent>

                {/* ─── Tab 2: User Feedback ─────────────────────────────── */}
                <TabsContent value="feedback" className="mt-4">
                    <FeedbackTab user={user} />
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default VersionUpdates;
