import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import ZAI from 'z-ai-web-dev-sdk'

// Helper function to extract YouTube video ID
function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/watch\?.*v=([^&\n?#]+)/
  ]
  
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }
  
  return null
}

// Helper function to extract YouTube playlist ID
function extractPlaylistId(url: string): string | null {
  const match = url.match(/[?&]list=([^&\n?#]+)/)
  return match ? match[1] : null
}

// Helper function to get video info using oEmbed API
async function getVideoInfo(videoId: string) {
  try {
    const oembedResponse = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    })
    
    if (oembedResponse.ok) {
      const oembedData = await oembedResponse.json()
      return {
        title: oembedData.title,
        description: oembedData.author_name || 'YouTube video',
        thumbnailUrl: oembedData.thumbnail_url || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
        videoId: videoId,
        videoUrl: `https://www.youtube.com/watch?v=${videoId}`
      }
    }
  } catch (error) {
    console.error('Error fetching oEmbed data:', error)
  }

  return {
    title: `YouTube Video ${videoId}`,
    description: 'Video description not available',
    thumbnailUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
    videoId: videoId,
    videoUrl: `https://www.youtube.com/watch?v=${videoId}`
  }
}

// Helper function to robustly find a continuation token in a complex object
function findToken(obj: any): string | null {
  if (!obj || typeof obj !== 'object') return null;

  if (obj.continuationCommand) {
    return obj.continuationCommand?.token || null;
  }

  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const result = findToken(obj[key]);
      if (result) return result;
    }
  }
  return null;
}

// Function to get all videos from a playlist by simulating internal API calls
async function getPlaylistVideosFromPage(playlistId: string): Promise<string[]> {
  try {
    console.log('Fetching playlist with robust internal API method:', playlistId);
    const videoIds = new Set<string>();
    let continuationToken: string | null = null;
    let apiKey: string | null = null;
    const clientVersion = "2.20240726.00.00";

    const initialUrl = `https://www.youtube.com/playlist?list=${playlistId}`;
    const initialResponse = await fetch(initialUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });
    const html = await initialResponse.text();

    const apiKeyMatch = html.match(/"apiKey":"([^"]+)"/);
    if (apiKeyMatch && apiKeyMatch[1]) {
      apiKey = apiKeyMatch[1];
    } else {
      console.error('Could not find API Key.');
      return [];
    }

    const initialJsonMatch = html.match(/var ytInitialData = (.*?);<\/script>/);
    if (initialJsonMatch && initialJsonMatch[1]) {
        const initialData = JSON.parse(initialJsonMatch[1]);
        const contents = initialData?.contents?.twoColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents?.[0]?.playlistVideoListRenderer?.contents;
        if(contents) {
            for (const item of contents) {
                const videoId = item?.playlistVideoRenderer?.videoId;
                if (videoId) videoIds.add(videoId);
            }
        }
        continuationToken = findToken(initialData);
    }
    
    console.log(`Found ${videoIds.size} initial videos and ${continuationToken ? 'an initial' : 'no initial'} continuation token.`);
    
    let iteration = 1;
    while (continuationToken) {
      console.log(`[Iteration ${iteration}] Fetching next page...`);

      const apiUrl = `https://www.youtube.com/youtubei/v1/browse?key=${apiKey}`;
      const requestBody = {
        context: { client: { clientName: "WEB", clientVersion: clientVersion } },
        continuation: continuationToken,
      };

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        console.error(`API request failed with status: ${response.status}`);
        break;
      }
      
      const data = await response.json();
      const continuationItems = data?.onResponseReceivedActions?.[0]?.appendContinuationItemsAction?.continuationItems;
      if (!continuationItems) {
        console.log('No more continuation items found in API response.');
        break;
      }

      let newVideosFound = 0;
      for (const item of continuationItems) {
        const videoId = item?.playlistVideoRenderer?.videoId;
        if (videoId && !videoIds.has(videoId)) {
          videoIds.add(videoId);
          newVideosFound++;
        }
      }
      console.log(`[Iteration ${iteration}] Found ${newVideosFound} new videos. Total unique: ${videoIds.size}`);

      continuationToken = findToken(continuationItems);
      
      iteration++;
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    console.log(`Finished scraping. Total unique videos found: ${videoIds.size}`);
    return Array.from(videoIds);

  } catch (error) {
    console.error('A critical error occurred in getPlaylistVideosFromPage:', error);
    return [];
  }
}

