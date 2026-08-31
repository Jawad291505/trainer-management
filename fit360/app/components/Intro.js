'use client'

import { motion, useReducedMotion } from 'framer-motion'

const EASE = [0.22, 1, 0.36, 1]

// Statement split into words so each fades up in sequence as it enters view.
const STATEMENT =
    'Fit360 is a premium coaching platform where driven clients and expert trainers meet — pairing personalised nutrition, structured training and honest progress tracking in one place.'

// Words to emphasise in the accent tone.
const ACCENT = new Set(['clients', 'trainers'])

export default function Intro() {
    const reduce = useReducedMotion()
    const words = STATEMENT.split(' ')

    return (
        <section id="intro" className="section bg-ivory">
            <div className="container">
                <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
                    <div className="lg:col-span-3">
                        <div className="label label-line text-clay">What is Fit360</div>
                        <p className="mt-6 max-w-[220px] text-sm leading-relaxed text-ink/60">
                            A single home for the whole fitness journey — for the people who coach and
                            the people who train.
                        </p>
                    </div>

                    <motion.p
                        initial="hidden"
                        whileInView="show"
                        viewport={{ once: true, margin: '-15% 0px' }}
                        variants={{ show: { transition: { staggerChildren: 0.035 } } }}
                        className="display text-[clamp(1.7rem,4.2vw,3.2rem)] leading-[1.2] tracking-[-0.02em] text-primary lg:col-span-9"
                    >
                        {words.map((w, i) => {
                            const clean = w.replace(/[^a-zA-Z]/g, '').toLowerCase()
                            const accent = ACCENT.has(clean)
                            return (
                                <span key={i} className="inline-block overflow-hidden align-bottom">
                                    <motion.span
                                        variants={{
                                            hidden: reduce ? { opacity: 0.15 } : { opacity: 0.12, y: '105%' },
                                            show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: EASE } },
                                        }}
                                        className="inline-block"
                                    >
                                        {accent ? <em className="text-clay">{w}</em> : w}
                                        &nbsp;
                                    </motion.span>
                                </span>
                            )
                        })}
                    </motion.p>
                </div>
            </div>
        </section>
    )
}
