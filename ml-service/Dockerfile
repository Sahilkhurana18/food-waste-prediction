FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Generate the synthetic dataset and train the model at build time,
# so the image ships with a ready-to-serve models/model.joblib.
# For a real deployment, replace this with COPY of a real dataset
# and/or a pre-trained model artifact instead of training on every build.
RUN python data/generate_dataset.py && python train.py

EXPOSE 8001
# Shell form (not exec/JSON array) so ${PORT} is actually substituted at
# container start. Render (and most PaaS platforms) inject their own PORT
# env var and expect the app to bind to it; local docker-compose doesn't
# set PORT, so this falls back to 8001 to match the existing port mapping.
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8001}
