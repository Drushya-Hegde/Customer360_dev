# Cloud deployment

`kubernetes.yaml` is a provider-neutral starting point for AKS, EKS, or GKE. Before applying it:

1. Push `backend-nest` and `frontend-angular` images to the cloud registry and replace the placeholder image names.
2. Create a `customer360-secrets` Secret containing `DATABASE_URL`, `MONGODB_URL`, and `KEYCLOAK_ISSUER`.
3. Use managed PostgreSQL with pgvector and MongoDB Atlas or the cloud equivalent.
4. Run Keycloak with a production database and TLS; do not use the Compose development credentials.
5. Schedule Ollama on a GPU-capable node or replace it with an approved hosted model endpoint.
6. Deploy the OpenTelemetry Collector, Prometheus, and Grafana with persistent storage and network policies.

```powershell
kubectl apply -f deploy/kubernetes.yaml
kubectl -n customer360 get pods,svc
```
