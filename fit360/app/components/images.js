// Curated editorial fitness / training / wellness imagery.
// Unsplash source URLs with auto format (webp/avif) + sizing for performance.
const u = (id, w = 1200) =>
    `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&q=80&w=${w}`

export const IMAGES = {
    // Hero — strong, cinematic training moment
    hero: u('1517836357463-d25dfeac3438', 1600),

    // "How it works" experience section
    experienceLarge: u('1534438327276-14e5300c3a48', 1400),
    experienceTall: u('1517838277536-f5f99be501cd', 900),
    experienceSmall: u('1571902943202-507ec2618e8f', 1200),

    // Gallery — varied crops of training / nutrition / progress
    gallery1: u('1526506118085-60ce8714f8c5', 900),
    gallery2: u('1490645935967-10de6ba17061', 800),
    gallery3: u('1550345332-09e3ac987658', 900),
    gallery4: u('1461938337379-4b537cd2c48c', 800),

    // Philosophy / atmosphere
    philosophy: u('1571019613454-1cb2f99b2d8b', 1200),

    // Testimonial portrait
    portrait: u('1594381898411-846e7d193883', 600),
}
