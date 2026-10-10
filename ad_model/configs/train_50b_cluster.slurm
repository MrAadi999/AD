#!/bin/bash
#SBATCH --job-name=ad-50b-train
#SBATCH --nodes=1
#SBATCH --gpus-per-node=8
#SBATCH --cpus-per-task=16
#SBATCH --mem=512GB
#SBATCH --time=24:00:00
#SBATCH --output=ad_50b_%j.log

echo "[*] Initializing BiharStack AI AD-50B Training Cluster..."
export NCCL_DEBUG=INFO
export PYTHONUNBUFFERED=1

accelerate launch \
    --config_file=ad_model/configs/accelerate_config_50b.yaml \
    ad_model/05_train_ad_50b_moe.py \
    --deepspeed ad_model/configs/ds_zero3_50b.json
