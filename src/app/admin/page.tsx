'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useTheme } from 'next-themes'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Moon, Sun, Plus, Trash2, Edit, Settings, Home, Code, BookOpen, Brain, TestTube, Palette } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

interface Tab {
  id: string
  name: string
  icon: string
  color: string
  description?: string
  position: number
}

const iconOptions = [
  { value: 'Code', label: 'Code', icon: <Code className="w-4 h-4" /> },
  { value: 'BookOpen', label: 'Book', icon: <BookOpen className="w-4 h-4" /> },
  { value: 'Brain', label: 'Brain', icon: <Brain className="w-4 h-4" /> },
  { value: 'TestTube', label: 'Test Tube', icon: <TestTube className="w-4 h-4" /> },
  { value: 'Settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
  { value: 'Palette', label: 'Palette', icon: <Palette className="w-4 h-4" /> },
]

const colorOptions = [
  { value: 'bg-red-500', label: 'Red', preview: 'bg-red-500' },
  { value: 'bg-blue-500', label: 'Blue', preview: 'bg-blue-500' },
  { value: 'bg-green-500', label: 'Green', preview: 'bg-green-500' },
  { value: 'bg-yellow-500', label: 'Yellow', preview: 'bg-yellow-500' },
  { value: 'bg-purple-500', label: 'Purple', preview: 'bg-purple-500' },
  { value: 'bg-pink-500', label: 'Pink', preview: 'bg-pink-500' },
  { value: 'bg-orange-500', label: 'Orange', preview: 'bg-orange-500' },
  { value: 'bg-cyan-500', label: 'Cyan', preview: 'bg-cyan-500' },
]

export default function AdminPage() {
  const [addTabOpen, setAddTabOpen] = useState(false)
  const [editingTab, setEditingTab] = useState<Tab | null>(null)
  const [newTab, setNewTab] = useState({ name: '', icon: 'Code', color: 'bg-blue-500', description: '' })
  const { theme, setTheme } = useTheme()
  const queryClient = useQueryClient()

  // Fetch tabs
  const { data: tabs = [], isLoading } = useQuery({
    queryKey: ['tabs'],
    queryFn: async () => {
      const response = await fetch('/api/tabs')
      if (!response.ok) throw new Error('Failed to fetch tabs')
      return response.json() as Promise<Tab[]>
    }
  })

  // Add tab mutation
  const addTabMutation = useMutation({
    mutationFn: async (tabData: { name: string; icon: string; color: string; description?: string }) => {
      const response = await fetch('/api/tabs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tabData)
      })
      if (!response.ok) throw new Error('Failed to create tab')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tabs'] })
      setNewTab({ name: '', icon: 'Code', color: 'bg-blue-500', description: '' })
      setAddTabOpen(false)
      toast.success('Tab added successfully!')
    },
    onError: () => {
      toast.error('Failed to add tab')
    }
  })

  // Update tab mutation
  const updateTabMutation = useMutation({
    mutationFn: async ({ id, tabData }: { id: string; tabData: Partial<Tab> }) => {
      const response = await fetch(`/api/tabs/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tabData)
      })
      if (!response.ok) throw new Error('Failed to update tab')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tabs'] })
      setEditingTab(null)
      setNewTab({ name: '', icon: 'Code', color: 'bg-blue-500', description: '' })
      toast.success('Tab updated successfully!')
    },
    onError: () => {
      toast.error('Failed to update tab')
    }
  })

  // Delete tab mutation
  const deleteTabMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/tabs/${id}`, {
        method: 'DELETE'
      })
      if (!response.ok) throw new Error('Failed to delete tab')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tabs'] })
      toast.success('Tab deleted successfully!')
    },
    onError: () => {
      toast.error('Failed to delete tab')
    }
  })

  const getIcon = (iconName: string) => {
    const icons: { [key: string]: React.ReactNode } = {
      Code: <Code className="w-4 h-4" />,
      BookOpen: <BookOpen className="w-4 h-4" />,
      Brain: <Brain className="w-4 h-4" />,
      TestTube: <TestTube className="w-4 h-4" />,
      Settings: <Settings className="w-4 h-4" />,
      Palette: <Palette className="w-4 h-4" />
    }
    return icons[iconName] || <Code className="w-4 h-4" />
  }

  const handleAddTab = () => {
    if (!newTab.name.trim()) return
    addTabMutation.mutate(newTab)
  }

  const handleUpdateTab = () => {
    if (!editingTab || !newTab.name.trim()) return
    updateTabMutation.mutate({ 
      id: editingTab.id, 
      tabData: { name: newTab.name, icon: newTab.icon, color: newTab.color, description: newTab.description }
    })
  }

  const handleDeleteTab = (tabId: string) => {
    if (confirm('Are you sure you want to delete this tab? This will also delete all videos in this tab.')) {
      deleteTabMutation.mutate(tabId)
    }
  }

  const openEditDialog = (tab: Tab) => {
    setEditingTab(tab)
    setNewTab({ 
      name: tab.name, 
      icon: tab.icon, 
      color: tab.color, 
      description: tab.description || '' 
    })
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Settings className="w-16 h-16 mx-auto mb-4 animate-pulse" />
          <p className="text-lg">Loading admin panel...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="outline" size="sm">
                  <Home className="w-4 h-4 mr-2" />
                  Back to Platform
                </Button>
              </Link>
              <div className="flex items-center gap-2">
                <Settings className="w-6 h-6" />
                <h1 className="text-2xl font-bold">Admin Panel</h1>
              </div>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="tabs" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="tabs">Manage Tabs</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="tabs" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold">Tab Management</h2>
                <p className="text-muted-foreground mt-2">
                  Add, edit, or remove learning tabs
                </p>
              </div>
              <Dialog open={addTabOpen} onOpenChange={setAddTabOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Tab
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Tab</DialogTitle>
                    <DialogDescription>
                      Create a new learning category tab
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="tabName">Tab Name</Label>
                      <Input
                        id="tabName"
                        placeholder="Enter tab name"
                        value={newTab.name}
                        onChange={(e) => setNewTab({ ...newTab, name: e.target.value })}
                        disabled={addTabMutation.isPending}
                      />
                    </div>
                    <div>
                      <Label htmlFor="tabDescription">Description (Optional)</Label>
                      <Input
                        id="tabDescription"
                        placeholder="Enter tab description"
                        value={newTab.description}
                        onChange={(e) => setNewTab({ ...newTab, description: e.target.value })}
                        disabled={addTabMutation.isPending}
                      />
                    </div>
                    <div>
                      <Label htmlFor="tabIcon">Icon</Label>
                      <Select 
                        value={newTab.icon} 
                        onValueChange={(value) => setNewTab({ ...newTab, icon: value })}
                        disabled={addTabMutation.isPending}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select an icon" />
                        </SelectTrigger>
                        <SelectContent>
                          {iconOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              <div className="flex items-center gap-2">
                                {option.icon}
                                <span>{option.label}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="tabColor">Color</Label>
                      <Select 
                        value={newTab.color} 
                        onValueChange={(value) => setNewTab({ ...newTab, color: value })}
                        disabled={addTabMutation.isPending}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a color" />
                        </SelectTrigger>
                        <SelectContent>
                          {colorOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              <div className="flex items-center gap-2">
                                <div className={`w-4 h-4 rounded-full ${option.preview}`} />
                                <span>{option.label}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button 
                      onClick={handleAddTab} 
                      className="w-full"
                      disabled={addTabMutation.isPending}
                    >
                      {addTabMutation.isPending ? 'Adding...' : 'Add Tab'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Tabs Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tabs.map((tab) => (
                <Card key={tab.id} className="group hover:shadow-lg transition-all duration-300">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded-full ${tab.color}`} />
                        <div className="flex items-center gap-2">
                          {getIcon(tab.icon)}
                          <CardTitle className="text-lg">{tab.name}</CardTitle>
                        </div>
                      </div>
                      <Badge variant="secondary">ID: {tab.id.slice(0, 8)}</Badge>
                    </div>
                    {tab.description && (
                      <CardDescription>{tab.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2">
                      <Dialog open={editingTab?.id === tab.id} onOpenChange={(open) => !open && setEditingTab(null)}>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1"
                            onClick={() => openEditDialog(tab)}
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Edit Tab</DialogTitle>
                            <DialogDescription>
                              Update the tab details
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="editTabName">Tab Name</Label>
                              <Input
                                id="editTabName"
                                placeholder="Enter tab name"
                                value={newTab.name}
                                onChange={(e) => setNewTab({ ...newTab, name: e.target.value })}
                                disabled={updateTabMutation.isPending}
                              />
                            </div>
                            <div>
                              <Label htmlFor="editTabDescription">Description (Optional)</Label>
                              <Input
                                id="editTabDescription"
                                placeholder="Enter tab description"
                                value={newTab.description}
                                onChange={(e) => setNewTab({ ...newTab, description: e.target.value })}
                                disabled={updateTabMutation.isPending}
                              />
                            </div>
                            <div>
                              <Label htmlFor="editTabIcon">Icon</Label>
                              <Select 
                                value={newTab.icon} 
                                onValueChange={(value) => setNewTab({ ...newTab, icon: value })}
                                disabled={updateTabMutation.isPending}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select an icon" />
                                </SelectTrigger>
                                <SelectContent>
                                  {iconOptions.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                      <div className="flex items-center gap-2">
                                        {option.icon}
                                        <span>{option.label}</span>
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label htmlFor="editTabColor">Color</Label>
                              <Select 
                                value={newTab.color} 
                                onValueChange={(value) => setNewTab({ ...newTab, color: value })}
                                disabled={updateTabMutation.isPending}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a color" />
                                </SelectTrigger>
                                <SelectContent>
                                  {colorOptions.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                      <div className="flex items-center gap-2">
                                        <div className={`w-4 h-4 rounded-full ${option.preview}`} />
                                        <span>{option.label}</span>
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <Button 
                              onClick={handleUpdateTab} 
                              className="w-full"
                              disabled={updateTabMutation.isPending}
                            >
                              {updateTabMutation.isPending ? 'Updating...' : 'Update Tab'}
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => handleDeleteTab(tab.id)}
                        disabled={deleteTabMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Platform Settings</CardTitle>
                <CardDescription>
                  Configure platform-wide settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Theme</h4>
                    <p className="text-sm text-muted-foreground">Set the default theme for the platform</p>
                  </div>
                  <Select value={theme} onValueChange={setTheme}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}