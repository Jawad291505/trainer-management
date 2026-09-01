'use client'

import { IMAGES } from './images'
import { Reveal, ImageReveal } from './motion'

const STEPS = [
    ['Create your account', 'Register as a client or a trainer in under a minute — no friction, no clutter.'],
    ['Get matched', 'Clients are paired with a certified coach based on goals, preferences and training style.'],
    ['Train with a plan', 'Follow personalised nutrition and workouts, track daily habits and watch progress build.'],
]

export default function Experience() {
    return (
        <section id="how" className="section overflow-hidden bg-ivory">
            <div className="container">
                <div className="grid grid-cols-1 gap-x-8 gap-y-12 lg:grid-cols-12">
                    {/* Large primary image */}
                    <div className="lg:col-span-7">
                        <ImageReveal className="relative aspect-[4/3] overflow-hidden rounded-[24px]">
                            <img
                                src={IMAGES.experienceLarge}
                                alt="A coach guiding a client through a training session"
                                loading="lazy"
                                className="h-full w-full object-cover transition-transform duration-[1.2s] ease-editorial hover:scale-[1.04]"
                            />
                        </ImageReveal>
                    </div>

                    {/* Text column */}
                    <div className="flex flex-col justify-center lg:col-span-5">
                        <div className="label label-line text-clay">How it works</div>
                        <Reveal as="h2" className="mt-6 display text-[clamp(2rem,4.5vw,3.4rem)] leading-[1.05] text-primary">
                            Three steps to your
                            <span className="italic text-clay"> best shape.</span>
                        </Reveal>
                        <Reveal as="p" delay={0.1} className="mt-6 max-w-[380px] text-ink/70">
                            From sign-up to real results, Fit360 keeps the path simple. No guesswork —
                            just a coach, a plan, and clear momentum you can measure.
                        </Reveal>
                        <Reveal delay={0.18} className="mt-10 flex flex-col gap-5">
                            {STEPS.map(([t, d], i) => (
                                <div key={t} className="flex items-baseline gap-5 border-t border-ink/10 pt-4">
                                    <span className="font-sans text-xs tracking-editorial text-clay">
                                        {String(i + 1).padStart(2, '0')}
                                    </span>
                                    <div>
                                        <h3 className="font-serif text-xl text-primary">{t}</h3>
                                        <p className="mt-1 text-sm text-ink/60">{d}</p>
                                    </div>
                                </div>
                            ))}
                        </Reveal>
                    </div>
                </div>

                {/* Overlapping lower row */}
                <div className="mt-8 grid grid-cols-1 gap-x-8 gap-y-8 sm:grid-cols-12 lg:-mt-24">
                    <div className="sm:col-span-5 lg:col-span-4 lg:col-start-8">
                        <ImageReveal className="relative aspect-[3/4] overflow-hidden rounded-[24px]" delay={0.1}>
                            <img
                                src={IMAGES.experienceTall}
                                alt="A client tracking progress after a workout"
                                loading="lazy"
                                className="h-full w-full object-cover transition-transform duration-[1.2s] ease-editorial hover:scale-[1.04]"
                            />
                        </ImageReveal>
                    </div>
                    <div className="flex items-end sm:col-span-7 lg:col-span-3 lg:col-start-1 lg:row-start-1">
                        <Reveal>
                            <p className="display text-[clamp(1.4rem,3vw,2rem)] leading-snug text-primary">
                                &ldquo;A coach in your corner changes
                                <span className="italic text-clay"> everything.</span>&rdquo;
                            </p>
                            <p className="mt-4 font-sans text-[0.72rem] uppercase tracking-editorial text-ink/50">
                                The Fit360 promise
                            </p>
                        </Reveal>
                    </div>
                </div>
            </div>
        </section>
    )
}
