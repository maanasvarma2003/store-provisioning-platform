# Store Provisioning Platform

**Kubernetes-Native Multi-Tenant Ecommerce Provisioner**

A platform that automatically provisions isolated ecommerce stores using Kubernetes and Helm. The same deployment works locally and on a VPS (k3s) using configuration-only changes.

This project demonstrates Kubernetes orchestration, Helm-based deployments, multi-tenant isolation, provisioning workflows, and production-style reliability practices.

---

## Architecture Overview

The platform consists of four main components:

```
React Dashboard  →  API Service  →  Orchestrator  →  Kubernetes Cluster
```

### Components

| Component | Description |
|-----------|-------------|
| **Dashboard** | React + TypeScript UI. Create/delete stores, displays provisioning status, shows store URLs and timestamps. |
| **API Service** | Node.js + Express. Prisma + PostgreSQL. Store lifecycle management, audit logging, rate limiting. |
| **Orchestrator** | Kubernetes-native provisioning controller. Namespace-per-store isolation, Helm release management, idempotent reconciliation logic. |
| **Helm Charts** | WooCommerce store chart, platform chart, environment-specific values. |

---

## Repository Structure

```
store-provisioning-platform/
│
├── dashboard/
├── api/
├── orchestrator/
├── helm/
│   ├── platform/
│   ├── wordpress-store/
│   └── medusa-store/
│
├── infra/
├── scripts/
└── README.md
```

---

## Local Setup Instructions

### Requirements

Install:

- **Docker**
- **kubectl**
- **Helm**
- **Node.js 18+**
- **kind** (or k3d)
- **Make**

### Start Local Kubernetes

```bash
make local-up
```

This will:

- Create a kind cluster
- Install NGINX ingress
- Configure storage class
- Deploy platform services

### Install Dependencies

**Dashboard**

```bash
cd dashboard
npm install
```

**API**

```bash
cd api
npm install
```

**Orchestrator**

```bash
cd orchestrator
npm install
```

### Deploy Platform

```bash
make deploy
```

### Access Dashboard

**http://localhost:3000**

(Or use the nip.io URL if configured: `http://dashboard.127.0.0.1.nip.io`)

---

## Provisioning a Store

From the dashboard:

1. Click **Create Store**
2. Choose **WooCommerce**
3. Submit

The orchestrator will:

- Create namespace
- Apply quotas and limits
- Install Helm chart
- Create DB + WordPress
- Install WooCommerce
- Configure ingress
- Wait for readiness

**Store status transitions:** `PROVISIONING` → `READY`

---

## Store URL Pattern (Local)

```
store-{id}.127.0.0.1.nip.io
```

**Example:** `store-1.127.0.0.1.nip.io`

---

## Placing an Order (WooCommerce)

### Storefront

Open store URL.

### Steps

1. Add product to cart
2. Go to checkout
3. Select **Cash on Delivery**
4. Place order

### Verify Order

Visit: **`/wp-admin`**

Default credentials are stored in Kubernetes Secrets. The order should appear in WooCommerce admin.

---

## Deleting a Store

From dashboard:

1. Click **Delete Store**

Cleanup includes:

- Helm uninstall
- Namespace deletion
- PVC deletion
- Secrets removal
- Database update

---

## VPS / Production-Like Deployment (k3s)

This project uses the same Helm charts for local and production. **Only values files change.**

### Install k3s

```bash
curl -sfL https://get.k3s.io | sh -
```

### Deploy Platform

```bash
helm install platform ./helm/platform -f ./helm/values-prod.yaml
```

### Production Differences

Handled via Helm values:

| Component | Local | VPS |
|-----------|--------|------|
| Domain | nip.io | real domain |
| Storage | standard | local-path |
| Ingress | nginx | nginx |
| Secrets | local secrets | production secrets |
| TLS | disabled | optional cert-manager |

---

## Helm Charts

Charts included:

- **helm/platform**
- **helm/wordpress-store**
- **helm/medusa-store** (stub)

### Values Files

- `helm/values-local.yaml`
- `helm/values-prod.yaml`

These control:

- domains
- storage class
- resource limits
- ingress config
- secret references

---

## Multi-Tenant Isolation

Each store runs in its own namespace: **`store-{id}`**

Each namespace contains:

- Deployment(s)
- StatefulSet
- Services
- Secrets
- PVCs
- ResourceQuota
- LimitRange
- NetworkPolicy

This ensures strong isolation.

---

## Idempotency & Failure Handling

Provisioning uses a **reconciliation model**.

**If provisioning fails:**

- Status becomes `FAILED`
- Error reason is stored
- Operation is retry-safe

**If orchestrator restarts mid-provisioning:**

- Reconcile loop resumes
- Existing resources are reused
- No duplicate Helm releases created

---

## Cleanup Guarantees

Deleting a store triggers:

- Helm uninstall
- Namespace deletion
- PVC removal
- Secret cleanup
- DB status update

Operations are safe to retry.

---

## Security Model

Implemented:

- RBAC for orchestrator
- Namespace isolation
- Kubernetes Secrets
- No hardcoded credentials
- NetworkPolicy per store namespace
- Containers run as non-root where possible

---

## Abuse Prevention

Guardrails implemented:

- API rate limiting
- Store quota per user
- Provisioning timeout
- Audit logging

### Audit Log

Records:

- `create`
- `delete`
- `failure`
- `timestamp`
- `actor`

---

## Observability

Platform exposes:

- Provisioning logs
- Failure reasons
- Metrics endpoint
- Store activity history

---

## Scaling Strategy

**Horizontally scalable components:**

- API service
- Dashboard
- Orchestrator workers

Provisioning concurrency is controlled using a worker queue.

**Stateful workloads:**

- MySQL
- WordPress PVC

Handled via Kubernetes storage primitives.

---

## Upgrade & Rollback Strategy

Helm supports:

- `helm upgrade`
- `helm rollback`

Store versions can be upgraded safely using chart versioning.

---

## System Design & Tradeoffs

### Architecture Choice

A controller-style orchestrator was chosen to ensure Kubernetes-native provisioning and idempotent reconciliation.

Namespace-per-store isolation simplifies:

- security boundaries
- resource quotas
- cleanup logic

### Idempotency Strategy

Helm releases and namespaces are treated as source of truth. Provisioning checks existing resources before creating new ones.

### Failure Handling

Failures are persisted in the database with reasons. Operations can be retried without creating duplicate infrastructure.

### Production Changes

Production mainly changes:

- DNS configuration
- ingress hostnames
- storage class
- secret management
- TLS certificates

These are controlled entirely via Helm values.

---

## Future Improvements

- Medusa provisioning implementation
- cert-manager TLS automation
- domain linking UI
- Prometheus metrics
- provisioning job queue
- store templates
- autoscaling policies

---

**Built with Kubernetes, Helm, and React.**
