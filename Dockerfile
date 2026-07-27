# Slim Maritime image: Python + scikit-learn only (no Node/apt/npm).
# The deployed wake cycle re-improves the predictor on the baked-in labeled data
# (INGEST=0), so the container needs no Gemini/Node. Live ingestion is a local/
# full-image concern; the deployed agent's job is the recursive model-improvement
# loop + serving the curve. Much lighter => builds reliably on Maritime.
FROM python:3.11-slim

WORKDIR /app

COPY agent/requirements.txt agent/requirements.txt
RUN pip install --no-cache-dir -r agent/requirements.txt

COPY . .

ENV PYTHONUNBUFFERED=1
ENV PORT=8080
ENV INGEST=0
EXPOSE 8080

# Long-running service: health on GET /, one self-improvement cycle per POST.
CMD ["python3", "agent/server.py"]
