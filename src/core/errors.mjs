export class MemoryConflictError extends Error {
  constructor(message, latest) {
    super(message);
    this.name = "MemoryConflictError";
    this.latest = latest;
  }
}
