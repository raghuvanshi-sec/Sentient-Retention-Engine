<!-- markdownlint-disable MD033 -->

# 🚀 Sentient-Retention Engine

**Autonomous SaaS Churn Defense via Guardrailed Multi-Agent Workflows & High-Fidelity Digital Twins.**

The **Sentient-Retention Engine (SRE)** is an enterprise-grade, closed-loop AI platform designed to predict, simulate, and prevent customer churn in SaaS environments. By unifying predictive Machine Learning, autonomous multi-agent graphs built on LangGraph, high-fidelity sandbox simulations (Digital Twins), and an inline governance model, SRE ensures that proactively saving high-risk accounts is done safely, dynamically, and transparently.

## Key Features

- **Streamlined 4-Agent Workflow**: Observe, Think, Simulate, and Decide dynamically via LangGraph cyclic execution paths comprising Risk Analysis, Strategy Planning, Simulation, and Decision agents.
- **Resilient AI Graph**: Inline security/governance validation bounds built directly into the Decision agent, with automated fallback logic for low-confidence or high-risk outcomes.
- **SafeLLM Outage Failover**: Zero-downtime resilient AI architecture falling back from Gemini to Groq in <50ms.
- **Digital Twin Simulation Sandbox**: High-fidelity environment for stress-testing intervention strategies and calculating ROI.
- **Cyber-Brutalist Dashboard**: Lightweight React 18 UI featuring real-time WebSocket telemetry streams and specialist workspace queues.

---

## Tech Stack

- **Language**: TypeScript/JavaScript (Node.js), Python 3.10+
- **Frontend**: React 18 with Vanilla CSS and Framer Motion
- **Backend / Orchestration**: Express.js Gateway, FastAPI, Python LangGraph
- **Database**: PostgreSQL 15+
- **Caching & Pub/Sub**: Redis 7
- **Machine Learning**: scikit-learn (Churn Classification)
- **Monitoring / Infra**: Docker Compose (Database & Redis services)
- **Testing**: Jest, PyTest, Unified Python Audit Pipeline

---

## Prerequisites

Ensure your local development environment has the following installed:

- **Node.js** (v20.x or higher)
- **Python** (v3.10.x or higher, with `pip` and `virtualenv`)
- **Docker Desktop** (v4.0+ for running the containerized database/cache stack)
- **PostgreSQL 15+** and **Redis** (If running manually outside of Docker)

---

## Getting Started

You can launch the database and caching layer using Docker Compose, and spin up the microservices manually using our PowerShell script for deep development.

### Method 1: Database & Cache Setup (Docker Compose)

Run the backend storage layer:

```bash
# 1. Clone the repository
git clone https://github.com/raghuvanshi-sec/Sentient-Retention-Engine.git
cd Sentient-Retention-Engine

# 2. Launch database and cache
docker-compose up --build -d
```

Once initialized, access the interfaces:

