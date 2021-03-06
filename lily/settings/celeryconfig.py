import os
from datetime import timedelta

from kombu import Queue

from .settings import DEBUG, TIME_ZONE, REDIS_URL


# The broker env var name to use for fetching the broker url.
BROKER_ENV = os.environ.get('BROKER_ENV', 'DEV_BROKER')
# The broker url to use, based on the env var name.
BROKER_URL = os.environ.get(BROKER_ENV, 'amqp://guest@rabbit:5672')
# The broker connection pool limit (most connections alive simultaneously).
BROKER_POOL_LIMIT = os.environ.get('BROKER_POOL_LIMIT', 64)
# The broker connection keepalive heartbeat, by default we're using TCP keep-alive instead.
BROKER_HEARTBEAT = os.environ.get('BROKER_HEARTBEAT', None)
# The broker connection timeout, may require a long timeout due to Linux DNS timeouts etc
BROKER_CONNECTION_TIMEOUT = os.environ.get('BROKER_CONNECTION_TIMEOUT', 30)

CELERY_ACCEPT_CONTENT = ['json']  # ignore other content
CELERY_ANNOTATIONS = {
    '*': {
        'time_limit': 3600.0,
    },
}
CELERY_DEFAULT_QUEUE = 'queue1'
CELERY_ENABLE_UTC = True
CELERY_RESULT_SERIALIZER = 'json'
CELERY_SEND_TASK_ERROR_EMAILS = not DEBUG
# CELERY_SEND_TASK_SENT_EVENT = True
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_BACKEND = REDIS_URL
CELERY_TASK_RESULT_EXPIRES = 300
CELERY_TIMEZONE = TIME_ZONE
CELERY_QUEUES = (
    Queue('queue1', routing_key='email_async_tasks'),
    Queue('queue2', routing_key='email_scheduled_tasks'),
)
CELERY_ROUTES = (
    {'synchronize_email_account_scheduler': {  # schedule priority email tasks without interference
        'queue': 'queue2'
    }},
    {'synchronize_email_account': {  # schedule priority email tasks without interference
        'queue': 'queue2'
    }},
    {'first_synchronize_email_account': {  # schedule priority email tasks without interference
        'queue': 'queue2'
    }},
)
CELERYBEAT_SCHEDULE = {
    'synchronize_email_account_scheduler': {
        'task': 'synchronize_email_account_scheduler',
        'schedule': timedelta(seconds=int(os.environ.get('EMAIL_SYNC_INTERVAL', 60))),
    },
}
