export const isBlobAlreadyExistsError = (error: unknown): boolean => {
  if (!error) {
    return false
  }

  if (typeof error === 'string') {
    return error.includes('This blob already exists')
  }

  if (error instanceof Error) {
    return error.message.includes('This blob already exists')
  }

  if (typeof error === 'object') {
    const maybeMessage =
      typeof (error as { message?: unknown }).message === 'string'
        ? (error as { message: string }).message
        : undefined

    if (maybeMessage) {
      return maybeMessage.includes('This blob already exists')
    }
  }

  return false
}

