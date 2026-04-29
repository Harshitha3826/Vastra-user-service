# Vastra User Service

## Overview
The **User Service** is a Node.js/Express microservice responsible for user registration, authentication, and JWT-based authorization in the VastraCo e-commerce platform.

| Property | Value |
|----------|-------|
| **Runtime** | Node.js 20 (Alpine) |
| **Framework** | Express.js |
| **Port** | 3001 |
| **Database** | PostgreSQL (`users_db` / `users_db_main`) |
| **Auth** | JWT + Argon2 password hashing |
| **Docker Image** | `harshithasrinivas03/user-service` |

---

## Repository Structure
```
Vastra-user-service/
├── .github/workflows/
│   └── ci.yml                  # CI trigger — calls reusable template
├── src/
│   ├── server.js               # Express app entry point
│   ├── db/index.js             # PostgreSQL connection pool + schema init
│   ├── controllers/
│   │   └── authController.js   # Register, login, profile handlers
│   ├── middleware/
│   │   └── authMiddleware.js   # JWT verification middleware
│   ├── models/
│   │   └── userModel.js        # DB queries (CRUD)
│   ├── routes/
│   │   └── authRoutes.js       # /api/auth/* route definitions
│   └── __tests__/              # Unit tests (Jest)
├── Dockerfile                  # Multi-stage Docker build
├── package.json
└── README.md
```

---

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | No | Register a new user |
| POST | `/api/auth/login` | No | Login and receive JWT |
| GET | `/api/auth/profile` | Bearer JWT | Get current user profile |
| GET | `/health` | No | Liveness probe |
| GET | `/ready` | No | Readiness probe (checks DB connection) |

---

## Environment Variables

| Variable | Source | Description |
|----------|--------|-------------|
| `PORT` | Helm Deployment | Service port (3001) |
| `NODE_ENV` | ConfigMap | Environment (`dev` / `main`) |
| `USER_DB_HOST` | ConfigMap | PostgreSQL host (K8s DNS) |
| `USER_DB_PORT` | ConfigMap | PostgreSQL port (5432) |
| `USER_DB_NAME` | ConfigMap | Database name |
| `USER_DB_USER` | SealedSecret (`users-db-secret`) | DB username |
| `USER_DB_PASSWORD` | SealedSecret (`users-db-secret`) | DB password |
| `JWT_SECRET` | SealedSecret (`jwt-secret`) | JWT signing key |
| `JWT_EXPIRES_IN` | SealedSecret (`jwt-secret`) | Token expiry |

---

## CI/CD Pipeline

### Trigger
```yaml
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]
```

### Pipeline Flow
```
ci.yml (this repo) ──calls──► ci-template.yml (Reusable-template repo)

Prepare → Test → SonarQube → Snyk → Docker Build → Trivy → Docker Push → Update Helm → Release → Notify
```

### Branch-Based Deployment
| Branch | Values File | K8s Namespace | Environment |
|--------|-------------|---------------|-------------|
| `main` | `values-main.yaml` | `main` | Production |
| `develop` | `values-dev.yaml` | `dev` | Development |

---

## Dockerfile — Multi-Stage Build
```
Stage 1 (builder): node:20-alpine
  → Install build tools (python3, make, g++) for argon2
  → npm install --omit=dev

Stage 2 (runtime): node:20-alpine
  → Install dumb-init for signal handling
  → Create non-root user (nodejs, uid 1001)
  → Copy node_modules from builder
  → USER nodejs (non-root)
  → ENTRYPOINT ["dumb-init", "--"]
  → CMD ["node", "src/server.js"]
```

**Security hardening:**
- Non-root user execution
- `dumb-init` for proper PID 1 signal handling
- Production-only dependencies (`--omit=dev`)
- Alpine-based minimal image

---

## Kubernetes Resources

| Resource | Name | Purpose |
|----------|------|---------|
| Deployment | `user-service` | Runs the service pods |
| Service | `user-service` | ClusterIP for internal routing |
| ConfigMap | `user-service-config` | Non-sensitive env vars |
| Secret | `user-service-secret` | App-level secrets |
| SealedSecret | `users-db-secret` | Encrypted DB credentials |
| SealedSecret | `jwt-secret` | Encrypted JWT config |
| HPA | `user-service-hpa` | Auto-scaling (2–10 pods, 60% CPU) |

### Health Probes
- **Liveness**: `GET /health` — checks service is alive (restart if fails)
- **Readiness**: `GET /ready` — checks DB connection (remove from LB if fails)

---

## Connection Verification

```bash
# Check pods are running
kubectl get pods -n main -l app=user-service

# Check service endpoint
kubectl get svc user-service -n main

# Check logs
kubectl logs -l app=user-service -n main --tail=50

# Test health endpoint from inside cluster
kubectl run test --rm -it --image=curlimages/curl -- curl http://user-service.main.svc.cluster.local:3001/health

# Check environment variables
kubectl exec -it <pod-name> -n main -- env | grep USER_DB

# Verify DB connectivity
kubectl exec -it <pod-name> -n main -- node -e "require('./src/db').pool.query('SELECT 1').then(() => console.log('DB OK'))"
```

---

## Secret Management
All sensitive values are managed via **Bitnami SealedSecrets**:
1. Create a plain Kubernetes Secret locally
2. Encrypt with `kubeseal --controller-namespace kube-system -o yaml`
3. Commit the SealedSecret YAML to `Vastra-helm/vastra-deployments/secrets/{env}/`
4. SealedSecret controller decrypts it in the cluster
5. Pods reference via `envFrom.secretRef` and `env.valueFrom.secretKeyRef`

**No secrets are hardcoded in source code or CI workflows.**

---

## Local Development
```bash
npm install
cp .env.example .env   # Set local env vars
npm run dev             # Start with nodemon
npm test                # Run Jest tests
```
