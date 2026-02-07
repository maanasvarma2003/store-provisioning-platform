# System Architecture

## Overview

The Store Provisioning Platform is a Kubernetes-native system designed to automatically provision isolated ecommerce stores using a microservices architecture with Helm-based deployments.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          Internet                                │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    NGINX Ingress Controller                      │
│  ┌──────────────┬──────────────┬──────────────────────────────┐ │
│  │ dashboard.*  │   api.*      │   store-*.*                  │ │
│  └──────┬───────┴──────┬───────┴──────────┬───────────────────┘ │
└─────────┼──────────────┼──────────────────┼─────────────────────┘
          │              │                  │
          ▼              ▼                  ▼
    ┌─────────┐    ┌─────────┐      ┌──────────────┐
    │Dashboard│    │   API   │      │Store Namespace│
    │ (React) │    │(Express)│      │  (WordPress) │
    └─────────┘    └────┬────┘      └──────────────┘
                        │
                ┌───────┴────────┐
                │                │
                ▼                ▼
          ┌──────────┐    ┌───────────┐
          │PostgreSQL│    │   Redis   │
          │(Metadata)│    │(Job Queue)│
          └──────────┘    └─────┬─────┘
                                │
                                ▼
                        ┌──────────────┐
                        │ Orchestrator │
                        │ (Controller) │
                        └──────┬───────┘
                               │
                               ▼
                        ┌──────────────┐
                        │Kubernetes API│
                        └──────┬───────┘
                               │
                ┌──────────────┼──────────────┐
                │              │              │
                ▼              ▼              ▼
          [Namespace 1]  [Namespace 2]  [Namespace N]
```

## Component Architecture

### 1. Dashboard (Frontend)

**Technology:** React 18 + TypeScript + Vite + Tailwind CSS

**Responsibilities:**
- User interface for store management
- Real-time status updates
- Store creation and deletion
- Activity monitoring

**Key Features:**
- Auto-refresh every 5 seconds
- Responsive design
- Error handling
- Beautiful UI with Tailwind

**API Communication:**
- REST API calls via Axios
- React Query for caching and state management

### 2. API Service (Backend)

**Technology:** Node.js 20 + Express + TypeScript

**Responsibilities:**
- RESTful API endpoints
- Request validation
- Database operations
- Job queue management
- Rate limiting
- Metrics collection

**Architecture Pattern:** Layered Architecture
```
Routes → Middleware → Controllers → Services → Database
```

**Key Components:**
- **Routes:** HTTP endpoint definitions
- **Middleware:** Validation, error handling, rate limiting
- **Queue:** Bull job queue for async operations
- **Database:** Prisma ORM with PostgreSQL

**Scalability:**
- Stateless design
- Horizontal scaling ready
- Connection pooling

### 3. Orchestrator Service (Controller)

**Technology:** Node.js 20 + TypeScript + Kubernetes Client

**Responsibilities:**
- Process provisioning jobs
- Kubernetes resource management
- Helm chart deployment
- Status reconciliation
- Event tracking

**Architecture Pattern:** Worker Pattern
```
Job Queue → Worker → Provisioner → K8s API → Helm
```

**Key Components:**
- **Worker:** Bull job processor
- **K8s Client:** Kubernetes API wrapper
- **Helm Client:** Helm CLI wrapper
- **Provisioners:** Engine-specific logic (WooCommerce, Medusa)

**Provisioning State Machine:**
```
PENDING → PROVISIONING → READY
                ↓
              FAILED
```

**Idempotency:**
- All operations are idempotent
- Safe to retry on failure
- Reconciliation on restart

### 4. PostgreSQL Database

**Technology:** PostgreSQL 16

**Schema:**
```sql
Store {
  id: UUID (PK)
  name: String (unique)
  engine: Enum (WOOCOMMERCE, MEDUSA)
  status: Enum (PROVISIONING, READY, FAILED, DELETING)
  namespace: String (unique)
  url: String
  adminUrl: String
  adminUser: String
  adminPass: String (encrypted)
  failureReason: String
  createdAt: Timestamp
  updatedAt: Timestamp
}

ProvisioningEvent {
  id: UUID (PK)
  storeId: UUID (FK)
  event: String
  message: String
  metadata: JSON
  createdAt: Timestamp
}

