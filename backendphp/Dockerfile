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

# Get latest Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Set working directory
WORKDIR /var/www/html

# Copy composer files
COPY composer.json composer.lock ./

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
<VirtualHost *:80>
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

# Expose port 80
EXPOSE 80

# Create startup script
RUN echo '#!/bin/bash\n\
# Wait for MongoDB\n\
echo "Waiting for MongoDB..."\n\
while ! nc -z mongodb 27017; do\n\
  sleep 1\n\
done\n\
echo "MongoDB is up!"\n\
\n\
# Start Apache\n\
apache2-foreground' > /usr/local/bin/start.sh \
    && chmod +x /usr/local/bin/start.sh

CMD ["/usr/local/bin/start.sh"]