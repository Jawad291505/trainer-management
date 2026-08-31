'use client'

import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { REGISTER_CLIENT_URL, REGISTER_TRAINER_URL } from './links'

const LINKS = [
    { href: '#intro', label: 'About', index: '01' },
    { href: '#register', label: 'Join', index: '02' },
    { href: '#how', label: 'How it works', index: '03' },
    { href: '#values', label: 'Values', index: '04' },
]

export default function Navbar() {
    const [scrolled, setScrolled] = useState(false)
    const [open, setOpen] = useState(false)

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 24)
        onScroll()
        window.addEventListener('scroll', onScroll, { passive: true })
        return () => window.removeEventListener('scroll', onScroll)
    }, [])

    useEffect(() => {
        document.body.style.overflow = open ? 'hidden' : ''
        return () => {
            document.body.style.overflow = ''
        }
    }, [open])

    return (
        <>
            <header
                className={`fixed inset-x-0 top-0 z-50 transition-colors duration-500 ease-editorial ${scrolled || open
                        ? 'border-b border-ink/10 bg-ivory/85 backdrop-blur-xl'
                        : 'border-b border-transparent bg-transparent'
                    }`}
            >
                <div className="container flex h-[76px] items-center justify-between">
                    <a
                        href="#top"
                        className="font-serif text-[1.6rem] font-normal tracking-[-0.02em] text-primary"
                        aria-label="Fit360 home"
                        onClick={() => setOpen(false)}
                    >
                        Fit<span className="italic text-clay">360</span>
                    </a>

                    <nav className="hidden items-center gap-10 lg:flex" aria-label="Primary">
                        {LINKS.map((l) => (
                            <a
                                key={l.href}
                                href={l.href}
                                className="link-underline text-ink/70 transition-colors duration-300 hover:text-primary"
                            >
                                {l.label}
                            </a>
                        ))}
                    </nav>

                    <div className="flex items-center gap-3">
                        <a href={REGISTER_TRAINER_URL} className="btn btn-outline-ink hidden md:inline-flex">
                            Trainer
                        </a>
                        <a href={REGISTER_CLIENT_URL} className="btn btn-primary hidden sm:inline-flex">
                            Register as a Client
                        </a>
                        <button
                            type="button"
                            aria-label={open ? 'Close menu' : 'Open menu'}
                            aria-expanded={open}
                            onClick={() => setOpen((v) => !v)}
                            className="relative z-50 flex h-11 w-11 flex-col items-center justify-center gap-[6px] lg:hidden"
                        >
                            <span
                                className={`h-px w-6 bg-primary transition-all duration-300 ease-editorial ${open ? 'translate-y-[3.5px] rotate-45' : ''
                                    }`}
                            />
                            <span
                                className={`h-px w-6 bg-primary transition-all duration-300 ease-editorial ${open ? '-translate-y-[3.5px] -rotate-45' : ''
                                    }`}
                            />
                        </button>
                    </div>
                </div>
            </header>

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                        className="fixed inset-0 z-40 bg-primary text-ivory lg:hidden"
                    >
                        <div className="container flex h-full flex-col justify-center pt-20">
                            <nav className="flex flex-col" aria-label="Mobile">
                                {LINKS.map((l, i) => (
                                    <motion.a
                                        key={l.href}
                                        href={l.href}
                                        onClick={() => setOpen(false)}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.12 + i * 0.07, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                                        className="group flex items-baseline gap-4 border-b border-white/12 py-6"
                                    >
                                        <span className="font-sans text-xs tracking-editorial text-ivory/40">{l.index}</span>
                                        <span className="display text-[clamp(2.2rem,10vw,3.4rem)] text-ivory">{l.label}</span>
                                    </motion.a>
                                ))}
                            </nav>
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                                className="mt-12 flex flex-col gap-3 sm:flex-row"
                            >
                                <a href={REGISTER_CLIENT_URL} onClick={() => setOpen(false)} className="btn btn-ivory">
                                    Register as a Client
                                </a>
                                <a href={REGISTER_TRAINER_URL} onClick={() => setOpen(false)} className="btn btn-outline-ivory">
                                    Register as a Trainer
                                </a>
                            </motion.div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    )
}
