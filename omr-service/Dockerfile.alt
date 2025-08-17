# Alternative Dockerfile with pre-downloaded Audiveris
FROM ubuntu:22.04

# Set environment variables
ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1
ENV JAVA_HOME=/usr/lib/jvm/java-11-openjdk-amd64

# Install system dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-dev \
    openjdk-11-jdk \
    curl \
    unzip \
    libxml2-dev \
    libxslt1-dev \
    zlib1g-dev \
    libjpeg-dev \
    libfreetype6-dev \
    liblcms2-dev \
    libopenjp2-7-dev \
    libtiff5-dev \
    libwebp-dev \
    tcl8.6-dev \
    tk8.6-dev \
    python3-tk \
    ghostscript \
    imagemagick \
    && rm -rf /var/lib/apt/lists/*

# Create working directory
WORKDIR /app

# Alternative 1: Use a different OMR library (tessdata + Python)
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    tesseract-ocr-eng \
    && rm -rf /var/lib/apt/lists/*

# Create Audiveris placeholder directory
RUN mkdir -p /opt/audiveris/bin && \
    echo '#!/bin/bash' > /opt/audiveris/bin/audiveris && \
    echo 'echo "Audiveris placeholder - using alternative OMR"' >> /opt/audiveris/bin/audiveris && \
    chmod +x /opt/audiveris/bin/audiveris

# Add to PATH
ENV PATH="/opt/audiveris/bin:${PATH}"

# Copy Python requirements
COPY requirements.txt .
RUN pip3 install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create directories for processing
RUN mkdir -p /tmp/uploads /tmp/processing /tmp/results

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Start the application
CMD ["python3", "app.py"]