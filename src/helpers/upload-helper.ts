// Helper to split a file into parts
const MIN_PART_SIZE = 5 * 1024 * 1024; // 5 MB

export function splitFile(file: File, requestedParts: number): Blob[] {
  if (file.size <= MIN_PART_SIZE) {
    return [file];
  }

  // Calculate the minimum size required for (requestedParts - 1) parts of 5MB each
  const minRequiredSize = (requestedParts - 1) * MIN_PART_SIZE;
  if (file.size < minRequiredSize) {
    // Not enough for requestedParts, fallback to max number of 5MB parts + remainder
    const fullParts = Math.floor(file.size / MIN_PART_SIZE);
    const parts: Blob[] = [];
    let start = 0;
    for (let i = 0; i < fullParts; i++) {
      parts.push(file.slice(start, start + MIN_PART_SIZE));
      start += MIN_PART_SIZE;
    }
    if (start < file.size) {
      parts.push(file.slice(start, file.size));
    }
    return parts;
  }

  // Otherwise, split into exactly requestedParts: first N-1 are 5MB, last is the remainder
  const parts: Blob[] = [];
  let start = 0;
  for (let i = 0; i < requestedParts - 1; i++) {
    parts.push(file.slice(start, start + MIN_PART_SIZE));
    start += MIN_PART_SIZE;
  }
  // Last part: whatever is left
  parts.push(file.slice(start, file.size));
  return parts;
}