import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Textarea } from '../../ui/textarea';
import { Button } from '../../ui/button';
import { MessageSquare, Send } from 'lucide-react';

export const WorkOrderComments = ({ wo, comment, setComment, handleAddComment }) => {
    return (
        <Card data-testid="comments-section" className="bg-card border-border shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50/50 border-b border-border/50">
                <CardTitle className="flex items-center space-x-2 text-foreground text-lg font-bold">
                    <MessageSquare size={20} className="text-[#9AD872]" />
                    <span>Activity Feed & Comments</span>
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <div className="max-h-[500px] overflow-y-auto p-6 space-y-4">
                    {wo.comments && wo.comments.length > 0 ? (
                        <div className="space-y-6">
                            {wo.comments.map((c, index) => (
                                <div key={c.id || index} className="relative pl-6 border-l-2 border-slate-100 last:border-l-0">
                                    <div className="absolute left-[-9px] top-0 w-4 h-4 rounded-full bg-white border-2 border-[#9AD872]" />
                                    <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
                                        <div className="flex items-center justify-between mb-2">
                                            <p className="font-bold text-sm text-slate-800">{c.user_name}</p>
                                            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                                                {new Date(c.created_at).toLocaleString()}
                                            </p>
                                        </div>
                                        <p className="text-sm text-slate-600 leading-relaxed">{c.comment}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                            <MessageSquare size={48} className="opacity-10 mb-2" />
                            <p className="text-sm font-medium">No comments or activity yet</p>
                        </div>
                    )}
                </div>

                <div className="p-6 bg-slate-50/30 border-t border-border mt-auto">
                    <form onSubmit={handleAddComment} className="space-y-3">
                        <div className="relative">
                            <Textarea
                                placeholder="Write a comment or update..."
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                className="min-h-[100px] bg-white border-slate-200 focus:border-[#9AD872] focus:ring-[#9AD872]/10 transition-all resize-none p-4"
                                rows={3}
                            />
                        </div>
                        <div className="flex justify-end">
                            <Button 
                                type="submit" 
                                disabled={!comment.trim()}
                                className="bg-[#9AD872] hover:bg-[#8bc964] text-white font-bold px-6 border-b-4 border-[#76a15a] active:border-b-0 active:translate-y-1 transition-all flex items-center gap-2"
                            >
                                <Send size={16} />
                                Post Update
                            </Button>
                        </div>
                    </form>
                </div>
            </CardContent>
        </Card>
    );
};
