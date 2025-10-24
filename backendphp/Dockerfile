FROM bitnami/airflow-worker:2.9.1

USER root

# Cập nhật và cài PHP 8.3 từ Ondrej's PPA
RUN apt-get update -y && \
    apt-get install -y apt-transport-https curl lsb-release ca-certificates gnupg && \
    curl -fsSL https://packages.sury.org/php/apt.gpg | gpg --dearmor -o /usr/share/keyrings/deb.sury.org-php.gpg && \
    echo "deb [signed-by=/usr/share/keyrings/deb.sury.org-php.gpg] https://packages.sury.org/php/ $(lsb_release -sc) main" > /etc/apt/sources.list.d/php.list && \
    apt-get update -y && \
    apt-get install -y php8.3 php8.3-mysql php8.3-curl && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

USER 1001
