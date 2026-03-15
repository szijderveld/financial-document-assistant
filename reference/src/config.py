from pydantic_settings import BaseSettings


class AppConfig(BaseSettings):
    # Logging
    log_level: str = "INFO"
    log_format: str = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"

    # Model Configuration
    model_name: str = "gpt-4o"
    api_key: str | None = None
    max_tokens: int = 2000
    temperature: float = 0.1
    timeout: int = 30

    # Dataset Configuration
    dataset_path: str = "data/convfinqa_dataset.json"
    default_split: str = "train"

    # Evaluation Settings
    exact_match_tolerance: float = 0.001
    enable_chain_of_thought: bool = True
    max_reasoning_steps: int = 10
    default_num_samples: int = 5
    error_placeholder: str = "ERROR"

    # Flexible Match Tolerances
    percentage_tolerance: float = 0.5
    opposite_sign_tolerance: float = 1e-6
    scale_factor_tolerance: float = 0.1
    final_comparison_tolerance: float = 1e-6

    # Output Settings
    output_dir: str = "outputs"
    summary_excel_path: str = "./evaluation_results.xlsx"

    # Chat Settings
    exit_commands: list[str] = ["exit", "quit"]

    class Config:
        env_file = ".env"


# Global config instance
config = AppConfig()
