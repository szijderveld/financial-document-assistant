"""
Main typer app for ConvFinQA
"""

from pathlib import Path

import typer
from rich import print as rich_print

from agents.cot_dsl_agent import ChainOfThoughtDSLAgent
from agents.direct_prompt_agent import DirectPromptAgent
from config import config
from evaluator import Evaluator
from logger import get_logger
from schemas.convfinqa import ConvFinEnv

logger = get_logger(__name__)

app = typer.Typer(
    name="main",
    help="Boilerplate app for ConvFinQA",
    add_completion=True,
    no_args_is_help=True,
)


@app.command()
def chat(
    record_id: str = typer.Argument(..., help="ID of the record to chat about"),
) -> None:
    """Ask questions about a specific record"""
    logger.info(f"Starting chat session for record: {record_id}")

    # Read in convfinqa dataset into data conv_env
    conv_env = ConvFinEnv.from_json(
        Path(config.dataset_path), split=config.default_split
    )

    # Find record by ID
    record = conv_env.find_record(record_id)
    if record is None:
        logger.error(f"Record {record_id} not found")
        rich_print(f"[red]Record ID '{record_id}' not found in dataset[/red]")
        return

    # Create the agent
    agent = ChainOfThoughtDSLAgent(
        document=record.doc, document_features=record.features
    )

    while True:
        message = input("Enter your question here:")
        if message.strip().lower() in config.exit_commands:
            logger.info("Chat session ended")
            break

        # Send message to agent, update conversation history and gain response
        try:
            response = agent.chat(user_input=message)
            rich_print(f"[blue][bold]assistant:[/bold] {response}[/blue]")
        except Exception as e:
            logger.error(f"Chat failed for question '{message[:50]}...': {e}")
            rich_print(
                "[red]Error: Unable to process your question. Please try rephrasing or try again.[/red]"
            )
            rich_print(f"[dim]Details: {str(e)[:100]}...[/dim]")


@app.command()
def evaluate(
    num_samples: int = typer.Option(
        config.default_num_samples, help="Number of samples to evaluate"
    ),
) -> None:
    """Load and evaluate the ConvFinQA dataset"""
    try:
        # Select agents to evaluate
        agents = [DirectPromptAgent, ChainOfThoughtDSLAgent]
        data_path = Path(config.dataset_path)
        evaluator = Evaluator(data_path)

        evaluator.evaluate(agents=agents, num_samples=num_samples)
        rich_print("[green]Evaluation completed successfully![/green]")
    except Exception as e:
        rich_print(f"[red]Error running evaluation: {e}[/red]")


if __name__ == "__main__":
    app()
