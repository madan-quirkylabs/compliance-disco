FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for pymupdf
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose port
EXPOSE 8000

# Run the stdlib server (no FastAPI dependency)
CMD ["python", "serve.py"]
