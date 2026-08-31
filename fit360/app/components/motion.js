'use client'

import { motion, useReducedMotion } from 'framer-motion'

const EASE = [0.22, 1, 0.36, 1]

/* Reveal wrapper — fades + rises into view once. Honors reduced-motion. */
export function Reveal({ as = 'div', children, delay = 0, y = 24, className, ...rest }) {
    const reduce = useReducedMotion()
    const MotionTag = motion[as] || motion.div
    return (
        <MotionTag
            className={className}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y }}
            whileInView={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-12% 0px' }}
            transition={{ duration: 0.9, ease: EASE, delay }}
            {...rest}
        >
            {children}
        </MotionTag>
    )
}

/* Staggered container + child for lists and grids. */
export function Stagger({ as = 'div', children, className, stagger = 0.09, ...rest }) {
    const MotionTag = motion[as] || motion.div
    return (
        <MotionTag
            className={className}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-10% 0px' }}
            variants={{ show: { transition: { staggerChildren: stagger } } }}
            {...rest}
        >
            {children}
        </MotionTag>
    )
}

export function StaggerItem({ as = 'div', children, className, y = 26, ...rest }) {
    const reduce = useReducedMotion()
    const MotionTag = motion[as] || motion.div
    return (
        <MotionTag
            className={className}
            variants={{
                hidden: reduce ? { opacity: 0 } : { opacity: 0, y },
                show: {
                    opacity: 1,
                    y: 0,
                    transition: { duration: 0.85, ease: EASE },
                },
            }}
            {...rest}
        >
            {children}
        </MotionTag>
    )
}

/* Masked image reveal — clip wipe + slow settle. Used for editorial imagery. */
export function ImageReveal({ children, className, delay = 0 }) {
    const reduce = useReducedMotion()
    if (reduce) return <div className={className}>{children}</div>
    return (
        <motion.div
            className={className}
            initial={{ clipPath: 'inset(0 0 100% 0)' }}
            whileInView={{ clipPath: 'inset(0 0 0% 0)' }}
            viewport={{ once: true, margin: '-8% 0px' }}
            transition={{ duration: 1.1, ease: EASE, delay }}
        >
            {children}
        </motion.div>
    )
}

export { motion, EASE }
