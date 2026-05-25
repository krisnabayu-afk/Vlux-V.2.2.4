import { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useCanEdit } from '../context/PermissionContext';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { Plus, Search, Download, Eye, Trash2, FileArchive, MapPin, User, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';
import SiteCombobox from '../components/SiteCombobox';

const API = `${process.env.REACT_APP_API_URL}/api`;

const TTB = () => {
  const { user } = useAuth();
  const canEditPerm = useCanEdit('ttb');
  const [ttbDocuments, setTtbDocuments] = useState([]);
  const [sites, setSites] = useState([]);
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    site_id: undefined,
    title: '',
    file: null
  });
  const [uploading, setUploading] = useState(false);
  const [viewFilter, setViewFilter] = useState('all'); // 'all' or 'mine'

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 15;

  useEffect(() => {
    fetchSites();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, viewFilter]);

  useEffect(() => {
    fetchTTBDocuments(currentPage);
  }, [currentPage, searchQuery, viewFilter]);

  const fetchSites = async () => {
    try {
      const response = await axios.get(`${API}/sites`, { params: { limit: 1000 } });
      setSites(response.data.items || response.data);
    } catch (error) {
      console.error('Failed to fetch sites:', error);
    }
  };

  const fetchTTBDocuments = async (page = 1) => {
    try {
      const params = { page, limit: itemsPerPage };
      if (searchQuery) params.search = searchQuery;
      if (viewFilter === 'mine') params.mine = true;
      const response = await axios.get(`${API}/ttb`, { params });
      setTtbDocuments(response.data.items || []);
      setTotalPages(response.data.total_pages || 1);
      setTotalItems(response.data.total || 0);
    } catch (error) {
      console.error('Failed to fetch TTB documents:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.site_id) {
      toast.error('Please select a site');
      return;
    }
    if (!formData.file) {
      toast.error('Please select a file to upload');
      return;
    }

    setUploading(true);
    try {
      const data = new FormData();
      data.append('site_id', formData.site_id);
      data.append('title', formData.title);
      data.append('file', formData.file);

      await axios.post(`${API}/ttb`, data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      toast.success('TTB document uploaded successfully!');
      setOpen(false);
      setFormData({ site_id: undefined, title: '', file: null });
      fetchTTBDocuments(currentPage);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to upload TTB document');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (ttbId) => {
    if (!window.confirm('Are you sure you want to delete this TTB document? This action cannot be undone.')) return;

    try {
      await axios.delete(`${API}/ttb/${ttbId}`);
      toast.success('TTB document deleted');
      fetchTTBDocuments(currentPage);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete TTB document');
    }
  };

  const handleDownload = (fileUrl, fileName) => {
    const link = document.createElement('a');
    link.href = `${process.env.REACT_APP_API_URL}${fileUrl}`;
    link.download = fileName;
    link.target = '_blank';
    link.click();
  };

  const handlePreview = (fileUrl) => {
    window.open(`${process.env.REACT_APP_API_URL}${fileUrl}`, '_blank');
  };

  const canDelete = (doc) => {
    return doc.uploaded_by === user?.id || user?.role === 'SuperUser';
  };

  return (
    <div className="space-y-6" data-testid="ttb-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2">TTB Archive</h1>
          <p className="text-muted-foreground">Manage and access TTB documents across all sites</p>
        </div>

        {canEditPerm && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/20" data-testid="upload-ttb-button">
              <Plus size={18} className="mr-2" />
              Upload TTB
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border text-foreground" onCloseAutoFocus={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle className="text-foreground">Upload TTB Document</DialogTitle>
              <DialogDescription className="text-muted-foreground">Select a site and upload a TTB document (PDF or Image).</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="site" className="text-foreground">Site Name</Label>
                <SiteCombobox
                  sites={sites}
                  value={formData.site_id}
                  onChange={(val) => setFormData({ ...formData, site_id: val })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="title" className="text-foreground">TTB Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  className="bg-background border-input text-foreground"
                  placeholder="Enter TTB document title"
                  data-testid="ttb-title-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="file" className="text-foreground">Document File</Label>
                <Input
                  id="file"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  onChange={(e) => setFormData({ ...formData, file: e.target.files[0] })}
                  required
                  className="bg-background border-input text-foreground file:mr-4 file:py-1 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
                  data-testid="ttb-file-input"
                />
                <p className="text-xs text-muted-foreground">Accepted: PDF, JPG, PNG, WebP</p>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-border/50">
                <Button type="button" variant="outline" onClick={() => setOpen(false)} className="border-border text-muted-foreground hover:bg-accent font-medium">
                  Cancel
                </Button>
                <Button type="submit" disabled={uploading} className="bg-red-500 hover:bg-red-600 px-6 font-semibold shadow-lg shadow-red-500/20" data-testid="submit-ttb-button">
                  {uploading ? 'Uploading...' : 'Upload'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        )}
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Left: All / My TTB Toggle */}
        <div className="flex items-center gap-0.5 bg-muted/50 p-0.5 rounded-lg">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewFilter('all')}
            className={cn(
              'h-7 px-3 rounded-md text-xs font-medium transition-all',
              viewFilter === 'all'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            All
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewFilter('mine')}
            className={cn(
              'h-7 px-3 rounded-md text-xs font-medium transition-all',
              viewFilter === 'mine'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            My TTB
          </Button>
        </div>

        {/* Right: Search + Count */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative w-full md:w-64">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by title, site, or uploader..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-background border-input hover:border-ring focus:border-primary rounded-full transition-colors text-foreground h-9"
              data-testid="ttb-search-input"
            />
          </div>
          <div className="text-sm text-muted-foreground whitespace-nowrap">
            {totalItems} document{totalItems !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Grid View */}
      {ttbDocuments.length === 0 ? (
        <div className="text-center py-20 bg-card border border-dashed border-border rounded-xl">
          <FileArchive size={48} className="mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-lg text-muted-foreground font-medium">No TTB documents found</p>
          <p className="text-sm text-muted-foreground/70 mt-1">Upload your first TTB document to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {ttbDocuments.map((doc) => (
            <div
              key={doc.id}
              className="group relative bg-card border border-border rounded-xl p-5 hover:shadow-lg hover:border-primary/30 transition-all duration-200 flex flex-col"
            >
              {/* File type icon */}
              <div className="flex items-start justify-between mb-4">
                <div className="p-2.5 bg-red-500/10 rounded-lg">
                  <FileArchive size={22} className="text-red-500" />
                </div>
                {canDelete(doc) && canEditPerm && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(doc.id)}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Delete"
                    data-testid={`delete-ttb-${doc.id}`}
                  >
                    <Trash2 size={15} />
                  </Button>
                )}
              </div>

              {/* Title */}
              <h3 className="font-bold text-foreground text-sm line-clamp-2 mb-3 group-hover:text-primary transition-colors">
                {doc.title}
              </h3>

              {/* Meta info */}
              <div className="space-y-1.5 mt-auto mb-4">
                <div className="flex items-center text-xs text-muted-foreground">
                  <MapPin size={12} className="mr-1.5 text-blue-500 shrink-0" />
                  <span className="truncate">{doc.site_name}</span>
                </div>
                <div className="flex items-center text-xs text-muted-foreground">
                  <User size={12} className="mr-1.5 text-green-500 shrink-0" />
                  <span className="truncate">{doc.uploaded_by_name}</span>
                </div>
                <div className="flex items-center text-xs text-muted-foreground">
                  <Calendar size={12} className="mr-1.5 text-purple-500 shrink-0" />
                  {new Date(doc.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 pt-3 border-t border-border/50">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePreview(doc.file_url)}
                  className="flex-1 h-8 text-xs border-border hover:bg-primary/10 hover:text-primary hover:border-primary/30"
                  data-testid={`view-ttb-${doc.id}`}
                >
                  <Eye size={13} className="mr-1.5" />
                  View
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownload(doc.file_url, doc.file_name)}
                  className="flex-1 h-8 text-xs border-border hover:bg-blue-500/10 hover:text-blue-600 hover:border-blue-500/30"
                  data-testid={`download-ttb-${doc.id}`}
                >
                  <Download size={13} className="mr-1.5" />
                  Download
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalItems > 0 && (
        <div className="flex items-center justify-between py-4">
          <div className="text-sm text-muted-foreground">
            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} documents
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft size={16} className="mr-1" />
              Previous
            </Button>
            <div className="text-sm font-medium px-2">
              Page {currentPage} of {totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight size={16} className="ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TTB;
