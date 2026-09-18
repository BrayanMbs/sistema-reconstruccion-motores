export const getErrorMessage = (error: unknown) => error instanceof Error ? error.message : "Ocurrió un error inesperado";
