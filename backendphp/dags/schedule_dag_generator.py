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
            parameters = connection.get('parameters', [])  # Get parameters from connection

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
                               base_url=base_url, method=method, headers=headers, parameters=parameters, **context):
                """Execute API call and save results"""
                import requests
                from pymongo import MongoClient
                from bson import ObjectId

                try:
                    print(f"[Airflow] Executing API call for schedule: {schedule_id}")

                    # Get PHP API URL from environment
                    php_api_url = os.getenv('PHP_API_URL', 'http://localhost:8000')
                    
                    # Create MongoDB connection
                    mongo_client = MongoClient(os.getenv('MONGODB_URI', 'mongodb://localhost:27017'))
                    mongo_db = os.getenv('MONGODB_DATABASE', 'api_connector')
                    db = mongo_client[mongo_db]
                    runs_collection = db['api_runs']

                    # Build URL with query parameters
                    api_url = base_url
                    if parameters:
                        query_params = {}
                        for param in parameters:
                            if isinstance(param, dict) and param.get('type') == 'query' and param.get('values'):
                                # Use first value if it's a list
                                value = param['values'][0] if isinstance(param['values'], list) else param['values']
                                if value:
                                    query_params[param['name']] = str(value)

                        if query_params:
                            from urllib.parse import urlencode
                            query_string = urlencode(query_params)
                            separator = '&' if '?' in api_url else '?'
                            api_url = api_url + separator + query_string

                    print(f"[Airflow] API URL: {api_url}")

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
                        url=api_url,  # Use the built URL with parameters
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
                        'apiResponse': response.text[:5000],  # Limit response size
                    }

                    # Try to count records if JSON array
                    try:
                        data = response.json()
                        if isinstance(data, list):
                            result['recordsProcessed'] = len(data)
                    except:
                        pass

                    # Create run record via PHP API
                    try:
                        create_response = requests.post(
                            f"{php_api_url}/api/runs",
                            json=result,
                            timeout=30
                        )
                        if create_response.status_code == 201:
                            run_data = create_response.json()
                            run_id = run_data.get('id')
                            print(f"[Airflow] Created run record: {run_id}")
                            
                            # Update run with execution results
                            update_result = {
                                'status': result['status'],
                                'statusCode': result['statusCode'],
                                'duration': result['duration'],
                                'recordsProcessed': result['recordsProcessed'],
                                'responseSize': result['responseSize'],
                                'apiResponse': result['apiResponse'],
                            }
                            
                            update_response = requests.post(
                                f"{php_api_url}/api/runs/{run_id}/execute",
                                json=update_result,
                                timeout=30
                            )
                            
                            if update_response.status_code == 200:
                                print(f"[Airflow] Updated run record: {run_id}")
                            else:
                                print(f"[Airflow] Failed to update run record: {update_response.status_code}")
                        else:
                            print(f"[Airflow] Failed to create run record: {create_response.status_code}")
                            # Fallback to direct MongoDB insert
                            runs_collection.insert_one(result)
                            
                    except Exception as api_error:
                        print(f"[Airflow] Error calling PHP API: {str(api_error)}")
                        # Fallback to direct MongoDB insert
                        runs_collection.insert_one(result)

                    print(f"[Airflow] API call completed: {result['status']}")
                    mongo_client.close()
                    
                    return result

                except Exception as e:
                    print(f"[Airflow] Error executing API call: {str(e)}")

                    # Prepare error result
                    error_result = {
                        'scheduleId': schedule_id,
                        'connectionId': connection_id,
                        'status': 'failed',
                        'error': str(e),
                        'executedAt': datetime.utcnow().isoformat(),
                        'triggeredBy': 'airflow_scheduler',
                    }

                    # Try to create run record via PHP API
                    try:
                        create_response = requests.post(
                            f"{php_api_url}/api/runs",
                            json=error_result,
                            timeout=30
                        )
                        if create_response.status_code == 201:
                            run_data = create_response.json()
                            run_id = run_data.get('id')
                            print(f"[Airflow] Created error run record: {run_id}")
                        else:
                            print(f"[Airflow] Failed to create error run record: {create_response.status_code}")
                            # Fallback to direct MongoDB insert
                            runs_collection.insert_one(error_result)
                    except Exception as api_error:
                        print(f"[Airflow] Error calling PHP API for error record: {str(api_error)}")
                        # Fallback to direct MongoDB insert
                        runs_collection.insert_one(error_result)
                    
                    mongo_client.close()
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
