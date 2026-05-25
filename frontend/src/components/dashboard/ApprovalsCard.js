import React from 'react';
import { Link } from 'react-router-dom';

export const ApprovalsCard = ({ pendingApprovals, handleViewReport, getStatusColor }) => {
    return (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col h-full overflow-hidden" data-testid="approvals-card">
            <div className="mb-4">
                <h3 className="text-xl font-bold text-gray-900">Pending Approvals</h3>
                <p className="text-gray-400 font-medium text-sm">Awaiting Review</p>
            </div>

            <div className="mb-4 flex flex-col items-center justify-center">
                <span className="text-5xl font-extrabold text-foreground">{pendingApprovals.length}</span>
            </div>

            <div className="flex-1 bg-[#F9FAFB] rounded-2xl p-3 border border-gray-100 space-y-0.5 overflow-hidden">
                {pendingApprovals.length === 0 ? (
                    <p className="text-muted-foreground text-sm text-center py-4">No pending approvals</p>
                ) : (
                    <div className="max-h-[160px] overflow-y-auto space-y-0.5">
                        {pendingApprovals.slice(0, 5).map((report, index) => (
                            <div
                                key={report.id}
                                onClick={() => handleViewReport(report.id)}
                                className={`p-3 bg-white ${index === 0 ? 'rounded-t-xl' : ''} ${index === pendingApprovals.slice(0, 5).length - 1 ? 'rounded-b-xl' : ''} border-b border-gray-50 last:border-b-0 hover:bg-gray-50 transition-colors cursor-pointer flex flex-col space-y-1`}
                            >
                                <p className="font-bold text-gray-900 text-base leading-tight">{report.title}</p>
                                <div className="flex items-center justify-between">
                                    <p className="text-xs text-gray-500 font-medium">By {report.submitted_by_name}</p>
                                    <span className={`px-3 py-0.5 rounded-lg text-xs font-bold border ${getStatusColor(report.status)}`}>
                                        {report.status}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="mt-4 text-center">
                <Link 
                    to="/reports" 
                    state={{ filter: 'approving' }}
                    className="text-gray-400 hover:text-gray-900 font-bold text-base transition-colors inline-block"
                >
                    View all
                </Link>
            </div>
        </div>
    );
};
