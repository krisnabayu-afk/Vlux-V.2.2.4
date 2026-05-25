import React from 'react';
import { Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';

export const DayAtGlance = ({ nextVisit, totalSchedules }) => {
    return (
        <Link to="/activity" className="block transition-transform hover:scale-[1.005] active:scale-[0.995]">
            <div className="bg-[#EBF5FF] border border-[#BFDBFE] rounded-2xl p-4 flex items-center justify-between shadow-sm cursor-pointer hover:bg-[#DEEFFF] transition-colors">
                <div className="flex items-center space-x-4">
                    <div className="bg-white p-2.5 rounded-xl shadow-sm border border-[#E0E7FF]">
                        <Calendar className="text-[#2563EB]" size={24} />
                    </div>
                    <div>
                        <h2 className="text-[#1E3A8A] font-bold text-lg leading-snug">Aktivitas Kamu Hari Ini</h2>
                        <p className="text-[#60A5FA] font-medium text-sm leading-snug">
                            {nextVisit
                                ? `${nextVisit.is_current ? 'Aktivitas kamu hari ini' : 'Aktivitas kamu berikutnya'}: (${nextVisit.title}) pukul (${new Date(nextVisit.start_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`
                                : "Tidak ada aktivitas atau kunjungan untuk hari ini."
                            }
                        </p>
                    </div>
                </div>
                {totalSchedules > 0 && (
                    <div className="bg-[#DBEAFE] text-[#1E40AF] font-bold h-8 w-8 flex items-center justify-center rounded-full text-base">
                        {totalSchedules}
                    </div>
                )}
            </div>
        </Link>
    );
};
