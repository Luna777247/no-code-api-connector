from airflow import DAG
from airflow.providers.http.operators.http import HttpOperator
from airflow.operators.python import PythonOperator
from datetime import timedelta, datetime
import json
import os
import sys
from pymongo import MongoClient
from pymongo.errors import PyMongoError
import requests

sys.path.insert(0, '/opt/airflow/dags')

default_args = {
    'owner': 'airflow',
    'retries': 3,
    'retry_delay': timedelta(minutes=5),
    'start_date': datetime(2024, 1, 1),
}

def create_api_execution_dag(schedule_id, connection_id, api_url, method='GET', headers=None, auth=None):
    """
    Factory function to create a DAG for API execution
    """
    dag_id = f'api_execute_{schedule_id}'
    
    dag = DAG(
        dag_id,
        default_args=default_args,
        description=f'Execute API call for schedule {schedule_id}',
        catchup=False,
    )
    
    def before_execute(**context):
        """Log execution start"""
        print(f"[Airflow] Starting execution for schedule: {schedule_id}")
        print(f"[Airflow] Connection: {connection_id}")
        print(f"[Airflow] URL: {api_url}")
    
def create_run_record(schedule_id, connection_id, **context):
    """Create initial run record in MongoDB"""
    try:
        # Get MongoDB connection details from environment
        mongo_uri = os.getenv('MONGODB_URI')
        mongo_db = os.getenv('MONGODB_DATABASE', 'api_connector')

        if not mongo_uri:
            print("[Airflow] MONGODB_URI not set, skipping run creation")
            return None

        # Connect to MongoDB
        client = MongoClient(mongo_uri)
        db = client[mongo_db]
        collection = db['api_runs']

        run_data = {
            'scheduleId': schedule_id,
            'connectionId': connection_id,
            'status': 'running',
            'startedAt': context['execution_date'].isoformat(),
            'triggeredBy': 'airflow_scheduler',
        }

        result = collection.insert_one(run_data)
        run_id = str(result.inserted_id)
        print(f"[Airflow] Created run record: {run_id}")

        # Close connection
        client.close()

        return run_id

    except PyMongoError as e:
        print(f"[Airflow] MongoDB error creating run: {str(e)}")
        return None
    except Exception as e:
        print(f"[Airflow] Error creating run record: {str(e)}")
        return None    # Create run record task
    create_run_task = PythonOperator(
        task_id='create_run_record',
        python_callable=create_run_record,
        op_args=[schedule_id, connection_id],
        dag=dag,
    )

    # HTTP call task
    http_task = HttpOperator(
        task_id='execute_api',
        http_conn_id='api_connection',
        endpoint=api_url,
        method=method,
        headers=headers or {},
        dag=dag,
    )

    # Execute and update run task
    execute_task = PythonOperator(
        task_id='execute_and_update',
        python_callable=after_execute,
        op_kwargs={'run_id': '{{ task_instance.xcom_pull(task_ids="create_run_record") }}'},
        dag=dag,
    )

    # Set dependencies
    create_run_task >> http_task >> execute_task

    return dag

# Example: Create DAG for a specific schedule
# This would be called dynamically based on MongoDB schedules
example_dag = create_api_execution_dag(
    schedule_id='example_schedule_1',
    connection_id='conn_1',
    api_url='/api/data',
    method='GET',
)

def after_execute(run_id, **context):
    """Update run with execution result by calling PHP API"""
    if not run_id:
        print("[Airflow] No run_id provided, skipping execution")
        return

    try:
        # Get PHP API base URL from environment
        php_api_url = os.getenv('PHP_API_URL', 'http://localhost:8000')

        # Call execute endpoint to update run with actual data
        execute_url = f"{php_api_url}/api/runs/{run_id}/execute"
        response = requests.post(execute_url, timeout=60)

        if response.status_code == 200:
            print(f"[Airflow] Run {run_id} executed and updated successfully")
        else:
            print(f"[Airflow] Failed to execute run {run_id}: {response.text}")

    except Exception as e:
        print(f"[Airflow] Error executing run {run_id}: {str(e)}")
