import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Ticket as TicketIcon, FileText, FileArchive, ImageIcon, Calendar, FolderKanban } from 'lucide-react';
import { TicketsList } from './TicketsList';
import { ReportsList } from './ReportsList';
import { TTBList } from './TTBList';
import { DocumentationList } from './DocumentationList';
import { SchedulesList } from './SchedulesList';
import { ProjectsList } from './ProjectsList';

export const SiteTabs = ({
    site,
    tickets,
    reports,
    schedules = [],
    projects = [],
    ttbDocuments = [],
    documentationDocuments = [],
    onUploadDocumentation,
    getPriorityColor,
    getStatusColor,
    sortBy,
    setSortBy,
    handleViewReport
}) => {
    return (
        <Tabs defaultValue="tickets" className="w-full">
            <TabsList className="grid w-full max-w-3xl grid-cols-6 mb-6 bg-secondary/50 p-1 rounded-xl">
                <TabsTrigger value="tickets" className="flex items-center gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm text-[11px] px-2">
                    <TicketIcon size={14} /> Tickets
                </TabsTrigger>
                <TabsTrigger value="reports" className="flex items-center gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm text-[11px] px-2">
                    <FileText size={14} /> Reports
                </TabsTrigger>
                <TabsTrigger value="projects" className="flex items-center gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm text-[11px] px-2">
                    <FolderKanban size={14} /> Projects
                </TabsTrigger>
                <TabsTrigger value="schedules" className="flex items-center gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm text-[11px] px-2">
                    <Calendar size={14} /> Schedule
                </TabsTrigger>
                <TabsTrigger value="ttb" className="flex items-center gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm text-[11px] px-2">
                    <FileArchive size={14} /> TTB
                </TabsTrigger>
                <TabsTrigger value="documentation" className="flex items-center gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm text-[11px] px-2">
                    <ImageIcon size={14} /> Site Images
                </TabsTrigger>
            </TabsList>
            <TabsContent value="tickets" className="mt-0 ring-offset-background focus-visible:outline-none">
                <TicketsList
                    site={site}
                    tickets={tickets}
                    getPriorityColor={getPriorityColor}
                    getStatusColor={getStatusColor}
                    sortBy={sortBy}
                    setSortBy={setSortBy}
                />
            </TabsContent>
            <TabsContent value="reports" className="mt-0 ring-offset-background focus-visible:outline-none">
                <ReportsList
                    site={site}
                    reports={reports}
                    getStatusColor={getStatusColor}
                    handleViewReport={handleViewReport}
                />
            </TabsContent>
            <TabsContent value="projects" className="mt-0 ring-offset-background focus-visible:outline-none">
                <ProjectsList
                    site={site}
                    projects={projects}
                />
            </TabsContent>
            <TabsContent value="schedules" className="mt-0 ring-offset-background focus-visible:outline-none">
                <SchedulesList
                    site={site}
                    schedules={schedules}
                />
            </TabsContent>
            <TabsContent value="ttb" className="mt-0 ring-offset-background focus-visible:outline-none">
                <TTBList ttbDocuments={ttbDocuments} />
            </TabsContent>
            <TabsContent value="documentation" className="mt-0 ring-offset-background focus-visible:outline-none">
                <DocumentationList documentationDocuments={documentationDocuments} onUploadClick={onUploadDocumentation} />
            </TabsContent>
        </Tabs>
    );
};
