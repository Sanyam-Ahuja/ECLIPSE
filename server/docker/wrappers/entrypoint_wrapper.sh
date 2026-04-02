#!/bin/bash
# CampuGrid Container Entrypoint Wrapper
# Routes job execution through appropriate wrappers based on job type.
set -e

export PYTHONPATH="/campugrid:$PYTHONPATH"

echo "[CampuGrid] Job Type: ${CAMPUGRID_JOB_TYPE:-unknown}"
echo "[CampuGrid] Sync Mode: ${CAMPUGRID_SYNC_MODE:-none}"
echo "[CampuGrid] Rank: ${RANK:-0} / World Size: ${WORLD_SIZE:-1}"

if [ "$CAMPUGRID_JOB_TYPE" = "ml_training" ]; then
    if [ "$CAMPUGRID_SYNC_MODE" = "local_sgd" ] && [ "${WORLD_SIZE:-1}" -gt 1 ]; then
        echo "[CampuGrid] Running with Local SGD sync wrapper..."
        python -u /campugrid/local_sgd_wrapper.py "$@"
    elif [ "$CAMPUGRID_SYNC_MODE" = "ddp" ]; then
        echo "[CampuGrid] Running with DDP via torchrun..."
        # torchrun handles distributed setup; checkpoint wrapper still applies
        CAMPUGRID_CHECKPOINT_WRAPPER=1 exec torchrun \
            --nproc_per_node=1 \
            --nnodes="${WORLD_SIZE:-1}" \
            --node_rank="${RANK:-0}" \
            --master_addr="${MASTER_ADDR:-127.0.0.1}" \
            --master_port="${MASTER_PORT:-29500}" \
            "$@"
    else
        echo "[CampuGrid] Running ML job through checkpoint wrapper..."
        python -u /campugrid/ml_checkpoint_wrapper.py "$@"
    fi
elif [ "$CAMPUGRID_JOB_TYPE" = "simulation" ]; then
    echo "[CampuGrid] Running simulation job..."
    if [ "$CAMPUGRID_FRAMEWORK" = "openfoam" ]; then
        # OpenFOAM runs with MPI
        mpirun -np "${WORLD_SIZE:-1}" "$@"
    elif [ "$CAMPUGRID_FRAMEWORK" = "lammps" ]; then
        mpirun -np "${WORLD_SIZE:-1}" lmp "$@"
    else
        exec "$@"
    fi
else
    # Non-ML jobs → run directly
    echo "[CampuGrid] Running job directly..."
    exec "$@"
fi
