import json
import os
import logging as logger

from openai import OpenAI, OpenAIError
from tenacity import retry, wait_random_exponential, stop_after_attempt


api_key = os.environ.get('OPENAI_API_KEY')
organization = os.environ.get('OPENAI_ORGANIZATION')

# GPT_MODEL = "gpt-3.5-turbo-0613"
GPT_MODEL = "gpt-4o-mini-2024-07-18"
client = OpenAI(
    api_key=api_key,
    organization=organization
)

MAX_ATTEMPTS = 6


class ResponseConditionNotMetError(Exception):
    """Custom exception for when the API response doesn't meet our expected condition."""
    pass


@retry(wait=wait_random_exponential(multiplier=1, max=40), stop=stop_after_attempt(MAX_ATTEMPTS), reraise=True)
def get_chat_completion_request(messages=None, tools=None, tool_choice=None):
    try:
        response = client.chat.completions.create(
            model=GPT_MODEL,
            messages=messages,
            tools=tools,
            tool_choice=tool_choice,
            temperature=0.2,
            response_format={"type": "json_object"}
        )

        print(response)

        return response
    except OpenAIError as e:
        logger.error(f"OpenAI API Error: {e}")
        raise OpenAIError(f"Failed to get chat completion: {e}") from e
    except ResponseConditionNotMetError as e:
        logger.info(f'Condition not met, retrying...\n{e}')
        raise
    except Exception as e:
        logger.error(f"Unexpected error: {e}", exc_info=True)
        raise Exception(f"An unexpected error occurred: {e}") from e
    # Re-raise to trigger retry