- 🖥️ **React Dashboard**: [http://localhost:3000](http://localhost:3000)
- ⚙️ **Express Gateway**: [http://localhost:8000](http://localhost:8000)
- 🧠 **FastAPI AI Server**: [http://localhost:8001](http://localhost:8001)

### Method 2: Manual Setup & `start-dev.ps1` Orchestrator

For active development, our intelligent PowerShell script handles dependency checks, port cleanup, virtual environments activation, and unified logging.

```bash
# 1. Clone and enter the repository
git clone https://github.com/raghuvanshi-sec/Sentient-Retention-Engine.git
cd Sentient-Retention-Engine

# 2. Install dependencies for all Node.js workspaces
npm install --prefix backend
npm install --prefix frontend
npm install --prefix shared

# 3. Setup Python Virtual Environments
cd agents
python -m venv venv
source venv/bin/activate  # Or `.\venv\Scripts\activate` on Windows
pip install -r requirements.txt
cd ..

cd simulation/ml-service
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cd ../..

# 4. Copy the environment variables
cp backend/.env.example backend/.env
cp agents/.env.example agents/.env
cp frontend/.env.example frontend/.env
cp simulation/ml-service/.env.example simulation/ml-service/.env

# 5. Launch the orchestrator script (Windows PowerShell)
.\start-dev.ps1
```

The orchestrator will provide an interactive command center to monitor all services in one terminal window.

---

## Architecture

### Directory Structure

```mermaid
flowchart LR
    classDef dir fill:#222,stroke:#666,stroke-width:1px,color:#fff;
    classDef file fill:#111,stroke:#444,stroke-width:1px,color:#ccc;
    
    Root["📂 Sentient-Retention-Engine"]:::dir
    
    Root --> Agents["📂 agents/ (LangGraph AI Engine)"]:::dir
    Agents --> AgApi["📂 api/ (FastAPI)"]:::dir
    Agents --> AgCore["📂 core/ (Nodes & State)"]:::dir
    Agents --> AgDT["📂 digital-twin/ (Simulations)"]:::dir
    Agents --> AgTools["📂 tools/ (Agent Capabilities)"]:::dir
    
    Root --> Backend["📂 backend/ (Node/Express API Gateway)"]:::dir
    Backend --> BkSrc["📂 src/ (Controllers & Routes)"]:::dir
    Backend --> BkLogs["📂 logs/ (Audit Traces)"]:::dir
    
    Root --> Frontend["📂 frontend/ (React 18 Dashboard)"]:::dir
    Frontend --> FrSrc["📂 src/ (Components & Pages)"]:::dir
    
    Root --> Gov["📂 governance/ (Cross-platform Policies)"]:::dir
    
    Root --> Infra["📂 infra/ (Docker PostgreSQL Setup)"]:::dir
    Infra --> InfDb["📂 database/ (PostgreSQL Schemas)"]:::dir
    
    Root --> Obs["📂 observability/ (Telemetry Tools)"]:::dir
    Root --> Sec["📂 security/ (RBAC Rules)"]:::dir
    Root --> Shared["📂 shared/ (Common Schemas)"]:::dir
    
    Root --> Sim["📂 simulation/"]:::dir
    Sim --> SimML["📂 ml-service/ (scikit-learn Predictor)"]:::dir
    
    Root --> StartDev["📄 start-dev.ps1 (Dev Orchestrator)"]:::file
```

### End-to-End Request Lifecycle

1. **Observe (Gateway & Frontend):** User telemetry data flows into the Express gateway.
2. **Predict (ML Service):** The Node backend queries the `ml-service` to calculate real-time churn risk.
3. **Orchestrate (Agentic Engine):** If a high risk is detected, the event fires into the LangGraph network (`agents/core/workflow.py`).
4. **Graph Execution:**
   - **RiskAnalysisAgent** evaluates historical context.
   - **StrategyPlanningAgent** formulates action options.
   - **SimulationAgent** calls the digital twin sandbox to measure ROI.
   - **DecisionAgent** selects the optimal route and runs security validation.
   - **Handoff/Feedback**:
     - If validation passes ➔ **FeedbackLearningAgent** logs metrics and completes execution.
     - If validation fails or has low confidence ➔ **HumanHandoff** persists the action to the Specialist queue for human-in-the-loop review.
5. **Persist & Telemetry:** All states and decisions are logged into PostgreSQL and broadcasted back to the React UI via Redis Pub/Sub.

---

## Environment Variables

Copy `.env.example` files across the workspace. **Do NOT place sensitive keys in Git.**

### Backend (`backend/.env`)

| Variable | Description | Example |
| `PORT` | API Gateway Port | `8000` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:postgres@localhost:5432/sre_db` |
| `REDIS_URL` | Redis pub-sub endpoint | `redis://localhost:6379` |
| `JWT_SECRET` | Secret for RBAC Auth generation | `your_secure_jwt_secret` |

### Agentic AI (`agents/.env`)

| Variable | Description | Example |
| `DATABASE_URL` | Database for agent persistence | `postgresql://postgres:postgres@localhost:5432/sre_db` |
| `GOOGLE_API_KEY` | Primary SafeLLM Provider Key | `your_google_api_key_here` |
| `GROQ_API_KEY` | Fallback SafeLLM Provider Key | `your_groq_api_key_here` |

### Frontend (`frontend/.env`)

| Variable | Description | Example |
| `VITE_API_URL` | Base URL for REST requests | `http://localhost:8000/api/v1` |
| `VITE_WS_URL` | WebSocket URL for live telemetry | `ws://localhost:8000` |

---

## Available Scripts

### Development & Orchestration

| Command | Description |
| `.\start-dev.ps1` | Interactive PowerShell dev center. Spawns, monitors, and cleans all active services safely. |
| `docker-compose up` | Launches containerized PostgreSQL and Redis databases. |

### Backend (`/backend`)

| Command | Description |
| `npm run dev` | Start Express with nodemon watch mode |
| `npm run db:setup` | Seeds the database and creates essential tables |
| `npm run test` | Run API integrations and fallback logic tests |

### Unified Audit Pipeline (`/`)

| Command | Description 
| `python .agent/scripts/checklist.py .` | Rigorous, multi-gate security, linting, testing, and schema audit. Required before commits. |

---

## Testing

SRE features a highly rigorous, priority-ordered testing framework validating AI failsafes and logical boundaries.

### Express Backend Tests

Validates logical locks, RBAC, deduplication, and graceful LLM degradation API handling.

```bash
cd backend
npm run test
```

### FastAPI & SafeLLM Fallback Tests

Validates that our custom LLM provider instantly shifts workloads to Groq when Gemini yields simulated rate limits.

```bash
cd agents
python -m unittest core/test_llm_failover.py
```

### Full Workspace Audits

Our custom auditing framework will test the entire workspace context.

```bash
python .agent/scripts/checklist.py .
```

---

## Troubleshooting

### Port Already In Use

**Error:** `Port 3000 in use` (or 8000/8001)
**Solution:**
If using `start-dev.ps1`, the script has an auto-cleanup block that forcefully kills ghost processes keeping the ports open. If using docker, run `docker-compose down -v` to kill hanging networking maps.

### LLM Rate Limits Triggering Instantly

**Error:** Backend reports failure during execution.
**Solution:**
Ensure you have set `GOOGLE_API_KEY` and `GROQ_API_KEY` in `agents/.env`. If the primary fails, the fallback only works if the secondary key is configured properly.

### Missing Tables or Schema Errors

**Error:** PostgreSQL `relation does not exist`
**Solution:**
If not using Docker volumes, ensure the DB is properly created and migrated:

```bash
cd backend
npm run db:setup
```

Alternatively, execute the contents of `infra/database/schema.sql` directly into your Postgres instance.

---

## Contributing

We welcome contributions! Any agent logic modification must run through our inline validator tests.
Before submitting pull requests, run `python .agent/scripts/checklist.py .` to ensure 100% security and schema compliance.

## 📄 Licensing

Distributed under the **MIT License**. See `LICENSE` for more information.
