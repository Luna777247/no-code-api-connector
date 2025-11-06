@echo off
echo Starting Airflow and Backend services...
docker-compose up -d --build

echo Waiting for services to be healthy...
timeout /t 30 /nobreak > nul

echo Checking service health...
docker-compose ps

echo Services should be available at:
echo - Airflow UI: http://localhost:8080
echo - Backend API: http://localhost:8000
echo - MongoDB: localhost:27017

echo To stop services, run: docker-compose down