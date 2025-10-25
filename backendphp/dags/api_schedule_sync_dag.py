from airflow import DAG
from airflow.providers.standard.operators.python import PythonOperator
from datetime import timedelta, datetime
import os
import sys
from pymongo import MongoClient
from pymongo.errors import PyMongoError

# Add project to path (for any future imports)
sys.path.insert(0, '/opt/airflow/dags')

default_args = {
    'owner': 'airflow',
    'retries': 2,
    'retry_delay': timedelta(minutes=5),
    'start_date': datetime(2024, 1, 1),
}

dag = DAG(
    'api_schedule_sync',
    default_args=default_args,
    description='Sync schedules from MongoDB to Airflow',
    schedule='0 * * * *',  # Every hour
    catchup=False,
)

def sync_schedules_from_mongodb():
    """
    Sync active schedules from MongoDB to Airflow DAGs
    This ensures new schedules are picked up by Airflow
    """
    try:
        # Get MongoDB connection details from environment
        mongo_uri = os.getenv('MONGODB_URI')
        mongo_db = os.getenv('MONGODB_DATABASE', 'api_connector')

        if not mongo_uri:
            raise ValueError("MONGODB_URI environment variable not set")

        # Connect to MongoDB
        client = MongoClient(mongo_uri)
        db = client[mongo_db]
        collection = db['api_schedules']

        # Find all schedules
        schedules = list(collection.find({}, {'_id': 1, 'name': 1, 'isActive': 1, 'cronExpression': 1}).limit(100))

        # Filter active schedules
        active_schedules = [s for s in schedules if s.get('isActive', True)]

        print(f"[Airflow] Found {len(active_schedules)} active schedules")
        print(f"[Airflow] Schedules: {[str(s.get('_id')) for s in active_schedules]}")

        # Close connection
        client.close()

        return {
            'total': len(schedules),
            'active': len(active_schedules),
            'status': 'success'
        }
    except PyMongoError as e:
        print(f"[Airflow] MongoDB error: {str(e)}")
        raise
    except Exception as e:
        print(f"[Airflow] Error syncing schedules: {str(e)}")
        raise

sync_task = PythonOperator(
    task_id='sync_schedules',
    python_callable=sync_schedules_from_mongodb,
    dag=dag,
)
