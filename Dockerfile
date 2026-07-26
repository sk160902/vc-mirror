# Maritime micro-VM image for the viral-RSI agent.
# One container that can run a wake cycle: Python (predictor + engine) + Node (Gemini).
FROM python:3.11-slim

# Node for the Gemini microservice (gemini_cli.mjs / extract.mjs).
RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY agent/requirements.txt agent/requirements.txt
RUN pip install --no-cache-dir -r agent/requirements.txt

# Node deps for @google/genai (the only runtime node dep).
COPY package.json ./
RUN npm install @google/genai@^2.12.0 --no-save

COPY . .

# GEMINI_API_KEY is injected by Maritime as a secret at runtime; never baked in.
# AUTOLAB_API_KEY (optional) routes optimization to Autolab instead of the local engine.
ENV PYTHONUNBUFFERED=1
ENV PORT=8080
EXPOSE 8080

# Long-running service: health check on GET /, one self-improvement cycle per POST.
# (A run-once container would exit and never pass Maritime's health check.)
CMD ["python3", "agent/server.py"]
