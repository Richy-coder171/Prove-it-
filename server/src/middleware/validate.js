export function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      return res.status(400).json({
        ok: false,
        error: { message: 'Invalid request', code: 'VALIDATION_ERROR', details: result.error.issues.map(({ path, message }) => ({ path: path.join('.'), message })) },
      });
    }
    req[source] = result.data;
    return next();
  };
}
