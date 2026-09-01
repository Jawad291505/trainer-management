'use client'

import { IMAGES } from './images'
import { Reveal, ImageReveal } from './motion'

export default function Testimonial() {
    return (
        <section className="section bg-ivory">
            <div className="container">
                <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-16">
                    <div className="lg:col-span-4 lg:col-start-1">
                        <ImageReveal className="relative mx-auto aspect-[4/5] w-full max-w-[320px] overflow-hidden rounded-[24px]">
                            <img
                                src={IMAGES.portrait}
                                alt="Portrait of a Fit360 member"
                                loading="lazy"
                                className="h-full w-full object-cover"
                            />
                        </ImageReveal>
                    </div>

                    <div className="lg:col-span-8">
                        <Reveal className="label text-clay">Member story</Reveal>
                        <Reveal as="blockquote" delay={0.08}>
                            <p className="mt-6 display text-[clamp(1.6rem,3.6vw,2.9rem)] leading-[1.2] text-primary">
                                Being matched with the right coach was the turning point. For the first
                                time the plan actually
                                <span className="italic text-clay"> fit my life</span> — and I've kept
                                the results for over a year.
                            </p>
                        </Reveal>
                        <Reveal delay={0.16} className="mt-8 flex items-center gap-4">
                            <span className="h-px w-10 bg-clay" />
                            <div>
                                <p className="font-serif text-lg text-primary">Daniel Okafor</p>
                                <p className="font-sans text-[0.72rem] uppercase tracking-editorial text-ink/50">
                                    Fit360 client since 2023
                                </p>
                            </div>
                        </Reveal>
                    </div>
                </div>
            </div>
        </section>
    )
}
