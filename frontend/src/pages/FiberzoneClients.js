import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '../components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { Plus, MapPin, Search, Eye, Edit, Trash2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { useAuth } from '../context/AuthContext';

const API = `${process.env.REACT_APP_API_URL}/api`;

const FiberzoneClients = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sites, setSites] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedSite, setSelectedSite] = useState(null);
  
  const [formData, setFormData] = useState({
    name: '',
    cid: '',
    location: '',
    description: '',
    region: '',
    status: 'active',
    fiberzone: true, // Forced true for this page
    btest_link: '',
    fiberlink_link: ''
  });

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalSites, setTotalSites] = useState(0);
  const itemsPerPage = 15;

  useEffect(() => {
    fetchSites(currentPage);
  }, [currentPage, searchQuery]);

  const fetchSites = async (page = 1) => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: itemsPerPage,
        fiberzone: true // Use boolean true now that backend supports it
      };

      if (searchQuery) {
        params.search = searchQuery;
      }

      const response = await axios.get(`${API}/sites`, { params });
      if (response.data.items) {
        setSites(response.data.items);
        setTotalPages(response.data.total_pages);
        setTotalSites(response.data.total);
      } else {
        setSites(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch fiberzone clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditMode(false);
    setSelectedSite(null);
    setFormData({ 
        name: '', 
        cid: '', 
        location: '', 
        description: '', 
        region: '', 
        status: 'active', 
        fiberzone: true, // Forced
        btest_link: '', 
        fiberlink_link: '' 
    });
    setOpen(true);
  };

  const handleEdit = (site) => {
    setSelectedSite(site);
    setFormData({
      name: site.name,
      cid: site.cid || '',
      location: site.location || '',
      description: site.description || '',
      region: site.region || '',
      status: site.status,
      fiberzone: true, // Keep it true
      btest_link: site.btest_link || '',
      fiberlink_link: site.fiberlink_link || ''
    });
    setEditMode(true);
    setOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editMode) {
        await axios.put(`${API}/sites/${selectedSite.id}`, formData);
        toast.success('Fiberzone client updated!');
      } else {
        await axios.post(`${API}/sites`, formData);
        toast.success('Fiberzone client created!');
      }
      setOpen(false);
      fetchSites(currentPage);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save client');
    }
  };

  const handleDelete = async (siteId) => {
    if (!window.confirm('Are you sure you want to delete this Fiberzone client?')) return;
    try {
      await axios.delete(`${API}/sites/${siteId}`);
      toast.success('Client deleted');
      fetchSites(currentPage);
    } catch (error) {
      toast.error('Failed to delete client');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-4">
            <div className="bg-[#9AD872]/20 p-3 rounded-xl border border-[#9AD872]/30">
                <MapPin className="text-[#76a15a]" size={24} />
            </div>
            <div>
                <h1 className="text-2xl font-bold text-slate-800">Fiberzone Clients</h1>
                <p className="text-slate-500 text-sm">Managing verified Fiberzone sites and infrastructure</p>
            </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
            <Input
              placeholder="Search clients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white border-slate-200"
            />
          </div>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleOpenCreate} className="bg-[#9AD872] hover:bg-[#8bc964] text-white font-bold shadow-lg shadow-[#9AD872]/20 border-b-4 border-[#76a15a] active:border-b-0 active:translate-y-1 transition-all">
                <Plus size={18} className="mr-2" />
                Add Client
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white border-slate-200">
              <DialogHeader>
                <DialogTitle>{editMode ? 'Edit Fiberzone Client' : 'Add Fiberzone Client'}</DialogTitle>
                <DialogDescription>
                    Clients created here will be automatically tagged as Fiberzone.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cid">CID</Label>
                    <Input id="cid" value={formData.cid} onChange={(e) => setFormData({ ...formData, cid: e.target.value })} placeholder="VTIB-XXXX" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name">Site Name *</Label>
                    <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required placeholder="Client Name" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input id="location" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} placeholder="Full Address" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Notes</Label>
                  <Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Additional details..." rows={2} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                    <Label>Region</Label>
                    <Select value={formData.region} onValueChange={(val) => setFormData({ ...formData, region: val })}>
                        <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Select Region" />
                        </SelectTrigger>
                        <SelectContent className="bg-white">
                        <SelectItem value="Region 1">Region 1</SelectItem>
                        <SelectItem value="Region 2">Region 2</SelectItem>
                        <SelectItem value="Region 3">Region 3</SelectItem>
                        </SelectContent>
                    </Select>
                    </div>
                     <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={formData.status} onValueChange={(val) => setFormData({ ...formData, status: val })}>
                        <SelectTrigger className="bg-white">
                        <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white">
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                    </Select>
                    </div>
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button type="submit" className="bg-[#9AD872] hover:bg-[#8bc964] text-white font-bold shadow-lg border-b-4 border-[#76a15a] active:border-b-0 active:translate-y-1 transition-all">
                    {editMode ? 'Update' : 'Create Client'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
           <div className="col-span-full text-center py-12 text-slate-400">Loading clients...</div>
        ) : sites.length === 0 ? (
          <div className="col-span-full text-center py-12 text-slate-400 bg-white rounded-xl border border-dashed">
            {searchQuery ? `No fiberzone clients found matching "${searchQuery}"` : 'No fiberzone clients found'}
          </div>
        ) : (
          sites.map((site) => (
            <Card key={site.id} className="bg-white border-slate-100 hover:shadow-md transition-shadow group">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg font-bold text-slate-800 truncate pr-2">
                    {site.name}
                  </CardTitle>
                   <Badge className="bg-[#9AD872]/20 text-[#76a15a] border-[#9AD872]/30 shrink-0 text-[10px] h-5 font-bold">
                    FIBERZONE
                  </Badge>
                </div>
                {site.cid && <CardDescription className="text-[#8bc964] font-mono text-xs font-semibold">{site.cid}</CardDescription>}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-2 text-sm text-slate-600">
                    <MapPin size={16} className="text-slate-400 mt-0.5 shrink-0" />
                    <span className="line-clamp-2">{site.location || 'No location specified'}</span>
                </div>
                
                <div className="pt-2 border-t border-slate-50 flex justify-between items-center">
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">{site.region || 'No Region'}</span>
                    <div className="flex gap-1.5">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => navigate(`/fiberzone/sites/${site.id}`)}>
                            <Eye size={14} className="text-slate-500" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleEdit(site)}>
                            <Edit size={14} className="text-blue-500" />
                        </Button>
                        {user?.role === 'SuperUser' && (
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleDelete(site.id)}>
                                <Trash2 size={14} className="text-red-500" />
                            </Button>
                        )}
                    </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {totalSites > itemsPerPage && (
        <div className="flex items-center justify-between py-4 px-2">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            {totalSites} Total Clients
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs font-bold border-slate-200"
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              Prev
            </Button>
            <span className="text-xs font-bold px-3 py-1 bg-slate-100 rounded text-slate-600">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
               className="h-8 text-xs font-bold border-slate-200"
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FiberzoneClients;