// Main function to get playlist videos using all available methods
async function getPlaylistVideos(playlistId: string): Promise<any[]> {
  try {
    console.log('Starting comprehensive playlist extraction for:', playlistId);
    
    let videoIds: string[] = await getPlaylistVideosFromPage(playlistId);
    
    // Fallback to web search if the primary method fails
    if (videoIds.length === 0) {
      console.log('Primary scraping method failed, using targeted web search as fallback.');
      const zai = await ZAI.create()
      
      const searchQuery = `site:youtube.com inurl:watch?v= inurl:list=${playlistId}`;
      const searchResult = await zai.functions.invoke("web_search", {
        query: searchQuery,
        num: 250 // Get more results for the fallback
      })
      
      const foundIds = new Set<string>()
      for (const result of searchResult) {
        const videoId = extractVideoId(result.url)
        if (videoId && videoId.length === 11) {
          foundIds.add(videoId)
        }
      }
      videoIds = Array.from(foundIds);
    }
    
    console.log(`Final video IDs count: ${videoIds.length}`);
    
    if (videoIds.length === 0) {
      console.log('No videos found with any method');
      return [];
    }
    
    // Get detailed info for each video
    const videos = [];
    for (const [index, videoId] of videoIds.entries()) {
      try {
        const videoInfo = await getVideoInfo(videoId);
        videos.push({
          title: videoInfo.title,
          description: videoInfo.description,
          thumbnailUrl: videoInfo.thumbnailUrl,
          videoId: videoId,
          videoUrl: videoInfo.videoUrl,
          duration: 'Unknown'
        });
        
        if (index > 0 && index % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (error) {
        console.error(`Error getting info for ${videoId}:`, error);
        videos.push({
          title: `Video ${videoId}`,
          description: 'Processing...', 
          thumbnailUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
          videoId: videoId,
          videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
          duration: 'Unknown'
        });
      }
    }
    
    console.log(`Successfully processed ${videos.length} videos`);
    return videos;
  } catch (error) {
    console.error('Error in getPlaylistVideos:', error);
    return [];
  }
}

// Mock user ID - in real app this would come from authentication
const MOCK_USER_ID = 'user_1'

// Helper function to get website metadata
async function getWebsiteInfo(url: string) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch website: ${response.statusText}`);
    }
    const html = await response.text();

    const titleMatch = html.match(/<title>(.*?)<\/title>/);
    const title = titleMatch ? titleMatch[1] : 'Website Link';

    const descriptionMatch = html.match(/<meta\s+name="description"\s+content="([^"]*)"/);
    const description = descriptionMatch ? descriptionMatch[1] : url;

    const imageMatch = html.match(/<meta\s+property="og:image"\s+content="([^"]*)"/);
    let imageUrl = imageMatch ? imageMatch[1] : '/logo.svg'; // default image

    // Ensure image URL is absolute
    if (imageUrl && !imageUrl.startsWith('http')) {
      const urlObj = new URL(url);
      imageUrl = new URL(imageUrl, urlObj.origin).href;
    }

    return {
      title,
      description,
      thumbnailUrl: imageUrl,
      videoUrl: url,
    };
  } catch (error) {
    console.error('Error fetching website info:', error);
    // Return a fallback object
    return {
      title: 'Website Link',
      description: url,
      thumbnailUrl: '/logo.svg', // A default image
      videoUrl: url,
    };
  }
}

// Helper function to get Instagram metadata
async function getInstagramInfo(url: string) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch Instagram post: ${response.statusText}`);
    }
    const html = await response.text();

    const titleMatch = html.match(/<title>(.*?)<\/title>/);
    let title = titleMatch ? titleMatch[1] : 'Instagram Post';
    // Clean up Instagram titles
    title = title.replace(/on Instagram: ".*"/, '').trim();


    const imageMatch = html.match(/<meta\s+property="og:image"\s+content="([^"]*)"/);
    const imageUrl = imageMatch ? imageMatch[1] : '/logo.svg';

    return {
      title,
      description: 'Instagram Post',
      thumbnailUrl: imageUrl,
      videoUrl: url,
    };
  } catch (error) {
    console.error('Error fetching Instagram info:', error);
    return {
      title: 'Instagram Post',
      description: url,
      thumbnailUrl: '/logo.svg',
      videoUrl: url,
    };
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tabId = searchParams.get('tabId')

    if (!tabId) {
      return NextResponse.json({ error: 'Tab ID is required' }, { status: 400 })
    }

    // 1. Fetch videos for the tab
    const videos = await db.video.findMany({
      where: { tabId },
      orderBy: { position: 'asc' }
    })
    
    if (videos.length === 0) {
      return NextResponse.json([])
    }

    // 2. Get video IDs
    const videoIds = videos.map(v => v.id)

    // 3. Fetch user progress for these videos
    const userProgress = await db.videoProgress.findMany({
      where: { 
        userId: MOCK_USER_ID, 
        videoId: { in: videoIds } 
      },
    })

    // 4. Create a set of completed video IDs for efficient lookup
    const completedVideoIds = new Set(
      userProgress.filter(p => p.isCompleted).map(p => p.videoId)
    )

    // 5. Merge the progress into the video objects
    const videosWithProgress = videos.map(video => ({
      ...video,
      isCompleted: completedVideoIds.has(video.id)
    }))

    return NextResponse.json(videosWithProgress)
  } catch (error) {
    console.error('Error fetching videos:', error)
    return NextResponse.json({ error: 'Failed to fetch videos' }, { status: 500 })
  }
}


