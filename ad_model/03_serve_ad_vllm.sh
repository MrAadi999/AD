#!/usr/bin/env bash
# ==============================================================================
# AD Model - Production High-Throughput Serving via vLLM
# Exposes OpenAI-compatible endpoints:
#   POST http://localhost:8000/v1/chat/completions
#   GET  http://localhost:8000/v1/models
# ==============================================================================

MODEL_PATH=${1:-"./ad_model_checkpoints/ad_model_merged_16bit"}
PORT=${2:-8000}
HOST=${3:-"0.0.0.0"}

echo "=========================================================="
echo " Starting AD Model Inference Server with vLLM"
echo " Model: ${MODEL_PATH}"
echo " Port:  ${PORT}"
echo "=========================================================="

# Check if vLLM is installed
if ! command -v vllm &> /dev/null && ! python3 -c "import vllm" &> /dev/null; then
    echo "[!] vLLM not found. Installing recommended dependencies..."
    pip install vllm
fi

# Run vLLM OpenAI-compatible API Server with PagedAttention
python3 -m vllm.entrypoints.openai.api_server \
    --model "${MODEL_PATH}" \
    --served-model-name "ad-model" \
    --host "${HOST}" \
    --port "${PORT}" \
    --tensor-parallel-size 1 \
    --gpu-memory-utilization 0.90 \
    --max-model-len 4096 \
    --enable-auto-tool-choice
