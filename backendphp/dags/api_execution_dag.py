from airflow import DAG
from airflow.operators.http import SimpleHttpOperator
from airflow.operators.python import PythonOperator
from airflow.utils.dates import days_ago
from datetime import timedelta
import json
import os
import sys

sys.path.insert(0, '/opt/bitnami/airflow/project')

from app.Repositories.ScheduleRepository import ScheduleRepository
from app.Repositories.RunRepository import RunRepository

default_args = {
    'owner': 'airflow',
    'retries': 3,
    'retry_delay': timedelta(minutes=5),
    'start_date': days_ago(1),
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
    
    def after_execute(response, **context):
        """Save execution result to MongoDB"""
        try:
            run_repo = RunRepository()
            
            result = {
                'scheduleId': schedule_id,
                'connectionId': connection_id,
                'status': 'success' if response.status_code < 400 else 'failed',
                'statusCode': response.status_code,
                'duration': context['task_instance'].duration,
                'recordsProcessed': len(response.json()) if isinstance(response.json(), list) else 1,
                'executedAt': context['execution_date'].isoformat(),
                'triggeredBy': 'airflow_scheduler',
            }
            
            run_repo.insert(result)
            print(f"[Airflow] Execution result saved: {result['status']}")
            
        except Exception as e:
            print(f"[Airflow] Error saving execution result: {str(e)}")
            raise
    
    # Pre-execution task
    pre_task = PythonOperator(
        task_id='pre_execute',
        python_callable=before_execute,
        dag=dag,
    )
    
    # HTTP call task
    http_task = SimpleHttpOperator(
        task_id='execute_api',
        http_conn_id='api_connection',
        endpoint=api_url,
        method=method,
        headers=headers or {},
        dag=dag,
    )
    
    # Post-execution task
    post_task = PythonOperator(
        task_id='post_execute',
        python_callable=after_execute,
        op_kwargs={'response': '{{ task_instance.xcom_pull(task_ids="execute_api") }}'},
        dag=dag,
    )
    
    # Set dependencies
    pre_task >> http_task >> post_task
    
    return dag

# Example: Create DAG for a specific schedule
# This would be called dynamically based on MongoDB schedules
example_dag = create_api_execution_dag(
    schedule_id='example_schedule_1',
    connection_id='conn_1',
    api_url='/api/data',
    method='GET',
)
