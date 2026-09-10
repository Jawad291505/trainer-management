// Wrap an async route handler so rejected promises reach Express' error pipeline.
export const asyncHandler = (fn) => (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next)
