export function getpluginMetadataDir(optionPath?: string) {
  return optionPath ? `.${optionPath}` : '.nx-plugin-openapi';
}
