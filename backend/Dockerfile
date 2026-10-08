# Image for the FastAPI backend.
FROM python:3.12-slim

WORKDIR /app

# Install dependencies first, in their own layer: Docker reuses this layer on later
# builds as long as requirements.txt has not changed, so rebuilds take seconds.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app

# The SQLite file lives in /data, which docker-compose.yml mounts as a named volume so
# the data survives container restarts and rebuilds.
ENV DATABASE_URL=sqlite:////data/app.db

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
