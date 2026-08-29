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
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]
