import { useEffect, useState } from 'react'
import { PlayCircleFilled } from '@ant-design/icons'
import { parseYouTubeId, youtubeThumbnail, youtubeEmbedUrl } from '../../utils/youtube'

// Embedded YouTube preview. Shows the video's thumbnail and only loads the
// player once it is tapped, so a list of techniques doesn't pull in a player
// per row. Renders nothing for a link that isn't a YouTube video — callers keep
// their plain "open link" fallback next to it.
export default function YouTubePreview({ url, title = 'Technique video', className = '' }) {
    const id = parseYouTubeId(url)
    const [playing, setPlaying] = useState(false)
    useEffect(() => { setPlaying(false) }, [id])

    if (!id) return null

    return (
        <div className={`relative aspect-video w-full overflow-hidden rounded-xl ${className}`} style={{ background: '#000' }}>
            {playing ? (
                <iframe
                    src={youtubeEmbedUrl(id)}
                    title={title}
                    className="absolute inset-0 h-full w-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                />
            ) : (
                <button
                    type="button"
                    onClick={() => setPlaying(true)}
                    aria-label={`Play video: ${title}`}
                    className="absolute inset-0 flex h-full w-full cursor-pointer items-center justify-center border-0 p-0"
                    style={{ background: 'transparent' }}
                >
                    <img src={youtubeThumbnail(id)} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
                    <span className="absolute inset-0" style={{ background: 'rgba(0, 0, 0, 0.25)' }} />
                    <PlayCircleFilled className="relative" style={{ fontSize: 52, color: '#fff' }} />
                </button>
            )}
        </div>
    )
}
