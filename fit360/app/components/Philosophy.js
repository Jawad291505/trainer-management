'use client'

import { IMAGES } from './images'
import { Reveal, Stagger, StaggerItem, ImageReveal } from './motion'

const PRINCIPLES = [
    {
        n: '01',
        title: 'Goal-first coaching',
        desc: 'Every plan starts from what you actually want to achieve — not a generic template.',
    },
    {
        n: '02',
        title: 'Health over hype',
        desc: 'Sustainable habits and smart nutrition instead of crash diets and burnout.',
    },
    {
        n: '03',
        title: 'Real accountability',
        desc: 'A dedicated coach in your corner with direct chat and honest feedback.',
    },
    {
        n: '04',
        title: 'Progress you can see',
        desc: 'Clear tracking for training, nutrition and results — momentum you can measure.',
    },
]

export default function Philosophy() {
    return (
        <section id="values" className="section overflow-hidden bg-primary text-ivory">
            <div className="container">
                <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-8">
                    <div className="lg:col-span-5">
                        <div className="label label-line text-sand">What we stand for</div>
                        <Reveal as="h2" className="mt-6 display text-[clamp(2.2rem,5vw,4rem)] leading-[1.02] text-ivory">
                            Values that shape
                            <br />
                            <span className="italic text-sand">every plan.</span>
                        </Reveal>
                        <ImageReveal className="mt-10 hidden aspect-[5/4] overflow-hidden rounded-[24px] lg:block" delay={0.1}>
                            <img
                                src={IMAGES.philosophy}
                                alt="Focused strength training in a premium gym"
                                loading="lazy"
                                className="h-full w-full object-cover"
                            />
                        </ImageReveal>
                    </div>

                    <Stagger className="lg:col-span-6 lg:col-start-7">
                        {PRINCIPLES.map((p) => (
                            <StaggerItem
                                key={p.n}
                                className="grid grid-cols-[auto_1fr] gap-6 border-t border-white/12 py-8 first:border-t-0 first:pt-0"
                            >
                                <span className="font-sans text-xs tracking-editorial text-sand/70">{p.n}</span>
                                <div>
                                    <h3 className="display text-[clamp(1.4rem,3vw,2rem)] text-ivory">{p.title}</h3>
                                    <p className="mt-3 max-w-[420px] text-ivory/60">{p.desc}</p>
                                </div>
                            </StaggerItem>
                        ))}
                    </Stagger>
                </div>
            </div>
        </section>
    )
}
