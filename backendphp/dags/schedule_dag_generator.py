"""
Dynamic DAG Generator for API Schedules
This script generates DAGs dynamically from MongoDB schedules
"""
from airflow import DAG
from airflow.operators.http import SimpleHttpOperator
from airflow.operators.python import PythonOperator
from airflow.utils.dates import days_ago
from datetime import timedelta
import os
import sys
from croniter import croniter
from datetime import datetime

sys.path.insert(0, '/opt/bitnami/airflow/project')

from app.Repositories.ScheduleRepository import ScheduleRepository
from app.Repositories.ConnectionRepository import ConnectionRepository
from app.Repositories.RunRepository import RunRepository

def generate_dags_from_schedules():
    """
    Generate DAGs dynamically from MongoDB schedules
    This function is called by Airflow to discover DAGs
    """
    dags = {}
    
    try:
        schedule_repo = ScheduleRepository()
        connection_repo = ConnectionRepository()
        run_repo = RunRepository()
        
        schedules = schedule_repo.findAll()
        
        for schedule in schedules:
            if not schedule.get('isActive', True):
                continue
            
            schedule_id = str(schedule.get('_id', ''))
            connection_id = schedule.get('connectionId', '')
            cron_expr = schedule.get('cronExpression', '0 * * * *')
            
            # Get connection details
            connection = connection_repo.findById(connection_id)
            if not connection:
                print(f"[DAG Generator] Connection not found: {connection_id}")
                continue
            
            api_config = connection.get('apiConfig', {})
            base_url = api_config.get('baseUrl', '')
            method = api_config.get('method', 'GET')
            headers = api_config.get('headers', {})
            
            # Create DAG
            dag_id = f'api_schedule_{schedule_id}'
            
            default_args = {
                'owner': 'airflow',
                'retries': 3,
                'retry_delay': timedelta(minutes=5),
                'start_date': days_ago(1),
            }
            
            dag = DAG(
                dag_id,
                default_args=default_args,
                description=f'API Schedule: {schedule.get("name", "Unnamed")}',
                schedule_interval=cron_expr,
                catchup=False,
            )
            
            def execute_api_call(schedule_id=schedule_id, connection_id=connection_id, 
                               base_url=base_url, method=method, headers=headers, **context):
                """Execute API call and save results"""
                import requests
                
                try:
                    print(f"[Airflow] Executing API call for schedule: {schedule_id}")
                    
                    # Make API call
                    response = requests.request(
                        method=method,
                        url=base_url,
                        headers=headers,
                        timeout=30
                    )
                    
                    # Prepare run result
                    result = {
                        'scheduleId': schedule_id,
                        'connectionId': connection_id,
                        'status': 'success' if response.status_code < 400 else 'failed',
                        'statusCode': response.status_code,
                        'duration': 0,
                        'recordsProcessed': 0,
                        'executedAt': datetime.utcnow().isoformat(),
                        'triggeredBy': 'airflow_scheduler',
                        'responseSize': len(response.text),
                    }
                    
                    # Try to count records if JSON array
                    try:
                        data = response.json()
                        if isinstance(data, list):
                            result['recordsProcessed'] = len(data)
                    except:
                        pass
                    
                    # Save to MongoDB
                    run_repo.insert(result)
                    
                    print(f"[Airflow] API call completed: {result['status']}")
                    return result
                    
                except Exception as e:
                    print(f"[Airflow] Error executing API call: {str(e)}")
                    
                    # Save error result
                    error_result = {
                        'scheduleId': schedule_id,
                        'connectionId': connection_id,
                        'status': 'failed',
                        'error': str(e),
                        'executedAt': datetime.utcnow().isoformat(),
                        'triggeredBy': 'airflow_scheduler',
                    }
                    run_repo.insert(error_result)
                    raise
            
            # Create task
            execute_task = PythonOperator(
                task_id='execute_api',
                python_callable=execute_api_call,
                dag=dag,
            )
            
            dags[dag_id] = dag
        
        print(f"[DAG Generator] Generated {len(dags)} DAGs from schedules")
        
    except Exception as e:
        print(f"[DAG Generator] Error generating DAGs: {str(e)}")
    
    return dags

# Generate DAGs
globals().update(generate_dags_from_schedules())
