export function notFound(req, res) {
  res.status(404).json({ ok: false, error: { message: 'Route not found', code: 'NOT_FOUND' } });
}

export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  const status = Number.isInteger(error.status) ? error.status : 500;
  if (status >= 500 && process.env.NODE_ENV !== 'test') req.log?.error?.({ err: error }, 'Request failed');
  return res.status(status).json({
    ok: false,
    error: { message: status >= 500 ? 'Something went wrong. Please try again.' : error.message, code: error.code ?? 'INTERNAL_ERROR' },
  });
}
