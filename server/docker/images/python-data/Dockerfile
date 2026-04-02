FROM python:3.11-slim

RUN pip install --no-cache-dir \
    pandas==2.2.0 \
    numpy==1.26.4 \
    scipy==1.12.0 \
    polars==0.20.7 \
    pyarrow==15.0.0 \
    dask[complete]==2024.1.0 \
    scikit-learn==1.4.0 \
    matplotlib==3.8.3

WORKDIR /workspace
