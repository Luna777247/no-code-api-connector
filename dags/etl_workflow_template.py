"""
ETL Workflow DAG Template for No-Code API Connector
This DAG template is dynamically generated for each API connection
"""

from datetime import datetime, timedelta
from airflow import DAG
from airflow.operators.python import PythonOperator
from airflow.operators.bash import BashOperator
import requests
import json
import os

# Default arguments for all DAGs
default_args = {
    'owner': 'no-code-api-connector',
    'depends_on_past': False,
    'start_date': datetime(2025, 1, 1),
    'email_on_failure': False,
    'email_on_retry': False,
    'retries': 3,
    'retry_delay': timedelta(minutes=5),
    'catchup': False
}

def execute_etl_workflow(**context):
    """
    Execute the ETL workflow by calling the Next.js API
    """
    # Get DAG configuration from context
    dag_id = context['dag'].dag_id
    connection_id = dag_id.replace('etl_workflow_', '')
    
    # API endpoint URL (adjust based on your deployment)
    api_url = os.getenv('NEXTJS_API_URL', 'http://localhost:3000')
    execute_url = f"{api_url}/api/execute-run"
    
    # Get workflow configuration from DAG params or external source
    workflow_config = context['params'].get('workflow_config', {})
    
    if not workflow_config:
        # Fallback: fetch config from API
        config_url = f"{api_url}/api/connections/{connection_id}"
        try:
            response = requests.get(config_url, timeout=30)
            response.raise_for_status()
            connection_data = response.json()
            
            # Transform connection data to workflow config
            workflow_config = {
                "connectionId": connection_id,
                "apiConfig": {
                    "baseUrl": connection_data.get("baseUrl"),
                    "method": connection_data.get("method", "GET"),
                    "headers": connection_data.get("headers", {}),
                    "authType": connection_data.get("authType"),
                    "authConfig": connection_data.get("authConfig", {})
                },
                "parameters": connection_data.get("parameters", []),
                "fieldMappings": connection_data.get("fieldMappings", [])
            }
        except Exception as e:
            raise Exception(f"Failed to fetch connection config: {str(e)}")
    
    # Execute the ETL workflow
    try:
        print(f"[v0] Executing ETL workflow for connection: {connection_id}")
        response = requests.post(
            execute_url,
            json=workflow_config,
            headers={'Content-Type': 'application/json'},
            timeout=300  # 5 minutes timeout
        )
        response.raise_for_status()
        result = response.json()
        
        print(f"[v0] Workflow execution completed: {result}")
        
        # Log results to Airflow
        print(f"Status: {result.get('status')}")
        print(f"Records extracted: {result.get('recordsExtracted', 0)}")
        print(f"Records loaded: {result.get('recordsLoaded', 0)}")
        print(f"Duration: {result.get('duration', 0)}ms")
        
        if result.get('errors'):
            print(f"Errors: {result['errors']}")
        
        # Return result for downstream tasks
        return result
        
    except requests.exceptions.RequestException as e:
        raise Exception(f"HTTP request failed: {str(e)}")
    except Exception as e:
        raise Exception(f"Workflow execution failed: {str(e)}")

def send_notification(**context):
    """
    Send notification about workflow completion
    """
    ti = context['ti']
    result = ti.xcom_pull(task_ids='execute_workflow')
    
    if result:
        status = result.get('status', 'unknown')
        records_loaded = result.get('recordsLoaded', 0)
        
        print(f"[v0] Workflow notification: Status={status}, RecordsLoaded={records_loaded}")
        
        # Here you can add email, Slack, or other notifications
        # For now, just log the completion
        if status == 'success':
            print("✅ ETL workflow completed successfully")
        elif status == 'partial':
            print("⚠️ ETL workflow completed with some errors")
        else:
            print("❌ ETL workflow failed")

# This function creates a DAG dynamically
def create_etl_dag(connection_id, schedule_interval, workflow_config=None):
    """
    Create an ETL DAG for a specific connection
    
    Args:
        connection_id (str): Unique identifier for the API connection
        schedule_interval (str): Cron expression for scheduling
        workflow_config (dict): Workflow configuration (optional)
    """
    
    dag_id = f'etl_workflow_{connection_id}'
    
    dag = DAG(
        dag_id=dag_id,
        default_args=default_args,
        description=f'ETL Workflow for connection {connection_id}',
        schedule_interval=schedule_interval,
        params={
            'workflow_config': workflow_config or {},
            'connection_id': connection_id
        },
        tags=['etl', 'api-connector', 'automated']
    )
    
    # Task 1: Execute ETL Workflow
    execute_task = PythonOperator(
        task_id='execute_workflow',
        python_callable=execute_etl_workflow,
        dag=dag
    )
    
    # Task 2: Health Check (optional)
    health_check = BashOperator(
        task_id='health_check',
        bash_command='echo "Health check completed at $(date)"',
        dag=dag
    )
    
    # Task 3: Send Notification
    notify_task = PythonOperator(
        task_id='send_notification',
        python_callable=send_notification,
        dag=dag
    )
    
    # Set task dependencies
    execute_task >> health_check >> notify_task
    
    return dag

# Example: Create a sample DAG (this will be generated dynamically)
if __name__ == "__main__":
    # This section is for testing - in production, DAGs are created via API
    sample_dag = create_etl_dag(
        connection_id='sample_connection',
        schedule_interval='0 */6 * * *',  # Every 6 hours
        workflow_config={
            "connectionId": "sample_connection",
            "apiConfig": {
                "baseUrl": "https://jsonplaceholder.typicode.com/users",
                "method": "GET",
                "headers": {}
            },
            "parameters": [],
            "fieldMappings": [
                {"sourcePath": "$.id", "targetField": "user_id", "dataType": "number"}
            ]
        }
    )
    
    # Make the DAG available to Airflow
    globals()['etl_workflow_sample_connection'] = sample_dag