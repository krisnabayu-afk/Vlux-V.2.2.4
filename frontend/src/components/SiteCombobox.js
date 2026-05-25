import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from './ui/button';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from './ui/command';
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';

const API = `${process.env.REACT_APP_API_URL}/api`;

const SiteCombobox = ({ sites: providedSites, value, onChange, fiberzoneOnly = false }) => {
    const [open, setOpen] = useState(false);
    const [internalSites, setInternalSites] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!providedSites) {
            const fetchSites = async () => {
                setLoading(true);
                try {
                    const params = fiberzoneOnly ? { fiberzone: 'true' } : {};
                    const response = await axios.get(`${API}/sites`, { params });
                    // Handle paginated response or flat list
                    const fetchedSites = response.data.items || response.data;
                    setInternalSites(fetchedSites);
                } catch (error) {
                    console.error("Failed to fetch sites for combobox", error);
                } finally {
                    setLoading(false);
                }
            };
            fetchSites();
        }
    }, [providedSites, fiberzoneOnly]);

    const activeSites = providedSites || internalSites;
    const safeSites = Array.isArray(activeSites) ? activeSites : [];
    const selectedSite = safeSites.find((site) => site.id === value);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between bg-background border-input text-foreground hover:bg-accent overflow-hidden"
                    data-testid="site-select-combobox"
                    disabled={loading}
                >
                    <span className="truncate mr-2">
                        {loading ? "Loading sites..." : (value ? selectedSite?.name : "Select site...")}
                    </span>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin opacity-50" /> : <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0 bg-popover border-border" align="start">
                <Command className="bg-popover border-border">
                    <CommandInput placeholder="Search site..." />
                    <CommandList>
                        <CommandEmpty className="text-muted-foreground">No site found.</CommandEmpty>
                        <CommandGroup>
                            {safeSites.map((site) => (
                                <CommandItem
                                    key={site.id}
                                    value={site.name}
                                    className="text-foreground data-[selected=true]:bg-accent cursor-pointer"
                                    onSelect={() => {
                                        onChange(site.id === value ? "" : site.id);
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
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
};

export default SiteCombobox;
