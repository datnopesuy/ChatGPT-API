from __future__ import annotations

import unittest
from unittest import mock

from services.account_service import account_service
from services.openai_backend_api import OpenAIBackendAPI
from services.protocol import openai_v1_models
from services.protocol import conversation


class TextPlanPriorityTests(unittest.TestCase):
    """验证文本对话账号优先使用高价值套餐（TOEIC 等场景）。"""

    def _run_get_text_token(self, accounts: dict[str, dict]) -> str:
        # 直接替换单例内部状态，避免依赖真实存储后端。
        with (
            mock.patch.object(account_service, "_accounts", accounts),
            mock.patch.object(account_service, "_index", 0),
            mock.patch.object(
                account_service,
                "refresh_access_token",
                side_effect=lambda token, **kwargs: token,
            ),
        ):
            return account_service.get_text_access_token()

    def test_prefers_pro_over_plus_and_free(self):
        accounts = {
            "token-free": {"access_token": "token-free", "type": "free", "status": "正常"},
            "token-plus": {"access_token": "token-plus", "type": "Plus", "status": "正常"},
            "token-pro": {"access_token": "token-pro", "type": "Pro", "status": "正常"},
        }
        self.assertEqual(self._run_get_text_token(accounts), "token-pro")

    def test_prefers_plus_over_free(self):
        accounts = {
            "token-free": {"access_token": "token-free", "type": "free", "status": "正常"},
            "token-plus": {"access_token": "token-plus", "type": "Plus", "status": "正常"},
        }
        self.assertEqual(self._run_get_text_token(accounts), "token-plus")

    def test_skips_rate_limited_top_plan_but_falls_back_when_all_limited(self):
        # Plus 被限流，Pro 正常 → 选 Pro
        accounts = {
            "token-plus": {"access_token": "token-plus", "type": "Plus", "status": "正常"},
            "token-pro": {"access_token": "token-pro", "type": "Pro", "status": "限流"},
        }
        self.assertEqual(self._run_get_text_token(accounts), "token-plus")

    def test_falls_back_to_rate_limited_when_no_normal_account(self):
        # 全部限流时仍要回退，避免完全无法服务
        accounts = {
            "token-pro": {"access_token": "token-pro", "type": "Pro", "status": "限流"},
        }
        self.assertEqual(self._run_get_text_token(accounts), "token-pro")

    def test_returns_empty_when_no_usable_account(self):
        accounts = {
            "token-bad": {"access_token": "token-bad", "type": "Pro", "status": "异常"},
        }
        self.assertEqual(self._run_get_text_token(accounts), "")


class ChatSystemPromptTests(unittest.TestCase):
    """验证 chat_system_prompt 只作用于文本链路。"""

    def test_prepends_prompt_when_configured(self):
        messages = [{"role": "user", "content": "TOEIC question"}]
        with mock.patch.object(
            type(conversation.config),
            "chat_system_prompt",
            new_callable=mock.PropertyMock,
            return_value="You are a TOEIC expert.",
        ):
            result = conversation.prepend_chat_system_prompt(messages)
        self.assertEqual(result[0], {"role": "system", "content": "You are a TOEIC expert."})
        self.assertEqual(result[1], {"role": "user", "content": "TOEIC question"})
        # 原列表不被就地修改
        self.assertEqual(len(messages), 1)

    def test_returns_unchanged_when_not_configured(self):
        messages = [{"role": "user", "content": "hi"}]
        with mock.patch.object(
            type(conversation.config),
            "chat_system_prompt",
            new_callable=mock.PropertyMock,
            return_value="",
        ):
            result = conversation.prepend_chat_system_prompt(messages)
        self.assertEqual(result, messages)


class TextModelsInModelListTests(unittest.TestCase):
    """验证 /v1/models 暴露文本模型，供 TOEIC 客户端选择。"""

    def test_text_models_present(self):
        with (
            mock.patch.object(
                openai_v1_models.OpenAIBackendAPI,
                "list_models",
                return_value={"object": "list", "data": []},
            ),
            mock.patch.object(
                openai_v1_models.account_service,
                "list_accounts",
                return_value=[{"access_token": "token-plus", "type": "Plus", "source_type": "web"}],
            ),
        ):
            result = openai_v1_models.list_models()

        ids = {item["id"] for item in result["data"]}
        for model in openai_v1_models.TEXT_MODELS:
            self.assertIn(model, ids)
        # 图片模型仍然保留
        self.assertIn("gpt-image-2", ids)

    def test_gpt_5_6_sol_is_the_default_text_model(self):
        self.assertEqual(openai_v1_models.DEFAULT_TEXT_MODEL, "gpt-5.6-sol")

    def test_gpt_5_6_sol_uses_chatgpt_web_thinking_slug(self):
        backend = object.__new__(OpenAIBackendAPI)
        backend.access_token = ""

        payload = backend._conversation_payload(
            [{"role": "user", "content": "TOEIC question"}],
            "gpt-5.6-sol",
            "Asia/Bangkok",
        )

        self.assertEqual(payload["model"], "gpt-5-6-thinking")

    def test_text_models_not_duplicated_when_backend_already_returns_them(self):
        with (
            mock.patch.object(
                openai_v1_models.OpenAIBackendAPI,
                "list_models",
                return_value={
                    "object": "list",
                    "data": [{"id": "gpt-5", "object": "model", "created": 0, "owned_by": "chatgpt", "root": "gpt-5", "parent": None, "permission": []}],
                },
            ),
            mock.patch.object(
                openai_v1_models.account_service,
                "list_accounts",
                return_value=[],
            ),
        ):
            result = openai_v1_models.list_models()

        gpt5_entries = [item for item in result["data"] if item["id"] == "gpt-5"]
        self.assertEqual(len(gpt5_entries), 1)


if __name__ == "__main__":
    unittest.main()