export async function POST(request: NextRequest) {
  try {
    const { videoUrl, tabId } = await request.json()

    if (!videoUrl || !tabId) {
      return NextResponse.json({ error: 'Video URL and Tab ID are required' }, { status: 400 })
    }

    console.log('Processing video URL:', videoUrl)

    const videoId = extractVideoId(videoUrl)
    const playlistId = extractPlaylistId(videoUrl)

    console.log('Extracted IDs - Video:', videoId, 'Playlist:', playlistId)

    if (videoUrl.includes('instagram.com')) {
        console.log('Fetching Instagram info for:', videoUrl);
        const instaInfo = await getInstagramInfo(videoUrl);

        const lastVideo = await db.video.findFirst({
            where: { tabId },
            orderBy: { position: 'desc' }
        });
        const newPosition = lastVideo ? lastVideo.position + 1 : 0;

        const video = await db.video.create({
            data: {
                title: instaInfo.title,
                description: instaInfo.description,
                thumbnailUrl: instaInfo.thumbnailUrl,
                videoUrl: instaInfo.videoUrl,
                type: 'INSTAGRAM',
                position: newPosition,
                tabId
            }
        });
        return NextResponse.json(video, { status: 201 });
    }
    
    // Handle generic website link if it's not a YouTube URL
    if (!videoId && !playlistId) {
        console.log('Fetching website info for:', videoUrl);
        const websiteInfo = await getWebsiteInfo(videoUrl);

        const lastVideo = await db.video.findFirst({
            where: { tabId },
            orderBy: { position: 'desc' }
        });
        const newPosition = lastVideo ? lastVideo.position + 1 : 0;

        const video = await db.video.create({
            data: {
                title: websiteInfo.title,
                description: websiteInfo.description,
                thumbnailUrl: websiteInfo.thumbnailUrl,
                videoUrl: websiteInfo.videoUrl,
                type: 'WEBSITE', // Set the type
                position: newPosition,
                tabId
            }
        });
        return NextResponse.json(video, { status: 201 });
    }

    if (playlistId) {
      // Handle playlist
      console.log('Fetching ALL playlist videos for:', playlistId)
      const playlistVideos = await getPlaylistVideos(playlistId)
      
      if (playlistVideos.length === 0) {
        return NextResponse.json({ 
          error: 'No videos found in playlist. The playlist might be private, restricted, or the ID might be incorrect.' 
        }, { status: 404 })
      }
      
      console.log('Found playlist videos:', playlistVideos.length)
      
      // Get the highest position to append at the end
      const lastVideo = await db.video.findFirst({
        where: { tabId },
        orderBy: { position: 'desc' }
      })
      
      let startPosition = lastVideo ? lastVideo.position + 1 : 0

      const createdVideos = []
      
      const batchSize = 10
      for (let i = 0; i < playlistVideos.length; i += batchSize) {
        const batch = playlistVideos.slice(i, i + batchSize)
        
        for (const [index, videoData] of batch.entries()) {
          try {
            const video = await db.video.create({
              data: {
                title: videoData.title,
                description: videoData.description,
                thumbnailUrl: videoData.thumbnailUrl,
                videoUrl: videoData.videoUrl,
                videoId: videoData.videoId,
                duration: videoData.duration,
                isPlaylist: true,
                playlistId,
                position: startPosition + i + index,
                tabId,
                type: 'YOUTUBE'
              }
            })
            createdVideos.push(video)
          } catch (error) {
            console.error(`Error adding video ${videoData.videoId}:`, error)
          }
        }
        if (i + batchSize < playlistVideos.length) {
          await new Promise(resolve => setTimeout(resolve, 50))
        }
      }

      return NextResponse.json({ 
        message: `Successfully added ${createdVideos.length} videos from playlist!`,
        videos: createdVideos 
      }, { status: 201 })
    } else {
      // Handle single video
      console.log('Fetching single video info for:', videoId)
      const videoInfo = await getVideoInfo(videoId!)
      
      const lastVideo = await db.video.findFirst({
        where: { tabId },
        orderBy: { position: 'desc' }
      })
      
      const newPosition = lastVideo ? lastVideo.position + 1 : 0

      const video = await db.video.create({
        data: {
          title: videoInfo.title,
          description: videoInfo.description,
          thumbnailUrl: videoInfo.thumbnailUrl,
          videoUrl: videoInfo.videoUrl,
          videoId: videoInfo.videoId,
          isPlaylist: false,
          position: newPosition,
          tabId,
          type: 'YOUTUBE'
        }
      })

      return NextResponse.json(video, { status: 201 })
    }
  } catch (error) {
    console.error('Error adding video:', error)
    return NextResponse.json({ error: 'Failed to add video' }, { status: 500 })
  }
}
