import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import SiteCombobox from '../SiteCombobox';

export const TicketDialogs = ({
    ticket,
    showEditDialog, setShowEditDialog,
    editForm, setEditForm, handleEditSubmit,
    sites,
    showCloseConfirm, setShowCloseConfirm, confirmCloseTicket,
    showDeleteConfirm, setShowDeleteConfirm, confirmDeleteTicket,
}) => {
    return (
        <>
            {/* Edit Ticket Dialog */}
            <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                <DialogContent className="max-w-2xl" data-testid="edit-ticket-dialog">
                    <DialogHeader>
                        <DialogTitle>Edit Ticket</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleEditSubmit} className="flex flex-col h-full max-h-[85vh]">
                        <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
                            <div className="space-y-2">
                                <Label htmlFor="edit-title">Title</Label>
                                <Input
                                    id="edit-title"
                                    value={editForm.title}
                                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                                    required
                                    data-testid="edit-ticket-title"
                                    className="bg-background border-input text-foreground"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="edit-ticket-number">Ticket Number</Label>
                                    <Input
                                        id="edit-ticket-number"
                                        value={editForm.ticket_number}
                                        onChange={(e) => setEditForm({ ...editForm, ticket_number: e.target.value })}
                                        data-testid="edit-ticket-number"
                                        className="bg-background border-input text-foreground"
                                        placeholder="Ticket#"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="edit-ticket-link">Link</Label>
                                    <Input
                                        id="edit-ticket-link"
                                        value={editForm.link}
                                        onChange={(e) => setEditForm({ ...editForm, link: e.target.value })}
                                        data-testid="edit-ticket-link"
                                        className="bg-background border-input text-foreground"
                                        placeholder="URL"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="edit-category">Category</Label>
                                    <Select
                                        value={editForm.category}
                                        onValueChange={(value) => setEditForm({ ...editForm, category: value })}
                                        required
                                    >
                                        <SelectTrigger data-testid="edit-ticket-category" className="bg-background border-input text-foreground">
                                            <SelectValue placeholder="Select Category" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-popover border-border text-popover-foreground">
                                            <SelectItem value="FOKMON">FOKMON</SelectItem>
                                            <SelectItem value="MAINTENANCE">MAINTENANCE</SelectItem>
                                            <SelectItem value="WO BOD/UPGRADE">WO BOD/UPGRADE</SelectItem>
                                            <SelectItem value="FYI">FYI</SelectItem>
                                    <SelectItem value="DOWN">DOWN</SelectItem>
                                            <SelectItem value="RFO">RFO</SelectItem>
                                            <SelectItem value="FIBERZONE">FIBERZONE</SelectItem>
                                            <SelectItem value="VLEPO">VLEPO</SelectItem>
                                            <SelectItem value="FTTR">FTTR</SelectItem>
                                            <SelectItem value="MEGALOS">MEGALOS</SelectItem>
                                            <SelectItem value="EMAIL">EMAIL</SelectItem>
                                            <SelectItem value="INTERNET">INTERNET</SelectItem>
                                            <SelectItem value="ACCESS POINT">ACCESS POINT</SelectItem>
                                            <SelectItem value="VIRTUAL">VIRTUAL</SelectItem>
                                            <SelectItem value="DEVICE">DEVICE</SelectItem>
                                            <SelectItem value="REPORT">REPORT</SelectItem>
                                            <SelectItem value="REQUEST CLIENT">REQUEST CLIENT</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="edit-site">Site (Optional)</Label>
                                    <SiteCombobox
                                        sites={sites}
                                        value={editForm.site_id}
                                        onChange={(val) => setEditForm({ ...editForm, site_id: val || undefined })}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="edit-division">Assign To Division</Label>
                                    <Select
                                        value={editForm.assigned_to_division}
                                        onValueChange={(value) => setEditForm({ ...editForm, assigned_to_division: value })}
                                    >
                                        <SelectTrigger data-testid="edit-ticket-division" className="bg-background border-input text-foreground">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-popover border-border text-popover-foreground">
                                            <SelectItem value="Monitoring">Monitoring</SelectItem>
                                            <SelectItem value="Infra">Infra</SelectItem>
                                            <SelectItem value="TS">TS</SelectItem>
                                            <SelectItem value="Internal Support">Internal Support</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="edit-description">Description</Label>
                                <Textarea
                                    id="edit-description"
                                    value={editForm.description}
                                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                                    required
                                    rows={5}
                                    data-testid="edit-ticket-description"
                                    className="bg-background border-input text-foreground min-h-[120px]"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end space-x-2 pt-6 mt-4 border-t border-border/50">
                            <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)} className="border-border text-muted-foreground hover:bg-accent font-medium">
                                Cancel
                            </Button>
                            <Button type="submit" className="bg-primary text-primary-foreground px-6 font-semibold shadow-lg shadow-primary/20">
                                Save Changes
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Close Ticket Confirmation */}
            <Dialog open={showCloseConfirm} onOpenChange={setShowCloseConfirm}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Close Ticket</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to close this ticket? This will mark the issue as resolved.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-end space-x-2 mt-4">
                        <Button variant="outline" onClick={() => setShowCloseConfirm(false)}>
                            Cancel
                        </Button>
                        <Button onClick={confirmCloseTicket} className="bg-green-600 hover:bg-green-700 text-white">
                            Confirm Close
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Delete Ticket Confirmation */}
            <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-red-600">Delete Ticket</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete this ticket? This action is permanent and cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-end space-x-2 mt-4">
                        <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
                            Cancel
                        </Button>
                        <Button onClick={confirmDeleteTicket} variant="destructive">
                            Confirm Delete
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
};
