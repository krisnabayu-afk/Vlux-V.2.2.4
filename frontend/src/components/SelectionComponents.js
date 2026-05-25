import React, { useState, useMemo, memo } from 'react';
import { Button } from './ui/button';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from './ui/command';
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';

export const OptimizedMultiStaffCombobox = memo(({ users = [], selectedIds = [], onChange, isLoading = false }) => {
    const [open, setOpen] = useState(false);

    const toggleUser = (userId) => {
        if (selectedIds.includes(userId)) {
            onChange(selectedIds.filter((id) => id !== userId));
        } else {
            onChange([...selectedIds, userId]);
        }
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between bg-transparent border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800/50 overflow-hidden"
                    data-testid="multi-staff-select"
                >
                    <span className="truncate">
                        {selectedIds.length > 0
                            ? `${selectedIds.length} staff selected`
                            : "Select staff"}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50 flex-shrink-0" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0" align="start">
                <Command>
                    <CommandInput placeholder="Search staff..." />
                    <CommandList>
                        {isLoading ? (
                            <div className="flex items-center justify-center p-4 text-sm text-muted-foreground">
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Loading staff list...
                            </div>
                        ) : (
                            <>
                                <CommandEmpty>No staff found.</CommandEmpty>
                                <CommandGroup>
                                    {users.map((user) => (
                                        <CommandItem
                                            key={user.id}
                                            value={`${user.username} ${user.role} ${user.division}`}
                                            onSelect={() => toggleUser(user.id)}
                                        >
                                            <Check
                                                className={cn(
                                                    "mr-2 h-4 w-4 text-primary",
                                                    selectedIds.includes(user.id) ? "opacity-100" : "opacity-0"
                                                )}
                                            />
                                            <div className="flex flex-col">
                                                <span>{user.username}</span>
                                                <span className="text-xs text-muted-foreground">{user.role} - {user.division}</span>
                                            </div>
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            </>
                        )}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
});

export const OptimizedSiteCombobox = memo(({ sites = [], value, onChange, isLoading = false, className, emptyLabel = "All Sites", placeholder = "Search site..." }) => {
    const [open, setOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const selectedSite = useMemo(() => sites.find((s) => s.id === value), [sites, value]);

    // OPTIMIZATION: Filter the FULL sites array in JS, then cap the rendered results.
    // This ensures every site is reachable via search, unlike the old slice approach.
    const displayLimit = 100;
    const filteredSites = useMemo(() => {
        if (!searchQuery.trim()) {
            // No search: show first N sites
            return sites.slice(0, displayLimit);
        }
        const q = searchQuery.toLowerCase().trim();
        const results = [];
        for (let i = 0; i < sites.length; i++) {
            if (sites[i].name && sites[i].name.toLowerCase().includes(q)) {
                results.push(sites[i]);
                if (results.length >= displayLimit) break;
            }
        }
        return results;
    }, [sites, searchQuery]);

    const totalMatches = useMemo(() => {
        if (!searchQuery.trim()) return sites.length;
        const q = searchQuery.toLowerCase().trim();
        return sites.filter(s => s.name && s.name.toLowerCase().includes(q)).length;
    }, [sites, searchQuery]);

    // Reset search when popover closes
    const handleOpenChange = (isOpen) => {
        setOpen(isOpen);
        if (!isOpen) setSearchQuery('');
    };

    return (
        <Popover open={open} onOpenChange={handleOpenChange}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn("w-full justify-between bg-transparent border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800/50 overflow-hidden font-normal text-sm h-10", className)}
                    data-testid="site-select-combobox"
                >
                    <span className="truncate mr-2">
                        {value && value !== 'all' ? selectedSite?.name : emptyLabel}
                    </span>
                    <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0" align="start">
                <Command shouldFilter={false}>
                    <CommandInput
                        placeholder={placeholder}
                        value={searchQuery}
                        onValueChange={setSearchQuery}
                    />
                    <CommandList>
                        {isLoading ? (
                            <div className="flex items-center justify-center p-4 text-sm text-muted-foreground">
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Loading sites...
                            </div>
                        ) : (
                            <>
                                {filteredSites.length === 0 && !searchQuery.trim() === false && (
                                    <div className="py-6 text-center text-sm">No site found.</div>
                                )}
                                <CommandGroup>
                                    {!searchQuery.trim() && (
                                        <CommandItem
                                            value="all-sites"
                                            onSelect={() => {
                                                onChange('all');
                                                setOpen(false);
                                            }}
                                        >
                                            <Check
                                                className={cn(
                                                    "mr-2 h-4 w-4",
                                                    value === 'all' || !value ? "opacity-100" : "opacity-0"
                                                )}
                                            />
                                            {emptyLabel}
                                        </CommandItem>
                                    )}
                                    {filteredSites.map((site) => (
                                        <CommandItem
                                            key={site.id}
                                            value={site.name}
                                            onSelect={() => {
                                                onChange(site.id);
                                                setOpen(false);
                                            }}
                                        >
                                            <Check
                                                className={cn(
                                                    "mr-2 h-4 w-4",
                                                    value === site.id ? "opacity-100" : "opacity-0"
                                                )}
                                            />
                                            {site.name}
                                        </CommandItem>
                                    ))}
                                    {filteredSites.length === 0 && searchQuery.trim() && (
                                        <div className="py-6 text-center text-sm text-muted-foreground">No site found.</div>
                                    )}
                                    {totalMatches > displayLimit && (
                                        <div className="p-2 text-[10px] text-center text-muted-foreground border-t border-border">
                                            Showing {displayLimit} of {totalMatches} matches. Refine your search.
                                        </div>
                                    )}
                                </CommandGroup>
                            </>
                        )}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
});

export const ProjectLeadCombobox = memo(({ users = [], value, onChange, className }) => {
    const [open, setOpen] = useState(false);
    const { orgConfig } = useAuth();
    
    const leadUsers = useMemo(() => {
        return users.filter(u => u.is_project_leader === true);
    }, [users]);

    const selectedUser = useMemo(() => users.find((u) => u.id === value), [users, value]);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn("w-full justify-between bg-transparent border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800/50 overflow-hidden font-normal", className)}
                >
                    <span className="truncate">
                        {value ? selectedUser?.username : "Select lead"}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0" align="start">
                <Command>
                    <CommandInput placeholder="Search lead..." />
                    <CommandList>
                        <CommandEmpty>No user found.</CommandEmpty>
                        <CommandGroup>
                            {leadUsers.map((user) => (
                                <CommandItem
                                    key={user.id}
                                    value={user.username}
                                    onSelect={() => {
                                        onChange(user.id);
                                        setOpen(false);
                                    }}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4 text-primary",
                                            value === user.id ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    {user.username}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
});

export const OptimizedStaffCombobox = memo(({ users = [], value, onChange, isLoading = false, className }) => {
    const [open, setOpen] = useState(false);
    const selectedUser = useMemo(() => users.find((user) => user.id === value), [users, value]);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn("w-full justify-between bg-transparent border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800/50 overflow-hidden", className)}
                    data-testid="staff-filter"
                >
                    <span className="truncate">
                        {value && value !== 'all'
                            ? `${selectedUser?.username} (${selectedUser?.role} - ${selectedUser?.division})`
                            : "All Staff"}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50 flex-shrink-0" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0" align="start">
                <Command>
                    <CommandInput placeholder="Search staff..." />
                    <CommandList>
                        {isLoading ? (
                            <div className="flex items-center justify-center p-4 text-sm text-muted-foreground">
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Loading staff...
                            </div>
                        ) : (
                            <>
                                <CommandEmpty>No staff found.</CommandEmpty>
                                <CommandGroup>
                                    <CommandItem
                                        value="all-staff"
                                        onSelect={() => {
                                            onChange('all');
                                            setOpen(false);
                                        }}
                                    >
                                        <Check
                                            className={cn(
                                                "mr-2 h-4 w-4",
                                                value === 'all' ? "opacity-100" : "opacity-0"
                                            )}
                                        />
                                        All Staff
                                    </CommandItem>
                                    {users.map((user) => (
                                        <CommandItem
                                            key={user.id}
                                            value={`${user.username} ${user.role} ${user.division}`}
                                            onSelect={() => {
                                                onChange(user.id);
                                                setOpen(false);
                                            }}
                                        >
                                            <Check
                                                className={cn(
                                                    "mr-2 h-4 w-4",
                                                    value === user.id ? "opacity-100" : "opacity-0"
                                                )}
                                            />
                                            <div className="flex flex-col">
                                                <span>{user.username}</span>
                                                <span className="text-xs text-muted-foreground">{user.role} - {user.division}</span>
                                            </div>
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            </>
                        )}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
});

export const SearchableSelectCombobox = memo(({ options = [], value, onChange, placeholder = "Select option...", emptyText = "No option found.", className, allowAll = false, allLabel = "All Options" }) => {
    const [open, setOpen] = useState(false);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn("w-full justify-between bg-transparent border-input hover:bg-accent text-foreground overflow-hidden", className)}
                >
                    <span className="truncate mr-2">
                        {value && value !== 'all' ? value : (allowAll && value === 'all' ? allLabel : placeholder)}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50 flex-shrink-0" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0 border-border bg-popover" align="start">
                <Command className="bg-popover border-border">
                    <CommandInput placeholder="Search..." />
                    <CommandList>
                        <CommandEmpty className="text-muted-foreground">{emptyText}</CommandEmpty>
                        <CommandGroup>
                            {allowAll && (
                                <CommandItem
                                    value="all"
                                    onSelect={() => {
                                        onChange('all');
                                        setOpen(false);
                                    }}
                                    className="text-foreground data-[selected=true]:bg-accent"
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            value === 'all' ? "opacity-100" : "opacity-0"
                                        )} 
                                    />
                                    {allLabel}
                                </CommandItem>
                            )}
                            {options.map((opt) => (
                                <CommandItem
                                    key={opt}
                                    value={opt}
                                    onSelect={() => {
                                        onChange(opt);
                                        setOpen(false);
                                    }}
                                    className="text-foreground data-[selected=true]:bg-accent"
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            value === opt ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    {opt}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
});

export const UserCombobox = memo(({ users = [], value, onChange, placeholder = "Select user...", className, isLoading = false }) => {
    const [open, setOpen] = useState(false);
    const selectedUser = useMemo(() => users.find((u) => u.id === value), [users, value]);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn("w-full justify-between bg-transparent border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800/50 overflow-hidden font-normal text-sm h-10", className)}
                >
                    <span className="truncate">
                        {value ? selectedUser?.username : placeholder}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50 flex-shrink-0" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0" align="start">
                <Command>
                    <CommandInput placeholder="Search user..." />
                    <CommandList>
                        {isLoading ? (
                            <div className="flex items-center justify-center p-4 text-sm text-muted-foreground">
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Loading...
                            </div>
                        ) : (
                            <>
                                <CommandEmpty>No user found.</CommandEmpty>
                                <CommandGroup>
                                    <CommandItem
                                        value="unassigned"
                                        onSelect={() => {
                                            onChange('');
                                            setOpen(false);
                                        }}
                                    >
                                        <Check
                                            className={cn(
                                                "mr-2 h-4 w-4 text-primary",
                                                !value ? "opacity-100" : "opacity-0"
                                            )}
                                        />
                                        Unassigned
                                    </CommandItem>
                                    {users.map((user) => (
                                        <CommandItem
                                            key={user.id}
                                            value={`${user.username} ${user.role || ''}`}
                                            onSelect={() => {
                                                onChange(user.id);
                                                setOpen(false);
                                            }}
                                        >
                                            <Check
                                                className={cn(
                                                    "mr-2 h-4 w-4 text-primary",
                                                    value === user.id ? "opacity-100" : "opacity-0"
                                                )}
                                            />
                                            <div className="flex flex-col">
                                                <span>{user.username}</span>
                                                {user.role && <span className="text-[10px] text-muted-foreground">{user.role}</span>}
                                            </div>
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            </>
                        )}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
});

export const SalesUserCombobox = memo(({ users = [], value, onChange, className }) => {
    const [open, setOpen] = useState(false);
    const { orgConfig } = useAuth();
    
    const salesUsers = useMemo(() => {
        const salesId = orgConfig?.division_mappings?.sales_department_id;
        return users.filter(u => {
            const isSalesDept = (salesId && u.department_id === salesId) || u.department === 'Sales';
            const hasSalesRole = ['Manager', 'VP', 'Sales Manager', 'VP Sales'].includes(u.role);
            return isSalesDept && hasSalesRole;
        });
    }, [users, orgConfig]);

    const selectedUser = useMemo(() => users.find((u) => u.id === value), [users, value]);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn("w-full justify-between bg-transparent border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800/50 overflow-hidden font-normal", className)}
                >
                    <span className="truncate">
                        {value ? selectedUser?.username : "Select sales assigned"}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0" align="start">
                <Command>
                    <CommandInput placeholder="Search sales staff..." />
                    <CommandList>
                        <CommandEmpty>No sales staff found.</CommandEmpty>
                        <CommandGroup>
                            <CommandItem
                                value="unassigned"
                                onSelect={() => {
                                    onChange('');
                                    setOpen(false);
                                }}
                            >
                                <Check
                                    className={cn(
                                        "mr-2 h-4 w-4 text-primary",
                                        !value ? "opacity-100" : "opacity-0"
                                    )}
                                />
                                Unassigned
                            </CommandItem>
                            {salesUsers.map((user) => (
                                <CommandItem
                                    key={user.id}
                                    value={user.username}
                                    onSelect={() => {
                                        onChange(user.id);
                                        setOpen(false);
                                    }}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4 text-primary",
                                            value === user.id ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    <div className="flex flex-col">
                                        <span>{user.username}</span>
                                        <span className="text-[10px] text-muted-foreground">{user.role}</span>
                                    </div>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
});
