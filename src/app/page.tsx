'use client'

import { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { useTheme } from 'next-themes'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Moon, Sun, Plus, Check, Play, Youtube, BookOpen, Code, Brain, TestTube, Settings, Globe, Instagram } from 'lucide-react'
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

interface Video {
  id: string
  title: string
  description?: string
  thumbnailUrl: string
  videoUrl: string
  videoId: string
  duration?: string
  isPlaylist: boolean
  playlistId?: string
  position: number
  tabId: string
  isCompleted?: boolean
  type?: 'YOUTUBE' | 'WEBSITE' | 'INSTAGRAM'
}

// Mock user ID - in real app this would come from authentication
const MOCK_USER_ID = 'user_1'

export default function Home() {
  const [activeTab, setActiveTab] = useState('')
  const [addLinkOpen, setAddLinkOpen] = useState(false)
  const [newLink, setNewLink] = useState('')
  const { theme, setTheme } = useTheme()
  const queryClient = useQueryClient()

  // Fetch tabs
  const { data: tabs = [], isLoading: tabsLoading } = useQuery({
    queryKey: ['tabs'],
    queryFn: async () => {
      const response = await fetch('/api/tabs')
      if (!response.ok) throw new Error('Failed to fetch tabs')
      return response.json() as Promise<Tab[]>
    }
  })

  // Fetch videos for active tab
  const { data: videos = [], isLoading: videosLoading } = useQuery({
    queryKey: ['videos', activeTab],
    queryFn: async () => {
      if (!activeTab) return []
      const response = await fetch(`/api/videos?tabId=${activeTab}`)
      if (!response.ok) throw new Error('Failed to fetch videos')
      return response.json() as Promise<Video[]>
    },
    enabled: !!activeTab
  })

  // Add video mutation
  const addVideoMutation = useMutation({
    mutationFn: async ({ videoUrl, tabId }: { videoUrl: string; tabId: string }) => {
      const response = await fetch('/api/videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoUrl, tabId })
      })
      if (!response.ok) throw new Error('Failed to add video')
      return response.json()
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['videos', activeTab] })
      setNewLink('')
      setAddLinkOpen(false)
      if (data.videos) {
        toast.success(`Added ${data.videos.length} videos from playlist!`)
      } else {
        toast.success('Video added successfully!')
      }
    },
    onError: () => {
      toast.error('Failed to add video')
    }
  })

  // Toggle video completion mutation
  const toggleCompleteMutation = useMutation({
    mutationFn: async ({ videoId, isCompleted }: { videoId: string; isCompleted: boolean }) => {
      const response = await fetch(`/api/videos/${videoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: MOCK_USER_ID, isCompleted })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update progress')
      }
      
      return response.json()
    },
    onMutate: async ({ videoId, isCompleted }) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: ['videos', activeTab] })

      // Snapshot the previous value
      const previousVideos = queryClient.getQueryData(['videos', activeTab])

      // Optimistically update to the new value
      queryClient.setQueryData(['videos', activeTab], (oldData: Video[] | undefined) =>
        oldData?.map(v =>
          v.id === videoId ? { ...v, isCompleted } : v
        ) || []
      )

      // Return a context object with the snapshotted value
      return { previousVideos }
    },
    onError: (err, variables, context) => {
      // Rollback to the previous value on error
      if (context?.previousVideos) {
        queryClient.setQueryData(['videos', activeTab], context.previousVideos)
      }
      toast.error(err.message || 'Failed to update progress')
    },
    onSuccess: () => {
      toast.success('Progress updated!')
    },
    onSettled: () => {
      // Always refetch after error or success to ensure server state
      queryClient.invalidateQueries({ queryKey: ['videos', activeTab] })
    }
  })

  useEffect(() => {
    if (tabs.length > 0 && !activeTab) {
      setActiveTab(tabs[0].id)
    }
  }, [tabs, activeTab])

  const getIcon = (iconName: string) => {
    const icons: { [key: string]: React.ReactNode } = {
      Code: <Code className="w-4 h-4" />,
      BookOpen: <BookOpen className="w-4 h-4" />,
      Brain: <Brain className="w-4 h-4" />,
      TestTube: <TestTube className="w-4 h-4" />,
      Settings: <Settings className="w-4 h-4" />
    }
    return icons[iconName] || <Code className="w-4 h-4" />
  }

  const handleAddLink = () => {
    if (!newLink.trim() || !activeTab) return
    addVideoMutation.mutate({ videoUrl: newLink, tabId: activeTab })
  }

  const toggleVideoComplete = (videoId: string, currentCompleted: boolean) => {
    toggleCompleteMutation.mutate({ 
      videoId, 
      isCompleted: !currentCompleted 
    })
  }

  const completedCount = videos.filter(v => v.isCompleted).length

  if (tabsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Youtube className="w-16 h-16 mx-auto mb-4 animate-pulse" />
          <p className="text-lg">Loading your learning platform...</p>
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
            <div className="flex items-center gap-2">
              <Youtube className="w-8 h-8 text-red-500" />
              <h1 className="text-2xl font-bold">Learning Platform</h1>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/admin">
                <Button variant="outline" size="sm">
                  <Settings className="w-4 h-4 mr-2" />
                  Admin
                </Button>
              </Link>
              <Dialog open={addLinkOpen} onOpenChange={setAddLinkOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Link
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Link</DialogTitle>
                    <DialogDescription>
                      Add a YouTube, Instagram, or website link to the current tab.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="link">URL</Label>
                      <Input
                        id="link"
                        placeholder="https://..."
                        value={newLink}
                        onChange={(e) => setNewLink(e.target.value)}
                        disabled={addVideoMutation.isPending}
                      />
                    </div>
                    <Button 
                      onClick={handleAddLink} 
                      className="w-full"
                      disabled={addVideoMutation.isPending}
                    >
                      {addVideoMutation.isPending ? 'Adding...' : 'Add Video'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              >
                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {tabs.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Settings className="w-16 h-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No tabs configured</h3>
              <p className="text-muted-foreground mb-4">Start by creating your first learning tab</p>
              <Link href="/admin">
                <Button>
                  <Settings className="w-4 h-4 mr-2" />
                  Go to Admin Panel
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 mb-8">
              {tabs.map((tab) => (
                <TabsTrigger 
                  key={tab.id} 
                  value={tab.id}
                  className="flex items-center gap-2 data-[state=active]:shadow-lg"
                >
                  <div className={`w-2 h-2 rounded-full ${tab.color}`} />
                  {getIcon(tab.icon)}
                  <span className="hidden sm:inline">{tab.name}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            {tabs.map((tab) => (
              <TabsContent key={tab.id} value={tab.id} className="mt-0">
                <div className="space-y-6">
                  {/* Tab Header */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-3xl font-bold flex items-center gap-3">
                        <div className={`w-4 h-4 rounded-full ${tab.color}`} />
                        {tab.name}
                      </h2>
                      <p className="text-muted-foreground mt-2">
                        {tab.description || `Track your learning progress in ${tab.name}`}
                      </p>
                    </div>
                    <Badge variant="secondary">
                      {completedCount} / {videos.length} completed
                    </Badge>
                  </div>

                  {/* Videos Grid */}
                  {videosLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {[...Array(6)].map((_, i) => (
                        <Card key={i} className="animate-pulse">
                          <div className="aspect-video bg-muted rounded-t-lg" />
                          <CardHeader>
                            <div className="h-4 bg-muted rounded w-3/4" />
                            <div className="h-3 bg-muted rounded w-full" />
                          </CardHeader>
                        </Card>
                      ))}
                    </div>
                  ) : videos.length === 0 ? (
                    <Card className="border-dashed">
                      <CardContent className="flex flex-col items-center justify-center py-16">
                        <Youtube className="w-16 h-16 text-muted-foreground mb-4" />
                        <h3 className="text-xl font-semibold mb-2">No videos yet</h3>
                        <p className="text-muted-foreground mb-4">Start by adding your first YouTube video</p>
                        <Button onClick={() => setAddLinkOpen(true)}>
                          <Plus className="w-4 h-4 mr-2" />
                          Add Video
                        </Button>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {videos.map((video) => (
                        <Card 
                        key={video.id} 
                        className="hover:shadow-lg transition-all duration-300 relative"
                      >
                        {video.isCompleted && (
                          <div className="absolute top-2 right-2 z-10">
                            <Badge className="bg-green-500 text-white">
                              <Check className="w-3 h-3 mr-1" />
                              Completed
                            </Badge>
                          </div>
                        )}
                        <div className={`${video.isCompleted ? 'opacity-60 blur-sm' : ''}`}>
                          <div className="relative">
                            <div className="aspect-video bg-muted rounded-t-lg overflow-hidden">
                              <img
                                src={video.thumbnailUrl}
                                alt={video.title}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            {video.duration && (
                              <div className="absolute bottom-2 right-2">
                                <Badge variant="secondary">{video.duration}</Badge>
                              </div>
                            )}
                          </div>
                          <CardHeader>
                            <CardTitle className="line-clamp-2 text-lg flex items-center gap-2">
                              {video.type === 'WEBSITE' ? <Globe className="w-5 h-5" /> : video.type === 'INSTAGRAM' ? <Instagram className="w-5 h-5 text-pink-500" /> : <Youtube className="w-5 h-5 text-red-500" />}
                              {video.title}
                            </CardTitle>
                            <CardDescription className="line-clamp-3">
                              {video.description}
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1"
                                onClick={() => window.open(video.videoUrl, '_blank')}
                              >
                                <Play className="w-4 h-4 mr-2" />
                                Watch
                              </Button>
                              <Button
                                variant={video.isCompleted ? "secondary" : "default"}
                                size="sm"
                                onClick={() => toggleVideoComplete(video.id, video.isCompleted || false)}
                                disabled={toggleCompleteMutation.isPending}
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </div>
                      </Card>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        )}
      </main>
    </div>
  )
}