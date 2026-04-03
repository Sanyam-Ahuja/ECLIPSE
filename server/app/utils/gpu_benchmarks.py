"""GPU benchmark data and pricing calculations."""
from typing import Any


# (fp32_tflops, vram_gb, power_watts)
GPU_BENCHMARKS: dict[str, tuple[float, int, int]] = {
    "Tesla T4":       (8.1,  16, 70),
    "RTX 3060":       (12.7,  8, 170),
    "RTX 3060 Ti":    (16.2,  8, 200),
    "RTX 3070":       (20.3,  8, 220),
    "RTX 3070 Ti":    (21.7,  8, 290),
    "RTX 3080":       (29.7, 10, 320),
    "RTX 3080 Ti":    (34.1, 12, 350),
    "RTX 3090":       (35.6, 24, 350),
    "RTX 4060":       (15.1,  8, 115),
    "RTX 4060 Ti":    (22.1,  8, 160),
    "RTX 4070":       (29.1, 12, 200),
    "RTX 4070 Ti":    (40.1, 12, 285),
    "RTX 4080":       (48.7, 16, 320),
    "RTX 4090":       (82.6, 24, 450),
    "A100 40GB":      (77.9, 40, 400),
    "A100 80GB":      (77.9, 80, 400),
}

# Pricing constants
BASE_PRICE_PER_TFLOP_HOUR = 0.075  # USD — calibrated so T4 ≈ $0.61/hr (Colab equivalent)
CUSTOMER_DISCOUNT = 0.50           # Customer pays 50% of equivalent Colab price
CONTRIBUTOR_SHARE = 0.72           # 72% of customer payment goes to contributor
PLATFORM_CUT = 0.28               # 28% platform margin
ELECTRICITY_COST_PER_KWH = 0.096  # USD — India average

# ML sync mode pricing multiplier
ML_SYNC_MULTIPLIER = {
    "local_sgd": 1.0,   # Standard — any network
    "ddp": 1.5,          # Premium — LAN only, better convergence
}

# Competitor prices per GPU-hour for comparison widget
COMPETITOR_PRICES = {
    "colab_pro":    {"T4": 0.61, "A100": 1.30},
    "aws_p3":       {"V100": 3.06, "A100": 4.10},
    "runpod":       {"RTX 3080": 0.44, "RTX 4090": 0.74, "A100": 1.64},
    "vast_ai":      {"RTX 3080": 0.30, "RTX 4090": 0.55, "A100": 1.20},
}


def customer_price_per_hour(gpu_model: str) -> float:
    """Calculate customer price per GPU-hour for a given GPU model."""
    if gpu_model not in GPU_BENCHMARKS:
        # Unknown GPU — use T4 as baseline
        return BASE_PRICE_PER_TFLOP_HOUR * 8.1 * CUSTOMER_DISCOUNT
    tflops = GPU_BENCHMARKS[gpu_model][0]
    return round(tflops * BASE_PRICE_PER_TFLOP_HOUR * CUSTOMER_DISCOUNT, 3)


def contributor_net_per_hour(gpu_model: str) -> float:
    """Calculate contributor net earnings per hour (after electricity)."""
    gross = customer_price_per_hour(gpu_model) * CONTRIBUTOR_SHARE
    if gpu_model in GPU_BENCHMARKS:
        power_watts = GPU_BENCHMARKS[gpu_model][2]
    else:
        power_watts = 200  # Conservative estimate
    electricity_cost = (power_watts / 1000) * ELECTRICITY_COST_PER_KWH
    return round(gross - electricity_cost, 3)


def dynamic_multiplier(
    gpu_model: str,
    available_count: int,
    total_count: int,
    queue_depth: int,
) -> float:
    """Dynamic pricing based on supply/demand."""
    if total_count == 0:
        return 1.0

    supply_ratio = available_count / total_count

    if supply_ratio > 0.5 and queue_depth < 5:
        return 0.90  # Surplus discount
    elif supply_ratio > 0.2:
        return 1.00  # Normal
    elif queue_depth > 20:
        return 1.50  # High demand
    else:
        return 2.00  # Scarcity surge


def get_price_comparison(gpu_model: str, estimated_hours: float) -> dict:
    """Generate price comparison against competitors."""
    our_price = customer_price_per_hour(gpu_model) * estimated_hours

    comparison: dict[str, Any] = {
        "campugrid": round(our_price, 2),
        "colab_pro": round(0.61 * estimated_hours, 2),      # T4 equivalent
        "aws_p3": round(3.06 * estimated_hours, 2),          # V100 equivalent
        "runpod": round(0.44 * estimated_hours, 2),           # RTX 3080 equivalent
    }

    if comparison["colab_pro"] > 0:
        comparison["savings_vs_colab"] = f"{round((1 - our_price / (0.61 * estimated_hours)) * 100)}%"
    if comparison["aws_p3"] > 0:
        comparison["savings_vs_aws"] = f"{round((1 - our_price / (3.06 * estimated_hours)) * 100)}%"

    return comparison
