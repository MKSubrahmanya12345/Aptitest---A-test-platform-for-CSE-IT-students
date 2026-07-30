// Helper function to stringify JSON values for database storage
export function stringifyJson(value: any): any {
  if (value === undefined) {
    return null;
  }
  return typeof value === "object" && value !== null
    ? JSON.stringify(value)
    : value;
}
