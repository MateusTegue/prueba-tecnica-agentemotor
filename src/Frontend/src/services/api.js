const API_BASE_URL = 'http://localhost:8000';

export const getPolicies = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.temporal_status) params.append('temporal_status', filters.temporal_status);
  if (filters.management_status) params.append('management_status', filters.management_status);
  if (filters.search) params.append('search', filters.search);
  if (filters.sort) params.append('sort', filters.sort);

  const response = await fetch(`${API_BASE_URL}/policies?${params.toString()}`);
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.detail || 'Error al obtener las pólizas');
  }
  return response.json();
};

export const getPolicyDetail = async (policyId) => {
  const response = await fetch(`${API_BASE_URL}/policies/${policyId}`);
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.detail || 'Error al obtener los detalles de la póliza');
  }
  return response.json();
};

export const createContactAttempt = async (policyId, outcome, notes) => {
  const response = await fetch(`${API_BASE_URL}/policies/${policyId}/contact-attempt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ outcome, notes }),
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.detail || 'Error al registrar el contacto');
  }
  return response.json();
};

export const renewPolicy = async (policyId, newExpirationDate) => {
  const response = await fetch(`${API_BASE_URL}/policies/${policyId}/renew`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ new_expiration_date: newExpirationDate }),
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.detail || 'Error al renovar la póliza');
  }
  return response.json();
};
