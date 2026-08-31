'use client'

import { IMAGES } from './images'
import { Reveal, ImageReveal } from './motion'

// Intentional, asymmetric composition — each item defines its own span + ratio.
const ITEMS = [
    { src: IMAGES.gallery1, alt: 'Strength training session', cls: 'sm:col-span-7 aspect-[16/10]' },
    { src: IMAGES.gallery2, alt: 'Fresh, balanced nutrition', cls: 'sm:col-span-5 aspect-[4/5]' },
    { src: IMAGES.gallery3, alt: 'Outdoor conditioning work', cls: 'sm:col-span-5 aspect-[4/5]' },
    { src: IMAGES.gallery4, alt: 'Tracking progress on the move', cls: 'sm:col-span-7 aspect-[16/10]' },
]

export default function Gallery() {
    return (
        <section id="gallery" className="section bg-ivory">
            <div className="container">
                <Reveal className="mb-12 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <div className="label label-line text-clay">Inside Fit360</div>
                        <h2 className="mt-6 display text-[clamp(2rem,4.5vw,3.4rem)] leading-[1.05] text-primary">
                            Training, made
                            <span className="italic text-clay"> intentional.</span>
                        </h2>
                    </div>
                    <p className="max-w-[340px] text-ink/60 sm:text-right">
                        Real coaching, real nutrition, real progress — the everyday moments that add
                        up to lasting change.
                    </p>
                </Reveal>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-12 md:gap-6">
                    {ITEMS.map((it, i) => (
                        <ImageReveal
                            key={it.src}
                            delay={(i % 2) * 0.1}
                            className={`group relative overflow-hidden rounded-[24px] ${it.cls}`}
                        >
                            <img
                                src={it.src}
                                alt={it.alt}
                                loading="lazy"
                                className="h-full w-full object-cover transition-transform duration-[1.2s] ease-editorial group-hover:scale-[1.05]"
                            />
                        </ImageReveal>
                    ))}
                </div>
            </div>
        </section>
    )
}
