.PHONY: help local-up local-down build deploy seed clean test

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-20s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

local-up: ## Create local kind cluster with ingress
	@echo "Creating kind cluster..."
	bash scripts/setup-kind.sh
	@echo "Installing NGINX Ingress..."
	kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml
	@echo "Waiting for ingress controller..."
	kubectl wait --namespace ingress-nginx --for=condition=ready pod --selector=app.kubernetes.io/component=controller --timeout=90s
	@echo "Kind cluster ready!"

local-down: ## Destroy local kind cluster
	@echo "Deleting kind cluster..."
	kind delete cluster --name store-platform

build: ## Build all Docker images
	@echo "Building Docker images..."
	docker build -t store-platform/dashboard:latest ./dashboard
	docker build -t store-platform/api:latest ./api
	docker build -t store-platform/orchestrator:latest ./orchestrator
	@echo "Loading images into kind..."
	kind load docker-image store-platform/dashboard:latest --name store-platform
	kind load docker-image store-platform/api:latest --name store-platform
	kind load docker-image store-platform/orchestrator:latest --name store-platform

deploy: ## Deploy platform to Kubernetes
	@echo "Creating namespace..."
	kubectl create namespace store-platform --dry-run=client -o yaml | kubectl apply -f -
	@echo "Deploying platform with Helm..."
	helm upgrade --install platform ./helm/platform \
		-f ./helm/values-local.yaml \
		--namespace store-platform \
		--create-namespace \
		--wait
	@echo "Platform deployed!"
	@echo ""
	@echo "Access the dashboard at: http://dashboard.127.0.0.1.nip.io"
	@echo "API endpoint: http://api.127.0.0.1.nip.io"

seed: ## Create sample stores
	@echo "Creating sample stores..."
	bash scripts/seed-stores.sh

clean: ## Clean up all resources
	@echo "Cleaning up..."
	helm uninstall platform --namespace store-platform || true
	kubectl delete namespace store-platform || true
	kubectl get namespaces | grep "store-" | awk '{print $$1}' | xargs -r kubectl delete namespace || true

test: ## Run integration tests
	@echo "Running tests..."
	cd api && npm test
	cd orchestrator && npm test

logs-api: ## Show API logs
	kubectl logs -n store-platform -l app=api -f

logs-orchestrator: ## Show orchestrator logs
	kubectl logs -n store-platform -l app=orchestrator -f

port-forward: ## Port forward to services
	@echo "Port forwarding dashboard to localhost:3000..."
	kubectl port-forward -n store-platform svc/dashboard 3000:80 &
	@echo "Port forwarding API to localhost:4000..."
	kubectl port-forward -n store-platform svc/api 4000:3000 &
