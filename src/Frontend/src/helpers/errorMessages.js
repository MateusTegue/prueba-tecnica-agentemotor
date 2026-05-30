export const ERROR_MESSAGES = {
  POLICIES_FETCH: 'Error al obtener las pólizas',
  POLICY_DETAIL_FETCH: 'Error al obtener los detalles de la póliza',
  CONTACT_CREATE: 'Error al registrar el contacto',
  POLICY_RENEW: 'Error al renovar la póliza',
  SERVER_CONNECTION: 'Error al conectar con el servidor.',
};

export const getApiErrorMessage = async (response, fallbackMessage) => {
  try {
    const errorBody = await response.json();
    return errorBody.detail || fallbackMessage;
  } catch {
    return fallbackMessage;
  }
};
