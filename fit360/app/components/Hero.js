'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { IMAGES } from './images'
import { REGISTER_CLIENT_URL, REGISTER_TRAINER_URL } from './links'

const EASE = [0.22, 1, 0.36, 1]

const META = [
    { k: 'Members', v: '2,400+' },
    { k: 'Certified coaches', v: '350+' },
    { k: 'Goal completion', v: '94%' },
]

export default function Hero() {
    const reduce = useReducedMotion()

    const word = {
        hidden: reduce ? { opacity: 0 } : { opacity: 0, y: '110%' },
        show: (i) => ({
            opacity: 1,
            y: 0,
            transition: { duration: 1, ease: EASE, delay: 0.15 + i * 0.12 },
        }),
    }

    return (
        <section id="top" className="relative overflow-hidden bg-ivory pt-[76px]">
            <div className="container relative grid grid-cols-1 items-center gap-y-10 pb-[clamp(4rem,8vw,7rem)] pt-[clamp(3rem,7vw,6rem)] lg:grid-cols-12 lg:gap-x-8">
                {/* Left — editorial type block */}
                <div className="relative z-10 lg:col-span-7">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.8, ease: EASE }}
                        className="label label-line text-clay"
                    >
                        Premium fitness coaching
                    </motion.div>

                    <h1 className="mt-8 display text-primary text-[clamp(2.7rem,8vw,6.6rem)] leading-[0.94] tracking-[-0.03em]">
                        <span className="block overflow-hidden">
                            <motion.span custom={0} variants={word} initial="hidden" animate="show" className="block">
                                Your goals,
                            </motion.span>
                        </span>
                        <span className="block overflow-hidden">
                            <motion.span custom={1} variants={word} initial="hidden" animate="show" className="block">
                                matched with the
                            </motion.span>
                        </span>
                        <span className="block overflow-hidden">
                            <motion.span custom={2} variants={word} initial="hidden" animate="show" className="block italic text-clay">
                                right coach.
                            </motion.span>
                        </span>
                    </h1>

                    <motion.p
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.9, ease: EASE, delay: 0.6 }}
                        className="mt-8 max-w-[460px] text-[1.05rem] leading-relaxed text-ink/70"
                    >
                        Fit360 brings clients and trainers together on one premium platform —
                        personalised nutrition, structured training and real progress tracking, all
                        in sync.
                    </motion.p>

                    {/* The two required role links — the core action of the site */}
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.9, ease: EASE, delay: 0.72 }}
                        className="mt-10 flex flex-wrap items-center gap-4"
                    >
                        <a href={REGISTER_CLIENT_URL} className="btn btn-primary">
                            Register as a Client
                        </a>
                        <a href={REGISTER_TRAINER_URL} className="btn btn-outline-ink">
                            Register as a Trainer
                        </a>
                    </motion.div>

                    <motion.dl
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 1, ease: EASE, delay: 0.9 }}
                        className="mt-14 flex max-w-[460px] items-end gap-10 border-t border-ink/10 pt-6"
                    >
                        {META.map((m) => (
                            <div key={m.k}>
                                <dd className="display text-3xl text-primary">{m.v}</dd>
                                <dt className="mt-1 font-sans text-[0.7rem] uppercase tracking-editorial text-ink/50">
                                    {m.k}
                                </dt>
                            </div>
                        ))}
                    </motion.dl>
                </div>

                {/* Right — framed cinematic image with slow zoom */}
                <div className="relative lg:col-span-5">
                    <motion.div
                        initial={{ clipPath: reduce ? 'inset(0 0 0 0)' : 'inset(0 0 100% 0)' }}
                        animate={{ clipPath: 'inset(0 0 0% 0)' }}
                        transition={{ duration: 1.2, ease: EASE, delay: 0.35 }}
                        className="relative aspect-[3/4] overflow-hidden rounded-t-[180px] rounded-b-[24px] md:aspect-[4/5]"
                    >
                        <img
                            src={IMAGES.hero}
                            alt="An athlete training with focus and intent"
                            fetchPriority="high"
                            className={`h-full w-full object-cover ${reduce ? '' : 'animate-slow-zoom'}`}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-primary/25 via-transparent to-transparent" />
                    </motion.div>

                    {/* Floating metadata card */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.9, ease: EASE, delay: 1 }}
                        className="absolute -left-4 bottom-10 hidden rounded-2xl border border-ink/10 bg-ivory/90 px-6 py-4 backdrop-blur-md md:block lg:-left-16"
                    >
                        <p className="font-sans text-[0.7rem] uppercase tracking-editorial text-clay">One platform</p>
                        <p className="mt-1 font-serif text-lg text-primary">Coaches &amp; clients, in sync</p>
                    </motion.div>
                </div>
            </div>

            {/* Bottom rule with supporting line */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1, ease: EASE, delay: 1.1 }}
                className="border-y border-ink/10"
            >
                <div className="container flex items-center justify-between py-4 font-sans text-[0.7rem] uppercase tracking-editorial text-ink/50">
                    <span>Nutrition · Training · Progress</span>
                    <span className="hidden sm:inline">Scroll to explore</span>
                    <span>Est. 2014</span>
                </div>
            </motion.div>
        </section>
    )
}
