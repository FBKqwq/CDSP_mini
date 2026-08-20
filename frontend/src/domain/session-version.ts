export class SessionVersion {
  private current = 0

  get value(): number {
    return this.current
  }

  bump(): number {
    this.current += 1
    return this.current
  }

  capture(): number {
    return this.current
  }

  isCurrent(version: number): boolean {
    return version === this.current
  }
}

