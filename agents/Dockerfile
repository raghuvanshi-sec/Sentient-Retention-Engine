# Use Python 3.11 slim image
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt ./

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose port for the Agentic AI service
EXPOSE 8002

# Start the application
CMD ["uvicorn", "api.ai_api:app", "--host", "0.0.0.0", "--port", "8002"]