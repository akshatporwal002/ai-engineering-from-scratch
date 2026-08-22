# Development-only local container; it is not deployment configuration.
FROM python:3.14-slim
WORKDIR /app
COPY pyproject.toml ./
RUN pip install --no-cache-dir fastapi==0.136.1 pydantic==2.13.3 pydantic-settings==2.13.1 uvicorn==0.41.0
COPY app ./app
EXPOSE 8000
CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
