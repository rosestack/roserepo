class RoserepoError extends Error {
  formatted(stack?: boolean) {
    if ( stack ) {
      if ( this.stack ) {
        this.stack = this.stack?.replace(/^Error: /, "");
      } else {
        this.stack = this.message;
      }
    }

    return stack ? this.stack as string : this.message;
  }

  static from = (error: any) => {
    if ( error instanceof RoserepoError ) {
      return error;
    }

    const rosepackError = new RoserepoError(error);

    if ( error instanceof Error ) {
      rosepackError.message = error.message;
      rosepackError.stack = error.stack ?? error.message;
    }

    return rosepackError;
  };
}

export default RoserepoError;