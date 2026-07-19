import json

from django.test import RequestFactory, TestCase

from core.sync import sync_view


class SyncViewTests(TestCase):
    def setUp(self) -> None:
        self.factory = RequestFactory()

    def test_records_pushed_after_pull_return_as_updated(self) -> None:
        initial_pull = sync_view(self.factory.get("/sync/", {"last_pulled_at": "0"}))
        initial_body = json.loads(initial_pull.content)
        checkpoint = initial_body["timestamp"]

        created_job = {
            "id": "hdiw5HbsUNwl5ntK",
            "title": "Synced locally first",
            "created_at": checkpoint - 1_000,
            "updated_at": checkpoint - 1_000,
        }
        push = sync_view(
            self.factory.post(
                "/sync/",
                data=json.dumps(
                    {
                        "lastPulledAt": checkpoint,
                        "changes": {
                            "jobs": {
                                "created": [created_job],
                                "updated": [],
                                "deleted": [],
                            },
                            "posts": {"created": [], "updated": [], "deleted": []},
                        },
                    }
                ),
                content_type="application/json",
            )
        )
        self.assertEqual(push.status_code, 200)

        next_pull = sync_view(
            self.factory.get("/sync/", {"last_pulled_at": str(checkpoint)})
        )
        next_body = json.loads(next_pull.content)

        self.assertEqual(next_body["changes"]["jobs"]["created"], [])
        self.assertEqual(
            [job["id"] for job in next_body["changes"]["jobs"]["updated"]],
            ["hdiw5HbsUNwl5ntK"],
        )