User {
  id: UUID (PK)
  email: String (unique)
  name: String
  apiKey: String (unique)
  maxStores: Integer
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

**Indexes:**
- Store: status, createdAt
- ProvisioningEvent: storeId, createdAt
- User: email, apiKey

### 5. Redis (Job Queue)

**Technology:** Redis 7

**Usage:**
- Bull job queue backend
- Job persistence
- Job retry management
- Concurrency control

**Job Types:**
- `provision-store`: Create new store
- `delete-store`: Clean up store

**Configuration:**
- Max retries: 3
- Backoff: Exponential (2s, 4s, 8s)
- Concurrency: 5 workers

## Kubernetes Architecture

### Namespace Strategy

**Platform Namespace:** `store-platform`
- API deployment
- Orchestrator deployment
- Dashboard deployment
- PostgreSQL StatefulSet
- Redis StatefulSet

**Store Namespaces:** `store-{name}`
- WordPress deployment
- MySQL StatefulSet
- PersistentVolumeClaims
- Services
- Ingress

### Resource Quotas

Each store namespace has:
```yaml
ResourceQuota:
  requests.cpu: 2
  requests.memory: 4Gi
  requests.storage: 10Gi
  persistentvolumeclaims: 5
```

### Network Policies

Each store namespace has:
```yaml
NetworkPolicy:
  podSelector: {}
  policyTypes: [Ingress]
  ingress:
    - from:
      - namespaceSelector:
          matchLabels:
            app.kubernetes.io/name: ingress-nginx
    - from:
      - podSelector: {}
```

### RBAC

**Orchestrator ServiceAccount:**
```yaml
ClusterRole:
  - namespaces: [get, list, create, delete]
  - secrets, configmaps, services, pvcs: [get, list, create, update, delete]
  - pods, pods/log: [get, list, watch]
  - deployments, statefulsets: [get, list, create, update, delete]
  - ingresses, networkpolicies: [get, list, create, update, delete]
  - resourcequotas, limitranges: [get, list, create, update, delete]
  - jobs: [get, list, create, delete]
```

## Helm Architecture

### Chart Hierarchy

```
platform/
├── Chart.yaml
├── values.yaml
├── templates/
│   ├── configmap.yaml
│   ├── postgresql.yaml
│   ├── redis.yaml
│   ├── api.yaml
│   ├── orchestrator.yaml
│   ├── dashboard.yaml
│   └── ingress.yaml

wordpress-store/
├── Chart.yaml
├── values.yaml
├── templates/
│   ├── pvc.yaml
│   ├── mysql-statefulset.yaml
│   ├── mysql-service.yaml
│   ├── wordpress-deployment.yaml
│   ├── wordpress-service.yaml
│   ├── ingress.yaml
│   └── woocommerce-setup-job.yaml
```

### Values Hierarchy

```
values-local.yaml (development)
  ↓
values.yaml (defaults)
  ↓
values-prod.yaml (production)
```

## Data Flow

### Store Creation Flow

```
1. User clicks "Create Store" in Dashboard
   ↓
2. Dashboard sends POST /api/stores
   ↓
3. API validates request (Zod)
   ↓
4. API creates Store record (status: PROVISIONING)
   ↓
5. API creates ProvisioningEvent (STORE_CREATED)
   ↓
6. API enqueues job to Redis
   ↓
7. Orchestrator picks up job
   ↓
8. Orchestrator creates namespace
   ↓
9. Orchestrator applies ResourceQuota
   ↓
10. Orchestrator applies LimitRange
    ↓
11. Orchestrator applies NetworkPolicy
    ↓
12. Orchestrator creates Secrets
    ↓
13. Orchestrator installs Helm release
    ↓
14. Helm deploys MySQL StatefulSet
    ↓
15. Helm deploys WordPress Deployment
    ↓
16. Helm creates Services and Ingress
    ↓
17. Helm runs WooCommerce setup Job
    ↓
18. Orchestrator waits for pods ready
    ↓
19. Orchestrator updates Store (status: READY)
    ↓
20. Dashboard polls and shows READY status
    ↓
21. User accesses store URL
```

### Store Deletion Flow

```
1. User clicks "Delete" in Dashboard
   ↓
2. Dashboard sends DELETE /api/stores/:id
   ↓
3. API updates Store (status: DELETING)
   ↓
4. API enqueues delete job
   ↓
5. Orchestrator picks up job
   ↓
6. Orchestrator uninstalls Helm release
   ↓
7. Orchestrator deletes namespace
   ↓
8. Kubernetes deletes all resources
   ↓
9. Orchestrator deletes Store record
   ↓
10. Dashboard removes store from list
```

## Security Architecture

### Defense in Depth

**Layer 1: Network**
- NetworkPolicies deny all ingress by default
- Only allow traffic from ingress controller
- Pod-to-pod communication within namespace

**Layer 2: RBAC**
- Orchestrator has minimal permissions
- No cluster-admin access
- Scoped to necessary operations

**Layer 3: Resource Limits**
- ResourceQuota prevents resource exhaustion
- LimitRange sets default limits
- Prevents noisy neighbor issues

**Layer 4: Secrets**
- Auto-generated passwords
- Stored in Kubernetes Secrets
- Never in source code or logs

**Layer 5: Container**
- Non-root user execution
- Security contexts defined
- Read-only root filesystem

### Threat Model

**Threats Mitigated:**
- ✅ Resource exhaustion
- ✅ Lateral movement
- ✅ Privilege escalation
- ✅ Secret exposure
- ✅ DoS attacks (rate limiting)

**Threats Not Mitigated:**
- ❌ DDoS (requires external mitigation)
- ❌ Application vulnerabilities in WordPress
- ❌ Supply chain attacks

## Scalability Architecture

### Horizontal Scaling

**API Service:**
- Stateless design
- Can scale to N replicas
- Load balanced by Kubernetes Service

**Orchestrator Service:**
- Stateful (job processing)
- Can scale with leader election
- Concurrent job processing

**Database:**
- Single instance (can add read replicas)
- Connection pooling
- Prepared statements

### Vertical Scaling

**Resource Requests:**
- API: 100m CPU, 256Mi RAM
- Orchestrator: 100m CPU, 256Mi RAM
- PostgreSQL: 100m CPU, 256Mi RAM
- Redis: 50m CPU, 128Mi RAM

**Resource Limits:**
- API: 500m CPU, 512Mi RAM
- Orchestrator: 500m CPU, 512Mi RAM
- PostgreSQL: 500m CPU, 512Mi RAM
- Redis: 200m CPU, 256Mi RAM

### Concurrency

**Job Queue:**
- Default: 5 concurrent provisions
- Configurable via environment variable
- Prevents Kubernetes API overload

## Observability Architecture

### Logging

**Structured Logging:**
```json
{
  "timestamp": "2024-01-01T00:00:00Z",
  "level": "info",
  "service": "api",
  "message": "Store created",
  "storeId": "uuid",
  "storeName": "demo-store"
}
```

**Log Levels:**
- ERROR: Failures requiring attention
- WARN: Potential issues
- INFO: Normal operations
- DEBUG: Detailed debugging

### Metrics

**Prometheus Metrics:**
- `store_platform_api_http_requests_total`
- `store_platform_api_http_request_duration_seconds`
- `store_platform_api_active_connections`
- `nodejs_heap_size_total_bytes`
- `nodejs_heap_size_used_bytes`

### Health Checks

**Liveness Probes:**
- API: HTTP GET /health
- WordPress: HTTP GET /wp-admin/install.php

**Readiness Probes:**
- API: HTTP GET /health
- PostgreSQL: pg_isready
- Redis: redis-cli ping

## Deployment Architecture

### Local Development

**Environment:** kind cluster
**Domain:** 127.0.0.1.nip.io
**Storage:** standard StorageClass
**Ingress:** NGINX Ingress Controller

### Production (VPS)

**Environment:** k3s cluster
**Domain:** Custom domain
**Storage:** local-path StorageClass
**Ingress:** NGINX Ingress Controller
**TLS:** cert-manager (optional)

### CI/CD (Future)

```
Git Push → GitHub Actions → Build Images → Push to Registry → Deploy to K8s
```

## Disaster Recovery

### Backup Strategy

**Database:**
- Daily PostgreSQL dumps
- Stored in object storage
- 30-day retention

**Persistent Volumes:**
- Snapshot-based backups
- Per-store backups
- On-demand backups before deletion

### Recovery Procedures

**Platform Recovery:**
1. Restore PostgreSQL from backup
2. Redeploy platform Helm chart
3. Verify services are healthy

**Store Recovery:**
1. Restore PVC from snapshot
2. Reinstall Helm release
3. Verify store is accessible

## Performance Characteristics

**Provisioning Time:**
- WooCommerce: 2-5 minutes
- Medusa: TBD (Round 2)

**API Latency:**
- GET /stores: < 100ms
- POST /stores: < 200ms
- DELETE /stores: < 100ms

**Throughput:**
- Concurrent provisions: 5
- API requests: 100 req/s
- Database connections: 20

## Future Enhancements

### Round 2
- Medusa provisioning
- Multi-user support
- Custom domain linking
- TLS automation

### Round 3
- Auto-scaling
- Multi-region support
- Backup automation
- Monitoring dashboards

---

**Architecture Version:** 1.0.0
**Last Updated:** 2024
**Status:** Production-Ready
