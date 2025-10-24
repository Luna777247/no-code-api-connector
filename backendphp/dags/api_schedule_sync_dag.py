from airflow import DAG
from airflow.operators.python import PythonOperator
from airflow.utils.dates import days_ago
from datetime import timedelta
import os
import sys

# Add project to path
sys.path.insert(0, '/opt/bitnami/airflow/project')

from app.Repositories.ScheduleRepository import ScheduleRepository

default_args = {
    'owner': 'airflow',
    'retries': 2,
    'retry_delay': timedelta(minutes=5),
    'start_date': days_ago(1),
}

dag = DAG(
    'api_schedule_sync',
    default_args=default_args,
    description='Sync schedules from MongoDB to Airflow',
    schedule_interval='0 * * * *',  # Every hour
    catchup=False,
)

def sync_schedules_from_mongodb():
    """
    Sync active schedules from MongoDB to Airflow DAGs
    This ensures new schedules are picked up by Airflow
    """
    try:
        repo = ScheduleRepository()
        schedules = repo.findAll()
        
        active_schedules = [s for s in schedules if s.get('isActive', True)]
        
        print(f"[Airflow] Found {len(active_schedules)} active schedules")
        print(f"[Airflow] Schedules: {[s.get('_id') for s in active_schedules]}")
        
        return {
            'total': len(schedules),
            'active': len(active_schedules),
            'status': 'success'
        }
    except Exception as e:
        print(f"[Airflow] Error syncing schedules: {str(e)}")
        raise

sync_task = PythonOperator(
    task_id='sync_schedules',
    python_callable=sync_schedules_from_mongodb,
    dag=dag,
)
