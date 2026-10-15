import { useState } from 'react'
import { Image } from 'antd'
import { ReadOutlined, PlayCircleOutlined, DownOutlined } from '@ant-design/icons'
import YouTubePreview from './YouTubePreview'

// Small photo of a food, shown beside its name on a diet plan. Renders nothing
// when the food has no image (or it fails to load) — never an empty box.
export function FoodThumb({ src, size = 36, className = '' }) {
    const [failedSrc, setFailedSrc] = useState(null)
    if (!src || src === failedSrc) return null
    return (
        <img
            src={src}
            alt=""
            loading="lazy"
            onError={() => setFailedSrc(src)}
            className={`shrink-0 rounded-md object-cover ${className}`}
            style={{ width: size, height: size }}
        />
    )
}

// A meal's optional recipe details: its photo, then a collapsible section with
// the preparation steps and the YouTube walkthrough. Anything not provided is
// simply left out; a meal with none of them renders nothing.
export default function MealRecipe({ meal, className = '', defaultOpen = false }) {
    const [open, setOpen] = useState(defaultOpen)
    const [failedImage, setFailedImage] = useState(null)
    const image = meal?.image !== failedImage && meal?.image
    const recipe = meal?.recipe?.trim()
    const video = meal?.youtubeUrl
    if (!image && !recipe && !video) return null

    return (
        <div className={`flex items-start gap-3 ${className}`}>
            {image && (
                // Compact thumbnail — tap to view it full size.
                <Image
                    src={image}
                    alt={meal.name ? `${meal.name} photo` : 'Meal photo'}
                    width={88}
                    height={88}
                    loading="lazy"
                    onError={() => setFailedImage(meal.image)}
                    className="rounded-xl object-cover"
                    rootClassName="shrink-0 cursor-zoom-in overflow-hidden rounded-xl"
                    style={{ objectFit: 'cover' }}
                    preview={{ mask: null }}
                />
            )}
            {(recipe || video) && (
                <div className="min-w-0 flex-1 rounded-xl" style={{ background: 'var(--color-surface-secondary)' }}>
                    <button
                        type="button"
                        onClick={() => setOpen((o) => !o)}
                        aria-expanded={open}
                        className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-semibold text-text-primary"
                    >
                        <ReadOutlined style={{ color: 'var(--color-primary)' }} />
                        <span className="flex-1">{recipe ? 'Recipe' : 'Recipe video'}</span>
                        <DownOutlined className="text-xs text-text-muted transition-transform" style={{ transform: open ? 'rotate(180deg)' : 'none' }} />
                    </button>
                    {open && (
                        <div className="px-3 pb-3">
                            {recipe && <p className="mb-0 whitespace-pre-line break-words text-sm text-text-secondary">{recipe}</p>}
                            {video && (
                                <div className={`max-w-sm ${recipe ? 'mt-3' : ''}`}>
                                    <YouTubePreview url={video} title={meal.name ? `${meal.name} recipe` : 'Recipe video'} />
                                    <a
                                        href={video}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold"
                                        style={{ color: 'var(--color-danger)' }}
                                    >
                                        <PlayCircleOutlined /> Watch on YouTube
                                    </a>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
