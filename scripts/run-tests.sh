#!/bin/bash

# This script runs tests more efficiently by organizing them into smaller batches
# Instead of running all tests at once, it runs them in groups
# This reduces memory usage and makes tests faster

# Exit immediately if a command exits with a non-zero status
set -e

echo "🧪 Running tests in optimized batches..."

# Run controller and routes tests
echo "▶️ Running controller and middleware tests..."
jest --silent "controller|middleware" --testTimeout=5000 --maxWorkers=50%

# Run service tests
echo "▶️ Running service tests..."
jest --silent "service|utils" --testTimeout=5000 --maxWorkers=50%

# Run model tests
echo "▶️ Running model tests..."
jest --silent "model" --testTimeout=5000 --maxWorkers=50%

# Run other tests
echo "▶️ Running other tests..."
jest --silent --testPathIgnorePatterns="controller|middleware|service|utils|model" --testTimeout=5000 --maxWorkers=50%

echo "✅ All tests completed successfully!"