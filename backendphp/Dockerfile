# Use PHP 8.3 with Apache
FROM php:8.3-apache

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    curl \
    libpng-dev \
    libonig-dev \
    libxml2-dev \
    libzip-dev \
    zip \
    unzip \
    nodejs \
    npm \
    netcat-openbsd \
    && docker-php-ext-install pdo_mysql mbstring exif pcntl bcmath gd zip

# Install MongoDB extension
RUN pecl install mongodb && docker-php-ext-enable mongodb

# Install Redis extension
RUN pecl install redis && docker-php-ext-enable redis

# Get latest Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Set working directory
WORKDIR /var/www/html

# Copy composer files
COPY composer.json ./

# Install PHP dependencies
RUN composer install --no-dev --optimize-autoloader --no-interaction

# Copy application code
COPY . .

# Create necessary directories and set permissions
RUN mkdir -p /var/www/html/logs /var/www/html/dags \
    && chown -R www-data:www-data /var/www/html \
    && chmod -R 755 /var/www/html \
    && chmod -R 775 /var/www/html/logs \
    && chmod -R 775 /var/www/html/dags

# Configure Apache
RUN echo "ServerName localhost" >> /etc/apache2/apache2.conf \
    && a2enmod rewrite

# Copy Apache config
COPY <<EOF /etc/apache2/sites-available/000-default.conf
<VirtualHost *:${BACKEND_PORT:-80}>
    ServerAdmin webmaster@localhost
    DocumentRoot /var/www/html/public

    <Directory /var/www/html/public>
        AllowOverride All
        Require all granted
    </Directory>

    ErrorLog \${APACHE_LOG_DIR}/error.log
    CustomLog \${APACHE_LOG_DIR}/access.log combined
</VirtualHost>
EOF

# Expose port (will be overridden by docker-compose)
EXPOSE ${BACKEND_PORT:-80}

# Create startup script
RUN echo '#!/bin/bash\n\
# Wait for MongoDB based on URI\n\
if [ "$MONGODB_URI" != "" ]; then\n\
  # Extract host and port from MongoDB URI\n\
  if [[ "$MONGODB_URI" =~ mongodb://([^:]+):([0-9]+) ]]; then\n\
    MONGO_HOST="${BASH_REMATCH[1]}"\n\
    MONGO_PORT="${BASH_REMATCH[2]}"\n\
    echo "Waiting for MongoDB at $MONGO_HOST:$MONGO_PORT..."\n\
    while ! nc -z "$MONGO_HOST" "$MONGO_PORT"; do\n\
      sleep 1\n\
    done\n\
    echo "MongoDB at $MONGO_HOST:$MONGO_PORT is up!"\n\
  else\n\
    echo "MongoDB URI does not contain host:port or using Atlas, skipping wait..."\n\
  fi\n\
else\n\
  echo "MONGODB_URI not set, skipping MongoDB wait..."\n\
fi\n\
\n\
# Start Apache\n\
apache2-foreground' > /usr/local/bin/start.sh \
    && chmod +x /usr/local/bin/start.sh

CMD ["/usr/local/bin/start.sh"]