"""
Dynamic DAG Generator for API Schedules
This script generates DAGs dynamically from MongoDB schedules
"""
from airflow import DAG
from airflow.providers.http.operators.http import HttpOperator
from airflow.operators.python import PythonOperator
from datetime import timedelta, datetime
import os
import sys
from croniter import croniter
from pymongo import MongoClient
from pymongo.errors import PyMongoError
from bson import ObjectId

sys.path.insert(0, '/opt/airflow/dags')

def generate_dags_from_schedules():
    """
    Generate DAGs dynamically from MongoDB schedules
    This function is called by Airflow to discover DAGs
    """
    dags = {}

    try:
        # Get MongoDB connection details from environment
        mongo_uri = os.getenv('MONGODB_URI')
        mongo_db = os.getenv('MONGODB_DATABASE', 'api_connector')

        if not mongo_uri:
            print("[DAG Generator] MONGODB_URI not set")
            return dags

        # Connect to MongoDB
        client = MongoClient(mongo_uri)
        db = client[mongo_db]
        schedules_collection = db['api_schedules']
        connections_collection = db['api_connections']
        runs_collection = db['api_runs']

        # Get all active schedules
        schedules = list(schedules_collection.find({'isActive': True}))

        for schedule in schedules:
            schedule_id = str(schedule.get('_id', ''))
            connection_id = schedule.get('connectionId', '')
            cron_expr = schedule.get('cronExpression', '0 * * * *')

            # Get connection details
            try:
                connection_id_obj = ObjectId(connection_id)
            except:
                print(f"[DAG Generator] Invalid connection ID format: {connection_id}, skipping schedule")
                continue

            connection = connections_collection.find_one({'_id': connection_id_obj})
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
                'start_date': datetime(2024, 1, 1),
            }

            dag = DAG(
                dag_id,
                default_args=default_args,
                description=f'API Schedule: {schedule.get("name", "Unnamed")}',
                schedule=cron_expr,
                catchup=False,
            )

            def execute_api_call(schedule_id=schedule_id, connection_id=connection_id,
                               base_url=base_url, method=method, headers=headers, **context):
                """Execute API call and save results"""
                import requests
                from pymongo import MongoClient
                from bson import ObjectId

                try:
                    print(f"[Airflow] Executing API call for schedule: {schedule_id}")

                    # Create MongoDB connection
                    mongo_client = MongoClient(os.getenv('MONGODB_URI', 'mongodb://localhost:27017'))
                    mongo_db = os.getenv('MONGODB_DATABASE', 'api_connector')
                    db = mongo_client[mongo_db]
                    runs_collection = db['api_runs']

                    # Make API call
                    # Ensure headers is a dict
                    if isinstance(headers, list):
                        headers_dict = {}
                        for header in headers:
                            if isinstance(header, dict) and 'key' in header and 'value' in header:
                                headers_dict[header['key']] = header['value']
                        headers = headers_dict
                    elif not isinstance(headers, dict):
                        headers = {}

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
                    runs_collection.insert_one(result)

                    print(f"[Airflow] API call completed: {result['status']}")
                    mongo_client.close()
                    
                    # Convert ObjectId to string for XCom serialization
                    result['_id'] = str(result['_id'])
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
                    runs_collection.insert_one(error_result)
                    mongo_client.close()
                    
                    # Convert ObjectId to string for XCom serialization if present
                    if '_id' in error_result:
                        error_result['_id'] = str(error_result['_id'])
                    raise

            # Create task
            execute_task = PythonOperator(
                task_id='execute_api',
                python_callable=execute_api_call,
                dag=dag,
            )

            dags[dag_id] = dag

        print(f"[DAG Generator] Generated {len(dags)} DAGs from schedules")

        # Close connection
        client.close()

    except PyMongoError as e:
        print(f"[DAG Generator] MongoDB error: {str(e)}")
    except Exception as e:
        print(f"[DAG Generator] Error generating DAGs: {str(e)}")

    return dags

# Generate DAGs
globals().update(generate_dags_from_schedules())
