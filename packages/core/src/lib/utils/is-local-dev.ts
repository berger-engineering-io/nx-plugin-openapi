export function isLocalDev() {
  return (
    process.env['NODE_ENV'] === 'development' ||
    process.env['NX_PLUGIN_OPENAPI_DEV'] === 'true'
  );
}
