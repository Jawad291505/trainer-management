'use client'

import { IMAGES } from './images'
import { Reveal } from './motion'
import { REGISTER_CLIENT_URL, REGISTER_TRAINER_URL } from './links'

export default function FinalCTA() {
    return (
        <section id="book" className="relative isolate overflow-hidden bg-primary-deep text-ivory">
            {/* Cinematic background image, dimmed for legibility */}
            <div className="absolute inset-0 -z-10">
                <img
                    src={IMAGES.experienceSmall}
                    alt=""
                    aria-hidden="true"
                    loading="lazy"
                    className="h-full w-full object-cover opacity-30"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-primary-deep/80 via-primary/70 to-primary-deep/90" />
            </div>

            <div className="container flex flex-col items-center py-[clamp(6rem,14vw,12rem)] text-center">
                <Reveal className="label text-sand">Start today</Reveal>
                <Reveal as="h2" delay={0.06} className="mt-6 display text-[clamp(2.4rem,7vw,5.4rem)] leading-[0.98] text-ivory">
                    Ready to start your
                    <br />
                    <span className="italic text-sand">Fit360 journey?</span>
                </Reveal>
                <Reveal as="p" delay={0.14} className="mt-8 max-w-[460px] text-ivory/70">
                    Join as a client or a trainer today — it takes less than a minute to create your
                    account and get started.
                </Reveal>
                <Reveal delay={0.2} className="mt-10 flex flex-wrap items-center justify-center gap-4">
                    <a href={REGISTER_CLIENT_URL} className="btn btn-ivory">
                        Register as a Client
                    </a>
                    <a href={REGISTER_TRAINER_URL} className="btn btn-outline-ivory">
                        Register as a Trainer
                    </a>
                </Reveal>
            </div>
        </section>
    )
}
