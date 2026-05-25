import React from 'react';
import { Link } from 'react-router-dom';
import { Zap } from 'lucide-react';
import { Button } from '../ui/button';

export const DashboardHeader = ({ user }) => {
    return (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
            <h1 className="text-4xl font-extrabold text-slate-800 tracking-tight">
                Welcome back, {user?.first_name && user?.last_name ? `${user.first_name} ${user.last_name}` : user?.username}!
            </h1>
        </div>
    );
};
