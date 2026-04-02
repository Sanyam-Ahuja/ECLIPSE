FROM nvidia/cuda:12.1.1-cudnn8-runtime-ubuntu22.04

# System dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 python3-pip python3-dev \
    libgl1 libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# PyTorch + ML ecosystem
RUN pip3 install --no-cache-dir \
    torch==2.2.0 \
    torchvision==0.17.0 \
    torchaudio==2.2.0 \
    numpy==1.26.4 \
    pandas==2.2.0 \
    scikit-learn==1.4.0 \
    matplotlib==3.8.3 \
    pillow==10.2.0 \
    tqdm==4.66.1 \
    tensorboard==2.16.2

# CampuGrid wrappers (auto-checkpoint + local SGD)
COPY ../../wrappers/ml_checkpoint_wrapper.py /campugrid/
COPY ../../wrappers/local_sgd_wrapper.py /campugrid/
COPY ../../wrappers/entrypoint_wrapper.sh /campugrid/
RUN chmod +x /campugrid/entrypoint_wrapper.sh

WORKDIR /workspace
ENTRYPOINT ["/campugrid/entrypoint_wrapper.sh"]
