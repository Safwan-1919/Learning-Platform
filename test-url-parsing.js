// Test functions for URL parsing
function extractVideoId(url) {
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

function extractPlaylistId(url) {
  const match = url.match(/[?&]list=([^&\n?#]+)/)
  return match ? match[1] : null
}

// Test the URL
const testUrl = 'https://www.youtube.com/watch?v=y3OOaXrFy-Q&list=PLQEaRBV9gAFu4ovJ41PywklqI7IyXwr01'
console.log('Testing URL:', testUrl)
console.log('Video ID:', extractVideoId(testUrl))
console.log('Playlist ID:', extractPlaylistId(testUrl))