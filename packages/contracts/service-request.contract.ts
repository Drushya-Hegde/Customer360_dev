export type ServiceRequestStatus = 'open' | 'in_progress' | 'closed';

export interface ServiceRequestContract {
  id: string;
  customerId: string;
  type: string;
  status: ServiceRequestStatus;
}

export interface CreateServiceRequestRequest {
  type: string;
  description?: string;
}

export interface UpdateServiceRequestStatusRequest {
  status: ServiceRequestStatus;
}
